/**
 * OpenPDF Studio - Main Application Controller
 */

import { State } from "./state.js";
import { HistoryManager } from "./history.js";
import { PDFRenderer } from "./pdf-renderer.js";
import { TextSelectionManager } from "./text-selection.js";
import { InlineTextEditor } from "./text-editor.js";
import { ScannedEditor } from "./scanned-editor.js";
import { ToolbarManager } from "./toolbar.js";
import { ExportClient } from "./export-client.js";

class OpenPDFStudioApp {
  constructor() {
    this.renderer = null;
    this.selectionManager = null;
    this.textEditor = null;
    this.scannedEditor = null;
    this.toolbar = null;
    this.exportClient = null;
  }

  init() {
    // DOM Elements
    const viewportContainer = document.getElementById("pages-viewport");
    const thumbnailsContainer = document.getElementById("thumbnails-container");

    // Initialize Subsystems
    this.renderer = new PDFRenderer(viewportContainer, thumbnailsContainer);
    this.selectionManager = new TextSelectionManager();
    this.textEditor = new InlineTextEditor();
    this.scannedEditor = new ScannedEditor();
    this.toolbar = new ToolbarManager();
    this.exportClient = new ExportClient();

    this._bindHeaderActions();
    this._bindPageActions();
    this._bindZoomAndNavigation();
    this._bindInspector();
    this._bindDropzoneAndSamples();
    this._bindKeyboardShortcuts();
    this._bindToastSystem();
    this._bindFindAndReplace();

    // Expose app instance globally for subsystem coordination
    window.app = this;

    // Set default tool to edit-text to match UI active state
    this.toolbar.setTool("edit-text");

    // Check backend health
    this._checkHealth();
  }

  async _checkHealth() {
    try {
      const res = await fetch("/api/health");
      if (res.ok) {
        const data = await res.json();
        console.log("Backend healthy:", data);
      }
    } catch (e) {
      this.showToast("error", "Local backend connection failed. Ensure FastAPI server is running.");
    }
  }

