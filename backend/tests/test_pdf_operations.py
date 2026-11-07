import pytest
import os
import fitz
import tempfile
import numpy as np
import cv2
from PIL import Image, ImageDraw, ImageFont

from backend.app.schemas import (
    TextEditItem,
    RedactionItem,
    ScannedEditItem,
    ExportRequest,
    PageOperation
)
from backend.app.pdf_analyzer import PDFAnalyzer
from backend.app.text_editor import PDFTextEditor
from backend.app.redaction import RedactionEngine
from backend.app.ocr_engine import OCREngine
from backend.app.scanned_editor import ScannedDocumentEditor
from backend.app.pdf_exporter import PDFExporter
from backend.app.validation import PDFValidator

@pytest.fixture
def digital_pdf(tmp_path):
    """Creates a sample digital PDF with known text, fonts, and positions."""
    pdf_path = str(tmp_path / "digital_sample.pdf")
    doc = fitz.open()
    page = doc.new_page(width=612, height=792)  # Standard Letter
    
    # Title
    page.insert_text((50, 70), "OpenPDF Studio Test Document", fontsize=18, fontname="helv", color=(0, 0, 0))
    # Paragraph 1
    page.insert_text((50, 110), "The quick brown fox jumps over the lazy dog.", fontsize=12, fontname="helv", color=(0, 0, 0))
    # Paragraph 2
    page.insert_text((50, 140), "Confidential financial record: Account balance is $98,750.", fontsize=12, fontname="times-roman", color=(0, 0, 0))
    # Unicode text
    page.insert_text((50, 170), "International greeting: Bonjour le monde! Cafe & Resume.", fontsize=12, fontname="helv", color=(0, 0, 0))
    
    doc.save(pdf_path)
    doc.close()
    return pdf_path

@pytest.fixture
def scanned_pdf(tmp_path):
    """Creates a synthetic scanned document (an image placed on a blank page)."""
    pdf_path = str(tmp_path / "scanned_sample.pdf")
    
    # Create image with text
    img = Image.new("RGB", (800, 1000), color=(248, 248, 246))  # slightly off-white paper color
    draw = ImageDraw.Draw(img)
    draw.text((80, 100), "INVOICE NUMBER: INV-2026-9042", fill=(20, 20, 20))
    draw.text((80, 150), "TOTAL DUE: $1,450.00", fill=(20, 20, 20))
    draw.text((80, 200), "STATUS: PENDING PAYMENT", fill=(20, 20, 20))

    img_path = str(tmp_path / "scan_img.png")
    img.save(img_path)

    doc = fitz.open()
    page = doc.new_page(width=612, height=792)
    page.insert_image(page.rect, filename=img_path)
    doc.save(pdf_path)
    doc.close()
    return pdf_path

def test_pdf_analyzer(digital_pdf, scanned_pdf):
    # Test digital PDF classification
    d_info, d_pages = PDFAnalyzer.analyze_document(digital_pdf, "digital_sample.pdf")
    assert d_info.page_count == 1
    assert not d_info.is_scanned
    assert d_pages[0].has_text
    assert d_pages[0].word_count > 10

    # Test scanned PDF classification
    s_info, s_pages = PDFAnalyzer.analyze_document(scanned_pdf, "scanned_sample.pdf")
    assert s_info.page_count == 1
    assert s_info.is_scanned or s_pages[0].is_scanned
    assert s_pages[0].has_images

def test_text_replacement(digital_pdf, tmp_path):
    doc = fitz.open(digital_pdf)
    page = doc[0]
    
    # Locate "lazy dog"
    rects = page.search_for("lazy dog")
    assert len(rects) > 0
    target_rect = rects[0]

    edit = TextEditItem(
        page_number=0,
        original_text="lazy dog",
        replacement_text="energetic puppy",
        bbox=[target_rect.x0, target_rect.y0, target_rect.x1, target_rect.y1],
        font_name="helv",
        font_size=12.0
    )

    res = PDFTextEditor.apply_text_edits(doc, [edit])
    assert res["applied_count"] == 1

    out_path = str(tmp_path / "modified_text.pdf")
    doc.save(out_path)
    doc.close()

    # Reopen and verify
    doc_ver = fitz.open(out_path)
    extracted = doc_ver[0].get_text("text")
    assert "energetic puppy" in extracted
    assert "lazy dog" not in extracted
    doc_ver.close()

