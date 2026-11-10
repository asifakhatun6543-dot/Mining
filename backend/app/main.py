import os
import shutil
import tempfile
import uuid
import fitz
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from .schemas import (
    DocumentInfo,
    PageAnalysis,
    TextEditItem,
    RedactionItem,
    ScannedEditItem,
    OCRPageResult,
    ExportRequest,
    ValidationResult
)
from .pdf_analyzer import PDFAnalyzer
from .text_editor import PDFTextEditor
from .redaction import RedactionEngine
from .ocr_engine import OCREngine
from .scanned_editor import ScannedDocumentEditor
from .pdf_exporter import PDFExporter
from .validation import PDFValidator

app = FastAPI(
    title="OpenPDF Studio API",
    description="Local-first backend for professional PDF editing, OCR, and redaction.",
    version="1.0.0"
)

# Allow local frontend interaction
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dedicated isolated temporary storage directory
TEMP_STORAGE_DIR = os.path.join(tempfile.gettempdir(), "openpdf_studio_storage")
os.makedirs(TEMP_STORAGE_DIR, exist_ok=True)

# In-memory session store mapping document_id to metadata & file paths
DOCUMENT_STORE: Dict[str, Dict[str, Any]] = {}

def get_document_path(doc_id: str) -> str:
    """Safely retrieves document file path, preventing directory traversal."""
    if doc_id not in DOCUMENT_STORE:
        raise HTTPException(status_code=404, detail="Document not found or session expired.")
    path = DOCUMENT_STORE[doc_id].get("file_path")
    if not path or not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Document file does not exist on disk.")
    return path

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "app": "OpenPDF Studio",
        "version": "1.0.0",
        "tesseract_languages": OCREngine.get_installed_languages(),
        "storage_dir": TEMP_STORAGE_DIR
    }

@app.post("/api/documents/analyze")
async def analyze_document(file: UploadFile = File(...)):
    # Validate PDF magic header
    header = await file.read(5)
    if header != b"%PDF-":
        raise HTTPException(status_code=400, detail="Invalid file: Not a valid PDF document header.")
    
    # Read remaining content
    rest = await file.read()
    content = header + rest

    # Size limit (e.g. 100 MB max for local editor)
    if len(content) > 100 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large (exceeds 100MB limit).")

    doc_id = str(uuid.uuid4())
    save_path = os.path.join(TEMP_STORAGE_DIR, f"{doc_id}_orig.pdf")

    with open(save_path, "wb") as f:
        f.write(content)

    try:
        doc_info, page_analyses = PDFAnalyzer.analyze_document(save_path, file.filename or "document.pdf")
        doc_info.document_id = doc_id
    except Exception as e:
        if os.path.exists(save_path):
            os.remove(save_path)
        raise HTTPException(status_code=400, detail=f"Failed to analyze PDF: {str(e)}")

    DOCUMENT_STORE[doc_id] = {
        "file_path": save_path,
        "filename": file.filename or "document.pdf",
        "doc_info": doc_info.model_dump(),
        "page_analyses": [p.model_dump() for p in page_analyses]
    }

    return {
        "document_info": doc_info,
        "pages": page_analyses
    }

@app.post("/api/documents/extract-text")
def extract_text(doc_id: str = Form(...), page_number: Optional[int] = Form(None)):
    path = get_document_path(doc_id)
    doc = fitz.open(path)

    if page_number is not None:
        if page_number < 0 or page_number >= len(doc):
            doc.close()
            raise HTTPException(status_code=400, detail="Invalid page number")
        pages_to_extract = [page_number]
    else:
        pages_to_extract = list(range(len(doc)))

    results = []
    for pno in pages_to_extract:
        p = doc[pno]
        raw_dict = p.get_text("rawdict")
        results.append({
            "page_number": pno,
            "text": p.get_text("text"),
            "rawdict": raw_dict
        })

    doc.close()
    return {"pages": results}

@app.get("/api/documents/ocr/languages")
def get_ocr_languages():
    langs = OCREngine.get_installed_languages()
    return {
        "languages": langs,
        "default": "eng" if "eng" in langs else (langs[0] if langs else "")
    }

@app.post("/api/documents/ocr")
def run_ocr(
    doc_id: str = Form(...),
    page_number: int = Form(...),
    language: str = Form("eng"),
    dpi: int = Form(300)
):
    path = get_document_path(doc_id)
    doc = fitz.open(path)

    try:
        ocr_result: OCRPageResult = OCREngine.perform_ocr_on_page(
            doc,
            page_number=page_number,
            language=language,
            dpi=dpi
        )
    except Exception as e:
        doc.close()
        raise HTTPException(status_code=500, detail=str(e))

    doc.close()
    return ocr_result

