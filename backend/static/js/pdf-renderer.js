/**
 * OpenPDF Studio - PDF.js Rendering Engine
 */

import { State } from "./state.js";
import { applyPageEditsForPreview } from "./pdf-content-stream-editor.js?v=5.2";

// Configure PDF.js worker
if (window.pdfjsLib) {
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("vendor/pdfjs/pdf.worker.js", document.baseURI).href;
}

export class PDFRenderer {
  constructor(viewportContainer, thumbnailsContainer) {
    this.viewportContainer = viewportContainer;
    this.thumbnailsContainer = thumbnailsContainer;
    this.renderedPages = new Map();
    this.renderTasks = new Map();
    this.suppressedKeysByPage = new Map();
  }

  isSpanSuppressedOnCanvas(pageIndex, bbox) {
    const set = this.suppressedKeysByPage.get(pageIndex);
    if (!set || !Array.isArray(bbox)) return false;
    return set.has(`${Math.round(bbox[0])}_${Math.round(bbox[1])}`);
  }

  async renderPageWithSuppressedEdits(pageIndex) {
    if (!State.pdfBytes || !window.PDFLib || !window.pdfjsLib) return false;
    const pageEdits = (State.pendingTextEdits || []).filter(e => e.page_number === pageIndex);
    if (pageEdits.length === 0) {
      this.suppressedKeysByPage.delete(pageIndex);
      await this.renderPage(pageIndex);
      return true;
    }
    try {
      const { StandardFonts, rgb, degrees } = window.PDFLib;
      const drawFallbackFn = async (pdfDoc, page, edit, box) => {
        if (!edit.replacement_text) return;
        const nameStr = String(edit.font_name || "Helvetica").toLowerCase();
        let stdFont = StandardFonts.Helvetica;
        if (/times|roman|serif|georgia|cambria|garamond|palatino|tinos/i.test(nameStr)) {
          stdFont = edit.is_bold && edit.is_italic ? StandardFonts.TimesRomanBoldItalic
            : edit.is_bold ? StandardFonts.TimesRomanBold
            : edit.is_italic ? StandardFonts.TimesRomanItalic : StandardFonts.TimesRoman;
        } else if (/courier|mono|consolas|jetbrains|fixed/i.test(nameStr)) {
          stdFont = edit.is_bold && edit.is_italic ? StandardFonts.CourierBoldOblique
            : edit.is_bold ? StandardFonts.CourierBold
            : edit.is_italic ? StandardFonts.CourierOblique : StandardFonts.Courier;
        } else {
          stdFont = edit.is_bold && edit.is_italic ? StandardFonts.HelveticaBoldOblique
            : edit.is_bold ? StandardFonts.HelveticaBold
            : edit.is_italic ? StandardFonts.HelveticaOblique : StandardFonts.Helvetica;
        }
        const font = await pdfDoc.embedFont(stdFont);
        const targetBox = Array.isArray(edit.target_bbox) && edit.target_bbox.length >= 4 ? edit.target_bbox : edit.bbox;
        const [x0, y0, x1] = targetBox.map(Number);
        const fontSize = Math.max(5, Number(edit.font_size) || 12);
        const baselineY = (edit.target_baseline_y !== undefined && edit.target_baseline_y !== null)
          ? (box.y + box.height - Number(edit.target_baseline_y))
          : (edit.baseline_y !== undefined && edit.baseline_y !== null)
            ? (box.y + box.height - Number(edit.baseline_y))
            : (box.y + box.height - y0 - fontSize * 0.84);
        const [r, g, b] = Array.isArray(edit.text_color) ? edit.text_color : [0, 0, 0];
        const maxWidth = Math.max(12, x1 - x0);
        const lineHeight = fontSize * 1.18;
        const rawLines = String(edit.replacement_text).split("\n");
        const wrappedLines = [];
        for (const rawLine of rawLines) {
          if (!edit.has_custom_width) {
            wrappedLines.push(rawLine);
            continue;
          }
          const words = rawLine.split(/(\s+)/);
          let cur = "";
          for (const wPart of words) {
            const test = cur + wPart;
            if (cur && font.widthOfTextAtSize(test, fontSize) > maxWidth) {
              wrappedLines.push(cur.trimEnd());
              cur = wPart.trimStart();
            } else {
              cur = test;
            }
          }
          if (cur || wrappedLines.length === 0) wrappedLines.push(cur);
        }
        for (let li = 0; li < wrappedLines.length; li++) {
          const lineText = wrappedLines[li];
          if (!lineText) continue;
          let isWinAnsi = true;
          try { font.encodeText(lineText); } catch (_) { isWinAnsi = false; }
          if (isWinAnsi) {
            const drawOpts = {
              x: box.x + x0,
              y: baselineY - li * lineHeight,
              size: fontSize,
              font,
              color: rgb(r, g, b)
            };
            if (edit.opacity !== undefined && edit.opacity < 1) drawOpts.opacity = Math.max(0.05, Number(edit.opacity));
            if (edit.angle_deg && Math.abs(edit.angle_deg) > 0.25) drawOpts.rotate = degrees(-Number(edit.angle_deg));
            page.drawText(lineText, drawOpts);
          } else {
            // Transparent-background high-DPI Unicode text fallback (zero white rectangle)
            const dpiScale = 3;
            const tc = document.createElement("canvas");
            const tctx = tc.getContext("2d");
            const wt = edit.is_bold ? "bold" : "normal";
            const st = edit.is_italic ? "italic" : "normal";
            const cssFont = `${st} ${wt} ${fontSize * dpiScale}px "${edit.font_name || "Noto Sans"}", Arial, sans-serif`;
            tctx.font = cssFont;
            const tw = Math.max(8, Math.ceil(tctx.measureText(lineText).width) + 6);
            const th = Math.max(12, Math.ceil(fontSize * dpiScale * 1.35));
            tc.width = tw;
            tc.height = th;
            tctx.clearRect(0, 0, tw, th);
            tctx.font = cssFont;
            tctx.fillStyle = `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
            tctx.textBaseline = "alphabetic";
            tctx.fillText(lineText, 2, fontSize * dpiScale * 0.92);
            const pngDataUrl = tc.toDataURL("image/png");
            const bstr = atob(pngDataUrl.split(",")[1]);
            const pngBytes = new Uint8Array(bstr.length);
            for (let k = 0; k < bstr.length; k++) pngBytes[k] = bstr.charCodeAt(k);
            const pngImg = await pdfDoc.embedPng(pngBytes);
            page.drawImage(pngImg, {
              x: box.x + x0,
              y: (baselineY - li * lineHeight) - fontSize * 0.28,
              width: tw / dpiScale,
              height: th / dpiScale,
              opacity: edit.opacity !== undefined ? Math.max(0.05, Number(edit.opacity)) : 1
            });
          }
        }
      };

      const res = await applyPageEditsForPreview(State.pdfBytes, pageIndex, pageEdits, window.PDFLib, drawFallbackFn);
      this.lastPreviewWarnings = (res && res.warnings) ? res.warnings : [];
      if (this.lastPreviewWarnings.length > 0) {
        State.emit("toast", { type: "warning", message: this.lastPreviewWarnings[0] });
      }
      if (!res || !res.bytes || res.appliedKeys.size === 0) {
        this.suppressedKeysByPage.delete(pageIndex);
        return false;
      }

      const tempDoc = await window.pdfjsLib.getDocument({ data: res.bytes }).promise;
      const pdfPage = await tempDoc.getPage(pageIndex + 1);
      const viewport = pdfPage.getViewport({ scale: State.zoomScale });
      const dpr = Math.min(3, Math.max(window.devicePixelRatio || 1, 2));

      const pageContainer = document.getElementById(`page-container-${pageIndex}`);
      const canvas = document.getElementById(`page-canvas-${pageIndex}`);
      if (!canvas) return false;
      if (pageContainer) {
        pageContainer.style.width = `${viewport.width}px`;
        pageContainer.style.height = `${viewport.height}px`;
      }
      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      const ctx = canvas.getContext("2d");
      ctx.scale(dpr, dpr);

      await pdfPage.render({ canvasContext: ctx, viewport }).promise;
      this.suppressedKeysByPage.set(pageIndex, res.appliedKeys);
      try { tempDoc.destroy(); } catch (_) {}
      return true;
    } catch (e) {
      console.warn("Unified preview render fallback:", e);
      return false;
    }
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
    const dpr = Math.min(3, Math.max(window.devicePixelRatio || 1, 2));

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

    // Keep modified PDF preview synced on zoom / re-render
    if ((State.pendingTextEdits || []).some(e => e.page_number === pageIndex) && window.PDFLib) {
      await this.renderPageWithSuppressedEdits(pageIndex);
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
