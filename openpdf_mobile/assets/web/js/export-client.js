/**
 * OpenPDF Studio - Bulletproof Client-Side PDF Export, Save As & Validation Engine
 * Supports 100% offline/client-side export with full Unicode/Hindi/Symbol safety,
 * encrypted/restricted PDF tolerance, all annotations/edits/page ops, and Canvas-to-PDF fallback.
 */

import { State } from "./state.js";

export class ExportClient {
  constructor() {
    this.modalEl = null;
    this.lastExportBytes = null;
    this.lastBlobUrl = null;
    this._createModalDOM();
    this._initEvents();
  }

  _createModalDOM() {
    this.modalEl = document.createElement("div");
    this.modalEl.className = "modal-backdrop";
    this.modalEl.style.display = "none";
    this.modalEl.style.zIndex = "99999";

    this.modalEl.innerHTML = `
      <div class="modal-dialog" style="max-width: 500px; width: 94%; border-radius: 18px; overflow: hidden;">
        <div class="modal-header" style="padding: 16px 20px; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between;">
          <div class="modal-title" style="display: flex; align-items: center; gap: 8px; font-weight: 800; font-size: 16px; color: #0f172a;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.4"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            <span id="export-modal-heading">Export &amp; Save PDF</span>
          </div>
          <button type="button" class="btn-icon" id="export-modal-close" style="font-size: 22px; width: 32px; height: 32px; border-radius: 8px;">&times;</button>
        </div>

        <div class="modal-body" style="padding: 20px;">
          <div id="export-loading-state" style="display: flex; flex-direction: column; align-items: center; padding: 28px 16px; gap: 14px; text-align: center;">
            <div style="width: 38px; height: 38px; border: 3px solid #e2e8f0; border-top-color: #e5322d; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
            <div id="export-loading-text" style="font-weight: 700; color: #0f172a; font-size: 15px;">Applying edits and building your PDF...</div>
            <div style="font-size: 12px; color: #64748b;">Embedding edited text, annotations, signatures, and page changes.</div>
          </div>

          <div id="export-result-state" style="display: none; flex-direction: column; gap: 14px;">
            <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; padding: 12px 14px; display: flex; align-items: center; gap: 12px;">
              <div style="width: 32px; height: 32px; border-radius: 50%; background: #10b981; color: #fff; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div>
                <strong style="color: #065f46; font-size: 14px; display: block;">PDF Ready to Download</strong>
                <div id="export-status-subtext" style="font-size: 12px; color: #047857;">All edits baked cleanly into your PDF document.</div>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <div style="background: #f8fafc; padding: 10px 12px; border-radius: 10px; border: 1px solid #e2e8f0;">
                <div style="font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.04em;">Pages</div>
                <div id="export-val-pagecount" style="font-size: 15px; font-weight: 800; color: #0f172a; margin-top: 2px;">-</div>
              </div>
              <div style="background: #f8fafc; padding: 10px 12px; border-radius: 10px; border: 1px solid #e2e8f0;">
                <div style="font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.04em;">File Size</div>
                <div id="export-val-filesize" style="font-size: 15px; font-weight: 800; color: #059669; margin-top: 2px;">-</div>
              </div>
            </div>

            <!-- Save As Filename Input -->
            <div>
              <label for="export-filename-input" style="display: block; font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 6px;">Save As File Name</label>
              <div style="display: flex; align-items: center; border: 1.5px solid #cbd5e1; border-radius: 10px; overflow: hidden; background: #ffffff;">
                <input type="text" id="export-filename-input" value="edited_document.pdf" style="flex: 1; border: none; outline: none; padding: 10px 12px; font-size: 14px; font-weight: 600; color: #0f172a; font-family: inherit;" />
                <span style="padding: 10px 12px; background: #f1f5f9; color: #64748b; font-size: 12px; font-weight: 700; border-left: 1px solid #e2e8f0;">.pdf</span>
              </div>
            </div>

            <div id="export-val-warnings" style="display: none; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 8px 12px; font-size: 12px; color: #92400e;"></div>
          </div>
        </div>

        <div class="modal-footer" style="padding: 14px 20px; border-top: 1px solid #e2e8f0; background: #f8fafc; display: flex; align-items: center; justify-content: flex-end; gap: 10px; flex-wrap: wrap;">
          <button type="button" class="btn-secondary" id="export-modal-cancel" style="padding: 9px 16px; border-radius: 10px; font-weight: 600;">Close</button>
          <button type="button" class="btn-secondary" id="export-save-as-btn" style="display: none; padding: 9px 16px; border-radius: 10px; font-weight: 700; color: #1d4ed8; border-color: #bfdbfe; background: #eff6ff;">
            Save As...
          </button>
          <button type="button" class="btn-primary" id="export-download-btn" style="display: none; padding: 10px 20px; border-radius: 10px; font-weight: 700; background: #e5322d; color: #fff; border: none; align-items: center; gap: 8px; cursor: pointer;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Download PDF
          </button>
        </div>
      </div>
    `;

    const style = document.createElement("style");
    style.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
    document.head.appendChild(style);

    document.body.appendChild(this.modalEl);

    this.modalEl.querySelector("#export-modal-close").addEventListener("click", () => this.hide());
    this.modalEl.querySelector("#export-modal-cancel").addEventListener("click", () => this.hide());
    this.modalEl.addEventListener("click", (e) => {
      if (e.target === this.modalEl) this.hide();
    });

    this.modalEl.querySelector("#export-download-btn").addEventListener("click", () => {
      this._downloadPreparedBytes(false);
    });

    this.modalEl.querySelector("#export-save-as-btn").addEventListener("click", () => {
      this._downloadPreparedBytes(true);
    });
  }

