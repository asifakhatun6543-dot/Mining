/**
 * OpenPDF Studio - Reactive State Store
 */

export const State = {
  // Document state
  documentId: null,
  filename: "Untitled.pdf",
  pageCount: 0,
  pageDimensions: [],
  isScanned: false,
  isMixed: false,
  isEncrypted: false,
  detectedFonts: [],
  hasInsufficientText: false,
  unsupportedFeatures: [],
  pdfDoc: null,           // PDF.js PDFDocumentProxy instance
  rawFileBytes: null,

  // Navigation & Viewport
  currentPage: 0,         // 0-indexed
  zoomScale: 1.0,         // 100%
  fitMode: "custom",      // "page", "width", "custom"

  // Active Tools:
  // "select", "edit-text", "add-text", "image", "signature",
  // "highlight", "underline", "strike", "draw", "rect", "circle", "line", "arrow",
  // "whiteout", "redact", "ocr", "find"
  activeTool: "select",

  // Selected item / active edit target
  activeSpan: null,
  activeOCRWord: null,

  // Operation queues
  pendingTextEdits: [],      // TextEditItem[]
  pendingRedactions: [],     // RedactionItem[]
  pendingScannedEdits: [],   // ScannedEditItem[]
  pendingAnnotations: [],    // OverlayAnnotation[]
  pendingPageOperations: [], // PageOperation[]

  // OCR cache by page: { [pageNumber: number]: OCRPageResult }
  ocrCache: {},

  // Subscribers
  listeners: {},

  subscribe(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
    return () => {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    };
  },

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb(data));
    }
  },

  setDocument(docInfo, pdfJsDoc, rawBytes) {
    this.documentId = docInfo.document_id;
    this.filename = docInfo.filename;
    this.pageCount = docInfo.page_count;
    this.pageDimensions = docInfo.page_dimensions || [];
    this.isScanned = docInfo.is_scanned || false;
    this.isMixed = docInfo.is_mixed || false;
    this.isEncrypted = docInfo.is_encrypted || false;
    this.detectedFonts = docInfo.detected_fonts || [];
    this.hasInsufficientText = docInfo.has_insufficient_text || false;
    this.unsupportedFeatures = docInfo.unsupported_features || [];
    this.pdfDoc = pdfJsDoc;
    this.rawFileBytes = rawBytes;

    this.currentPage = 0;
    this.pendingTextEdits = [];
    this.pendingRedactions = [];
    this.pendingScannedEdits = [];
    this.pendingAnnotations = [];
    this.pendingPageOperations = [];
    this.ocrCache = {};

    this.emit("documentLoaded", docInfo);
  },

  setActiveTool(tool) {
    this.activeTool = tool;
    this.emit("toolChanged", tool);
  },

  setCurrentPage(pageIndex) {
    if (pageIndex >= 0 && pageIndex < this.pageCount) {
      this.currentPage = pageIndex;
      this.emit("pageChanged", pageIndex);
    }
  },

  setZoom(scale) {
    this.zoomScale = Math.max(0.25, Math.min(3.0, scale));
    this.emit("zoomChanged", this.zoomScale);
  },

  addTextEdit(edit) {
    const idx = this.pendingTextEdits.findIndex(e => 
      e.page_number === edit.page_number &&
      Math.abs(e.bbox[0] - edit.bbox[0]) < 1 &&
      Math.abs(e.bbox[1] - edit.bbox[1]) < 1 &&
      Math.abs(e.bbox[2] - edit.bbox[2]) < 1 &&
      Math.abs(e.bbox[3] - edit.bbox[3]) < 1
    );
    if (idx >= 0) {
      this.pendingTextEdits[idx] = edit;
    } else {
      this.pendingTextEdits.push(edit);
    }
    this.emit("editsChanged", { type: "text", count: this.pendingTextEdits.length });
  },

  removeTextEdit(edit) {
    this.pendingTextEdits = this.pendingTextEdits.filter(e => 
      e !== edit && !(
        e.page_number === edit.page_number &&
        Math.abs(e.bbox[0] - edit.bbox[0]) < 1.5 &&
        Math.abs(e.bbox[1] - edit.bbox[1]) < 1.5
      )
    );
    this.emit("editsChanged", { type: "text", count: this.pendingTextEdits.length });
  },

  updateTextEdit(oldEdit, newEdit) {
    let idx = this.pendingTextEdits.indexOf(oldEdit);
    if (idx < 0 && oldEdit) {
      idx = this.pendingTextEdits.findIndex(e =>
        e.page_number === oldEdit.page_number &&
        Math.abs(e.bbox[0] - oldEdit.bbox[0]) < 1.5 &&
        Math.abs(e.bbox[1] - oldEdit.bbox[1]) < 1.5
      );
    }
    if (idx >= 0) {
      if (newEdit) {
        this.pendingTextEdits[idx] = newEdit;
      } else {
        this.pendingTextEdits.splice(idx, 1);
      }
    } else if (newEdit) {
      this.addTextEdit(newEdit);
    }
    this.emit("editsChanged", { type: "text", count: this.pendingTextEdits.length });
  },

  addRedaction(redaction) {
    this.pendingRedactions.push(redaction);
    this.emit("editsChanged", { type: "redaction", count: this.pendingRedactions.length });
  },

  removeRedaction(redaction) {
    this.pendingRedactions = this.pendingRedactions.filter(r => r !== redaction);
    this.emit("editsChanged", { type: "redaction", count: this.pendingRedactions.length });
  },

  addScannedEdit(edit) {
    this.pendingScannedEdits.push(edit);
    this.emit("editsChanged", { type: "scanned", count: this.pendingScannedEdits.length });
  },

  addAnnotation(annotation) {
    this.pendingAnnotations.push(annotation);
    this.emit("annotationsChanged", this.pendingAnnotations);
  },

  addPageOperation(op) {
    this.pendingPageOperations.push(op);
    this.emit("pageOpsChanged", this.pendingPageOperations);
  }
};

export function getApiUrl(path) {
  const p = path.startsWith("/") ? path : "/" + path;
  if (typeof window !== "undefined" && window.location.hostname.includes("github.io")) {
    return "https://mining-lilac.vercel.app" + p;
  }
  return p;
}
