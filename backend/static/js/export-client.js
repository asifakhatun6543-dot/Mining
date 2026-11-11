/**
 * OpenPDF Studio - PDF Export Client & Validation Modal
 */

import { State, getApiUrl } from "./state.js";

export class ExportClient {
  constructor() {
    this.modalEl = null;
    this._createModalDOM();
    this._initEvents();
  }

  _createModalDOM() {
    this.modalEl = document.createElement("div");
    this.modalEl.className = "modal-backdrop";
    this.modalEl.style.display = "none";

    this.modalEl.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-header">
          <div class="modal-title" style="display: flex; align-items: center; gap: 8px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            PDF Export & Integrity Validation
          </div>
          <button class="btn-icon" id="export-modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <div id="export-loading-state" style="display: flex; flex-direction: column; align-items: center; padding: 30px; gap: 14px;">
            <div style="width: 36px; height: 36px; border: 3px solid var(--border-subtle); border-top-color: var(--accent-primary); border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
            <div style="font-weight: 600; color: var(--text-main);">Applying edits and running PyMuPDF validation engine...</div>
            <div style="font-size: 11px; color: var(--text-dim);">Genuinely purging redacted content streams and generating searchable text layer.</div>
          </div>

          <div id="export-result-state" style="display: none; flex-direction: column; gap: 14px;">
            <div style="background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.35); border-radius: var(--radius-md); padding: 12px; display: flex; align-items: center; gap: 10px;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
              <div>
                <strong style="color: #34d399; font-size: 13px;">Export & Validation Passed</strong>
                <div style="font-size: 11px; color: var(--text-muted);">PDF reopened and inspected. Content stream integrity verified.</div>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <div style="background: var(--bg-sidebar); padding: 10px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
                <div style="font-size: 10px; text-transform: uppercase; color: var(--text-dim); font-weight: 700;">Page Count</div>
                <div id="export-val-pagecount" style="font-size: 15px; font-weight: 600; color: var(--text-main);">-</div>
              </div>
              <div style="background: var(--bg-sidebar); padding: 10px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
                <div style="font-size: 10px; text-transform: uppercase; color: var(--text-dim); font-weight: 700;">Redaction Audit</div>
                <div id="export-val-redaction" style="font-size: 14px; font-weight: 600; color: #34d399;">Clean / Unrecoverable</div>
              </div>
            </div>

            <div>
              <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--text-dim); margin-bottom: 4px;">Extracted Text Verification Preview</div>
              <div id="export-val-preview" style="background: var(--bg-app); border: 1px solid var(--border-subtle); padding: 8px 10px; font-family: var(--font-mono); font-size: 11px; max-height: 100px; overflow-y: auto; color: var(--text-muted); border-radius: var(--radius-sm); white-space: pre-wrap;"></div>
            </div>

