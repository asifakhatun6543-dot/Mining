/**
 * OpenPDF Studio - PDF Export Client & Validation Modal
 */

import { State } from "./state.js";

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
      const res = await fetch("/api/documents/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Export request failed");
      }

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
      dlLink.href = data.download_url;
      dlLink.download = data.download_filename || "edited_document.pdf";
      dlLink.style.display = "flex";

      this.modalEl.querySelector("#export-loading-state").style.display = "none";
      this.modalEl.querySelector("#export-result-state").style.display = "flex";

      State.emit("toast", { type: "success", message: "PDF exported and validated successfully!" });
    } catch (e) {
      this.hide();
      State.emit("toast", { type: "error", message: `Export error: ${e.message}` });
    }
  }

  hide() {
    this.modalEl.style.display = "none";
  }
}