def test_text_deletion(digital_pdf, tmp_path):
    doc = fitz.open(digital_pdf)
    page = doc[0]
    
    rects = page.search_for("brown fox")
    assert len(rects) > 0
    target_rect = rects[0]

    edit = TextEditItem(
        page_number=0,
        original_text="brown fox",
        replacement_text="",  # Deletion
        bbox=[target_rect.x0, target_rect.y0, target_rect.x1, target_rect.y1]
    )

    res = PDFTextEditor.apply_text_edits(doc, [edit])
    assert res["applied_count"] == 1

    out_path = str(tmp_path / "deleted_text.pdf")
    doc.save(out_path)
    doc.close()

    doc_ver = fitz.open(out_path)
    extracted = doc_ver[0].get_text("text")
    assert "brown fox" not in extracted
    doc_ver.close()

def test_secure_redaction_verification(digital_pdf, tmp_path):
    doc = fitz.open(digital_pdf)
    page = doc[0]
    
    rects = page.search_for("$98,750")
    assert len(rects) > 0
    target_rect = rects[0]

    redaction = RedactionItem(
        page_number=0,
        bbox=[target_rect.x0, target_rect.y0, target_rect.x1, target_rect.y1],
        fill_color=[0.0, 0.0, 0.0],
        is_whiteout=False,
        replacement_label="[REDACTED]"
    )

    RedactionEngine.apply_redactions(doc, [redaction])
    out_path = str(tmp_path / "redacted.pdf")
    doc.save(out_path)
    doc.close()

    # Verify that original balance is unrecoverable
    doc_ver = fitz.open(out_path)
    extracted = doc_ver[0].get_text("text")
    assert "$98,750" not in extracted
    passed, issues = RedactionEngine.verify_redactions(doc_ver, [redaction])
    assert passed
    assert len(issues) == 0
    doc_ver.close()

def test_visual_whiteout(digital_pdf, tmp_path):
    doc = fitz.open(digital_pdf)
    page = doc[0]
    
    rects = page.search_for("Bonjour le monde")
    assert len(rects) > 0
    target_rect = rects[0]

    whiteout = RedactionItem(
        page_number=0,
        bbox=[target_rect.x0, target_rect.y0, target_rect.x1, target_rect.y1],
        fill_color=[1.0, 1.0, 1.0],
        is_whiteout=True
    )

    res = RedactionEngine.apply_redactions(doc, [whiteout])
    assert res["applied_whiteout_count"] == 1

    out_path = str(tmp_path / "whited_out.pdf")
    doc.save(out_path)
    doc.close()

    # Whiteout visually covers, but underlying text stream remains extractable as per spec
    doc_ver = fitz.open(out_path)
    extracted = doc_ver[0].get_text("text")
    assert "Bonjour le monde" in extracted
    doc_ver.close()

def test_scanned_ocr_and_edit(scanned_pdf, tmp_path):
    doc = fitz.open(scanned_pdf)
    
    # Run OCR on scanned document
    ocr_res = OCREngine.perform_ocr_on_page(doc, page_number=0, language="eng", dpi=150)
    assert len(ocr_res.words) > 0
    assert any("INVOICE" in w.text.upper() or "TOTAL" in w.text.upper() or "PENDING" in w.text.upper() for w in ocr_res.words)

    # Find word to edit
    target_word = None
    for w in ocr_res.words:
        if "PENDING" in w.text.upper():
            target_word = w
            break

    if target_word:
        edit = ScannedEditItem(
            page_number=0,
            word_id=target_word.id,
            bbox=target_word.bbox,
            original_text=target_word.text,
            replacement_text="COMPLETED",
            font_size=14.0
        )
        
        # Test preview comparison
        prev = ScannedDocumentEditor.get_preview_comparison(doc, edit)
        assert prev["before_preview"].startswith("data:image/png;base64,")
        assert prev["after_preview"].startswith("data:image/png;base64,")

        # Test apply
        edit_res = ScannedDocumentEditor.apply_scanned_edits(doc, [edit], dpi=150)
        assert edit_res["applied_count"] == 1

    doc.close()

def test_page_operations_and_export(digital_pdf, tmp_path):
    out_path = str(tmp_path / "full_export.pdf")
    
    req = ExportRequest(
        document_id="dummy_id",
        page_operations=[
            PageOperation(type="rotate", page_number=0, rotation_angle=90),
            PageOperation(type="insert_blank", target_page=1)
        ],
        edits=[
            TextEditItem(
                page_number=0,
                original_text="Test",
                replacement_text="Verified",
                bbox=[50, 50, 100, 70]
            )
        ]
    )

    res = PDFExporter.export_document(digital_pdf, out_path, req)
    assert res["success"]
    assert res["page_count"] == 2  # 1 original + 1 inserted blank

    # Verify rotation on page 0
    doc_ver = fitz.open(out_path)
    assert len(doc_ver) == 2
    assert doc_ver[0].rotation == 90
    doc_ver.close()
