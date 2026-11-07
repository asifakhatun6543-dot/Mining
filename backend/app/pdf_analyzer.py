import fitz
import os
import uuid
from typing import Dict, Any, List, Tuple
from .schemas import DocumentInfo, PageAnalysis, TextBlock, TextLine, TextSpan

class PDFAnalyzer:
    """Analyzes PDF documents to inspect structure, text spans, fonts, and classification."""

    @staticmethod
    def analyze_document(file_path: str, original_filename: str) -> Tuple[DocumentInfo, List[PageAnalysis]]:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"PDF file not found at: {file_path}")

        try:
            doc = fitz.open(file_path)
        except Exception as e:
            raise ValueError(f"Unable to read PDF file: {str(e)}")

        is_encrypted = doc.is_encrypted
        if is_encrypted and not doc.authenticate(""):
            doc.close()
            raise ValueError("Document is password protected and cannot be opened without credentials.")

        page_count = len(doc)
        page_dimensions = []
        page_analyses: List[PageAnalysis] = []
        all_detected_fonts = set()
        scanned_page_count = 0
        mixed_page_count = 0
        total_word_count = 0
        unsupported_features = []

        # Check for XFA forms or heavy 3D/portfolio features
        if getattr(doc, "is_form_pdf", False) or doc.is_repaired:
            if doc.is_repaired:
                unsupported_features.append("PDF was damaged and automatically repaired on open.")

        for pno in range(page_count):
            page = doc[pno]
            rect = page.rect
            page_dimensions.append({"width": round(rect.width, 2), "height": round(rect.height, 2)})
            
            # Analyze text and images
            text_page = page.get_text("dict")
            image_list = page.get_images(full=True)
            has_images = len(image_list) > 0
            
            blocks: List[TextBlock] = []
            page_fonts = set()
            page_word_count = 0

            raw_blocks = text_page.get("blocks", [])
            for b in raw_blocks:
                b_type = b.get("type", 0)
                b_bbox = [round(v, 2) for v in b.get("bbox", [0, 0, 0, 0])]
                b_lines: List[TextLine] = []
                b_text_parts = []

                if b_type == 0:  # Text block
                    for line in b.get("lines", []):
                        l_bbox = [round(v, 2) for v in line.get("bbox", [0, 0, 0, 0])]
                        l_spans: List[TextSpan] = []
                        l_text_parts = []

                        for span in line.get("spans", []):
                            span_text = span.get("text", "")
                            if not span_text.strip():
                                continue

                            s_bbox = [round(v, 2) for v in span.get("bbox", [0, 0, 0, 0])]
                            s_font = span.get("font", "Helvetica")
                            s_size = round(span.get("size", 12.0), 2)
                            s_color = span.get("color", 0)
                            s_flags = span.get("flags", 0)
                            s_origin = [round(v, 2) for v in span.get("origin", [s_bbox[0], s_bbox[3]])]

                            page_fonts.add(s_font)
                            all_detected_fonts.add(s_font)
                            words_in_span = len(span_text.split())
                            page_word_count += words_in_span

                            l_spans.append(TextSpan(
                                text=span_text,
                                bbox=s_bbox,
                                font=s_font,
                                size=s_size,
                                color=s_color,
                                flags=s_flags,
                                origin=s_origin
                            ))
                            l_text_parts.append(span_text)

                        line_text = " ".join(l_text_parts)
                        if l_spans:
                            b_lines.append(TextLine(
                                bbox=l_bbox,
                                spans=l_spans,
                                text=line_text
                            ))
                            b_text_parts.append(line_text)

                block_text = "\n".join(b_text_parts)
                if b_lines or b_type == 1:
                    blocks.append(TextBlock(
                        bbox=b_bbox,
                        lines=b_lines,
                        text=block_text,
                        type=b_type
                    ))

            total_word_count += page_word_count
            has_text = page_word_count > 0

            # Classification: Scanned vs Native Text vs Mixed
            is_scanned = False
            if has_images and page_word_count < 15:
                # Page is predominantly an image with little or no extractable text
                is_scanned = True
                scanned_page_count += 1
            elif has_images and has_text:
                mixed_page_count += 1

            page_analysis = PageAnalysis(
                page_number=pno,
                width=round(rect.width, 2),
                height=round(rect.height, 2),
                rotation=page.rotation,
                has_text=has_text,
                has_images=has_images,
                is_scanned=is_scanned,
                word_count=page_word_count,
                blocks=blocks,
                fonts=sorted(list(page_fonts))
            )
            page_analyses.append(page_analysis)

        is_doc_scanned = (scanned_page_count == page_count and page_count > 0)
        is_doc_mixed = (mixed_page_count > 0 or (scanned_page_count > 0 and not is_doc_scanned))
        has_insufficient_text = (total_word_count < (page_count * 10))

        doc_info = DocumentInfo(
            document_id=str(uuid.uuid4()),
            filename=original_filename,
            page_count=page_count,
            page_dimensions=page_dimensions,
            is_encrypted=is_encrypted,
            is_scanned=is_doc_scanned,
            is_mixed=is_doc_mixed,
            metadata=dict(doc.metadata or {}),
            detected_fonts=sorted(list(all_detected_fonts)),
            has_insufficient_text=has_insufficient_text,
            unsupported_features=unsupported_features
        )

        doc.close()
        return doc_info, page_analyses