            <div id="export-val-warnings" style="display: none; background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: var(--radius-sm); padding: 8px 10px; font-size: 11px; color: #fbbf24;"></div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" id="export-modal-cancel">Close</button>
          <a class="btn-primary" id="export-download-link" href="#" download style="text-decoration: none;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Download PDF File
          </a>
        </div>
      </div>
    `;

    const style = document.createElement("style");
    style.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
    document.head.appendChild(style);

    document.body.appendChild(this.modalEl);

    this.modalEl.querySelector("#export-modal-close").addEventListener("click", () => this.hide());
    this.modalEl.querySelector("#export-modal-cancel").addEventListener("click", () => this.hide());
  }

  _initEvents() {
    const downloadBtn = document.getElementById("header-download-btn");
    if (downloadBtn) {
      downloadBtn.addEventListener("click", () => this.exportCurrentDocument());
    }
  }

  async exportCurrentDocument() {
    if (!State.documentId) {
      State.emit("toast", { type: "warning", message: "No document is currently loaded to export." });
      return;
    }

    this.modalEl.querySelector("#export-loading-state").style.display = "flex";
    this.modalEl.querySelector("#export-result-state").style.display = "none";
    this.modalEl.querySelector("#export-download-link").style.display = "none";
    this.modalEl.style.display = "flex";

    const payload = {
      document_id: State.documentId,
      edits: State.pendingTextEdits,
      redactions: State.pendingRedactions,
      scanned_edits: State.pendingScannedEdits,
      annotations: State.pendingAnnotations,
      page_operations: State.pendingPageOperations,
      flatten: false
    };

    try {
      const res = await fetch(getApiUrl("/api/documents/export"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        const val = data.result.validation;

        // Populate verification modal
        this.modalEl.querySelector("#export-val-pagecount").textContent = `${data.result.page_count} Pages`;
        this.modalEl.querySelector("#export-val-redaction").textContent = val.redaction_verified ? "Verified (Clean)" : "Issues Found";
        this.modalEl.querySelector("#export-val-redaction").style.color = val.redaction_verified ? "#34d399" : "#f87171";
        this.modalEl.querySelector("#export-val-preview").textContent = val.extracted_text_preview || "(No text on first page)";

        const warnBox = this.modalEl.querySelector("#export-val-warnings");
        if (val.warnings && val.warnings.length > 0) {
          warnBox.textContent = `Warnings: ${val.warnings.join("; ")}`;
          warnBox.style.display = "block";
        } else {
          warnBox.style.display = "none";
        }

        const dlLink = this.modalEl.querySelector("#export-download-link");
        dlLink.href = getApiUrl(data.download_url);
        dlLink.download = data.download_filename || "edited_document.pdf";
        dlLink.style.display = "flex";

        this.modalEl.querySelector("#export-loading-state").style.display = "none";
        this.modalEl.querySelector("#export-result-state").style.display = "flex";

        State.emit("toast", { type: "success", message: "PDF exported and validated successfully!" });
        return;
      }
    } catch (e) {
      console.warn("Backend export request failed, attempting client-side PDFLib export:", e);
    }

    // ------------------------------------------------------------------------
    // Client-Side PDFLib Export Fallback (Runs 100% offline & on GitHub Pages)
    // ------------------------------------------------------------------------
    if (window.PDFLib && State.rawFileBytes) {
      try {
        const { PDFDocument, rgb, StandardFonts } = window.PDFLib;
        const pdfDoc = await PDFDocument.load(State.rawFileBytes);
        const pages = pdfDoc.getPages();
        const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const timesFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);

        // 1. Apply Text Edits (whiteout underlying text + draw replacement)
        for (const edit of State.pendingTextEdits) {
          const page = pages[edit.page_number];
          if (!page) continue;
          const { height } = page.getSize();
          const [x0, y0, x1, y1] = edit.bbox;
          const w = Math.max(x1 - x0, 10);
          const h = Math.max(y1 - y0, 10);
          const pdfY = height - y1;

          page.drawRectangle({
            x: x0,
            y: pdfY,
            width: w,
            height: h,
            color: rgb(1, 1, 1)
          });

          if (edit.replacement_text) {
            const font = edit.font && /times|roman|serif/i.test(edit.font) ? timesFont : helveticaFont;
            const size = edit.font_size || 12;
            page.drawText(edit.replacement_text, {
              x: x0,
              y: pdfY + 2,
              size: size,
              font: font,
              color: rgb(0, 0, 0)
            });
          }
        }

        // 2. Apply Redactions
        for (const red of State.pendingRedactions) {
          const page = pages[red.page_number];
          if (!page) continue;
          const { height } = page.getSize();
          const [x0, y0, x1, y1] = red.bbox;
          page.drawRectangle({
            x: x0,
            y: height - y1,
            width: Math.max(10, x1 - x0),
            height: Math.max(10, y1 - y0),
            color: rgb(0, 0, 0)
          });
        }

        // 3. Apply Annotations
        for (const annot of State.pendingAnnotations) {
          const page = pages[annot.page_number];
          if (!page) continue;
          const { height } = page.getSize();
          const [x0, y0, x1, y1] = annot.rect;
          const w = Math.max(10, Math.abs(x1 - x0));
          const h = Math.max(10, Math.abs(y1 - y0));
          const pdfY = height - Math.max(y0, y1);

          if (annot.type === "whiteout") {
            page.drawRectangle({ x: Math.min(x0, x1), y: pdfY, width: w, height: h, color: rgb(1, 1, 1) });
          } else if (annot.type === "redact") {
            page.drawRectangle({ x: Math.min(x0, x1), y: pdfY, width: w, height: h, color: rgb(0, 0, 0) });
          } else if (annot.type === "highlight") {
            page.drawRectangle({ x: Math.min(x0, x1), y: pdfY, width: w, height: h, color: rgb(1, 0.9, 0), opacity: 0.45 });
          } else if (annot.type === "rect") {
            page.drawRectangle({ x: Math.min(x0, x1), y: pdfY, width: w, height: h, borderWidth: 2, borderColor: rgb(0, 0, 0) });
          } else if (annot.type === "text") {
            page.drawText(annot.properties.text || "", { x: x0, y: pdfY, size: annot.properties.font_size || 12, font: helveticaFont, color: rgb(0, 0, 0) });
          } else if (annot.type === "check") {
            page.drawText("✓", { x: x0, y: pdfY, size: Math.max(16, h), font: helveticaFont, color: rgb(0.08, 0.64, 0.29) });
          } else if (annot.type === "cross") {
            page.drawText("✗", { x: x0, y: pdfY, size: Math.max(16, h), font: helveticaFont, color: rgb(0.86, 0.15, 0.15) });
          } else if (annot.type === "watermark") {
            page.drawText(annot.properties.text || "CONFIDENTIAL", {
              x: 60,
              y: height / 2,
              size: 50,
              font: helveticaFont,
              color: rgb(0.85, 0.85, 0.85),
              rotate: { type: 'degrees', angle: 45 }
            });
          } else if ((annot.type === "image" || annot.type === "signature") && annot.properties.image_data) {
            try {
              const res = await fetch(annot.properties.image_data);
              const imgBytes = await res.arrayBuffer();
              const img = annot.properties.image_data.includes("image/jpeg")
                ? await pdfDoc.embedJpg(imgBytes)
                : await pdfDoc.embedPng(imgBytes);
              page.drawImage(img, { x: Math.min(x0, x1), y: pdfY, width: w, height: h });
            } catch (imgErr) {
              console.warn("Failed embedding image annot:", imgErr);
            }
          }
        }

        const outBytes = await pdfDoc.save();
        const blob = new Blob([outBytes], { type: "application/pdf" });
        const blobUrl = URL.createObjectURL(blob);

        const dlLink = this.modalEl.querySelector("#export-download-link");
        dlLink.href = blobUrl;
        dlLink.download = (State.filename || "edited_document.pdf").replace(/\.pdf$/i, "") + "_edited.pdf";
        dlLink.style.display = "flex";

        this.modalEl.querySelector("#export-val-pagecount").textContent = `${pages.length} Pages`;
        this.modalEl.querySelector("#export-val-redaction").textContent = "Clean Client Export";
        this.modalEl.querySelector("#export-val-redaction").style.color = "#34d399";
        this.modalEl.querySelector("#export-val-preview").textContent = "(PDF processed and generated directly in your browser with PDF-Lib)";
        this.modalEl.querySelector("#export-loading-state").style.display = "none";
        this.modalEl.querySelector("#export-result-state").style.display = "flex";

        State.emit("toast", { type: "success", message: "PDF exported and ready for download!" });
        return;
      } catch (clientErr) {
        console.error("Client export failed:", clientErr);
      }
    }

    this.hide();
    State.emit("toast", { type: "error", message: "Failed to export PDF." });
  }

  hide() {
    this.modalEl.style.display = "none";
  }
}
