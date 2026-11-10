/**
 * OpenPDF Studio - Scanned Document & OCR Interactive Editor
 */

import { State } from "./state.js";
import { HistoryManager } from "./history.js";

export class ScannedEditor {
  constructor() {
    this.modalEl = null;
    this.currentWordData = null;
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
          <div class="modal-title">Edit Scanned Word (Inpaint & Reconstruct)</div>
          <button class="btn-icon" id="scanned-modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
            <div>Original Recognized Text: <strong id="scanned-orig-text" style="color: var(--text-main);"></strong></div>
            <div id="scanned-conf-badge" class="doc-status-badge">Confidence: 95%</div>
          </div>

          <div style="margin-bottom: 14px;">
            <label style="display: block; font-size: 11px; margin-bottom: 4px; font-weight: 600;">Replacement Text:</label>
            <input type="text" id="scanned-replacement-input" class="inspector-control" style="width: 100%; font-size: 14px; padding: 8px;">
          </div>

          <div style="display: flex; gap: 12px; margin-bottom: 14px;">
            <button class="btn-secondary" id="scanned-preview-btn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              Generate Inpaint Preview
            </button>
          </div>

          <div id="scanned-preview-container" style="display: none;">
            <div class="comparison-container">
              <div class="comparison-box">
                <div class="comparison-label">Before (Original Scan)</div>
                <div class="comparison-img-wrapper">
                  <img id="scanned-img-before" alt="Before edit">
                </div>
              </div>
              <div class="comparison-box">
                <div class="comparison-label">After (OpenCV Inpainted)</div>
                <div class="comparison-img-wrapper">
                  <img id="scanned-img-after" alt="After inpaint">
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" id="scanned-cancel-btn">Cancel</button>
          <button class="btn-primary" id="scanned-apply-btn">Apply Scanned Edit</button>
        </div>
      </div>
    `;

    document.body.appendChild(this.modalEl);

    this.modalEl.querySelector("#scanned-modal-close").addEventListener("click", () => this.hide());
    this.modalEl.querySelector("#scanned-cancel-btn").addEventListener("click", () => this.hide());
    this.modalEl.querySelector("#scanned-preview-btn").addEventListener("click", () => this.fetchPreview());
    this.modalEl.querySelector("#scanned-apply-btn").addEventListener("click", () => this.applyScannedEdit());
  }

  _initEvents() {
    State.subscribe("ocrRunRequested", async (pageNumber) => {
      await this.runOCR(pageNumber !== undefined ? pageNumber : State.currentPage);
    });
  }

  async runOCR(pageIndex) {
    if (!State.documentId) return;

    // Check cache
    if (State.ocrCache[pageIndex]) {
      this.renderOCROverlays(pageIndex, State.ocrCache[pageIndex]);
      State.emit("toast", { type: "success", message: `Showing cached OCR for Page ${pageIndex + 1}` });
      return;
    }

    State.emit("toast", { type: "info", message: `Running OCR on Page ${pageIndex + 1}...` });

    try {
      const formData = new FormData();
      formData.append("doc_id", State.documentId);
      formData.append("page_number", pageIndex);
      formData.append("language", "eng");
      formData.append("dpi", 300);

      const res = await fetch("/api/documents/ocr", {
        method: "POST",
        body: formData
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "OCR request failed");
      }

      const ocrResult = await res.json();
      State.ocrCache[pageIndex] = ocrResult;
      this.renderOCROverlays(pageIndex, ocrResult);

      State.emit("toast", {
        type: "success",
        message: `OCR Complete: ${ocrResult.words.length} words recognized (Avg confidence ${ocrResult.average_confidence}%)`
      });
    } catch (e) {
      State.emit("toast", { type: "error", message: `OCR Error: ${e.message}` });
    }
  }

  renderOCROverlays(pageIndex, ocrResult) {
    const overlayLayer = document.getElementById(`page-overlay-${pageIndex}`);
    if (!overlayLayer) return;

    // Clear previous OCR words
    overlayLayer.querySelectorAll(".ocr-word-highlight").forEach(el => el.remove());

    const scale = State.zoomScale;

    ocrResult.words.forEach(word => {
      const [x0, y0, x1, y1] = word.bbox;
      const wordBox = document.createElement("div");
      wordBox.className = `ocr-word-highlight ${word.confidence < 75 ? "low-confidence" : ""}`;
      wordBox.dataset.wordId = word.id;
      wordBox.dataset.text = word.text;
      wordBox.dataset.conf = word.confidence;

      wordBox.style.left = `${x0 * scale}px`;
      wordBox.style.top = `${y0 * scale}px`;
      wordBox.style.width = `${Math.max(10, (x1 - x0) * scale)}px`;
      wordBox.style.height = `${Math.max(10, (y1 - y0) * scale)}px`;

      wordBox.title = `OCR: "${word.text}" (Confidence: ${word.confidence}%) - Click to edit`;

      wordBox.addEventListener("click", (e) => {
        e.stopPropagation();
        this.openForWord(pageIndex, word, wordBox);
      });

      overlayLayer.appendChild(wordBox);
    });
  }

  openForWord(pageIndex, word, element) {
    this.currentWordData = { pageIndex, word, element };
    
    this.modalEl.querySelector("#scanned-orig-text").textContent = word.text;
    this.modalEl.querySelector("#scanned-replacement-input").value = word.text;
    
    const badge = this.modalEl.querySelector("#scanned-conf-badge");
    badge.textContent = `Confidence: ${word.confidence}%`;
    badge.className = `doc-status-badge ${word.confidence < 75 ? "scanned" : ""}`;

    this.modalEl.querySelector("#scanned-preview-container").style.display = "none";
    this.modalEl.style.display = "flex";

    setTimeout(() => {
      this.modalEl.querySelector("#scanned-replacement-input").focus();
    }, 50);
  }

  async fetchPreview() {
    if (!this.currentWordData) return;
    const { pageIndex, word } = this.currentWordData;
    const replacement = this.modalEl.querySelector("#scanned-replacement-input").value;

    const formData = new FormData();
    formData.append("doc_id", State.documentId);
    formData.append("page_number", pageIndex);
    formData.append("bbox_x0", word.bbox[0]);
    formData.append("bbox_y0", word.bbox[1]);
    formData.append("bbox_x1", word.bbox[2]);
    formData.append("bbox_y1", word.bbox[3]);
    formData.append("original_text", word.text);
    formData.append("replacement_text", replacement);
    formData.append("font_size", 14.0);

    try {
      const res = await fetch("/api/documents/scanned-preview", {
        method: "POST",
        body: formData
      });
      if (!res.ok) throw new Error("Failed to generate preview");
      const data = await res.json();

      this.modalEl.querySelector("#scanned-img-before").src = data.before_preview;
      this.modalEl.querySelector("#scanned-img-after").src = data.after_preview;
      this.modalEl.querySelector("#scanned-preview-container").style.display = "block";
    } catch (e) {
      State.emit("toast", { type: "error", message: `Preview failed: ${e.message}` });
    }
  }

  applyScannedEdit() {
    if (!this.currentWordData) return;
    const { pageIndex, word, element } = this.currentWordData;
    const replacement = this.modalEl.querySelector("#scanned-replacement-input").value;

    const editItem = {
      page_number: pageIndex,
      word_id: word.id,
      bbox: word.bbox,
      original_text: word.text,
      replacement_text: replacement,
      font_size: 14.0,
      inpaint_radius: 3
    };

    State.addScannedEdit(editItem);
    HistoryManager.record({
      type: "scanned_edit",
      item: editItem,
      undo: () => {
        State.pendingScannedEdits = State.pendingScannedEdits.filter(e => e !== editItem);
      },
      redo: () => {
        State.pendingScannedEdits.push(editItem);
      }
    });

    // Visual placeholder
    element.style.background = "rgba(59, 130, 246, 0.4)";
    element.title = `Edited: "${replacement}"`;

    State.emit("toast", { type: "success", message: `Scanned text replacement queued for "${word.text}" -> "${replacement}"` });
    this.hide();
  }

  hide() {
    this.modalEl.style.display = "none";
    this.currentWordData = null;
  }
}
