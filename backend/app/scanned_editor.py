import fitz
import cv2
import numpy as np
import base64
import io
from PIL import Image, ImageDraw, ImageFont
from typing import Dict, Any, List, Optional
from .schemas import ScannedEditItem

class ScannedDocumentEditor:
    """Modifies scanned PDF documents via OpenCV inpainting and typographic reconstruction."""

    @staticmethod
    def get_preview_comparison(
        doc: fitz.Document,
        edit: ScannedEditItem,
        dpi: int = 200
    ) -> Dict[str, Any]:
        """
        Generates a before-and-after cropped preview (base64 PNG) of the edited region
        at high zoom for visual verification.
        """
        if edit.page_number < 0 or edit.page_number >= len(doc):
            raise ValueError("Invalid page number")

        page = doc[edit.page_number]
        orig_rect = fitz.Rect(edit.bbox)

        # Expand region slightly for context preview
        context_rect = fitz.Rect(
            max(0, orig_rect.x0 - 20),
            max(0, orig_rect.y0 - 15),
            min(page.rect.width, orig_rect.x1 + 20),
            min(page.rect.height, orig_rect.y1 + 15)
        )

        zoom = dpi / 72.0
        mat = fitz.Matrix(zoom, zoom)

        # Before image
        pix_before = page.get_pixmap(matrix=mat, clip=context_rect)
        img_before = Image.frombytes("RGB", [pix_before.width, pix_before.height], pix_before.samples)

        # Produce inpainted + rendered after image
        np_img = np.array(img_before)
        # Coordinate of word bbox relative to context_rect
        rel_x0 = int((orig_rect.x0 - context_rect.x0) * zoom)
        rel_y0 = int((orig_rect.y0 - context_rect.y0) * zoom)
        rel_x1 = int((orig_rect.x1 - context_rect.x0) * zoom)
        rel_y1 = int((orig_rect.y1 - context_rect.y0) * zoom)

        # Crop word region and generate mask
        mask = np.zeros((np_img.shape[0], np_img.shape[1]), dtype=np.uint8)
        # Add slight padding to mask
        pad = 2
        m_y0 = max(0, rel_y0 - pad)
        m_y1 = min(np_img.shape[0], rel_y1 + pad)
        m_x0 = max(0, rel_x0 - pad)
        m_x1 = min(np_img.shape[1], rel_x1 + pad)
        mask[m_y0:m_y1, m_x0:m_x1] = 255

        # Inpaint with Telea
        inpainted = cv2.inpaint(np_img, mask, inpaintRadius=edit.inpaint_radius or 3, flags=cv2.INPAINT_TELEA)

        # Render replacement text onto inpainted region
        img_after = Image.fromarray(inpainted)
        draw = ImageDraw.Draw(img_after)

        # Determine font size in image pixels
        pixel_font_size = int((edit.font_size or 12.0) * zoom)
        try:
            # Try system font or standard truetype
            font = ImageFont.truetype("arial.ttf", pixel_font_size)
        except Exception:
            font = ImageFont.load_default()

        text_color = tuple(edit.text_color) if edit.text_color and len(edit.text_color) == 3 else (0, 0, 0)
        
        # Calculate baseline
        text_y = rel_y0 + int((rel_y1 - rel_y0 - pixel_font_size) / 2)
        draw.text((rel_x0, max(0, text_y)), edit.replacement_text, fill=text_color, font=font)

        # Encode both to base64
        buf_b = io.BytesIO()
        img_before.save(buf_b, format="PNG")
        b64_before = base64.b64encode(buf_b.getvalue()).decode("utf-8")

        buf_a = io.BytesIO()
        img_after.save(buf_a, format="PNG")
        b64_after = base64.b64encode(buf_a.getvalue()).decode("utf-8")

        return {
            "before_preview": f"data:image/png;base64,{b64_before}",
            "after_preview": f"data:image/png;base64,{b64_after}",
            "original_text": edit.original_text,
            "replacement_text": edit.replacement_text,
            "bbox": edit.bbox
        }

    @staticmethod
    def apply_scanned_edits(doc: fitz.Document, edits: List[ScannedEditItem], dpi: int = 300) -> Dict[str, Any]:
        """
        Applies scanned document edits by rendering the page at 300 DPI,
        inpainting the target word masks using OpenCV, rendering clean text,
        and updating the PDF page image.
        """
        results = {
            "applied_count": 0,
            "failed_count": 0,
            "details": []
        }

        # Group by page
        edits_by_page: Dict[int, List[ScannedEditItem]] = {}
        for e in edits:
            edits_by_page.setdefault(e.page_number, []).append(e)

        zoom = dpi / 72.0
        mat = fitz.Matrix(zoom, zoom)

        for page_num, page_edits in edits_by_page.items():
            if page_num < 0 or page_num >= len(doc):
                results["failed_count"] += len(page_edits)
                continue

            page = doc[page_num]
            page_rect = page.rect

            # Render full page pixmap at 300 DPI
            pix = page.get_pixmap(matrix=mat, alpha=False)
            page_img = np.frombuffer(pix.samples, dtype=np.uint8).reshape((pix.height, pix.width, pix.n))
            
            # Convert to BGR for OpenCV
            bgr = cv2.cvtColor(page_img, cv2.COLOR_RGB2BGR)
            combined_mask = np.zeros((bgr.shape[0], bgr.shape[1]), dtype=np.uint8)

            replacement_tasks = []

            for edit in page_edits:
                orig_rect = fitz.Rect(edit.bbox)
                px0 = int(orig_rect.x0 * zoom)
                py0 = int(orig_rect.y0 * zoom)
                px1 = int(orig_rect.x1 * zoom)
                py1 = int(orig_rect.y1 * zoom)

                # Boundary safety
                px0 = max(0, min(px0, bgr.shape[1] - 1))
                py0 = max(0, min(py0, bgr.shape[0] - 1))
                px1 = max(px0 + 1, min(px1, bgr.shape[1]))
                py1 = max(py0 + 1, min(py1, bgr.shape[0]))

                # Add padding to mask for clean inpainting of antialiased stroke edges
                pad = 3
                m_x0 = max(0, px0 - pad)
                m_y0 = max(0, py0 - pad)
                m_x1 = min(bgr.shape[1], px1 + pad)
                m_y1 = min(bgr.shape[0], py1 + pad)

                combined_mask[m_y0:m_y1, m_x0:m_x1] = 255
                replacement_tasks.append((edit, (px0, py0, px1, py1)))

            # Inpaint all affected word regions
            inpainted_bgr = cv2.inpaint(bgr, combined_mask, inpaintRadius=3, flags=cv2.INPAINT_TELEA)

            # Convert back to PIL Image for high-quality text drawing
            rgb_inpainted = cv2.cvtColor(inpainted_bgr, cv2.COLOR_BGR2RGB)
            pil_page = Image.fromarray(rgb_inpainted)
            draw = ImageDraw.Draw(pil_page)

            for edit, (px0, py0, px1, py1) in replacement_tasks:
                if not edit.replacement_text:
                    results["applied_count"] += 1
                    continue

                pixel_font_size = int((edit.font_size or 12.0) * zoom)
                try:
                    font = ImageFont.truetype("arial.ttf", pixel_font_size)
                except Exception:
                    font = ImageFont.load_default()

                text_color = tuple(edit.text_color) if edit.text_color and len(edit.text_color) == 3 else (0, 0, 0)
                text_y = py0 + int((py1 - py0 - pixel_font_size) / 2)
                draw.text((px0, max(0, text_y)), edit.replacement_text, fill=text_color, font=font)
                results["applied_count"] += 1

            # Convert reconstructed PIL page back to bytes
            out_buf = io.BytesIO()
            pil_page.save(out_buf, format="JPEG", quality=95)
            out_bytes = out_buf.getvalue()

            # Clean original page content and replace with reconstructed high-res image
            # Preserve page dimensions exactly
            page.clean_contents()
            page_rect = fitz.Rect(0, 0, page.rect.width, page.rect.height)
            page.insert_image(page_rect, stream=out_bytes)

        return results