@app.post("/api/documents/scanned-preview")
def preview_scanned_edit(
    doc_id: str = Form(...),
    page_number: int = Form(...),
    bbox_x0: float = Form(...),
    bbox_y0: float = Form(...),
    bbox_x1: float = Form(...),
    bbox_y1: float = Form(...),
    original_text: str = Form(...),
    replacement_text: str = Form(...),
    font_size: float = Form(12.0)
):
    path = get_document_path(doc_id)
    doc = fitz.open(path)

    edit_item = ScannedEditItem(
        page_number=page_number,
        bbox=[bbox_x0, bbox_y0, bbox_x1, bbox_y1],
        original_text=original_text,
        replacement_text=replacement_text,
        font_size=font_size
    )

    try:
        preview = ScannedDocumentEditor.get_preview_comparison(doc, edit_item)
    except Exception as e:
        doc.close()
        raise HTTPException(status_code=500, detail=str(e))

    doc.close()
    return preview

@app.post("/api/documents/export")
def export_document(request: ExportRequest):
    source_path = get_document_path(request.document_id)
    export_id = str(uuid.uuid4())
    output_path = os.path.join(TEMP_STORAGE_DIR, f"{export_id}_exported.pdf")

    try:
        export_result = PDFExporter.export_document(
            source_pdf_path=source_path,
            output_pdf_path=output_path,
            request=request
        )
    except Exception as e:
        if os.path.exists(output_path):
            os.remove(output_path)
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")

    orig_filename = DOCUMENT_STORE[request.document_id].get("filename", "document.pdf")
    base, ext = os.path.splitext(orig_filename)
    download_filename = f"{base}_edited.pdf"

    DOCUMENT_STORE[export_id] = {
        "file_path": output_path,
        "filename": download_filename
    }

    return {
        "export_id": export_id,
        "download_url": f"/api/documents/{export_id}/download",
        "download_filename": download_filename,
        "result": export_result
    }

@app.get("/api/documents/{export_id}/download")
def download_document(export_id: str):
    path = get_document_path(export_id)
    filename = DOCUMENT_STORE[export_id].get("filename", "exported.pdf")
    return FileResponse(
        path,
        media_type="application/pdf",
        filename=filename,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

@app.post("/api/documents/validate")
def validate_pdf(doc_id: str = Form(...)):
    path = get_document_path(doc_id)
    doc = fitz.open(path)
    count = len(doc)
    doc.close()
    result = PDFValidator.validate_document(path, expected_page_count=count)
    return result

# Dynamically resolve workspace root for local, Docker, and Vercel serverless deployments
def resolve_workspace_root() -> str:
    candidates = [
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")), # Repo root
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..")),      # Backend root
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "static")), # Backend static dir
        os.path.abspath(os.path.dirname(__file__)),                          # App dir
        os.getcwd(),                                                         # CWD
        os.path.abspath(os.path.join(os.getcwd(), "..")),
        "/var/task",
        "/var/task/backend",
        "/var/task/backend/static"
    ]
    for c in candidates:
        if os.path.exists(os.path.join(c, "index.html")):
            return c
    return os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

WORKSPACE_ROOT = resolve_workspace_root()

def find_static_dir(dir_name: str) -> Optional[str]:
    candidates = [
        os.path.join(WORKSPACE_ROOT, dir_name),
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", dir_name)),
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "static", dir_name)),
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", dir_name)),
        os.path.abspath(os.path.join(os.getcwd(), dir_name)),
        f"/var/task/{dir_name}",
        f"/var/task/backend/{dir_name}",
        f"/var/task/backend/static/{dir_name}",
    ]
    for c in candidates:
        if os.path.exists(c) and os.path.isdir(c):
            return c
    return None

# Serve vendor, css, js, sample_docs static directories
for static_dir in ["css", "js", "vendor", "sample_docs"]:
    dir_path = find_static_dir(static_dir)
    if dir_path:
        app.mount(f"/{static_dir}", StaticFiles(directory=dir_path), name=static_dir)

@app.api_route("/", methods=["GET", "HEAD"])
@app.api_route("/index.html", methods=["GET", "HEAD"])
def serve_index():
    index_path = os.path.join(WORKSPACE_ROOT, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path, media_type="text/html")
    
    # Check alternate possible locations
    for candidate in [
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "index.html")),
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "static", "index.html")),
        os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "index.html")),
        os.path.abspath(os.path.join(os.getcwd(), "index.html")),
        "/var/task/index.html",
        "/var/task/backend/index.html",
        "/var/task/backend/static/index.html",
    ]:
        if os.path.exists(candidate):
            return FileResponse(candidate, media_type="text/html")

    return {"message": "OpenPDF Studio backend running. Place index.html in the workspace."}
