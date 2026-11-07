/**
 * OpenPDF Studio - Main Toolbar & Drawing Engine
 */

import { State } from "./state.js";
import { HistoryManager } from "./history.js";

export class ToolbarManager {
  constructor() {
    this.currentTool = "select";
    this.currentColor = [0.0, 0.0, 0.0];
    this.strokeWidth = 2;
    this.drawingActive = false;
    this.currentDrawPath = [];
    this._bindDOM();
  }

  _bindDOM() {
    // Toolbar buttons
    document.querySelectorAll(".tool-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const tool = btn.dataset.tool;
        if (!tool) return;

        if (tool === "ocr") {
          State.emit("ocrRunRequested", State.currentPage);
          return;
        }

        if (tool === "find") {
          State.emit("toggleFind");
          return;
        }

        if (tool === "signature") {
          State.emit("openSignatureModal");
          return;
        }

        if (tool === "image") {
          document.getElementById("image-upload-input")?.click();
          return;
        }

        this.setTool(tool);
      });
    });

    // Image file input handler
    const imgInput = document.getElementById("image-upload-input");
    if (imgInput) {
      imgInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
          this.insertImageOnPage(State.currentPage, event.target.result);
        };
        reader.readAsDataURL(file);
      });
    }

    // Bind canvas drawing events on viewport
    const viewport = document.getElementById("pages-viewport");
    if (viewport) {
      viewport.addEventListener("mousedown", (e) => this._onMouseDown(e));
      window.addEventListener("mousemove", (e) => this._onMouseMove(e));
      window.addEventListener("mouseup", (e) => this._onMouseUp(e));
    }
  }

  setTool(toolName) {
    this.currentTool = toolName;
    document.querySelectorAll(".tool-btn").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.tool === toolName);
    });

    const isDrawing = ["draw", "rect", "circle", "line", "arrow", "highlight", "add-text"].includes(toolName);
    document.querySelectorAll(".interactive-overlay-layer").forEach(layer => {
      layer.classList.toggle("drawing-active", isDrawing);
    });

    State.setActiveTool(toolName);
  }

  insertImageOnPage(pageIndex, dataUrl) {
    const annot = {
      id: `img_${Date.now()}`,
      type: "image",
      page_number: pageIndex,
      rect: [100, 100, 250, 250],
      properties: { image_data: dataUrl }
    };

    State.addAnnotation(annot);
    HistoryManager.record({
      type: "annotation_add",
      item: annot,
      undo: () => {
        State.pendingAnnotations = State.pendingAnnotations.filter(a => a.id !== annot.id);
        this.renderAnnotationsOnPage(pageIndex);
      },
      redo: () => {
        State.pendingAnnotations.push(annot);
        this.renderAnnotationsOnPage(pageIndex);
      }
    });

    this.renderAnnotationsOnPage(pageIndex);
    State.emit("toast", { type: "success", message: "Image added to page." });
  }

  _onMouseDown(e) {
    if (!["draw", "rect", "circle", "line", "arrow", "add-text"].includes(this.currentTool)) return;

    const pageContainer = e.target.closest(".pdf-page-container");
    if (!pageContainer) return;

    const pageIndex = parseInt(pageContainer.dataset.pageNumber);
    const rect = pageContainer.getBoundingClientRect();
    const scale = State.zoomScale;

    const startX = (e.clientX - rect.left) / scale;
    const startY = (e.clientY - rect.top) / scale;

    if (this.currentTool === "add-text") {
      const textPrompt = prompt("Enter text to add to document:");
      if (!textPrompt) return;

      const annot = {
        id: `text_${Date.now()}`,
        type: "text",
        page_number: pageIndex,
        rect: [startX, startY, startX + 200, startY + 30],
        properties: {
          text: textPrompt,
          font_size: 12.0,
          color: [0, 0, 0]
        }
      };

      State.addAnnotation(annot);
      HistoryManager.record({
        type: "annotation_add",
        item: annot,
        undo: () => {
          State.pendingAnnotations = State.pendingAnnotations.filter(a => a.id !== annot.id);
          this.renderAnnotationsOnPage(pageIndex);
        },
        redo: () => {
          State.pendingAnnotations.push(annot);
          this.renderAnnotationsOnPage(pageIndex);
        }
      });

      this.renderAnnotationsOnPage(pageIndex);
      return;
    }

    this.drawingActive = true;
    this.currentDrawData = {
      pageIndex,
      tool: this.currentTool,
      startX,
      startY,
      points: [[startX, startY]]
    };
  }

  _onMouseMove(e) {
    if (!this.drawingActive || !this.currentDrawData) return;

    const pageContainer = document.getElementById(`page-container-${this.currentDrawData.pageIndex}`);
    if (!pageContainer) return;

    const rect = pageContainer.getBoundingClientRect();
    const scale = State.zoomScale;
    const currentX = (e.clientX - rect.left) / scale;
    const currentY = (e.clientY - rect.top) / scale;

    if (this.currentDrawData.tool === "draw") {
      this.currentDrawData.points.push([currentX, currentY]);
    } else {
      this.currentDrawData.currentX = currentX;
      this.currentDrawData.currentY = currentY;
    }
  }

  _onMouseUp(e) {
    if (!this.drawingActive || !this.currentDrawData) return;
    this.drawingActive = false;

    const d = this.currentDrawData;
    const pageIndex = d.pageIndex;
    let annot = null;

    if (d.tool === "rect") {
      const x0 = Math.min(d.startX, d.currentX || d.startX);
      const y0 = Math.min(d.startY, d.currentY || d.startY);
      const x1 = Math.max(d.startX, d.currentX || d.startX);
      const y1 = Math.max(d.startY, d.currentY || d.startY);

      if (x1 - x0 > 5 && y1 - y0 > 5) {
        annot = {
          id: `rect_${Date.now()}`,
          type: "rect",
          page_number: pageIndex,
          rect: [x0, y0, x1, y1],
          properties: { color: [0, 0, 0], stroke_width: 2 }
        };
      }
    } else if (d.tool === "circle") {
      const x0 = Math.min(d.startX, d.currentX || d.startX);
      const y0 = Math.min(d.startY, d.currentY || d.startY);
      const x1 = Math.max(d.startX, d.currentX || d.startX);
      const y1 = Math.max(d.startY, d.currentY || d.startY);

      if (x1 - x0 > 5 && y1 - y0 > 5) {
        annot = {
          id: `circ_${Date.now()}`,
          type: "circle",
          page_number: pageIndex,
          rect: [x0, y0, x1, y1],
          properties: { color: [0, 0, 0], stroke_width: 2 }
        };
      }
    } else if (d.tool === "line" || d.tool === "arrow") {
      annot = {
        id: `line_${Date.now()}`,
        type: d.tool,
        page_number: pageIndex,
        rect: [d.startX, d.startY, d.currentX || d.startX, d.currentY || d.startY],
        properties: { color: [0, 0, 0], stroke_width: 2 }
      };
    }

    if (annot) {
      State.addAnnotation(annot);
      HistoryManager.record({
        type: "annotation_add",
        item: annot,
        undo: () => {
          State.pendingAnnotations = State.pendingAnnotations.filter(a => a.id !== annot.id);
          this.renderAnnotationsOnPage(pageIndex);
        },
        redo: () => {
          State.pendingAnnotations.push(annot);
          this.renderAnnotationsOnPage(pageIndex);
        }
      });
      this.renderAnnotationsOnPage(pageIndex);
    }

    this.currentDrawData = null;
  }

  renderAnnotationsOnPage(pageIndex) {
    const overlayLayer = document.getElementById(`page-overlay-${pageIndex}`);
    if (!overlayLayer) return;

    // Remove existing rendered annotations
    overlayLayer.querySelectorAll(".custom-rendered-annot").forEach(el => el.remove());

    const scale = State.zoomScale;
    const pageAnnots = State.pendingAnnotations.filter(a => a.page_number === pageIndex);

    pageAnnots.forEach(a => {
      const [x0, y0, x1, y1] = a.rect;
      const el = document.createElement("div");
      el.className = "custom-rendered-annot";
      el.style.position = "absolute";
      el.style.left = `${Math.min(x0, x1) * scale}px`;
      el.style.top = `${Math.min(y0, y1) * scale}px`;
      el.style.width = `${Math.abs(x1 - x0) * scale}px`;
      el.style.height = `${Math.abs(y1 - y0) * scale}px`;
      el.style.zIndex = "4";

      if (a.type === "rect") {
        el.style.border = "2px solid #000";
      } else if (a.type === "circle") {
        el.style.border = "2px solid #000";
        el.style.borderRadius = "50%";
      } else if (a.type === "text") {
        el.textContent = a.properties.text;
        el.style.color = "#000";
        el.style.fontSize = `${(a.properties.font_size || 12) * scale}px`;
      } else if (a.type === "image" && a.properties.image_data) {
        const img = document.createElement("img");
        img.src = a.properties.image_data;
        img.style.width = "100%";
        img.style.height = "100%";
        img.style.objectFit = "contain";
        el.appendChild(img);
      }

      overlayLayer.appendChild(el);
    });
  }
}
