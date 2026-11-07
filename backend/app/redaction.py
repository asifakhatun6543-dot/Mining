import fitz
from typing import List, Dict, Any, Tuple
from .schemas import RedactionItem

class RedactionEngine:
    """Handles genuine secure redaction vs visual whiteout, and verifies text removal."""

    @staticmethod
    def apply_redactions(doc: fitz.Document, redactions: List[RedactionItem]) -> Dict[str, Any]:
        results = {
            "applied_secure_count": 0,
            "applied_whiteout_count": 0,
            "failed_count": 0,
            "verification_passed": True,
            "warnings": [],
            "details": []
        }

        # Check for signatures/certifications before proceeding
        # Editing or redacting will invalidate digital signatures
        is_signed = False
        for p in doc:
            for annot in p.annots():
                if annot.type[0] == fitz.PDF_ANNOT_WIDGET:
                    field_type = annot.widget_type
                    if field_type == fitz.PDF_WIDGET_TYPE_SIGNATURE:
                        is_signed = True
                        break
        if is_signed:
            results["warnings"].append(
                "Document contains digital signatures. Applying redaction will invalidate existing digital signatures."
            )

        for red in redactions:
            if red.page_number < 0 or red.page_number >= len(doc):
                results["failed_count"] += 1
                continue

            page = doc[red.page_number]
            bbox = fitz.Rect(red.bbox)

            if red.is_whiteout:
                # Visual Whiteout: Draw an opaque rectangle over the area.
                # Underlying text stream remains in the PDF.
                shape = page.new_shape()
                fill_color = tuple(red.fill_color) if red.fill_color else (1.0, 1.0, 1.0)
                shape.draw_rect(bbox)
                shape.finish(fill=fill_color, color=None)
                shape.commit()

                results["applied_whiteout_count"] += 1
                results["details"].append({
                    "page": red.page_number,
                    "type": "whiteout",
                    "bbox": red.bbox,
                    "note": "Visual whiteout applied. Text under rectangle may still be extractable."
                })
            else:
                # Secure Redaction: Permanently remove the underlying text, vectors, and image pixels.
                fill_color = tuple(red.fill_color) if red.fill_color else (0.0, 0.0, 0.0)
                annot = page.add_redact_annot(
                    bbox,
                    text=red.replacement_label or "",
                    fill=fill_color,
                    align=fitz.TEXT_ALIGN_CENTER
                )
                
                # Apply redaction immediately on this page
                # Redacts text, vector graphics, and cuts into overlapping images
                page.apply_redactions(images=fitz.PDF_REDACT_IMAGE_PIXELS)

                results["applied_secure_count"] += 1
                results["details"].append({
                    "page": red.page_number,
                    "type": "secure_redaction",
                    "bbox": red.bbox,
                    "note": "Content permanently purged from content streams."
                })

        return results

    @staticmethod
    def verify_redactions(doc: fitz.Document, redactions: List[RedactionItem]) -> Tuple[bool, List[str]]:
        """
        Reopens and inspects redacted regions to verify no text characters remain in the bbox.
        """
        all_passed = True
        issues = []

        for red in redactions:
            if red.is_whiteout:
                continue  # Whiteout intentionally does not remove text

            if red.page_number < 0 or red.page_number >= len(doc):
                continue

            page = doc[red.page_number]
            bbox = fitz.Rect(red.bbox)

            # Extract words intersecting this bbox
            extracted_words = page.get_text("words", clip=bbox)
            if extracted_words:
                label = (red.replacement_label or "").strip()
                # Check if words other than the replacement label exist in the bbox
                words_found = [w[4].strip() for w in extracted_words if w[4].strip()]
                residual = [w for w in words_found if w != label and (not label or w not in label)]
                if residual:
                    all_passed = False
                    issues.append(f"Page {red.page_number + 1}: Text '{' '.join(residual)}' was not completely removed from region.")

        return all_passed, issues
