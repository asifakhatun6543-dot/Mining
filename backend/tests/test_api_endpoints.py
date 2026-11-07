import pytest
from fastapi.testclient import TestClient
import io
import fitz

from backend.app.main import app

client = TestClient(app)

@pytest.fixture
def sample_pdf_bytes():
    doc = fitz.open()
    page = doc.new_page(width=612, height=792)
    page.insert_text((50, 70), "Invoice Sample #1024", fontsize=16)
    page.insert_text((50, 110), "Customer Name: John Doe", fontsize=12)
    page.insert_text((50, 140), "Amount: $500.00", fontsize=12)
    buf = io.BytesIO()
    doc.save(buf)
    doc.close()
    return buf.getvalue()

def test_api_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert "eng" in data["tesseract_languages"]

def test_api_analyze_and_extract(sample_pdf_bytes):
    # Upload and analyze
    files = {"file": ("test_doc.pdf", sample_pdf_bytes, "application/pdf")}
    res = client.post("/api/documents/analyze", files=files)
    assert res.status_code == 200
    data = res.json()
    doc_info = data["document_info"]
    doc_id = doc_info["document_id"]
    assert doc_info["page_count"] == 1
    assert doc_info["filename"] == "test_doc.pdf"

    # Extract text endpoint
    extract_res = client.post("/api/documents/extract-text", data={"doc_id": doc_id, "page_number": 0})
    assert extract_res.status_code == 200
    ext_data = extract_res.json()
    assert "John Doe" in ext_data["pages"][0]["text"]

def test_api_export_and_download(sample_pdf_bytes):
    # Upload
    files = {"file": ("invoice.pdf", sample_pdf_bytes, "application/pdf")}
    res = client.post("/api/documents/analyze", files=files)
    doc_id = res.json()["document_info"]["document_id"]

    # Export with replacement
    export_payload = {
        "document_id": doc_id,
        "edits": [
            {
                "page_number": 0,
                "original_text": "John Doe",
                "replacement_text": "Jane Smith",
                "bbox": [50, 100, 180, 120]
            }
        ],
        "redactions": [
            {
                "page_number": 0,
                "bbox": [50, 130, 150, 150],
                "is_whiteout": False,
                "replacement_label": "[CONFIDENTIAL]"
            }
        ],
        "page_operations": [
            {
                "type": "rotate",
                "page_number": 0,
                "rotation_angle": 90
            }
        ]
    }
    exp_res = client.post("/api/documents/export", json=export_payload)
    assert exp_res.status_code == 200
    exp_data = exp_res.json()
    assert exp_data["result"]["success"]
    export_id = exp_data["export_id"]

    # Download
    dl_res = client.get(f"/api/documents/{export_id}/download")
    assert dl_res.status_code == 200
    assert dl_res.headers["content-type"] == "application/pdf"
    assert len(dl_res.content) > 500

    # Verify downloaded PDF
    doc_out = fitz.open(stream=dl_res.content, filetype="pdf")
    assert len(doc_out) == 1
    assert doc_out[0].rotation == 90
    extracted = doc_out[0].get_text("text")
    assert "Jane Smith" in extracted
    assert "$500.00" not in extracted
    doc_out.close()