  _bindHeaderActions() {
    // Undo / Redo
    document.getElementById("header-undo-btn")?.addEventListener("click", () => HistoryManager.undo());
    document.getElementById("header-redo-btn")?.addEventListener("click", () => HistoryManager.redo());

    // Print
    document.getElementById("header-print-btn")?.addEventListener("click", () => {
      window.print();
    });

    // Save project snapshot
    document.getElementById("header-save-btn")?.addEventListener("click", () => {
      const projectData = {
        documentId: State.documentId,
        filename: State.filename,
        edits: State.pendingTextEdits,
        redactions: State.pendingRedactions,
        scannedEdits: State.pendingScannedEdits,
        annotations: State.pendingAnnotations,
        pageOperations: State.pendingPageOperations
      };
      const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${State.filename.replace(/\.pdf$/i, "")}_project.json`;
      a.click();
      URL.revokeObjectURL(url);
      this.showToast("success", "Project state saved successfully.");
    });

    // Done button
    document.getElementById("header-done-btn")?.addEventListener("click", () => {
      this.exportClient.exportCurrentDocument();
    });

    // Filename input
    const filenameInput = document.getElementById("document-title-input");
    if (filenameInput) {
      filenameInput.addEventListener("change", (e) => {
        State.filename = e.target.value.trim() || "document.pdf";
      });
    }

    // Open file button
    document.getElementById("header-open-btn")?.addEventListener("click", () => {
      document.getElementById("pdf-file-picker")?.click();
    });

    document.getElementById("pdf-file-picker")?.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) this.loadPDFFile(file);
    });
  }

  _bindPageActions() {
    // Rotate Page
    document.getElementById("sidebar-rotate-btn")?.addEventListener("click", () => {
      const op = { type: "rotate", page_number: State.currentPage, rotation_angle: 90 };
      State.addPageOperation(op);
      this.showToast("info", `Rotated Page ${State.currentPage + 1} by 90°`);
    });

    // Delete Page
    document.getElementById("sidebar-delete-btn")?.addEventListener("click", () => {
      if (State.pageCount <= 1) {
        this.showToast("warning", "Cannot delete the only page in the document.");
        return;
      }
      if (confirm(`Delete Page ${State.currentPage + 1}?`)) {
        const op = { type: "delete", page_number: State.currentPage };
        State.addPageOperation(op);
        this.showToast("info", `Page ${State.currentPage + 1} marked for deletion on export.`);
      }
    });

    // Duplicate Page
    document.getElementById("sidebar-duplicate-btn")?.addEventListener("click", () => {
      const op = { type: "duplicate", page_number: State.currentPage };
      State.addPageOperation(op);
      this.showToast("info", `Page ${State.currentPage + 1} duplicated.`);
    });

    // Insert Blank Page
    document.getElementById("sidebar-insert-btn")?.addEventListener("click", () => {
      const op = { type: "insert_blank", target_page: State.currentPage + 1 };
      State.addPageOperation(op);
      this.showToast("info", `Blank page inserted after Page ${State.currentPage + 1}.`);
    });
    // Sidebar Toggle
    const sidebar = document.getElementById("left-sidebar");
    document.getElementById("btn-toggle-pages")?.addEventListener("click", () => {
      if (sidebar) {
        sidebar.style.display = sidebar.style.display === "none" ? "flex" : "none";
      }
    });
    document.getElementById("sidebar-close-btn")?.addEventListener("click", () => {
      if (sidebar) sidebar.style.display = "none";
    });
    document.getElementById("tool-find-btn")?.addEventListener("click", () => {
      this._toggleFindDrawer();
    });
  }

  _bindZoomAndNavigation() {
    // Stepper
    document.getElementById("btn-prev-page")?.addEventListener("click", () => {
      if (State.currentPage > 0) {
        State.setCurrentPage(State.currentPage - 1);
        this.renderer.scrollToPage(State.currentPage);
      }
    });

    document.getElementById("btn-next-page")?.addEventListener("click", () => {
      if (State.currentPage < State.pageCount - 1) {
        State.setCurrentPage(State.currentPage + 1);
        this.renderer.scrollToPage(State.currentPage);
      }
    });

    // Zoom controls
    document.getElementById("btn-zoom-in")?.addEventListener("click", () => {
      State.setZoom(State.zoomScale + 0.15);
      this.renderer.updateZoom();
      this._updateZoomUI();
    });

    document.getElementById("btn-zoom-out")?.addEventListener("click", () => {
      State.setZoom(State.zoomScale - 0.15);
      this.renderer.updateZoom();
      this._updateZoomUI();
    });

    document.getElementById("btn-fit-page")?.addEventListener("click", () => {
      State.setZoom(1.0);
      this.renderer.updateZoom();
      this._updateZoomUI();
    });

    State.subscribe("pageChanged", (pno) => {
      const pageDisplay = document.getElementById("page-num-display");
      if (pageDisplay) pageDisplay.textContent = pno + 1;
    });
  }

  _updateZoomUI() {
    const label = document.getElementById("zoom-percentage-label");
    if (label) {
      label.textContent = `${Math.round(State.zoomScale * 100)}%`;
    }
  }

  _bindInspector() {
    // Sync inspector with document properties if elements are present
    State.subscribe("documentLoaded", (docInfo) => {
      const pageCountEl = document.getElementById("prop-page-count");
      if (pageCountEl) pageCountEl.textContent = docInfo.page_count;

      const classificationEl = document.getElementById("prop-classification");
      if (classificationEl) {
        classificationEl.textContent = docInfo.is_scanned ? "Scanned (Images)" : (docInfo.is_mixed ? "Mixed Content" : "Digital Text");
      }

      const encEl = document.getElementById("prop-encrypted");
      if (encEl) encEl.textContent = docInfo.is_encrypted ? "Yes" : "No";

      const fontsList = document.getElementById("prop-fonts-list");
      if (fontsList) {
        fontsList.innerHTML = docInfo.detected_fonts && docInfo.detected_fonts.length > 0
          ? docInfo.detected_fonts.slice(0, 8).map(f => `<li>${f}</li>`).join("")
          : "<li>Standard Base-14</li>";
      }

      const ocrBanner = document.getElementById("ocr-offer-banner");
      if (ocrBanner) {
        ocrBanner.style.display = (docInfo.is_scanned || docInfo.has_insufficient_text) ? "block" : "none";
      }
    });

    // Color Swatches
    document.querySelectorAll(".color-swatch-btn").forEach(swatch => {
      swatch.addEventListener("click", () => {
        document.querySelectorAll(".color-swatch-btn").forEach(s => s.classList.remove("selected"));
        swatch.classList.add("selected");
        const color = swatch.dataset.color;
        this.toolbar.currentColor = this._parseColor(color);
      });
    });

    // Custom color input
    document.getElementById("custom-color-picker")?.addEventListener("change", (e) => {
      this.toolbar.currentColor = this._parseColor(e.target.value);
    });
  }

  _parseColor(hexOrRgb) {
    if (hexOrRgb.startsWith("#")) {
      const c = hexOrRgb.slice(1);
      const r = parseInt(c.slice(0, 2), 16) / 255;
      const g = parseInt(c.slice(2, 4), 16) / 255;
      const b = parseInt(c.slice(4, 6), 16) / 255;
      return [r, g, b];
    }
    return [0, 0, 0];
  }

  _bindDropzoneAndSamples() {
    const welcomeModal = document.getElementById("welcome-modal");
    const dropzone = document.getElementById("welcome-dropzone");

    // Close welcome modal button
    document.getElementById("welcome-close-btn")?.addEventListener("click", () => {
      welcomeModal.style.display = "none";
    });

    // Drag-and-drop
    ["dragenter", "dragover"].forEach(evt => {
      dropzone?.addEventListener(evt, (e) => {
        e.preventDefault();
        dropzone.classList.add("drag-over");
      });
    });

    ["dragleave", "drop"].forEach(evt => {
      dropzone?.addEventListener(evt, (e) => {
        e.preventDefault();
        dropzone.classList.remove("drag-over");
      });
    });

    dropzone?.addEventListener("drop", (e) => {
      const file = e.dataTransfer.files[0];
      if (file && file.name.endsWith(".pdf")) {
        this.loadPDFFile(file);
        welcomeModal.style.display = "none";
      }
    });

    dropzone?.addEventListener("click", () => {
      document.getElementById("pdf-file-picker")?.click();
    });

    // Sample document cards
    document.getElementById("load-sample-digital")?.addEventListener("click", async () => {
      welcomeModal.style.display = "none";
      await this.loadSampleDocument("/sample_docs/sample_digital_contract.pdf", "sample_digital_contract.pdf");
    });

    document.getElementById("load-sample-scanned")?.addEventListener("click", async () => {
      welcomeModal.style.display = "none";
      await this.loadSampleDocument("/sample_docs/sample_scanned_receipt.pdf", "sample_scanned_receipt.pdf");
    });
  }

  async loadSampleDocument(url, filename) {
    this.showToast("info", `Loading sample ${filename}...`);
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const file = new File([blob], filename, { type: "application/pdf" });
      await this.loadPDFFile(file);
    } catch (e) {
      this.showToast("error", `Failed to load sample: ${e.message}`);
    }
  }

  async loadPDFFile(file) {
    this.showToast("info", `Analyzing ${file.name}...`);
    const welcomeModal = document.getElementById("welcome-modal");
    if (welcomeModal) welcomeModal.style.display = "none";

    try {
      // Step 1: Read raw array buffer
      const arrayBuffer = await file.arrayBuffer();

      // Step 2: Initialize PDF.js document
      const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
      const pdfJsDoc = await loadingTask.promise;

      // Step 3: Send to local backend for structure & font analysis
      const formData = new FormData();
      formData.append("file", file);

      const apiRes = await fetch("/api/documents/analyze", {
        method: "POST",
        body: formData
      });

      if (!apiRes.ok) {
        const err = await apiRes.json();
        throw new Error(err.detail || "PDF analysis failed");
      }

      const analysisData = await apiRes.json();
      const docInfo = analysisData.document_info;
      const pages = analysisData.pages;

      // Step 4: Register in State
      State.setDocument(docInfo, pdfJsDoc, arrayBuffer);

      // Register page analysis blocks in selection manager
      pages.forEach((p, idx) => {
        this.selectionManager.setPageAnalysis(idx, p);
      });

      // Update UI title and badges
      const titleInput = document.getElementById("document-title-input");
      if (titleInput) titleInput.value = file.name;

      const badge = document.getElementById("header-status-badge");
      if (badge) {
        badge.textContent = docInfo.is_scanned ? "Scanned Document" : (docInfo.is_mixed ? "Mixed Content" : "Digital Text PDF");
        badge.className = `doc-status-badge ${docInfo.is_scanned ? "scanned" : ""}`;
      }

      const totalPagesEl = document.getElementById("total-pages-label");
      if (totalPagesEl) totalPagesEl.textContent = docInfo.page_count;

      // Step 5: Render Document
      await this.renderer.renderDocument();

      this.showToast("success", `Loaded "${file.name}" (${docInfo.page_count} pages). Ready for editing.`);
    } catch (err) {
      console.error(err);
      this.showToast("error", `Failed to load PDF: ${err.message}`);
    }
  }

  _bindKeyboardShortcuts() {
    window.addEventListener("keydown", (e) => {
      // Don't intercept typing in inputs, textareas, or active contenteditable
      if (["INPUT", "TEXTAREA"].includes(e.target.tagName) || e.target.isContentEditable) return;

      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const cmd = isMac ? e.metaKey : e.ctrlKey;

      if (cmd && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          HistoryManager.redo();
        } else {
          HistoryManager.undo();
        }
      } else if (cmd && e.key.toLowerCase() === "y") {
        e.preventDefault();
        HistoryManager.redo();
      } else if (cmd && e.key.toLowerCase() === "s") {
        e.preventDefault();
        this.exportClient.exportCurrentDocument();
      } else if (cmd && e.key.toLowerCase() === "f") {
        e.preventDefault();
        this._toggleFindDrawer();
      } else if (e.key === "Escape") {
        this.textEditor.hide();
        this.scannedEditor.hide();
        this.exportClient.hide();
      } else if (e.key === "+" || e.key === "=") {
        State.setZoom(State.zoomScale + 0.1);
        this.renderer.updateZoom();
        this._updateZoomUI();
      } else if (e.key === "-") {
        State.setZoom(State.zoomScale - 0.1);
        this.renderer.updateZoom();
        this._updateZoomUI();
      }
    });
  }

  _bindFindAndReplace() {
    const drawer = document.getElementById("find-replace-drawer");
    const findInput = document.getElementById("find-search-input");
    const matchBadge = document.getElementById("find-match-badge");

    State.subscribe("toggleFind", () => this._toggleFindDrawer());

    document.getElementById("find-close-btn")?.addEventListener("click", () => {
      if (drawer) drawer.style.display = "none";
    });

    findInput?.addEventListener("input", (e) => {
      const query = e.target.value.trim().toLowerCase();
      if (!query) {
        if (matchBadge) matchBadge.textContent = "0 matches";
        return;
      }

      // Count occurrences in extracted pages
      let count = 0;
      this.selectionManager.extractedPages.forEach(p => {
        p.blocks.forEach(b => {
          if (b.text && b.text.toLowerCase().includes(query)) {
            count++;
          }
        });
      });

      if (matchBadge) matchBadge.textContent = `${count} found`;
    });
  }

  _toggleFindDrawer() {
    const drawer = document.getElementById("find-replace-drawer");
    if (!drawer) return;
    const isVisible = drawer.style.display === "flex";
    drawer.style.display = isVisible ? "none" : "flex";
    if (!isVisible) {
      document.getElementById("find-search-input")?.focus();
    }
  }

  _bindToastSystem() {
    State.subscribe("toast", ({ type, message }) => {
      this.showToast(type, message);
    });
  }

  showToast(type, message) {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <div style="flex: 1;">${message}</div>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(30px)";
      toast.style.transition = "all 0.2s ease";
      setTimeout(() => toast.remove(), 250);
    }, 3500);
  }
}

// Bootstrap on DOM ready
document.addEventListener("DOMContentLoaded", () => {
  const app = new OpenPDFStudioApp();
  app.init();
});
