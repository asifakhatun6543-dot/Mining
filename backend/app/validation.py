import fitz
import os
from typing import List, Optional
from .schemas import ValidationResult, TextEditItem, RedactionItem

class PDFValidator:
    """Validates exported PDF integrity, ensuring proper redaction, page structure, and text presence."""

    @staticmethod
    def validate_document(
        pdf_path: str,
        expected_page_count: int,
        edits: Optional[List[TextEditItem]] = None,
        redactions: Optional[List[RedactionItem]] = None
    ) -> ValidationResult:
        if not os.path.exists(pdf_path):
            return ValidationResult(
                valid=False,
                page_count=0,
                errors=["Exported PDF file was not found on disk."],
                redaction_verified=False
            )

        errors = []
        warnings = []
        redaction_verified = True

        try:
            doc = fitz.open(pdf_path)
        except Exception as e:
            return ValidationResult(
                valid=False,
                page_count=0,
                errors=[f"Corrupted or unreadable PDF: {str(e)}"],
                redaction_verified=False
            )

        actual_page_count = len(doc)
        if actual_page_count != expected_page_count:
            warnings.append(f"Page count mismatch: expected {expected_page_count}, got {actual_page_count}.")

        # Check that redacted text is genuinely purged and unrecoverable
        if redactions:
            for red in redactions:
                if red.is_whiteout:
                    continue  # Whiteout is visual only
                if 0 <= red.page_number < actual_page_count:
                    page = doc[red.page_number]
                    clip_rect = fitz.Rect(red.bbox)
                    extracted = page.get_text("text", clip=clip_rect).strip()
                    if extracted and red.replacement_label not in extracted:
                        # Unintended text found in secure redacted region
                        redaction_verified = False
                        warnings.append(
                            f"Page {red.page_number + 1}: Residual text '{extracted[:30]}' detected in redacted area."
                        )

        # Check that text replacements are present
        if edits:
            for edit in edits:
                if not edit.replacement_text:
                    continue  # Deletion edit
                if 0 <= edit.page_number < actual_page_count:
                    page = doc[edit.page_number]
                    page_text = page.get_text("text")
                    # If replacement text is non-empty, check if it or part of it is in the page
                    sample = edit.replacement_text.strip()
                    if sample and (sample not in page_text) and (sample.split()[0] not in page_text):
                        warnings.append(
                            f"Page {edit.page_number + 1}: Replacement text '{sample[:20]}' could not be verified in extracted text."
                        )

        # Extract text preview from first page for quick confirmation
        text_preview = ""
        if actual_page_count > 0:
            text_preview = doc[0].get_text("text")[:400].strip()

        doc.close()

        is_valid = len(errors) == 0

        return ValidationResult(
            valid=is_valid,
            page_count=actual_page_count,
            errors=errors,
            warnings=warnings,
            redaction_verified=redaction_verified,
            extracted_text_preview=text_preview
        )
