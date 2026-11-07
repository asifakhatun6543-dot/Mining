import fitz
import os
import cv2
import numpy as np
import uuid
from typing import List, Dict, Any, Tuple
from .schemas import OCRWord, OCRPageResult

class OCREngine:
    """High-resolution OCR pipeline using PyMuPDF embedded Tesseract with skew detection."""

    TESSDATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "tessdata"))

    @classmethod
    def get_installed_languages(cls) -> List[str]:
        """Returns list of installed Tesseract languages found in tessdata."""
        languages = []
        if os.path.exists(cls.TESSDATA_DIR):
            for f in os.listdir(cls.TESSDATA_DIR):
                if f.endswith(".traineddata"):
                    lang_code = f.replace(".traineddata", "")
                    languages.append(lang_code)
        
        # Also check system TESSDATA_PREFIX if set
        sys_prefix = os.environ.get("TESSDATA_PREFIX", "")
        if sys_prefix and os.path.exists(sys_prefix):
            for f in os.listdir(sys_prefix):
                if f.endswith(".traineddata"):
                    lang_code = f.replace(".traineddata", "")
                    if lang_code not in languages:
                        languages.append(lang_code)

        if not languages:
            languages = ["eng"]  # default fallback
        return sorted(languages)

    @classmethod
    def detect_skew_angle(cls, image_np: np.ndarray) -> float:
        """Calculates page skew angle using Hough line transform on edge map."""
        try:
            gray = cv2.cvtColor(image_np, cv2.COLOR_BGR2GRAY) if len(image_np.shape) == 3 else image_np
            # Threshold image
            _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
            # Find contours or lines
            edges = cv2.Canny(thresh, 50, 150, apertureSize=3)
            lines = cv2.HoughLinesP(edges, 1, np.pi / 180, 100, minLineLength=100, maxLineGap=10)
            
            if lines is None:
                return 0.0

            angles = []
            for line in lines:
                x1, y1, x2, y2 = line[0]
                if abs(x2 - x1) > 20:  # nearly horizontal
                    angle = np.degrees(np.arctan2(y2 - y1, x2 - x1))
                    if -45 < angle < 45:
                        angles.append(angle)

            if angles:
                median_angle = float(np.median(angles))
                return round(median_angle, 2)
            return 0.0
        except Exception:
            return 0.0

    @classmethod
    def perform_ocr_on_page(
        cls,
        doc: fitz.Document,
        page_number: int,
        language: str = "eng",
        dpi: int = 300
    ) -> OCRPageResult:
        if page_number < 0 or page_number >= len(doc):
            raise ValueError(f"Page number {page_number} is out of bounds (0-{len(doc)-1})")

        installed_langs = cls.get_installed_languages()
        if language not in installed_langs:
            raise ValueError(
                f"Requested OCR language '{language}' is not installed. "
                f"Available languages: {', '.join(installed_langs)}. "
                f"To add support, download {language}.traineddata into the 'tessdata' folder."
            )

        page = doc[page_number]
        os.environ["TESSDATA_PREFIX"] = cls.TESSDATA_DIR

        # Step 1: Render page at requested DPI to check skew
        zoom = dpi / 72.0
        mat = fitz.Matrix(zoom, zoom)
        pix = page.get_pixmap(matrix=mat, alpha=False)
        img_np = np.frombuffer(pix.samples, dtype=np.uint8).reshape((pix.height, pix.width, pix.n))
        
        skew_angle = cls.detect_skew_angle(img_np)

        # Step 2: Run PyMuPDF get_textpage_ocr
        try:
            tp = page.get_textpage_ocr(
                tessdata=cls.TESSDATA_DIR,
                language=language,
                dpi=dpi,
                full=True
            )
        except Exception as e:
            raise RuntimeError(f"OCR processing failed: {str(e)}")

        extracted_words = tp.extractWORDS()
        words: List[OCRWord] = []
        confidences = []
        full_text = tp.extractText()

        for idx, item in enumerate(extracted_words):
            # item is (x0, y0, x1, y1, word_text, block_no, line_no, word_no)
            wx0, wy0, wx1, wy1, wtext, b_no, l_no, w_no = item
            if not wtext.strip():
                continue

            # Confidence estimation
            conf = 95.0
            if any(c in wtext for c in "~`^|<>{}[]_"):
                conf = 65.0
            elif len(wtext) == 1 and not wtext.isalnum():
                conf = 50.0

            confidences.append(conf)
            words.append(OCRWord(
                id=f"ocr_p{page_number}_w{idx}_{uuid.uuid4().hex[:6]}",
                text=wtext,
                bbox=[round(wx0, 2), round(wy0, 2), round(wx1, 2), round(wy1, 2)],
                confidence=conf,
                line_num=l_no,
                word_num=w_no
            ))

        avg_conf = round(float(np.mean(confidences)), 1) if confidences else 0.0

        return OCRPageResult(
            page_number=page_number,
            words=words,
            full_text=full_text,
            average_confidence=avg_conf,
            detected_orientation=page.rotation,
            detected_skew_angle=skew_angle
        )
