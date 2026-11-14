/**
 * OpenPDF Studio - Main Toolbar, Digital Signatures, Stamps & Drawing Engine
 * Full touch & mouse pointer support for all annotation tools
 */

import { State } from "./state.js";
import { HistoryManager } from "./history.js";

export class ToolbarManager {
  constructor() {
    this.currentTool = "select";
    this.currentColor = [0.0, 0.0, 0.0];
    this.strokeWidth = 2;
    this.drawingActive = false;
    this.currentDrawData = null;
    this.tempSvgEl = null;

    // Signature state
    this.sigActiveTab = "draw";
    this.sigInkColor = "#1e3a8a";
    this.sigSelectedFont = "'Dancing Script', cursive";
    this.sigPadDrawing = false;
    this.sigPadPoints = [];

    this._bindDOM();
    this._bindSignatureModal();
  }

  _bindDOM() {
    // Main Toolbar Buttons
    document.querySelectorAll(".tool-btn").forEach(btn => {
      const handleToolActivation = (e) => {
        // If button is disabled, ignore
        if (btn.disabled || btn.getAttribute("disabled") !== null) return;

        // Ignore buttons managed directly by app.js (pages sidebar toggle and find drawer toggle)
        if (btn.id === "btn-toggle-pages" || btn.id === "tool-find-btn") return;

        const tool = btn.dataset.tool;
        if (!tool) return;

        if (tool === "ocr") {
          State.emit("ocrRunRequested", State.currentPage);
          return;
        }

        if (tool === "signature") {
          this.openSignatureModal();
          return;
        }

        if (tool === "image") {
          const input = document.getElementById("image-upload-input");
          if (input) {
            input.value = "";
            input.click();
          }
          return;
        }

        if (tool === "watermark") {
          this.promptWatermark();
          return;
        }

        this.setTool(tool);
      };

      btn.addEventListener("click", handleToolActivation);
    });

    // Image file input handler
    const imgInput = document.getElementById("image-upload-input");
    if (imgInput) {
      imgInput.addEventListener("change", (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
          this.insertImageOnPage(State.currentPage, event.target.result);
        };
        reader.readAsDataURL(file);
      });
    }

    // Pointer-events on pages viewport (supports mouse, stylus, and mobile touch)
    const viewport = document.getElementById("pages-viewport");
    if (viewport) {
      viewport.addEventListener("pointerdown", (e) => this._onPointerDown(e));
      window.addEventListener("pointermove", (e) => this._onPointerMove(e));
      window.addEventListener("pointerup", (e) => this._onPointerUp(e));
      window.addEventListener("pointercancel", (e) => this._onPointerUp(e));
    }

    // Subscribe to tool changes and page renders
    State.subscribe("toolChanged", (tool) => {
      this.currentTool = tool;
    });

    State.subscribe("pageRendered", ({ pageIndex }) => {
      this.renderAnnotationsOnPage(pageIndex);
    });

    State.subscribe("zoomChanged", () => {
      for (let i = 0; i < State.pageCount; i++) {
        this.renderAnnotationsOnPage(i);
      }
    });

