import pytest
import fitz
from backend.app.schemas import TextEditItem
from backend.app.text_editor import PDFTextEditor, map_font_name

def test_serif_font_detection_and_mapping():
    # Verify Times New Roman and serif font families map to times-roman
    assert map_font_name("TimesNewRomanPSMT") == "times-roman"
    assert map_font_name("TimesNewRomanPS-BoldMT") == "tibo"
    assert map_font_name("TimesNewRomanPS-ItalicMT") == "tiit"
    assert map_font_name("Georgia") == "times-roman"
    assert map_font_name("CustomFont", flags=4) == "times-roman"  # flags bit 2 = serif

def test_academic_title_page_center_replacement(tmp_path):
    """
    Directly tests the user's scenario:
    An academic paper with centered title and centered 'Submitted by:' block.
    Replacing the student name must preserve the serif font, center alignment, and font size.
    """
    pdf_path = str(tmp_path / "academic_cover.pdf")
    doc = fitz.open()
    page = doc.new_page(width=612, height=792)

    # Centered 'Submitted by:'
    page.insert_text((270, 200), "Submitted by:", fontname="times-roman", fontsize=12)
    # Original centered student name
    page.insert_text((245, 230), "Original Student Name", fontname="times-roman", fontsize=12)

    doc.save(pdf_path)
    doc.close()

    # Reopen to edit
    doc = fitz.open(pdf_path)
    page = doc[0]
    rects = page.search_for("Original Student Name")
    assert len(rects) > 0
    orig_box = rects[0]

    # Replace with 'moromi khan' (user's input)
    edit = TextEditItem(
        page_number=0,
        original_text="Original Student Name",
        replacement_text="moromi khan",
        bbox=[orig_box.x0, orig_box.y0, orig_box.x1, orig_box.y1],
        font_name="times-roman",
        original_font="TimesNewRomanPSMT",
        font_size=12.0,
        alignment="center",
        flags=4 # serif
    )

    result = PDFTextEditor.apply_text_edits(doc, [edit])
    assert result["applied_count"] == 1
    assert result["details"][0]["font"] == "times-roman"
    assert result["details"][0]["alignment"] == "center"

    out_path = str(tmp_path / "academic_cover_edited.pdf")
    doc.save(out_path)
    doc.close()

    # Reopen and verify new position and font
    doc_ver = fitz.open(out_path)
    p_ver = doc_ver[0]
    new_rects = p_ver.search_for("moromi khan")
    assert len(new_rects) > 0
    new_box = new_rects[0]

    # Verify horizontal center is aligned with original center
    orig_center_x = (orig_box.x0 + orig_box.x1) / 2.0
    new_center_x = (new_box.x0 + new_box.x1) / 2.0
    assert abs(orig_center_x - new_center_x) < 2.0  # Centered within 2 pt precision!

    # Verify font is Times Roman
    fonts = p_ver.get_fonts()
    assert any("times" in f[3].lower() or "times" in f[4].lower() for f in fonts)
    doc_ver.close()

def test_repeated_edits_no_ghosting_and_size_preservation(tmp_path):
    """
    Tests that multiple successive edits on the same text do not produce overlapping double text
    and preserve font size accurately.
    """
    pdf_path = str(tmp_path / "academic_test.pdf")
    doc = fitz.open()
    page = doc.new_page(width=612, height=792)
    page.insert_text((224, 520), "Department of Economics", fontname="times-roman", fontsize=14)
    doc.save(pdf_path)
    doc.close()

    doc = fitz.open(pdf_path)
    page = doc[0]
    rect = page.search_for("Department of Economics")[0]
    bbox = [rect.x0, rect.y0, rect.x1, rect.y1]

    # Two edits on same bbox (e.g. user typed once, then added 'gg' at the end)
    edit1 = TextEditItem(
        page_number=0,
        original_text="Department of Economics",
        replacement_text="Department of Economics",
        bbox=bbox,
        font_name="times-roman",
        font_size=14.0,
        alignment="center"
    )
    edit2 = TextEditItem(
        page_number=0,
        original_text="Department of Economics",
        replacement_text="Department of Economicsgg",
        bbox=bbox,
        font_name="times-roman",
        font_size=14.0,
        alignment="center"
    )

    result = PDFTextEditor.apply_text_edits(doc, [edit1, edit2])
    assert result["applied_count"] == 1

    out_path = str(tmp_path / "academic_test_edited.pdf")
    doc.save(out_path)
    doc.close()

    # Reopen and verify ONLY ONE string exists, font size is 14.0, no double text
    doc_ver = fitz.open(out_path)
    spans = []
    for b in doc_ver[0].get_text("dict")["blocks"]:
        if b.get("lines"):
            for l in b["lines"]:
                for s in l["spans"]:
                    spans.append(s)

    assert len(spans) == 1
    assert spans[0]["text"] == "Department of Economicsgg"
    assert round(spans[0]["size"]) == 14
    doc_ver.close()

