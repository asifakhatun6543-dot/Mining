import fitz
from typing import List, Tuple, Optional, Dict, Any
from .schemas import TextEditItem

def map_font_name(font_name: Optional[str] = "", is_bold: bool = False, is_italic: bool = False, flags: int = 0) -> str:
    """
    Intelligently maps any PDF font name or request to standard PyMuPDF Base-14 font identifiers,
    preserving Serif vs Sans-serif vs Monospace classification and Bold / Italic styling.
    """
    clean = (font_name or "").lower().replace("-", " ").replace("_", " ").replace(",", " ")
    
    # Check flags and clean string for bold & italic
    bold = is_bold or (flags & 16 != 0) or any(k in clean for k in ["bold", "black", "heavy", "bd", "demi", "semibold"])
    italic = is_italic or (flags & 2 != 0) or any(k in clean for k in ["italic", "oblique", "it"])
    
    # Check Serif classification (flags bit 2 or common serif font families)
    serif = (flags & 4 != 0) or any(k in clean for k in [
        "times", "roman", "serif", "cambria", "georgia", "garamond",
        "baskerville", "palatino", "minion", "century", "book", "pt serif", "lora", "merriweather"
    ])
    
    # Check Monospace classification (flags bit 3 or common mono fonts)
    mono = (flags & 8 != 0) or any(k in clean for k in [
        "courier", "mono", "consolas", "code", "typewriter", "menlo", "fira code",
        "fira mono", "jetbrains mono", "ibm plex mono", "source code pro", "ubuntu mono",
        "dm mono", "space mono", "inconsolata", "dejavu sans mono", "liberation mono", "noto sans mono"
    ])

    # Check Serif classification (flags bit 2 or common serif font families)
    serif = (flags & 4 != 0) or any(k in clean for k in [
        "times", "roman", "serif", "cambria", "georgia", "garamond",
        "baskerville", "palatino", "minion", "century", "book", "pt serif", "lora",
        "merriweather", "caladea", "calisto", "charter", "computer modern", "constantia",
        "dejavu serif", "droid serif", "fontin", "frank ruhl", "gentium", "ibm plex serif",
        "liberation serif", "linux libertine", "noto serif", "playfair", "roboto slab",
        "source serif", "alegreya", "cormorant", "crimson", "dm serif", "eczar",
        "instrument serif", "spectral", "vollkorn", "zilla slab", "cinzel"
    ])

    if mono:
        if bold and italic:
            return "cobi"
        elif bold:
            return "cobo"
        elif italic:
            return "coit"
        return "courier"

    if serif:
        if bold and italic:
            return "tibi"
        elif bold:
            return "tibo"
        elif italic:
            return "tiit"
        return "times-roman"

    # Default Sans-Serif (Helvetica / Arial / Calibri / Roboto / Inter / Poppins / etc.)
    if bold and italic:
        return "hebi"
    elif bold:
        return "hebo"
    elif italic:
        return "heit"
    return "helv"