    State.subscribe("openSignatureModal", () => {
      this.openSignatureModal();
    });
  }

  setTool(toolName) {
    this.currentTool = toolName;
    document.querySelectorAll(".tool-btn").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.tool === toolName);
    });

    const isDrawingTool = [
      "draw", "rect", "circle", "line", "arrow",
      "whiteout", "redact", "highlight",
      "check", "cross", "sticky", "add-text"
    ].includes(toolName);

    document.querySelectorAll(".interactive-overlay-layer").forEach(layer => {
      layer.classList.toggle("drawing-active", isDrawingTool);
    });

    State.setActiveTool(toolName);
  }

  // ------------------------------------------------------------------------
  // Digital Signature Modal & Engine
  // ------------------------------------------------------------------------
  openSignatureModal() {
    const modal = document.getElementById("modal-signature");
    if (!modal) return;
    modal.style.display = "flex";
    this.clearSignaturePad();
    this._syncSignatureTypedPreview();
  }

  _bindSignatureModal() {
    const modal = document.getElementById("modal-signature");
    if (!modal) return;

    const closeBtn = document.getElementById("close-signature-modal");
    const cancelBtn = document.getElementById("btn-sig-cancel");
    const placeBtn = document.getElementById("btn-sig-place");
    const clearBtn = document.getElementById("btn-sig-clear");
    const drawTabBtn = document.getElementById("tab-btn-sig-draw");
    const typeTabBtn = document.getElementById("tab-btn-sig-type");
    const drawPanel = document.getElementById("sig-panel-draw");
    const typePanel = document.getElementById("sig-panel-type");
    const typeInput = document.getElementById("sig-type-input");
    const canvas = document.getElementById("sig-pad-canvas");

    const closeModal = () => {
      modal.style.display = "none";
    };

    closeBtn?.addEventListener("click", closeModal);
    cancelBtn?.addEventListener("click", closeModal);
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });

    // Tab switching
    drawTabBtn?.addEventListener("click", () => {
      this.sigActiveTab = "draw";
      drawTabBtn.style.background = "#e5322d";
      drawTabBtn.style.color = "#fff";
      drawTabBtn.style.borderColor = "#e5322d";
      typeTabBtn.style.background = "#fff";
      typeTabBtn.style.color = "#334155";
      typeTabBtn.style.borderColor = "#cbd5e1";
      if (drawPanel) drawPanel.style.display = "block";
      if (typePanel) typePanel.style.display = "none";
    });

    typeTabBtn?.addEventListener("click", () => {
      this.sigActiveTab = "type";
      typeTabBtn.style.background = "#e5322d";
      typeTabBtn.style.color = "#fff";
      typeTabBtn.style.borderColor = "#e5322d";
      drawTabBtn.style.background = "#fff";
      drawTabBtn.style.color = "#334155";
      drawTabBtn.style.borderColor = "#cbd5e1";
      if (typePanel) typePanel.style.display = "block";
      if (drawPanel) drawPanel.style.display = "none";
      this._syncSignatureTypedPreview();
    });

    // Color pickers
    document.querySelectorAll(".sig-color-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".sig-color-btn").forEach(b => {
          b.classList.remove("active");
          b.style.boxShadow = "none";
        });
        btn.classList.add("active");
        this.sigInkColor = btn.dataset.color || "#1e3a8a";
        btn.style.boxShadow = `0 0 0 2px ${this.sigInkColor}`;
        this._redrawSignaturePad();
        this._syncSignatureTypedPreview();
      });
    });

    // Type input & styles
    typeInput?.addEventListener("input", () => {
      this._syncSignatureTypedPreview();
    });

    document.querySelectorAll(".sig-style-option").forEach(opt => {
      opt.addEventListener("click", () => {
        document.querySelectorAll(".sig-style-option").forEach(o => {
          o.classList.remove("active");
          o.style.borderColor = "#cbd5e1";
          o.style.background = "#fff";
        });
        opt.classList.add("active");
        opt.style.borderColor = "#2563eb";
        opt.style.background = "#eff6ff";
        this.sigSelectedFont = opt.dataset.font || "'Dancing Script', cursive";
      });
    });

    // Clear Pad
    clearBtn?.addEventListener("click", () => {
      this.clearSignaturePad();
    });

    // Drawing Pad Pointer Events
    if (canvas) {
      canvas.addEventListener("pointerdown", (e) => {
        this.sigPadDrawing = true;
        canvas.setPointerCapture(e.pointerId);
        const rect = canvas.getBoundingClientRect();
        const pt = [e.clientX - rect.left, e.clientY - rect.top];
        this.sigPadPoints.push([pt]);
        this._redrawSignaturePad();
      });

      canvas.addEventListener("pointermove", (e) => {
        if (!this.sigPadDrawing) return;
        const rect = canvas.getBoundingClientRect();
        const pt = [e.clientX - rect.left, e.clientY - rect.top];
        const currentStroke = this.sigPadPoints[this.sigPadPoints.length - 1];
        if (currentStroke) {
          currentStroke.push(pt);
          this._redrawSignaturePad();
        }
      });

      const endSigDraw = (e) => {
        this.sigPadDrawing = false;
        try { canvas.releasePointerCapture(e.pointerId); } catch (_) {}
      };

      canvas.addEventListener("pointerup", endSigDraw);
      canvas.addEventListener("pointercancel", endSigDraw);
    }

    // Place Signature button
    placeBtn?.addEventListener("click", () => {
      let dataUrl = null;
      if (this.sigActiveTab === "draw") {
        if (this.sigPadPoints.length === 0) {
          alert("Please draw your signature first or switch to Type tab.");
          return;
        }
        dataUrl = canvas.toDataURL("image/png");
      } else {
        const text = (typeInput?.value || "").trim() || "Signature";
        const offscreen = document.createElement("canvas");
        offscreen.width = 400;
        offscreen.height = 120;
        const ctx = offscreen.getContext("2d");
        ctx.clearRect(0, 0, 400, 120);
        ctx.fillStyle = this.sigInkColor;
        ctx.font = `44px ${this.sigSelectedFont}`;
        ctx.textBaseline = "middle";
        ctx.textAlign = "center";
        ctx.fillText(text, 200, 60);
        dataUrl = offscreen.toDataURL("image/png");
      }

      this.insertSignatureOnPage(State.currentPage, dataUrl);
      closeModal();
      State.emit("toast", { type: "success", message: "Signature placed! You can move or delete it." });
    });
  }

  clearSignaturePad() {
    this.sigPadPoints = [];
    const canvas = document.getElementById("sig-pad-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  _redrawSignaturePad() {
    const canvas = document.getElementById("sig-pad-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = this.sigInkColor;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    this.sigPadPoints.forEach(stroke => {
      if (stroke.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(stroke[0][0], stroke[0][1]);
      for (let i = 1; i < stroke.length; i++) {
        ctx.lineTo(stroke[i][0], stroke[i][1]);
      }
      ctx.stroke();
    });
  }

  _syncSignatureTypedPreview() {
    const input = document.getElementById("sig-type-input");
    const text = (input?.value || "").trim() || "Your Signature";
    document.querySelectorAll(".sig-preview-text").forEach(el => {
      el.textContent = text;
      el.parentElement.style.color = this.sigInkColor;
    });
  }

  insertSignatureOnPage(pageIndex, dataUrl) {
    const targetPage = (pageIndex !== undefined && pageIndex >= 0) ? pageIndex : (State.currentPage || 0);
    const pDim = State.pageDimensions[targetPage] || { width: 612, height: 792 };
    const w = 180;
    const h = 60;
    const x0 = (pDim.width - w) / 2;
    const y0 = (pDim.height - h) / 2;

    const annot = {
      id: `sig_${Date.now()}`,
      type: "signature",
      page_number: targetPage,
      rect: [x0, y0, x0 + w, y0 + h],
      properties: { image_data: dataUrl }
    };

    State.addAnnotation(annot);
    HistoryManager.record({
      type: "annotation_add",
      item: annot,
      undo: () => {
        State.pendingAnnotations = State.pendingAnnotations.filter(a => a.id !== annot.id);
        this.renderAnnotationsOnPage(targetPage);
      },
      redo: () => {
        State.pendingAnnotations.push(annot);
        this.renderAnnotationsOnPage(targetPage);
      }
    });

    this.renderAnnotationsOnPage(targetPage);

    // Ensure target page is centered in viewport so user immediately sees their placed signature
    const pageContainer = document.getElementById(`page-container-${targetPage}`);
    if (pageContainer) {
      pageContainer.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  insertImageOnPage(pageIndex, dataUrl) {
    const pDim = State.pageDimensions[pageIndex] || { width: 612, height: 792 };
    const w = 180;
    const h = 140;
    const x0 = (pDim.width - w) / 2;
    const y0 = (pDim.height - h) / 2;

    const annot = {
      id: `img_${Date.now()}`,
      type: "image",
      page_number: pageIndex,
      rect: [x0, y0, x0 + w, y0 + h],
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

  promptWatermark() {
    const text = prompt("Enter watermark text to apply across document:", "CONFIDENTIAL");
    if (!text || !text.trim()) return;

    for (let p = 0; p < State.pageCount; p++) {
      const pDim = State.pageDimensions[p] || { width: 612, height: 792 };
      const annot = {
        id: `wm_${Date.now()}_${p}`,
        type: "watermark",
        page_number: p,
        rect: [20, 20, pDim.width - 20, pDim.height - 20],
        properties: { text: text.trim().toUpperCase() }
      };
      State.addAnnotation(annot);
      this.renderAnnotationsOnPage(p);
    }

    State.emit("toast", { type: "success", message: `Watermark "${text.trim().toUpperCase()}" applied to all pages.` });
  }

  // ------------------------------------------------------------------------
  // Pointer Events Handling (Draw, Shapes, Stamps, Whiteout, Redact, Highlight)
  // ------------------------------------------------------------------------
  _onPointerDown(e) {
    const interactiveTools = [
      "draw", "rect", "circle", "line", "arrow",
      "whiteout", "redact", "highlight",
      "check", "cross", "sticky", "add-text"
    ];

    if (!interactiveTools.includes(this.currentTool)) return;

    // If clicking an existing text span with Erase (whiteout), Redact or Highlight tool, immediately apply to span
    const hitSpan = e.target.closest(".text-span-highlight");
    if (hitSpan && (this.currentTool === "whiteout" || this.currentTool === "redact" || this.currentTool === "highlight")) {
      e.stopPropagation();
      e.preventDefault();
      const pno = parseInt(hitSpan.dataset.page || "0");
      const spanScale = State.zoomScale || 1.0;
      const left = parseFloat(hitSpan.style.left) / spanScale;
      const top = parseFloat(hitSpan.style.top) / spanScale;
      const width = parseFloat(hitSpan.style.width) / spanScale;
      const height = parseFloat(hitSpan.style.height) / spanScale;
      const annot = {
        id: `${this.currentTool}_${Date.now()}`,
        type: this.currentTool,
        page_number: pno,
        rect: [left, top, left + width, top + height],
        properties: this.currentTool === "whiteout"
          ? { fill: [1, 1, 1], color: [1, 1, 1] }
          : (this.currentTool === "redact" ? { fill: [0, 0, 0], color: [0, 0, 0] } : { color: [1, 0.9, 0], opacity: 0.45 })
      };
      this._saveAnnotation(annot, pno);
      return;
    }

    // Don't intercept if clicking an active editor box, mini toolbar, popover or editing text
    if (e.target.closest(".inplace-text-box") || 
        e.target.closest(".floating-mini-toolbar") || 
        e.target.closest("#mt-style-popover") ||
        (hitSpan && (this.currentTool === "edit-text" || this.currentTool === "select"))) return;

    const pageContainer = e.target.closest(".pdf-page-container");
    if (!pageContainer) return;

    const pageIndex = parseInt(pageContainer.dataset.pageNumber);
    const rect = pageContainer.getBoundingClientRect();
    const scale = State.zoomScale;

    const startX = (e.clientX - rect.left) / scale;
    const startY = (e.clientY - rect.top) / scale;

    // Stamp 1: Checkmark
    if (this.currentTool === "check") {
      const annot = {
        id: `check_${Date.now()}`,
        type: "check",
        page_number: pageIndex,
        rect: [startX - 12, startY - 12, startX + 16, startY + 16],
        properties: { color: "#16a34a" }
      };
      this._saveAnnotation(annot, pageIndex);
      return;
    }

    // Stamp 2: Cross mark
    if (this.currentTool === "cross") {
      const annot = {
        id: `cross_${Date.now()}`,
        type: "cross",
        page_number: pageIndex,
        rect: [startX - 12, startY - 12, startX + 16, startY + 16],
        properties: { color: "#dc2626" }
      };
      this._saveAnnotation(annot, pageIndex);
      return;
    }

    // Stamp 3: Sticky Note
    if (this.currentTool === "sticky") {
      const noteText = prompt("Enter sticky note text:");
      if (!noteText || !noteText.trim()) return;
      const annot = {
        id: `sticky_${Date.now()}`,
        type: "sticky",
        page_number: pageIndex,
        rect: [startX, startY, startX + 130, startY + 90],
        properties: { text: noteText.trim() }
      };
      this._saveAnnotation(annot, pageIndex);
      return;
    }

    // Add Text anywhere on page
    if (this.currentTool === "add-text") {
      const textPrompt = prompt("Enter text to add to document:");
      if (!textPrompt || !textPrompt.trim()) return;

      const annot = {
        id: `text_${Date.now()}`,
        type: "text",
        page_number: pageIndex,
        rect: [startX, startY, startX + 220, startY + 32],
        properties: {
          text: textPrompt.trim(),
          font_size: 13.0,
          color: [0, 0, 0]
        }
      };
      this._saveAnnotation(annot, pageIndex);
      return;
    }

    // Drag-based tools: draw, rect, whiteout, redact, highlight
    if (["draw", "rect", "circle", "line", "arrow", "whiteout", "redact", "highlight"].includes(this.currentTool)) {
      this.drawingActive = true;
      this.currentDrawData = {
        pageIndex,
        tool: this.currentTool,
        startX,
        startY,
        currentX: startX,
        currentY: startY,
        points: [[startX, startY]]
      };

      // Create live visual preview element
      this._createLivePreviewElement(pageIndex, startX, startY);
    }
  }

  _createLivePreviewElement(pageIndex, startX, startY) {
    this._removeLivePreviewElement();
    const overlayLayer = document.getElementById(`page-overlay-${pageIndex}`);
    if (!overlayLayer) return;

    const scale = State.zoomScale;

    if (this.currentTool === "draw") {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.className = "live-drawing-preview";
      svg.style.position = "absolute";
      svg.style.top = "0";
      svg.style.left = "0";
      svg.style.width = "100%";
      svg.style.height = "100%";
      svg.style.pointerEvents = "none";
      svg.style.zIndex = "6";

      const polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
      polyline.setAttribute("points", `${startX * scale},${startY * scale}`);
      polyline.setAttribute("fill", "none");
      polyline.setAttribute("stroke", "#000000");
      polyline.setAttribute("stroke-width", "2.5");
      polyline.setAttribute("stroke-linecap", "round");
      polyline.setAttribute("stroke-linejoin", "round");

      svg.appendChild(polyline);
      overlayLayer.appendChild(svg);
      this.tempSvgEl = svg;
    } else {
      const box = document.createElement("div");
      box.className = "live-shape-preview";
      box.style.position = "absolute";
      box.style.left = `${startX * scale}px`;
      box.style.top = `${startY * scale}px`;
      box.style.width = "0px";
      box.style.height = "0px";
      box.style.zIndex = "6";
      box.style.pointerEvents = "none";

      if (this.currentTool === "whiteout") {
        box.style.background = "#ffffff";
        box.style.border = "1px dashed #94a3b8";
      } else if (this.currentTool === "redact") {
        box.style.background = "#000000";
      } else if (this.currentTool === "highlight") {
        box.style.background = "rgba(250, 204, 21, 0.45)";
        box.style.border = "1px dashed #eab308";
      } else {
        box.style.border = "2px solid #000000";
      }

      overlayLayer.appendChild(box);
      this.tempSvgEl = box;
    }
  }

  _removeLivePreviewElement() {
    if (this.tempSvgEl) {
      this.tempSvgEl.remove();
      this.tempSvgEl = null;
    }
  }

  _onPointerMove(e) {
    if (!this.drawingActive || !this.currentDrawData) return;

    const pageContainer = document.getElementById(`page-container-${this.currentDrawData.pageIndex}`);
    if (!pageContainer) return;

    const rect = pageContainer.getBoundingClientRect();
    const scale = State.zoomScale;
    const currentX = (e.clientX - rect.left) / scale;
    const currentY = (e.clientY - rect.top) / scale;

    this.currentDrawData.currentX = currentX;
    this.currentDrawData.currentY = currentY;

    if (this.currentDrawData.tool === "draw") {
      this.currentDrawData.points.push([currentX, currentY]);
      if (this.tempSvgEl) {
        const polyline = this.tempSvgEl.querySelector("polyline");
        if (polyline) {
          const ptsStr = this.currentDrawData.points.map(pt => `${pt[0] * scale},${pt[1] * scale}`).join(" ");
          polyline.setAttribute("points", ptsStr);
        }
      }
    } else if (this.tempSvgEl) {
      const d = this.currentDrawData;
      const x0 = Math.min(d.startX, currentX);
      const y0 = Math.min(d.startY, currentY);
      const w = Math.abs(currentX - d.startX);
      const h = Math.abs(currentY - d.startY);

      this.tempSvgEl.style.left = `${x0 * scale}px`;
      this.tempSvgEl.style.top = `${y0 * scale}px`;
      this.tempSvgEl.style.width = `${w * scale}px`;
      this.tempSvgEl.style.height = `${h * scale}px`;
    }
  }

  _onPointerUp(e) {
    if (!this.drawingActive || !this.currentDrawData) return;
    this.drawingActive = false;

    const d = this.currentDrawData;
    const pageIndex = d.pageIndex;
    this._removeLivePreviewElement();

    let annot = null;

    if (d.tool === "draw") {
      if (d.points.length > 2) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        d.points.forEach(pt => {
          minX = Math.min(minX, pt[0]);
          minY = Math.min(minY, pt[1]);
          maxX = Math.max(maxX, pt[0]);
          maxY = Math.max(maxY, pt[1]);
        });
        annot = {
          id: `draw_${Date.now()}`,
          type: "draw",
          page_number: pageIndex,
          rect: [minX, minY, maxX, maxY],
          properties: { points: d.points, color: [0, 0, 0], stroke_width: 2.5 }
        };
      }
    } else {
      const x0 = Math.min(d.startX, d.currentX);
      const y0 = Math.min(d.startY, d.currentY);
      const x1 = Math.max(d.startX, d.currentX);
      const y1 = Math.max(d.startY, d.currentY);

      if (x1 - x0 > 4 && y1 - y0 > 4) {
        if (d.tool === "whiteout") {
          annot = {
            id: `wo_${Date.now()}`,
            type: "whiteout",
            page_number: pageIndex,
            rect: [x0, y0, x1, y1],
            properties: { fill: [1, 1, 1], color: [1, 1, 1] }
          };
        } else if (d.tool === "redact") {
          annot = {
            id: `red_${Date.now()}`,
            type: "redact",
            page_number: pageIndex,
            rect: [x0, y0, x1, y1],
            properties: { fill: [0, 0, 0], color: [0, 0, 0] }
          };
        }
      } else if (d.tool === "whiteout") {
        // Tap to whiteout sensible block (80x24 pt)
        annot = {
          id: `wo_${Date.now()}`,
          type: "whiteout",
          page_number: pageIndex,
          rect: [d.startX - 40, d.startY - 12, d.startX + 40, d.startY + 12],
          properties: { fill: [1, 1, 1], color: [1, 1, 1] }
        };
      }
            rect: [x0, y0, x1, y1],
            properties: { fill: [0, 0, 0], color: [0, 0, 0] }
          };
        } else if (d.tool === "highlight") {
          annot = {
            id: `hl_${Date.now()}`,
            type: "highlight",
            page_number: pageIndex,
            rect: [x0, y0, x1, y1],
            properties: { color: [1, 0.9, 0] }
          };
        } else if (d.tool === "rect") {
          annot = {
            id: `rect_${Date.now()}`,
            type: "rect",
            page_number: pageIndex,
            rect: [x0, y0, x1, y1],
            properties: { color: [0, 0, 0], stroke_width: 2 }
          };
        }
      }
    }

    if (annot) {
      this._saveAnnotation(annot, pageIndex);
    }

    this.currentDrawData = null;
  }

  _saveAnnotation(annot, pageIndex) {
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

  // ------------------------------------------------------------------------
  // Annotation DOM Renderer
  // ------------------------------------------------------------------------
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
      el.dataset.id = a.id;
      el.style.position = "absolute";
      el.style.left = `${Math.min(x0, x1) * scale}px`;
      el.style.top = `${Math.min(y0, y1) * scale}px`;
      el.style.width = `${Math.max(10, Math.abs(x1 - x0) * scale)}px`;
      el.style.height = `${Math.max(10, Math.abs(y1 - y0) * scale)}px`;
      el.style.zIndex = "5";
      el.style.pointerEvents = "auto";
      el.style.cursor = "pointer";

      // Delete Button (x)
      const delBtn = document.createElement("button");
      delBtn.className = "annot-delete-btn";
      delBtn.innerHTML = "&times;";
      delBtn.title = "Delete annotation";
      delBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        State.pendingAnnotations = State.pendingAnnotations.filter(item => item.id !== a.id);
        this.renderAnnotationsOnPage(pageIndex);
      });
      el.appendChild(delBtn);

      // Click to select
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        overlayLayer.querySelectorAll(".custom-rendered-annot.selected").forEach(item => item.classList.remove("selected"));
        el.classList.add("selected");
      });

      // Type-specific rendering
      if (a.type === "whiteout") {
        el.style.background = "#ffffff";
        el.style.boxShadow = "none";
      } else if (a.type === "redact") {
        el.style.background = "#000000";
      } else if (a.type === "highlight") {
        el.style.background = "rgba(250, 204, 21, 0.45)";
        el.style.mixBlendMode = "multiply";
      } else if (a.type === "rect") {
        el.style.border = "2px solid #000000";
      } else if (a.type === "circle") {
        el.style.border = "2px solid #000000";
        el.style.borderRadius = "50%";
      } else if (a.type === "text") {
        el.textContent = a.properties.text;
        el.style.color = "#000000";
        el.style.fontSize = `${(a.properties.font_size || 13) * scale}px`;
        el.style.fontWeight = "600";
        el.style.whiteSpace = "nowrap";
      } else if (a.type === "sticky") {
        el.className += " sticky-note-annot";
        el.textContent = a.properties.text;
      } else if (a.type === "check") {
        el.innerHTML = `
          <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="${a.properties.color || '#16a34a'}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        `;
        el.appendChild(delBtn);
      } else if (a.type === "cross") {
        el.innerHTML = `
          <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="${a.properties.color || '#dc2626'}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        `;
        el.appendChild(delBtn);
      } else if ((a.type === "image" || a.type === "signature") && a.properties.image_data) {
        const img = document.createElement("img");
        img.src = a.properties.image_data;
        img.style.width = "100%";
        img.style.height = "100%";
        img.style.objectFit = "contain";
        img.style.pointerEvents = "none";
        el.appendChild(img);
      } else if (a.type === "draw" && a.properties.points) {
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.style.position = "absolute";
        svg.style.left = "0";
        svg.style.top = "0";
        svg.style.width = "100%";
        svg.style.height = "100%";
        svg.style.overflow = "visible";
        svg.style.pointerEvents = "none";

        const polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
        const originX = Math.min(x0, x1);
        const originY = Math.min(y0, y1);
        const ptsStr = a.properties.points.map(pt => `${(pt[0] - originX) * scale},${(pt[1] - originY) * scale}`).join(" ");
        polyline.setAttribute("points", ptsStr);
        polyline.setAttribute("fill", "none");
        polyline.setAttribute("stroke", "#000000");
        polyline.setAttribute("stroke-width", "2.5");
        polyline.setAttribute("stroke-linecap", "round");
        polyline.setAttribute("stroke-linejoin", "round");

        svg.appendChild(polyline);
        el.appendChild(svg);
      } else if (a.type === "watermark") {
        el.className += " watermark-annot";
        el.textContent = a.properties.text || "CONFIDENTIAL";
        el.style.fontSize = `${54 * scale}px`;
      }

      overlayLayer.appendChild(el);
    });
  }
}
