from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class DocumentInfo(BaseModel):
    document_id: str
    filename: str
    page_count: int
    page_dimensions: List[Dict[str, float]]
    is_encrypted: bool
    is_scanned: bool
    is_mixed: bool
    metadata: Dict[str, Any]
    detected_fonts: List[str]
    has_insufficient_text: bool
    unsupported_features: List[str] = Field(default_factory=list)

class TextSpan(BaseModel):
    text: str
    bbox: List[float]  # [x0, y0, x1, y1] in PDF points
    font: str
    size: float
    color: int
    flags: int
    origin: Optional[List[float]] = None

class TextLine(BaseModel):
    bbox: List[float]
    spans: List[TextSpan]
    text: str

class TextBlock(BaseModel):
    bbox: List[float]
    lines: List[TextLine]
    text: str
    type: int  # 0 for text, 1 for image

class PageAnalysis(BaseModel):
    page_number: int
    width: float
    height: float
    rotation: int
    has_text: bool
    has_images: bool
    is_scanned: bool
    word_count: int
    blocks: List[TextBlock] = Field(default_factory=list)
    fonts: List[str] = Field(default_factory=list)

class TextEditItem(BaseModel):
    page_number: int
    original_text: str
    replacement_text: str
    bbox: List[float]  # [x0, y0, x1, y1] in PDF points
    font_name: Optional[str] = "helv"
    original_font: Optional[str] = None
    font_size: Optional[float] = 11.0
    text_color: Optional[List[float]] = Field(default_factory=lambda: [0.0, 0.0, 0.0])  # RGB [0..1]
    fit_mode: Optional[str] = "fit"  # "exact", "fit", "scale_down", "expand"
    alignment: Optional[str] = "auto"  # "auto", "left", "center", "right"
    is_bold: Optional[bool] = False
    is_italic: Optional[bool] = False
    is_underline: Optional[bool] = False
    flags: Optional[int] = 0
    preserve_baseline: Optional[bool] = True

class RedactionItem(BaseModel):
    page_number: int
    bbox: List[float]  # [x0, y0, x1, y1]
    fill_color: Optional[List[float]] = Field(default_factory=lambda: [0.0, 0.0, 0.0])  # RGB [0..1]
    is_whiteout: Optional[bool] = False  # False = secure redaction; True = visual whiteout
    replacement_label: Optional[str] = None

class OCRWord(BaseModel):
    id: str
    text: str
    bbox: List[float]  # [x0, y0, x1, y1] in PDF points
    confidence: float
    line_num: int
    word_num: int

class OCRPageResult(BaseModel):
    page_number: int
    words: List[OCRWord]
    full_text: str
    average_confidence: float
    detected_orientation: int = 0
    detected_skew_angle: float = 0.0

class ScannedEditItem(BaseModel):
    page_number: int
    word_id: Optional[str] = None
    bbox: List[float]  # [x0, y0, x1, y1] in PDF points
    original_text: str
    replacement_text: str
    font_size: Optional[float] = 12.0
    font_family: Optional[str] = "helv"
    text_color: Optional[List[int]] = Field(default_factory=lambda: [0, 0, 0])  # RGB [0..255]
    inpaint_radius: Optional[int] = 3

class OverlayAnnotation(BaseModel):
    id: str
    type: str  # "text", "highlight", "underline", "strike", "rect", "circle", "line", "arrow", "image", "signature", "stamp"
    page_number: int
    rect: List[float]  # [x0, y0, x1, y1] in PDF points
    properties: Dict[str, Any] = Field(default_factory=dict)

class PageOperation(BaseModel):
    type: str  # "rotate", "delete", "reorder", "insert_blank", "duplicate"
    page_number: Optional[int] = None
    target_page: Optional[int] = None
    rotation_angle: Optional[int] = None
    new_order: Optional[List[int]] = None

class ExportRequest(BaseModel):
    document_id: str
    edits: List[TextEditItem] = Field(default_factory=list)
    redactions: List[RedactionItem] = Field(default_factory=list)
    scanned_edits: List[ScannedEditItem] = Field(default_factory=list)
    annotations: List[OverlayAnnotation] = Field(default_factory=list)
    page_operations: List[PageOperation] = Field(default_factory=list)
    flatten: Optional[bool] = False

class ValidationResult(BaseModel):
    valid: bool
    page_count: int
    errors: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    redaction_verified: bool = True
    extracted_text_preview: str = ""
