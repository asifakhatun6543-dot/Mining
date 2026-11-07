/**
 * OpenPDF Studio - PDF.js Rendering Engine
 */

import { State } from "./state.js";

// Configure PDF.js worker
if (window.pdfjsLib) {
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = "/vendor/pdfjs/pdf.worker.js";
}

export class PDFRenderer {
  constructor(viewportContainer, thumbnailsContainer) {
    this.viewportContainer = viewportContainer;
    this.thumbnailsContainer = thumbnailsContainer;
    this.renderedPages = new Map();
    this.renderTasks = new Map();
  }

  async renderDocument() {
    this.viewportContainer.innerHTML = "";
    this.thumbnailsContainer.innerHTML = "";
    this.renderedPages.clear();

    if (!State.pdfDoc) return;

    const totalPages = State.pageCount;

    // Build DOM structure for all pages
    for (let pno = 0; pno < totalPages; pno++) {
      const pageWrapper = document.createElement("div");
      pageWrapper.className = "pdf-page-container";
      pageWrapper.id = `page-container-${pno}`;
      pageWrapper.dataset.pageNumber = pno;

      const canvasLayer = document.createElement("div");
      canvasLayer.className = "pdf-canvas-layer";

      const canvas = document.createElement("canvas");
      canvas.id = `page-canvas-${pno}`;
      canvasLayer.appendChild(canvas);
      pageWrapper.appendChild(canvasLayer);

      const textLayerDiv = document.createElement("div");
      textLayerDiv.className = "textLayer";
      textLayerDiv.id = `page-text-layer-${pno}`;
      pageWrapper.appendChild(textLayerDiv);

      const overlayLayer = document.createElement("div");
      overlayLayer.className = "interactive-overlay-layer";
      overlayLayer.id = `page-overlay-${pno}`;
      pageWrapper.appendChild(overlayLayer);

      this.viewportContainer.appendChild(pageWrapper);

      // Render thumbnail placeholder
      this._createThumbnailItem(pno);
    }

    // Render current active page first, then others
    await this.renderPage(State.currentPage);
    this._renderRemainingPages();
    this._renderThumbnailsProgressive();
  }

  async renderPage(pageIndex) {
    if (!State.pdfDoc || pageIndex < 0 || pageIndex >= State.pageCount) return;

    // Cancel existing render task if in progress
    if (this.renderTasks.has(pageIndex)) {
      try {
        await this.renderTasks.get(pageIndex).cancel();
      } catch (e) {}
    }

    const pdfPage = await State.pdfDoc.getPage(pageIndex + 1);
    const viewport = pdfPage.getViewport({ scale: State.zoomScale });
    const dpr = window.devicePixelRatio || 1;

    const pageContainer = document.getElementById(`page-container-${pageIndex}`);
    const canvas = document.getElementById(`page-canvas-${pageIndex}`);
    const textLayerDiv = document.getElementById(`page-text-layer-${pageIndex}`);
    const overlayLayer = document.getElementById(`page-overlay-${pageIndex}`);

    if (!pageContainer || !canvas) return;

    pageContainer.style.width = `${viewport.width}px`;
    pageContainer.style.height = `${viewport.height}px`;

    canvas.width = Math.floor(viewport.width * dpr);
    canvas.height = Math.floor(viewport.height * dpr);
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;

    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);

    const renderContext = {
      canvasContext: ctx,
      viewport: viewport
    };

    const renderTask = pdfPage.render(renderContext);
    this.renderTasks.set(pageIndex, renderTask);

    try {
      await renderTask.promise;
      this.renderedPages.set(pageIndex, true);
    } catch (err) {
      if (err.name !== "RenderingCancelledException") {
        console.error("Page render error:", err);
      }
      return;
    }

    // Render PDF.js Text Layer
    if (textLayerDiv && window.pdfjsLib) {
      textLayerDiv.innerHTML = "";
      textLayerDiv.style.width = `${viewport.width}px`;
      textLayerDiv.style.height = `${viewport.height}px`;

      const textContent = await pdfPage.getTextContent();
      window.pdfjsLib.renderTextLayer({
        textContentSource: textContent,
        container: textLayerDiv,
        viewport: viewport,
        textDivs: []
      });
    }

    State.emit("pageRendered", { pageIndex, viewport });
  }

  async _renderRemainingPages() {
    for (let pno = 0; pno < State.pageCount; pno++) {
      if (pno !== State.currentPage && !this.renderedPages.has(pno)) {
        await this.renderPage(pno);
      }
    }
  }

  _createThumbnailItem(pageIndex) {
    const thumbItem = document.createElement("div");
    thumbItem.className = `thumb-item ${pageIndex === State.currentPage ? "active" : ""}`;
    thumbItem.id = `thumb-item-${pageIndex}`;
    thumbItem.dataset.pageNumber = pageIndex;

    const wrapper = document.createElement("div");
    wrapper.className = "thumb-canvas-wrapper";

    const canvas = document.createElement("canvas");
    canvas.id = `thumb-canvas-${pageIndex}`;
    wrapper.appendChild(canvas);

    const label = document.createElement("div");
    label.className = "thumb-label";
    label.textContent = `Page ${pageIndex + 1}`;

    thumbItem.appendChild(wrapper);
    thumbItem.appendChild(label);

    thumbItem.addEventListener("click", () => {
      State.setCurrentPage(pageIndex);
      this.scrollToPage(pageIndex);
    });

    this.thumbnailsContainer.appendChild(thumbItem);
  }

  async _renderThumbnailsProgressive() {
    if (!State.pdfDoc) return;

    for (let pno = 0; pno < State.pageCount; pno++) {
      try {
        const page = await State.pdfDoc.getPage(pno + 1);
        const canvas = document.getElementById(`thumb-canvas-${pno}`);
        if (!canvas) continue;

        const thumbScale = 140 / page.getViewport({ scale: 1.0 }).width;
        const viewport = page.getViewport({ scale: thumbScale });

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const ctx = canvas.getContext("2d");
        await page.render({ canvasContext: ctx, viewport: viewport }).promise;
      } catch (e) {
        console.warn("Thumbnail render failed for page", pno, e);
      }
    }
  }

  scrollToPage(pageIndex) {
    const container = document.getElementById(`page-container-${pageIndex}`);
    if (container) {
      container.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    // Update thumbnail active states
    document.querySelectorAll(".thumb-item").forEach(item => {
      item.classList.toggle("active", parseInt(item.dataset.pageNumber) === pageIndex);
    });
  }

  updateZoom() {
    for (let pno = 0; pno < State.pageCount; pno++) {
      this.renderPage(pno);
    }
  }
}