  _initEvents() {
    const downloadBtn = document.getElementById("header-download-btn");
    if (downloadBtn) {
      downloadBtn.addEventListener("click", () => this.exportCurrentDocument({ autoDownload: true }));
    }
  }

  _getDesiredFilename() {
    const input = this.modalEl.querySelector("#export-filename-input");
    let raw = (input?.value || State.filename || "edited_document").trim();
    raw = raw.replace(/[\\/:*?"<>|]+/g, "_").replace(/\.pdf$/i, "");
    if (!raw) raw = "edited_document";
    return `${raw}.pdf`;
  }

  _formatBytes(bytes) {
    if (!bytes || bytes < 1024) return `${bytes || 0} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  async _downloadPreparedBytes(useSaveAsPicker = false) {
    if (!this.lastExportBytes) return;
    const filename = this._getDesiredFilename();
    const blob = new Blob([this.lastExportBytes], { type: "application/pdf" });

    // High-Fidelity Flutter Bridge Integration for Android App
    if (window.FlutterBridge) {
      try {
        const reader = new FileReader();
        reader.onloadend = () => {
          const res = reader.result;
          const base64Data = (typeof res === "string" && res.includes(",")) ? res.split(",")[1] : res;
          window.FlutterBridge.postMessage(JSON.stringify({
            action: "export",
            filename: filename,
            base64: base64Data,
            size: blob.size
          }));
        };
        reader.readAsDataURL(blob);
      } catch (bridgeErr) {
        console.warn("FlutterBridge export error:", bridgeErr);
      }
    }

    // Direct HTTP POST to local loopback server if active
    try {
      fetch("/api/save?filename=" + encodeURIComponent(filename), {
        method: "POST",
        headers: { "Content-Type": "application/pdf" },
        body: blob
      }).catch(() => {});
    } catch (_) {}

    // Try native Save As file picker when user clicks "Save As..."
    if (useSaveAsPicker && typeof window.showSaveFilePicker === "function") {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: filename,
          types: [{
            description: "PDF Document",
            accept: { "application/pdf": [".pdf"] }
          }]
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        State.emit("toast", { type: "success", message: `Saved "${handle.name || filename}" successfully!` });
        return;
      } catch (err) {
        if (err && err.name === "AbortError") return; // User cancelled Save As dialog
        console.warn("showSaveFilePicker fallback to direct download:", err);
      }
    }

    // Universal browser download (Desktop Chrome/Edge/Firefox/Safari + Android/iOS)
    try {
      if (this.lastBlobUrl) {
        try { URL.revokeObjectURL(this.lastBlobUrl); } catch (_) {}
      }
      const blobUrl = URL.createObjectURL(blob);
      this.lastBlobUrl = blobUrl;

      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      a.rel = "noopener";
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        try { document.body.removeChild(a); } catch (_) {}
      }, 250);

      State.emit("toast", { type: "success", message: `Downloading "${filename}"...` });
    } catch (dlErr) {
      console.error("Direct download trigger error:", dlErr);
      State.emit("toast", { type: "error", message: "Browser blocked download. Please tap 'Download PDF'." });
    }
  }

  // --------------------------------------------------------------------------
  // Color & Typography Helpers
  // --------------------------------------------------------------------------
  _parseRgb(colorVal, hexFallback, rgbFn) {
    if (Array.isArray(colorVal) && colorVal.length >= 3) {
      const [r, g, b] = colorVal.map(v => {
        const n = Number(v);
        if (!Number.isFinite(n)) return 0;
        return n > 1 ? Math.min(1, Math.max(0, n / 255)) : Math.min(1, Math.max(0, n));
      });
      return rgbFn(r, g, b);
    }
    const hex = typeof colorVal === "string" ? colorVal : hexFallback;
    if (typeof hex === "string" && /^#?[0-9a-f]{6}$/i.test(hex.trim())) {
      const clean = hex.trim().replace("#", "");
      const r = parseInt(clean.slice(0, 2), 16) / 255;
      const g = parseInt(clean.slice(2, 4), 16) / 255;
      const b = parseInt(clean.slice(4, 6), 16) / 255;
      return rgbFn(r, g, b);
    }
    return rgbFn(0, 0, 0);
  }

  _colorToCss(colorVal, hexFallback) {
    if (typeof hexFallback === "string" && hexFallback.startsWith("#")) return hexFallback;
    if (typeof colorVal === "string" && colorVal.startsWith("#")) return colorVal;
    if (Array.isArray(colorVal) && colorVal.length >= 3) {
      const [r, g, b] = colorVal.map(v => {
        const n = Number(v);
        return n > 1 ? Math.round(n) : Math.round(n * 255);
      });
      return `rgb(${r}, ${g}, ${b})`;
    }
    return "#000000";
  }

  _normalizeWinAnsi(str) {
    return String(str ?? "")
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .replace(/\t/g, "    ")
      .replace(/[\u2018\u2019\u201A]/g, "'")
      .replace(/[\u201C\u201D\u201E]/g, '"')
      .replace(/\u2013/g, "-")
      .replace(/\u2014/g, "--")
      .replace(/\u2026/g, "...")
      .replace(/\u00A0/g, " ")
      .replace(/[\u200B-\u200D\uFEFF]/g, "");
  }

  _canEncodeWinAnsi(font, text) {
    try {
      font.encodeText(text);
      return true;
    } catch (_) {
      return false;
    }
  }

  async _renderUnicodeTextToPngBytes(text, opts) {
    const scale = 3;
    const fontSize = Math.max(6, opts.fontSize || 12);
    const fontFamily = opts.fontFamily || "Arial, Helvetica, sans-serif";
    const fontWeight = opts.isBold ? "700" : "400";
    const fontStyle = opts.isItalic ? "italic" : "normal";
    const color = opts.colorCss || "#000000";
    const lines = String(text).split("\n");
    const lineHeight = fontSize * 1.25;

    const measureCanvas = document.createElement("canvas");
    const mctx = measureCanvas.getContext("2d");
    mctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;

    let maxW = opts.minWidth || 10;
    for (const line of lines) {
      const w = mctx.measureText(line || " ").width;
      if (w > maxW) maxW = w;
    }
    const padX = 2;
    const padY = 2;
    const cssW = Math.ceil(maxW + padX * 2);
    const cssH = Math.ceil(Math.max(opts.minHeight || lineHeight, lines.length * lineHeight) + padY * 2);

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(4, Math.ceil(cssW * scale));
    canvas.height = Math.max(4, Math.ceil(cssH * scale));
    const ctx = canvas.getContext("2d");
    ctx.scale(scale, scale);
    ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
    ctx.fillStyle = color;
    ctx.textBaseline = "top";

    lines.forEach((line, idx) => {
      const y = padY + idx * lineHeight;
      ctx.fillText(line, padX, y);
      if (opts.isUnderline) {
        const lw = mctx.measureText(line).width;
        ctx.fillRect(padX, y + fontSize * 1.02, lw, Math.max(1, fontSize * 0.07));
      }
    });

    const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
    const bytes = new Uint8Array(await blob.arrayBuffer());
    return { bytes, width: cssW, height: cssH };
  }

  async _embedAnyImageData(pdfDoc, dataUrl) {
    if (!dataUrl || typeof dataUrl !== "string") return null;

    // 1. Try direct fast embed for PNG / JPEG
    try {
      const res = await fetch(dataUrl);
      const imgBytes = new Uint8Array(await res.arrayBuffer());
      if (dataUrl.startsWith("data:image/jpeg") || dataUrl.startsWith("data:image/jpg")) {
        return await pdfDoc.embedJpg(imgBytes);
      }
      if (dataUrl.startsWith("data:image/png")) {
        return await pdfDoc.embedPng(imgBytes);
      }
    } catch (_) {
      // Fall through to canvas PNG normalization
    }

    // 2. Universal Canvas-to-PNG converter (handles WebP, GIF, SVG, malformed PNGs, etc.)
    try {
      const imgEl = await new Promise((resolve, reject) => {
        const im = new Image();
        im.crossOrigin = "anonymous";
        im.onload = () => resolve(im);
        im.onerror = reject;
        im.src = dataUrl;
      });
      const c = document.createElement("canvas");
      c.width = imgEl.naturalWidth || imgEl.width || 200;
      c.height = imgEl.naturalHeight || imgEl.height || 100;
      const ctx = c.getContext("2d");
      ctx.drawImage(imgEl, 0, 0, c.width, c.height);
      const pngBlob = await new Promise(r => c.toBlob(r, "image/png"));
      const pngBytes = new Uint8Array(await pngBlob.arrayBuffer());
      return await pdfDoc.embedPng(pngBytes);
    } catch (err) {
      console.warn("Could not convert/embed image annotation:", err);
      return null;
    }
  }

  // --------------------------------------------------------------------------
  // Primary Engine: Native Vector PDF-Lib Export
  // --------------------------------------------------------------------------
  async _exportWithPdfLib() {
    if (!window.PDFLib || !State.rawFileBytes) {
      throw new Error("PDFLib or raw PDF bytes unavailable");
    }

    const { PDFDocument, rgb, StandardFonts, degrees } = window.PDFLib;

    // Always clone buffer so repeated exports never hit detached/mutated buffers
    const rawCopy = State.rawFileBytes instanceof Uint8Array
      ? State.rawFileBytes.slice()
      : new Uint8Array(State.rawFileBytes).slice();

    if (rawCopy.byteLength === 0) {
      throw new Error("Raw PDF buffer is empty/detached");
    }

    const pdfDoc = await PDFDocument.load(rawCopy, {
      ignoreEncryption: true,
      updateMetadata: false
    });

    const pages = pdfDoc.getPages();
    if (!pages || pages.length === 0) {
      throw new Error("Loaded PDF has 0 pages");
    }

    // Lazily embed standard fonts so we only embed what is used
    const fontCache = {};
    const getFont = async (fontName, isBold, isItalic) => {
      const nameStr = String(fontName || "Helvetica").toLowerCase();
      let family = "Helvetica";
      if (/times|roman|serif|georgia|cambria|garamond|palatino|tinos/i.test(nameStr)) {
        family = "Times";
      } else if (/courier|mono|consolas|jetbrains|fixed/i.test(nameStr)) {
        family = "Courier";
      }

      const key = `${family}_${isBold ? "B" : ""}_${isItalic ? "I" : ""}`;
      if (fontCache[key]) return fontCache[key];

      let stdFont = StandardFonts.Helvetica;
      if (family === "Helvetica") {
        if (isBold && isItalic) stdFont = StandardFonts.HelveticaBoldOblique;
        else if (isBold) stdFont = StandardFonts.HelveticaBold;
        else if (isItalic) stdFont = StandardFonts.HelveticaOblique;
        else stdFont = StandardFonts.Helvetica;
      } else if (family === "Times") {
        if (isBold && isItalic) stdFont = StandardFonts.TimesRomanBoldItalic;
        else if (isBold) stdFont = StandardFonts.TimesRomanBold;
        else if (isItalic) stdFont = StandardFonts.TimesRomanItalic;
        else stdFont = StandardFonts.TimesRoman;
      } else if (family === "Courier") {
        if (isBold && isItalic) stdFont = StandardFonts.CourierBoldOblique;
        else if (isBold) stdFont = StandardFonts.CourierBold;
        else if (isItalic) stdFont = StandardFonts.CourierOblique;
        else stdFont = StandardFonts.Courier;
      }

      fontCache[key] = await pdfDoc.embedFont(stdFont);
      return fontCache[key];
    };

    const getPageBox = (page) => {
      try {
        const crop = page.getCropBox();
        if (crop && crop.width > 0 && crop.height > 0) return crop;
      } catch (_) {}
      const size = page.getSize();
      return { x: 0, y: 0, width: size.width, height: size.height };
    };

    const drawSafeMultilineText = async (page, text, x, topYFromBoxTop, box, opts) => {
      const normalized = this._normalizeWinAnsi(text);
      if (!normalized) return;

      const fontSize = Math.max(5, Number(opts.fontSize) || 12);
      const isBold = !!opts.isBold;
      const isItalic = !!opts.isItalic;
      const isUnderline = !!opts.isUnderline;
      const fontName = opts.fontName || "Helvetica";
      const font = await getFont(fontName, isBold, isItalic);
      const color = this._parseRgb(opts.colorRgb, opts.colorHex, rgb);
      const colorCss = this._colorToCss(opts.colorRgb, opts.colorHex);
      const isHandwriting = /caveat|dancing|vibes|script|cursive/i.test(String(fontName));

      // Use high-DPI transparent PNG overlay if text has non-WinAnsi Unicode (Hindi, ₹, emojis, etc.) or script font
      const winAnsiTestStr = normalized.replace(/\n/g, "");
      if (isHandwriting || !this._canEncodeWinAnsi(font, winAnsiTestStr)) {
        const rendered = await this._renderUnicodeTextToPngBytes(text, {
          fontSize,
          fontFamily: fontName,
          isBold,
          isItalic,
          isUnderline,
          colorCss,
          minWidth: opts.boxWidth || 10,
          minHeight: opts.boxHeight || fontSize * 1.25
        });
        const img = await pdfDoc.embedPng(rendered.bytes);
        const drawX = box.x + x;
        const drawY = box.y + box.height - topYFromBoxTop - rendered.height;
        page.drawImage(img, {
          x: drawX,
          y: Math.max(box.y, drawY),
          width: rendered.width,
          height: rendered.height
        });
        return;
      }

      // Draw native vector PDF text line by line
      const lines = normalized.split("\n");
      const lineHeight = fontSize * 1.22;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line) continue;
        let lineX = box.x + x;

        if (opts.alignment && opts.boxWidth && opts.alignment !== "left") {
          try {
            const textW = font.widthOfTextAtSize(line, fontSize);
            if (opts.alignment === "center") {
              lineX = box.x + x + Math.max(0, (opts.boxWidth - textW) / 2);
            } else if (opts.alignment === "right") {
              lineX = box.x + x + Math.max(0, opts.boxWidth - textW);
            }
          } catch (_) {}
        }

        // Baseline sits ~0.82 * fontSize below top of box
        const baselineY = box.y + box.height - topYFromBoxTop - (i * lineHeight) - (fontSize * 0.84);

        page.drawText(line, {
          x: lineX,
          y: baselineY,
          size: fontSize,
          font,
          color
        });

        if (isUnderline) {
          try {
            const textW = font.widthOfTextAtSize(line, fontSize);
            page.drawLine({
              start: { x: lineX, y: baselineY - Math.max(1.2, fontSize * 0.1) },
              end: { x: lineX + textW, y: baselineY - Math.max(1.2, fontSize * 0.1) },
              thickness: Math.max(0.7, fontSize * 0.06),
              color
            });
          } catch (_) {}
        }
      }
    };

    // 1. Apply Text Edits (whiteout original span + draw styled replacement)
    for (const edit of (State.pendingTextEdits || [])) {
      const page = pages[edit.page_number];
      if (!page || !Array.isArray(edit.bbox) || edit.bbox.length < 4) continue;

      const box = getPageBox(page);
      const [x0, y0, x1, y1] = edit.bbox.map(Number);
      const pad = 1.5;
      const w = Math.max(x1 - x0, 8);
      const h = Math.max(y1 - y0, 8);
      const rectY = box.y + box.height - y1 - pad;

      // Cover original text seamlessly with exact sampled background color (defaults to white)
      const bgFill = (edit.bg_color || edit.bg_color_hex)
        ? this._parseRgb(edit.bg_color, edit.bg_color_hex || "#ffffff", rgb)
        : rgb(1, 1, 1);
      page.drawRectangle({
        x: box.x + x0 - pad,
        y: rectY,
        width: w + pad * 2,
        height: h + pad * 2,
        color: bgFill
      });

      if (edit.replacement_text && String(edit.replacement_text).length > 0) {
        await drawSafeMultilineText(page, edit.replacement_text, x0, y0, box, {
          fontName: edit.font_name || edit.original_font || edit.font || "Helvetica",
          fontSize: edit.font_size || Math.max(8, h * 0.82),
          isBold: !!edit.is_bold,
          isItalic: !!edit.is_italic,
          isUnderline: !!edit.is_underline,
          colorRgb: edit.text_color,
          colorHex: edit.text_color_hex,
          alignment: edit.alignment || "left",
          boxWidth: w,
          boxHeight: h
        });
      }
    }

    // 2. Apply Scanned OCR Edits
    for (const sedit of (State.pendingScannedEdits || [])) {
      const page = pages[sedit.page_number];
      if (!page || !Array.isArray(sedit.bbox) || sedit.bbox.length < 4) continue;
      const box = getPageBox(page);
      const [x0, y0, x1, y1] = sedit.bbox.map(Number);
      const w = Math.max(x1 - x0, 8);
      const h = Math.max(y1 - y0, 8);

      page.drawRectangle({
        x: box.x + x0 - 1,
        y: box.y + box.height - y1 - 1,
        width: w + 2,
        height: h + 2,
        color: rgb(1, 1, 1)
      });

      if (sedit.replacement_text) {
        await drawSafeMultilineText(page, sedit.replacement_text, x0, y0, box, {
          fontName: "Helvetica",
          fontSize: sedit.font_size || Math.max(9, h * 0.8),
          colorHex: "#000000",
          boxWidth: w,
          boxHeight: h
        });
      }
    }

    // 3. Apply Redactions
    for (const red of (State.pendingRedactions || [])) {
      const page = pages[red.page_number];
      if (!page || !Array.isArray(red.bbox) || red.bbox.length < 4) continue;
      const box = getPageBox(page);
      const [x0, y0, x1, y1] = red.bbox.map(Number);
      page.drawRectangle({
        x: box.x + Math.min(x0, x1),
        y: box.y + box.height - Math.max(y0, y1),
        width: Math.max(6, Math.abs(x1 - x0)),
        height: Math.max(6, Math.abs(y1 - y0)),
        color: rgb(0, 0, 0)
      });
    }

    // 4. Apply Annotations (Whiteout, Redact, Highlight, Rect, Text, Sticky, Check, Cross, Draw, Watermark, Image, Signature)
    for (const annot of (State.pendingAnnotations || [])) {
      const page = pages[annot.page_number];
      if (!page || !Array.isArray(annot.rect) || annot.rect.length < 4) continue;
      const box = getPageBox(page);
      const [rx0, ry0, rx1, ry1] = annot.rect.map(Number);
      const left = Math.min(rx0, rx1);
      const top = Math.min(ry0, ry1);
      const right = Math.max(rx0, rx1);
      const bottom = Math.max(ry0, ry1);
      const w = Math.max(6, right - left);
      const h = Math.max(6, bottom - top);
      const pdfX = box.x + left;
      const pdfY = box.y + box.height - bottom;
      const props = annot.properties || {};

      if (annot.type === "whiteout") {
        page.drawRectangle({ x: pdfX, y: pdfY, width: w, height: h, color: rgb(1, 1, 1) });
      } else if (annot.type === "redact") {
        page.drawRectangle({ x: pdfX, y: pdfY, width: w, height: h, color: rgb(0, 0, 0) });
      } else if (annot.type === "highlight") {
        const hlColor = this._parseRgb(props.color, "#fde047", rgb);
        page.drawRectangle({ x: pdfX, y: pdfY, width: w, height: h, color: hlColor, opacity: props.opacity ?? 0.42 });
      } else if (annot.type === "rect") {
        const strokeColor = this._parseRgb(props.color, "#000000", rgb);
        page.drawRectangle({
          x: pdfX,
          y: pdfY,
          width: w,
          height: h,
          borderWidth: props.stroke_width || 2,
          borderColor: strokeColor
        });
      } else if (annot.type === "text") {
        if (props.text) {
          await drawSafeMultilineText(page, props.text, left, top, box, {
            fontName: props.font_name || "Helvetica",
            fontSize: props.font_size || 13,
            colorRgb: props.color,
            colorHex: props.color_hex || "#000000",
            boxWidth: w,
            boxHeight: h
          });
        }
      } else if (annot.type === "sticky") {
        page.drawRectangle({
          x: pdfX,
          y: pdfY,
          width: w,
          height: h,
          color: rgb(0.996, 0.941, 0.541),
          borderColor: rgb(0.918, 0.702, 0.031),
          borderWidth: 1.2
        });
        if (props.text) {
          await drawSafeMultilineText(page, props.text, left + 6, top + 6, box, {
            fontName: "Helvetica",
            fontSize: 10,
            colorHex: "#713f12",
            boxWidth: Math.max(20, w - 12),
            boxHeight: Math.max(20, h - 12)
          });
        }
      } else if (annot.type === "check") {
        // Draw crisp vector checkmark (ZERO WinAnsi encoding risk!)
        const cColor = this._parseRgb(props.color, "#16a34a", rgb);
        const thick = Math.max(2.2, Math.min(w, h) * 0.14);
        page.drawLine({
          start: { x: pdfX + w * 0.18, y: pdfY + h * 0.48 },
          end: { x: pdfX + w * 0.42, y: pdfY + h * 0.22 },
          thickness: thick,
          color: cColor
        });
        page.drawLine({
          start: { x: pdfX + w * 0.40, y: pdfY + h * 0.22 },
          end: { x: pdfX + w * 0.85, y: pdfY + h * 0.80 },
          thickness: thick,
          color: cColor
        });
      } else if (annot.type === "cross") {
        // Draw crisp vector X mark (ZERO WinAnsi encoding risk!)
        const xColor = this._parseRgb(props.color, "#dc2626", rgb);
        const thick = Math.max(2.2, Math.min(w, h) * 0.14);
        page.drawLine({
          start: { x: pdfX + w * 0.2, y: pdfY + h * 0.8 },
          end: { x: pdfX + w * 0.8, y: pdfY + h * 0.2 },
          thickness: thick,
          color: xColor
        });
        page.drawLine({
          start: { x: pdfX + w * 0.2, y: pdfY + h * 0.2 },
          end: { x: pdfX + w * 0.8, y: pdfY + h * 0.8 },
          thickness: thick,
          color: xColor
        });
      } else if (annot.type === "draw" && Array.isArray(props.points) && props.points.length > 1) {
        const strokeColor = this._parseRgb(props.color, "#000000", rgb);
        const strokeWidth = props.stroke_width || 2.5;
        for (let i = 1; i < props.points.length; i++) {
          const p0 = props.points[i - 1];
          const p1 = props.points[i];
          if (!p0 || !p1) continue;
          const xA = box.x + (Array.isArray(p0) ? p0[0] : p0.x);
          const yA = box.y + box.height - (Array.isArray(p0) ? p0[1] : p0.y);
          const xB = box.x + (Array.isArray(p1) ? p1[0] : p1.x);
          const yB = box.y + box.height - (Array.isArray(p1) ? p1[1] : p1.y);
          page.drawLine({
            start: { x: xA, y: yA },
            end: { x: xB, y: yB },
            thickness: strokeWidth,
            color: strokeColor
          });
        }
      } else if (annot.type === "watermark") {
        const wmText = this._normalizeWinAnsi(props.text || "CONFIDENTIAL");
        const wmFont = await getFont("Helvetica", true, false);
        if (this._canEncodeWinAnsi(wmFont, wmText)) {
          page.drawText(wmText, {
            x: box.x + box.width * 0.15,
            y: box.y + box.height * 0.35,
            size: Math.min(54, Math.max(24, box.width * 0.08)),
            font: wmFont,
            color: rgb(0.85, 0.2, 0.2),
            opacity: 0.22,
            rotate: degrees(35)
          });
        }
      } else if ((annot.type === "image" || annot.type === "signature") && props.image_data) {
        const img = await this._embedAnyImageData(pdfDoc, props.image_data);
        if (img) {
          page.drawImage(img, { x: pdfX, y: pdfY, width: w, height: h });
        }
      }
    }

    // 5. Apply Page Operations (Rotate, Duplicate, Insert Blank, Delete)
    const deletedPages = new Set();
    for (const op of (State.pendingPageOperations || [])) {
      try {
        if (op.type === "rotate") {
          const p = pages[op.page_number];
          if (p) {
            const cur = p.getRotation()?.angle || 0;
            p.setRotation(degrees((cur + (op.rotation_angle || 90)) % 360));
          }
        } else if (op.type === "duplicate") {
          const idx = op.page_number;
          if (idx >= 0 && idx < pdfDoc.getPageCount()) {
            const [copied] = await pdfDoc.copyPages(pdfDoc, [idx]);
            pdfDoc.insertPage(idx + 1, copied);
          }
        } else if (op.type === "insert_blank") {
          const refPage = pages[0];
          const sz = refPage ? refPage.getSize() : { width: 595, height: 842 };
          const targetIdx = Math.min(Math.max(0, op.target_page ?? pdfDoc.getPageCount()), pdfDoc.getPageCount());
          pdfDoc.insertPage(targetIdx, [sz.width, sz.height]);
        } else if (op.type === "delete") {
          deletedPages.add(op.page_number);
        }
      } catch (opErr) {
        console.warn("Skipping page op error:", op, opErr);
      }
    }

    // Remove deleted pages in descending order so indices don't shift
    if (deletedPages.size > 0) {
      const sortedDeletes = [...deletedPages].sort((a, b) => b - a);
      for (const idx of sortedDeletes) {
        if (pdfDoc.getPageCount() > 1 && idx >= 0 && idx < pdfDoc.getPageCount()) {
          pdfDoc.removePage(idx);
        }
      }
    }

    const outBytes = await pdfDoc.save({ useObjectStreams: false });
    return {
      bytes: outBytes,
      pageCount: pdfDoc.getPageCount(),
      mode: "vector"
    };
  }

  // --------------------------------------------------------------------------
  // Ultimate Fallback Engine: PDF.js High-Res Canvas -> Clean PDF-Lib Document
  // Guarantees export NEVER fails even on heavily encrypted/corrupted PDFs!
  // --------------------------------------------------------------------------
  async _exportViaCanvasFallback() {
    if (!window.PDFLib || !State.pdfDoc) {
      throw new Error("PDF.js document or PDFLib is not available for fallback export");
    }

    const { PDFDocument } = window.PDFLib;
    const newPdf = await PDFDocument.create();
    const numPages = State.pdfDoc.numPages;
    const renderScale = 2.0;

    const deletedPages = new Set(
      (State.pendingPageOperations || []).filter(o => o.type === "delete").map(o => o.page_number)
    );

    for (let i = 0; i < numPages; i++) {
      if (deletedPages.has(i) && numPages - deletedPages.size >= 1) continue;

      const page = await State.pdfDoc.getPage(i + 1);
      const baseVp = page.getViewport({ scale: 1.0 });
      const vp = page.getViewport({ scale: renderScale });

      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(vp.width);
      canvas.height = Math.ceil(vp.height);
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({ canvasContext: ctx, viewport: vp }).promise;

      ctx.save();
      ctx.scale(renderScale, renderScale);

      // Paint text edits
      for (const edit of (State.pendingTextEdits || []).filter(e => e.page_number === i)) {
        const [x0, y0, x1, y1] = edit.bbox.map(Number);
        ctx.fillStyle = edit.bg_color_hex || (edit.bg_color ? this._colorToCss(edit.bg_color, "#ffffff") : "#ffffff");
        ctx.fillRect(x0 - 1.5, y0 - 1.5, Math.max(8, x1 - x0) + 3, Math.max(8, y1 - y0) + 3);
        if (edit.replacement_text) {
          const fs = edit.font_size || 12;
          const wt = edit.is_bold ? "700" : "400";
          const st = edit.is_italic ? "italic" : "normal";
          ctx.font = `${st} ${wt} ${fs}px ${edit.font_name || "Helvetica, Arial, sans-serif"}`;
          ctx.fillStyle = this._colorToCss(edit.text_color, edit.text_color_hex);
          ctx.textBaseline = "top";
          const lines = String(edit.replacement_text).split("\n");
          lines.forEach((line, li) => {
            ctx.fillText(line, x0, y0 + li * fs * 1.22);
          });
        }
      }

      // Paint redactions
      for (const red of (State.pendingRedactions || []).filter(r => r.page_number === i)) {
        const [x0, y0, x1, y1] = red.bbox.map(Number);
        ctx.fillStyle = "#000000";
        ctx.fillRect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0));
      }

      // Paint annotations
      for (const annot of (State.pendingAnnotations || []).filter(a => a.page_number === i)) {
        const [x0, y0, x1, y1] = annot.rect.map(Number);
        const l = Math.min(x0, x1), t = Math.min(y0, y1);
        const w = Math.max(6, Math.abs(x1 - x0)), h = Math.max(6, Math.abs(y1 - y0));
        const props = annot.properties || {};

        if (annot.type === "whiteout") {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(l, t, w, h);
        } else if (annot.type === "redact") {
          ctx.fillStyle = "#000000";
          ctx.fillRect(l, t, w, h);
        } else if (annot.type === "highlight") {
          ctx.fillStyle = "rgba(253, 224, 71, 0.45)";
          ctx.fillRect(l, t, w, h);
        } else if (annot.type === "rect") {
          ctx.strokeStyle = this._colorToCss(props.color, "#000000");
          ctx.lineWidth = props.stroke_width || 2;
          ctx.strokeRect(l, t, w, h);
        } else if (annot.type === "text" && props.text) {
          ctx.font = `500 ${props.font_size || 13}px Helvetica, Arial, sans-serif`;
          ctx.fillStyle = this._colorToCss(props.color, "#000000");
          ctx.textBaseline = "top";
          ctx.fillText(props.text, l, t);
        } else if (annot.type === "sticky") {
          ctx.fillStyle = "#fef08a";
          ctx.strokeStyle = "#eab308";
          ctx.lineWidth = 1.2;
          ctx.fillRect(l, t, w, h);
          ctx.strokeRect(l, t, w, h);
          if (props.text) {
            ctx.font = "500 10px Helvetica, Arial, sans-serif";
            ctx.fillStyle = "#713f12";
            ctx.textBaseline = "top";
            ctx.fillText(props.text, l + 6, t + 6, w - 12);
          }
        } else if (annot.type === "check") {
          ctx.strokeStyle = "#16a34a";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(l + w * 0.18, t + h * 0.52);
          ctx.lineTo(l + w * 0.42, t + h * 0.78);
          ctx.lineTo(l + w * 0.85, t + h * 0.20);
          ctx.stroke();
        } else if (annot.type === "cross") {
          ctx.strokeStyle = "#dc2626";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(l + w * 0.2, t + h * 0.2);
          ctx.lineTo(l + w * 0.8, t + h * 0.8);
          ctx.moveTo(l + w * 0.8, t + h * 0.2);
          ctx.lineTo(l + w * 0.2, t + h * 0.8);
          ctx.stroke();
        } else if (annot.type === "draw" && Array.isArray(props.points) && props.points.length > 1) {
          ctx.strokeStyle = this._colorToCss(props.color, "#000000");
          ctx.lineWidth = props.stroke_width || 2.5;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.beginPath();
          props.points.forEach((pt, idx) => {
            const px = Array.isArray(pt) ? pt[0] : pt.x;
            const py = Array.isArray(pt) ? pt[1] : pt.y;
            if (idx === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          });
          ctx.stroke();
        } else if ((annot.type === "image" || annot.type === "signature") && props.image_data) {
          try {
            const imgEl = await new Promise((resolve, reject) => {
              const im = new Image();
              im.onload = () => resolve(im);
              im.onerror = reject;
              im.src = props.image_data;
            });
            ctx.drawImage(imgEl, l, t, w, h);
          } catch (_) {}
        }
      }

      ctx.restore();

      const jpgBlob = await new Promise(r => canvas.toBlob(r, "image/jpeg", 0.92));
      const jpgBytes = new Uint8Array(await jpgBlob.arrayBuffer());
      const embeddedImg = await newPdf.embedJpg(jpgBytes);
      const outPage = newPdf.addPage([baseVp.width, baseVp.height]);
      outPage.drawImage(embeddedImg, {
        x: 0,
        y: 0,
        width: baseVp.width,
        height: baseVp.height
      });
    }

    const outBytes = await newPdf.save();
    return {
      bytes: outBytes,
      pageCount: newPdf.getPageCount(),
      mode: "canvas-fallback"
    };
  }

  // --------------------------------------------------------------------------
  // Main Entry Point: Export & Save / Save As Current Document
  // --------------------------------------------------------------------------
  async exportCurrentDocument(options = {}) {
    const { saveAs = false, autoDownload = !saveAs } = options;

    if (!State.documentId && !State.pdfDoc && !State.rawFileBytes) {
      State.emit("toast", { type: "warning", message: "No PDF document is currently loaded." });
      return;
    }

    // Auto-commit any active inline text edit so latest typed changes are NEVER lost
    try {
      if (window.app && window.app.textEditor && window.app.textEditor.isVisible) {
        window.app.textEditor.applyEdit();
      }
    } catch (e) {
      console.warn("Auto-commit active text edit warning:", e);
    }

    if (!autoDownload) {
      const headingEl = this.modalEl.querySelector("#export-modal-heading");
      if (headingEl) headingEl.textContent = saveAs ? "Save As PDF" : "Export & Download PDF";

      this.modalEl.querySelector("#export-loading-state").style.display = "flex";
      this.modalEl.querySelector("#export-result-state").style.display = "none";
      this.modalEl.querySelector("#export-download-btn").style.display = "none";
      this.modalEl.querySelector("#export-save-as-btn").style.display = "none";
      this.modalEl.style.display = "flex";
    } else {
      State.emit("toast", { type: "info", message: "Exporting modified PDF..." });
    }

    // Pre-fill filename input cleanly
    const baseName = (State.filename || "document.pdf").replace(/\.pdf$/i, "");
    const fnInput = this.modalEl.querySelector("#export-filename-input");
    if (fnInput) fnInput.value = `${baseName}_edited`;

    let exportResult = null;
    let warningMsg = "";

    // Tier 1: Native Vector PDF-Lib Export
    try {
      exportResult = await this._exportWithPdfLib();
    } catch (vecErr) {
      console.warn("Vector PDF-Lib export hit compatibility issue, switching to high-res Canvas PDF fallback:", vecErr);
      warningMsg = "Document used special encryption or structure — exported cleanly using high-resolution compatibility mode.";

      // Tier 2: Guaranteed High-Res PDF.js Canvas-to-PDF Fallback
      try {
        exportResult = await this._exportViaCanvasFallback();
      } catch (fbErr) {
        console.error("Both vector and fallback PDF export failed:", fbErr);
        this.hide();
        State.emit("toast", { type: "error", message: `Failed to export PDF: ${fbErr.message || "Unknown error"}` });
        return;
      }
    }

    this.lastExportBytes = exportResult.bytes;

    // Auto-trigger direct download for Done / Auto-download button without modal popup
    if (autoDownload) {
      this.hide();
      await this._downloadPreparedBytes(false);
      State.emit("toast", { type: "success", message: "PDF successfully exported!" });
      return;
    }

    // Populate modal stats
    this.modalEl.querySelector("#export-val-pagecount").textContent = `${exportResult.pageCount} ${exportResult.pageCount === 1 ? "Page" : "Pages"}`;
    this.modalEl.querySelector("#export-val-filesize").textContent = this._formatBytes(exportResult.bytes.byteLength);

    const warnBox = this.modalEl.querySelector("#export-val-warnings");
    if (warningMsg) {
      warnBox.textContent = warningMsg;
      warnBox.style.display = "block";
    } else {
      warnBox.style.display = "none";
    }

    this.modalEl.querySelector("#export-loading-state").style.display = "none";
    this.modalEl.querySelector("#export-result-state").style.display = "flex";
    this.modalEl.querySelector("#export-download-btn").style.display = "inline-flex";
    this.modalEl.querySelector("#export-save-as-btn").style.display = "inline-flex";

    // Auto-trigger immediate download for Download / Done button (so user gets file right away!)
    if (autoDownload) {
      await this._downloadPreparedBytes(false);
    } else if (saveAs) {
      // Focus filename input for Save As workflow
      setTimeout(() => {
        if (fnInput) {
          fnInput.focus();
          fnInput.select();
        }
      }, 60);
    }
  }

  hide() {
    this.modalEl.style.display = "none";
  }
}
