# OpenPDF Studio

**OpenPDF Studio** is a local-first, professional open-source PDF editor designed for accurate digital text editing, scanned document OCR with background inpainting, secure redactions, and verified PDF export.

Unlike basic overlay tools that merely paint white rectangles over text, OpenPDF Studio uses PyMuPDF's underlying redaction and stream-editing engine to genuinely purge original text characters from content streams and insert replacement text using matched typography, font sizes, and layout preservation.

---

## Key Features

### 1. True Editing of Existing Digital Text
- **Click-to-Select**: Select words, sentences, or paragraphs directly on the rendered document.
- **Accurate Coordinate Translation**: Automatically translates viewport pixels to PDF point space `[x0, y0, x1, y1]`, accounting for zoom, rotation, and device pixel ratio.
- **Genuine Redaction & Text Replacement**: Purges the original glyphs from the content stream rather than covering them up.
- **Typography & Font Matching**: Matches font family (Helvetica, Times Roman, Courier, etc.), font size, and baseline position.
- **Fit Settings**: Supports auto-fitting into original bounding box, scaling font size down proportionally, expanding safe bounds, or exact placement.
- **Live Diff Preview**: Shows original strikethrough text and replacement text before applying changes.

### 2. Scanned Documents & OCR Pipeline
- **Local Tesseract OCR**: Uses local Tesseract language packs with skew and orientation detection.
- **Confidence Scoring**: Word-by-word confidence scoring with visual amber highlighting for low-confidence words (< 75%).
- **Interactive Word Correction**: Click any recognized word to modify its text.
- **OpenCV Inpainting & Reconstruction**: Reconstructs the scanned page background using OpenCV Telea inpainting (`cv2.inpaint`), seamlessly blending neighboring paper texture before rendering replacement text.
- **Side-by-Side Inpaint Preview**: Generates high-zoom before-and-after image comparisons.

### 3. Mixed-Content & Document Diagnostics
- **Document Classification**: Automatically classifies documents as **Digital Text**, **Scanned (Images)**, or **Mixed Content**.
- **Font & Encoding Inspection**: Identifies embedded fonts, unusual encodings, and encryption status.
- **OCR Prompts**: Proactively suggests OCR when pages have insufficient extractable text.

### 4. Genuine Redaction vs. Visual Whiteout
- **Visual Whiteout**: Draws an opaque white rectangle over the area while clearly warning that underlying text remains extractable.
- **Secure Redaction**: Permanently removes underlying text characters, vector strokes, and image pixels.
- **Redaction Audit**: Reopens and programmatically verifies the exported document to ensure no target characters remain recoverable.

### 5. Page Operations & Annotations
- **Page Management**: Reorder pages, rotate 90°/180°/270°, duplicate pages, delete pages, and insert blank pages.
- **Annotation Tools**: Highlights, underlines, strikethroughs, freehand drawing, shapes (rectangles, circles, lines, arrows), sticky notes, and watermarks.
- **Signatures & Images**: Insert signatures (drawn or typed) and external image assets.
- **Search & Replace**: Search extracted document text with occurrence badges.

### 6. PDF Export & Integrity Validation
- Every export is verified by reopening the generated PDF with PyMuPDF.
- Audits page count, text extraction readability, and ensures redacted sensitive text has been purged.
- Displays a validation report before user download.

---

## Project Structure

```
openpdf-studio/
├── index.html                  # Main responsive UI
├── css/
│   ├── styles.css              # Design system and layout tokens
│   ├── editor.css              # Overlays, popovers, and dialogs
│   └── responsive.css          # Responsive and accessibility rules
├── js/
│   ├── app.js                  # Application bootstrap and shortcuts
│   ├── state.js                # Reactive state store
│   ├── pdf-renderer.js         # PDF.js rendering and thumbnail engine
│   ├── text-selection.js       # Coordinate translation and text selection
│   ├── text-editor.js          # Inline digital text editor
│   ├── scanned-editor.js       # OCR overlay and inpaint comparison
│   ├── toolbar.js              # Annotation and drawing toolbar
│   ├── history.js              # Command-pattern Undo/Redo manager
│   └── export-client.js        # Export client & validation modal
├── backend/
│   ├── app/
│   │   ├── main.py             # FastAPI endpoints and static file server
│   │   ├── pdf_analyzer.py     # PDF analysis and classification
│   │   ├── text_editor.py      # Redaction-based text modification
│   │   ├── redaction.py        # Secure redaction vs visual whiteout
│   │   ├── ocr_engine.py       # Tesseract OCR and skew detection
│   │   ├── scanned_editor.py   # OpenCV inpainting and image reconstruction
│   │   ├── pdf_exporter.py     # Document assembler and exporter
│   │   ├── validation.py       # Integrity and text purge validator
│   │   └── schemas.py          # Pydantic models
│   ├── tests/
│   │   ├── test_pdf_operations.py # Pytest core PDF tests
│   │   └── test_api_endpoints.py  # Pytest FastAPI endpoint tests
│   └── requirements.txt        # Pinned dependencies
├── sample_docs/                # Demo PDFs (Digital contract & Scanned receipt)
├── tessdata/                   # Local Tesseract OCR language models (eng.traineddata)
├── vendor/
│   ├── pdfjs/                  # Offline PDF.js library and Web Worker
│   └── README.md
├── scripts/
│   └── generate_samples.py     # Test document generator script
├── README.md
└── LICENSE                     # AGPL-3.0 License
```

---

## Installation & Setup

### Prerequisites
- **Python 3.10+** (Python 3.11 recommended)
- **Node.js** (optional, for vendor package updates)

### 1. Windows Setup
```powershell
# Clone or navigate to the repository
cd c:\Users\Admin\OneDrive\pdfeditor

# Create a virtual environment
python -m venv .venv
.\.venv\Scripts\activate

# Install pinned dependencies
pip install -r backend/requirements.txt

# Start the local application
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```
Open your browser at `http://127.0.0.1:8000`.

### 2. macOS Setup
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
python3 -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```

### 3. Linux (Ubuntu / Debian) Setup
```bash
sudo apt-get update && sudo apt-get install -y libgl1 libglib2.0-0
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
python3 -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```

---

## Running the Automated Test Suite

OpenPDF Studio includes an extensive test suite verifying text extraction, text replacement, secure redactions, OCR, inpainting, and export validation:

```bash
# Run pytest with detailed verbose output
pytest backend/tests -v
```

---

## Third-Party Licenses & Compatibility

OpenPDF Studio is distributed under the **GNU Affero General Public License v3.0 (AGPL-3.0)** to remain fully license-compatible with its core dependencies:

| Component | License | Notes |
| :--- | :--- | :--- |
| **PyMuPDF** | AGPL-3.0 / Commercial | Core PDF parsing, redaction, and export engine |
| **PDF.js** | Apache License 2.0 | Browser-side PDF rendering and text layer |
| **OpenCV (headless)** | Apache License 2.0 | Image processing and inpainting |
| **Pillow** | HPND License | Raster image handling |
| **FastAPI / Starlette** | MIT License | Local REST API server |
| **Tesseract OCR (traineddata)** | Apache License 2.0 | Local OCR text recognition |

---

## Privacy & Security Guarantees
- **Localhost Only**: The backend binds exclusively to `127.0.0.1`.
- **Zero Cloud Uploads**: Documents are processed entirely on your local machine.
- **Isolated Storage**: Temporary processing files are stored in an isolated system temp directory and cleaned up safely.
- **No PDF JavaScript**: Browser and backend PDF execution disables JavaScript execution inside documents.