class PDFTextEditor:
    """Precision text replacement in digital PDFs using true redaction and text insertion."""

    @staticmethod
    def apply_text_edits(doc: fitz.Document, edits: List[TextEditItem]) -> Dict[str, Any]:
        results = {
            "applied_count": 0,
            "failed_count": 0,
            "details": []
        }

        edits_by_page: Dict[int, List[TextEditItem]] = {}
        for edit in edits:
            edits_by_page.setdefault(edit.page_number, []).append(edit)

        for page_num, page_edits in edits_by_page.items():
            if page_num < 0 or page_num >= len(doc):
                results["failed_count"] += len(page_edits)
                results["details"].append(f"Invalid page number {page_num}")
                continue

            page = doc[page_num]
            page_width = page.rect.width

            # Deduplicate edits on the same page and bbox: keep only the latest edit to prevent double text
            deduped_edits = {}
            for edit in page_edits:
                key = (round(edit.bbox[0], 1), round(edit.bbox[1], 1), round(edit.bbox[2], 1), round(edit.bbox[3], 1))
                deduped_edits[key] = edit
            unique_page_edits = list(deduped_edits.values())

            # Stage 1: Add redaction annotations for each edit bbox with clean white fill
            redactions_to_apply = []
            for edit in unique_page_edits:
                orig_bbox = fitz.Rect(edit.bbox)
                # Expand slightly to cover full ascent and descent of glyphs
                clean_rect = fitz.Rect(
                    orig_bbox.x0 - 1.0,
                    orig_bbox.y0 - 1.0,
                    orig_bbox.x1 + 1.0,
                    orig_bbox.y1 + 1.5
                )
                # fill=[1, 1, 1] fills with clean white, purging old text and preventing ghosting/overlap
                page.add_redact_annot(clean_rect, fill=(1.0, 1.0, 1.0))
                redactions_to_apply.append((edit, orig_bbox))

            # Apply redactions cleanly purging old characters from the content stream
            page.apply_redactions(images=fitz.PDF_REDACT_IMAGE_NONE)

            # Stage 2: Insert replacement text
            for edit, orig_bbox in redactions_to_apply:
                try:
                    replacement = edit.replacement_text
                    if not replacement:
                        results["applied_count"] += 1
                        results["details"].append({
                            "page": page_num,
                            "original": edit.original_text,
                            "replacement": "",
                            "status": "deleted"
                        })
                        continue

                    # Determine font identifier, factoring in bold/italic and original font
                    chosen_font = edit.font_name or edit.original_font or "helv"
                    font_name = map_font_name(
                        chosen_font,
                        is_bold=bool(edit.is_bold),
                        is_italic=bool(edit.is_italic),
                        flags=int(edit.flags or 0)
                    )

                    font_size = edit.font_size or (orig_bbox.height * 0.85)
                    color = tuple(edit.text_color) if edit.text_color and len(edit.text_color) == 3 else (0.0, 0.0, 0.0)

                    # Estimate text width using font metrics
                    text_width = fitz.get_text_length(replacement, fontname=font_name, fontsize=font_size)
                    box_width = orig_bbox.width

                    # Fit mode scaling (only scale down if explicitly requested)
                    effective_font_size = font_size
                    if edit.fit_mode == "scale_down":
                        if text_width > box_width and box_width > 5:
                            scale_factor = box_width / (text_width + 1.0)
                            effective_font_size = max(font_size * scale_factor, 6.0)
                            text_width = fitz.get_text_length(replacement, fontname=font_name, fontsize=effective_font_size)

                    # Determine Horizontal Alignment
                    alignment = edit.alignment
                    if alignment == "auto" or not alignment:
                        # Auto-detect if original span was horizontally centered on page or line
                        dist_left = orig_bbox.x0
                        dist_right = page_width - orig_bbox.x1
                        if abs(dist_left - dist_right) < 35:
                            alignment = "center"
                        else:
                            alignment = "left"

                    if alignment == "center":
                        orig_center_x = (orig_bbox.x0 + orig_bbox.x1) / 2.0
                        insertion_x = orig_center_x - (text_width / 2.0)
                    elif alignment == "right":
                        insertion_x = orig_bbox.x1 - text_width
                    else:  # left
                        insertion_x = orig_bbox.x0

                    # Calculate vertical baseline for placement
                    baseline_y = orig_bbox.y1 - (orig_bbox.height * 0.20)
                    insertion_point = fitz.Point(insertion_x, baseline_y)

                    # Insert text with matched font and typography
                    rc = page.insert_text(
                        insertion_point,
                        replacement,
                        fontname=font_name,
                        fontsize=effective_font_size,
                        color=color
                    )

                    if rc < 0:
                        # Fallback textbox for complex / Unicode glyphs
                        target_rect = fitz.Rect(insertion_x, orig_bbox.y0, insertion_x + text_width + 10, orig_bbox.y1)
                        page.insert_textbox(
                            target_rect,
                            replacement,
                            fontsize=effective_font_size,
                            color=color,
                            align=fitz.TEXT_ALIGN_CENTER if alignment == "center" else fitz.TEXT_ALIGN_LEFT
                        )

                    results["applied_count"] += 1
                    results["details"].append({
                        "page": page_num,
                        "original": edit.original_text,
                        "replacement": replacement,
                        "font": font_name,
                        "size": effective_font_size,
                        "alignment": alignment,
                        "status": "replaced"
                    })
                except Exception as ex:
                    results["failed_count"] += 1
                    results["details"].append({
                        "page": page_num,
                        "original": edit.original_text,
                        "error": str(ex),
                        "status": "failed"
                    })

        return results
