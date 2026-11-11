import fitz
import os
import io
import base64
from typing import Dict, Any, List, Optional
from .schemas import (
    ExportRequest,
    ValidationResult,
    OverlayAnnotation,
    PageOperation
)
from .text_editor import PDFTextEditor
from .redaction import RedactionEngine
from .scanned_editor import ScannedDocumentEditor
from .validation import PDFValidator

class PDFExporter:
    """Orchestrates document modification, annotations, page operations, and validation."""

    @classmethod
    def export_document(
        cls,
        source_pdf_path: str,
        output_pdf_path: str,
        request: ExportRequest
    ) -> Dict[str, Any]:
        if not os.path.exists(source_pdf_path):
            raise FileNotFoundError(f"Source PDF not found at {source_pdf_path}")

        doc = fitz.open(source_pdf_path)

        # 1. Apply Page Operations (Delete, Rotate, Reorder, Insert)
        if request.page_operations:
            cls._apply_page_operations(doc, request.page_operations)

        # 2. Apply Text Edits (Digital PDF replacement via redaction + insertion)
        text_edit_stats = {}
        if request.edits:
            text_edit_stats = PDFTextEditor.apply_text_edits(doc, request.edits)

        # 3. Apply Redactions and Whiteouts
        redaction_stats = {}
        if request.redactions:
            redaction_stats = RedactionEngine.apply_redactions(doc, request.redactions)

        # 4. Apply Scanned Edits (OCR inpainting & reconstruction)
        scanned_edit_stats = {}
        if request.scanned_edits:
            scanned_edit_stats = ScannedDocumentEditor.apply_scanned_edits(doc, request.scanned_edits)

        # 5. Apply Annotations & Overlays (Highlights, Drawings, Signatures, Images, Shapes)
        if request.annotations:
            cls._apply_annotations(doc, request.annotations)

        # Save document cleanly
        # deflate=True compresses streams; garbage=3 cleans unused objects
        doc.save(
            output_pdf_path,
            garbage=3,
            deflate=True,
            clean=True
        )
        expected_page_count = len(doc)
        doc.close()

        # 6. Validate exported file
        validation: ValidationResult = PDFValidator.validate_document(
            output_pdf_path,
            expected_page_count=expected_page_count,
            edits=request.edits,
            redactions=request.redactions
        )

        return {
            "success": validation.valid,
            "output_path": output_pdf_path,
            "page_count": validation.page_count,
            "validation": validation.model_dump(),
            "text_edits": text_edit_stats,
            "redactions": redaction_stats,
            "scanned_edits": scanned_edit_stats
        }

    @classmethod
    def _apply_page_operations(cls, doc: fitz.Document, operations: List[PageOperation]):
        for op in operations:
            if op.type == "rotate":
                if op.page_number is not None and 0 <= op.page_number < len(doc):
                    angle = op.rotation_angle or 90
                    doc[op.page_number].set_rotation((doc[op.page_number].rotation + angle) % 360)
            elif op.type == "delete":
                if op.page_number is not None and 0 <= op.page_number < len(doc) and len(doc) > 1:
                    doc.delete_page(op.page_number)
            elif op.type == "duplicate":
                if op.page_number is not None and 0 <= op.page_number < len(doc):
                    doc.fullcopy_page(op.page_number, op.page_number + 1)
            elif op.type == "insert_blank":
                target_p = op.target_page if op.target_page is not None else len(doc)
                target_p = max(0, min(target_p, len(doc)))
                # Match size of existing first page or standard Letter
                width, height = (612, 792)
                if len(doc) > 0:
                    width, height = doc[0].rect.width, doc[0].rect.height
                doc.new_page(target_p, width=width, height=height)
            elif op.type == "reorder":
                if op.new_order and len(op.new_order) == len(doc):
                    doc.select(op.new_order)

    @classmethod
    def _apply_annotations(cls, doc: fitz.Document, annotations: List[OverlayAnnotation]):
        for annot in annotations:
            pno = annot.page_number
            if pno < 0 or pno >= len(doc):
                continue
            page = doc[pno]
            r = fitz.Rect(annot.rect)
            props = annot.properties
            atype = annot.type

            if atype == "highlight":
                h = page.add_highlight_annot(r)
                if "color" in props:
                    h.set_colors(stroke=tuple(props["color"]))
                h.update()
            elif atype == "underline":
                u = page.add_underline_annot(r)
                if "color" in props:
                    u.set_colors(stroke=tuple(props["color"]))
                u.update()
            elif atype == "strike":
                s = page.add_strikeout_annot(r)
                if "color" in props:
                    s.set_colors(stroke=tuple(props["color"]))
                s.update()
            elif atype in ("rect", "whiteout", "redact"):
                shape = page.new_shape()
                shape.draw_rect(r)
                if atype == "whiteout":
                    color = (1, 1, 1)
                    fill = (1, 1, 1)
                    width = 0
                elif atype == "redact":
                    color = (0, 0, 0)
                    fill = (0, 0, 0)
                    width = 0
                else:
                    color = tuple(props.get("color", [0, 0, 0]))
                    fill = tuple(props.get("fill", [1, 1, 1])) if props.get("fill") else None
                    width = props.get("stroke_width", 1.5)
                shape.finish(color=color, fill=fill, width=width)
                shape.commit()
            elif atype == "draw" and "points" in props:
                pts = props.get("points", [])
                if len(pts) > 1:
                    shape = page.new_shape()
                    for idx in range(len(pts) - 1):
                        p1 = fitz.Point(pts[idx][0], pts[idx][1])
                        p2 = fitz.Point(pts[idx + 1][0], pts[idx + 1][1])
                        shape.draw_line(p1, p2)
                    color = tuple(props.get("color", [0, 0, 0]))
                    width = props.get("stroke_width", 2.0)
                    shape.finish(color=color, width=width)
                    shape.commit()
            elif atype == "check":
                page.insert_textbox(r, "✓", fontsize=r.height * 0.9, color=(0.08, 0.64, 0.29), align=fitz.TEXT_ALIGN_CENTER)
            elif atype == "cross":
                page.insert_textbox(r, "✗", fontsize=r.height * 0.9, color=(0.86, 0.15, 0.15), align=fitz.TEXT_ALIGN_CENTER)
            elif atype == "sticky":
                comment_text = props.get("text", "")
                page.add_text_annot(fitz.Point(r.x0, r.y0), comment_text, icon="Note")
            elif atype == "circle":
                shape = page.new_shape()
                shape.draw_oval(r)
                color = tuple(props.get("color", [0, 0, 0]))
                fill = tuple(props.get("fill", [1, 1, 1])) if props.get("fill") else None
                width = props.get("stroke_width", 1.5)
                shape.finish(color=color, fill=fill, width=width)
                shape.commit()
            elif atype == "line":
                p1 = fitz.Point(r.x0, r.y0)
                p2 = fitz.Point(r.x1, r.y1)
                shape = page.new_shape()
                shape.draw_line(p1, p2)
                color = tuple(props.get("color", [0, 0, 0]))
                width = props.get("stroke_width", 1.5)
                shape.finish(color=color, width=width)
                shape.commit()
            elif atype == "arrow":
                p1 = fitz.Point(r.x0, r.y0)
                p2 = fitz.Point(r.x1, r.y1)
                shape = page.new_shape()
                shape.draw_line(p1, p2)
                color = tuple(props.get("color", [0, 0, 0]))
                width = props.get("stroke_width", 1.5)
                shape.finish(color=color, width=width)
                shape.commit()
            elif atype == "text":
                text = props.get("text", "")
                font_size = props.get("font_size", 12.0)
                color = tuple(props.get("color", [0, 0, 0]))
                page.insert_textbox(r, text, fontsize=font_size, color=color)
            elif atype in ("image", "signature") and "image_data" in props:
                raw_data = props["image_data"]
                if "base64," in raw_data:
                    raw_data = raw_data.split("base64,")[1]
                img_bytes = base64.b64decode(raw_data)
                page.insert_image(r, stream=img_bytes)
            elif atype == "watermark":
                wm_text = props.get("text", "CONFIDENTIAL")
                color = tuple(props.get("color", [0.8, 0.8, 0.8]))
                fontsize = props.get("font_size", 48.0)
                page.insert_textbox(
                    page.rect,
                    wm_text,
                    fontsize=fontsize,
                    color=color,
                    align=fitz.TEXT_ALIGN_CENTER
                )
            elif atype == "comment":
                comment_text = props.get("text", "")
                page.add_text_annot(fitz.Point(r.x0, r.y0), comment_text, icon="Comment")
