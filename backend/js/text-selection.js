/**
 * OpenPDF Studio - Text Selection & Coordinate Mapping
 */

import { State } from "./state.js";

export class TextSelectionManager {
  constructor() {
    this.extractedPages = new Map(); // pageIndex -> PageAnalysis
    this.selectedSpan = null;
    this._initEvents();
  }

  setPageAnalysis(pageIndex, analysis) {
    this.extractedPages.set(pageIndex, analysis);
  }

  clear() {
    this.extractedPages.clear();
    this.selectedSpan = null;
  }

  _initEvents() {
    State.subscribe("toolChanged", (tool) => {
      this.updateSelectionOverlays(tool);
    });

    State.subscribe("pageRendered", ({ pageIndex }) => {
      if (State.activeTool === "edit-text" || State.activeTool === "select" || State.activeTool === "redact" || State.activeTool === "whiteout") {
        this.renderTextOverlaysForPage(pageIndex);
      }
    });
  }

  updateSelectionOverlays(activeTool) {
    for (let pno = 0; pno < State.pageCount; pno++) {
      const overlayLayer = document.getElementById(`page-overlay-${pno}`);
      if (!overlayLayer) continue;

      if (activeTool === "edit-text" || activeTool === "select" || activeTool === "redact" || activeTool === "whiteout") {
        overlayLayer.classList.add("edit-text-active");
        this.renderTextOverlaysForPage(pno);
      } else {
        overlayLayer.classList.remove("edit-text-active");
        // Clear raw text highlight boxes (preserve edited text overlays so they remain visible)
        overlayLayer.querySelectorAll(".text-span-highlight:not(.edited-text-overlay)").forEach(el => el.remove());
      }
    }
  }

  renderTextOverlaysForPage(pageIndex) {
    const overlayLayer = document.getElementById(`page-overlay-${pageIndex}`);
    const analysis = this.extractedPages.get(pageIndex);
    if (!overlayLayer || !analysis) return;

    // Clear previous raw highlights (preserve edited text overlays)
    overlayLayer.querySelectorAll(".text-span-highlight:not(.edited-text-overlay)").forEach(el => el.remove());

    const scale = State.zoomScale;

    // Render interactive highlight box for each text span
    analysis.blocks.forEach(block => {
      if (block.type !== 0) return; // Only text blocks
      block.lines.forEach(line => {
        line.spans.forEach(span => {
          if (!span.text || !span.text.trim()) return;

          const [x0, y0, x1, y1] = span.bbox;
          const boxEl = document.createElement("div");
          boxEl.className = "text-span-highlight";
          boxEl.dataset.page = pageIndex;
          boxEl.dataset.text = span.text;
          boxEl.dataset.font = span.font;
          boxEl.dataset.size = span.size;

          boxEl.style.left = `${x0 * scale}px`;
          boxEl.style.top = `${y0 * scale}px`;
          boxEl.style.width = `${Math.max(12, (x1 - x0) * scale)}px`;
          boxEl.style.height = `${Math.max(10, (y1 - y0) * scale)}px`;

          span._origHighlightEl = boxEl;

          // If this span already has an active edit or replacement cover, hide the raw highlight
          const hasEdit = State.pendingTextEdits.some(e => 
            e.page_number === pageIndex &&
            Math.abs(e.bbox[0] - span.bbox[0]) < 1 &&
            Math.abs(e.bbox[1] - span.bbox[1]) < 1
          );
          if (hasEdit || span._coverEl) {
            boxEl.style.display = "none";
          }

          boxEl.title = `Click to edit: "${span.text}"`;

          let lastTrigger = 0;
          const triggerSelect = (e) => {
            const now = Date.now();
            if (now - lastTrigger < 250) return;
            lastTrigger = now;
            e.stopPropagation();
            e.preventDefault();
            this.handleSpanClick(pageIndex, span, boxEl, e);
          };

          boxEl.addEventListener("pointerup", triggerSelect);
          boxEl.addEventListener("click", triggerSelect);

          overlayLayer.appendChild(boxEl);
        });
      });
    });
  }

  handleSpanClick(pageIndex, span, element, event) {
    // Highlight element
    document.querySelectorAll(".text-span-highlight.selected").forEach(el => el.classList.remove("selected"));
    element.classList.add("selected");

    this.selectedSpan = {
      pageIndex,
      span,
      element,
      clientRect: element.getBoundingClientRect()
    };

    State.activeSpan = this.selectedSpan;
    State.emit("spanSelected", this.selectedSpan);
  }

  /**
   * Converts screen client coordinates (clientX, clientY) to PDF Page Point coordinates
   */
  screenToPdfCoords(pageIndex, clientX, clientY) {
    const pageContainer = document.getElementById(`page-container-${pageIndex}`);
    if (!pageContainer) return { x: 0, y: 0 };

    const rect = pageContainer.getBoundingClientRect();
    const relX = clientX - rect.left;
    const relY = clientY - rect.top;

    const scale = State.zoomScale;
    const pdfX = relX / scale;
    const pdfY = relY / scale;

    return {
      x: Math.round(pdfX * 100) / 100,
      y: Math.round(pdfY * 100) / 100
    };
  }
}
