/**
 * OpenPDF Studio - Ultra-Aesthetic Portal Controller & Client-Side Tools Suite
 * Powered by PDF-Lib, PDF.js, and HTML5 Canvas
 */

import { AdvancedToolsManager, formatBytes } from "./portal-advanced-tools.js?v=5.3";
import { MobileLiquidNavController, RecentHistoryManager } from "./mobile-liquid-nav.js?v=5.3";

if (typeof window !== "undefined") {
  window.MobileLiquidNavController = MobileLiquidNavController;
  window.RecentHistoryManager = RecentHistoryManager;
}

export class PortalManager {
  constructor() {
    this.landingView = document.getElementById("landing-view");
    this.editorView = document.getElementById("editor-view");
    
    // Tools State
    this.jpgFiles = [];
    this.mergeFiles = [];
    this.splitPdfDoc = null;
    this.splitFile = null;
    this.rotatePdfDoc = null;
    this.rotateFile = null;
    this.rotateAngle = 90;
    this.pdfToJpgFile = null;
    this.resizeState = {
      file: null,
      img: null,
      origWidth: 0,
      origHeight: 0,
      aspectRatio: 1
    };

    this.init();
  }

  init() {
    this._bindNavigation();
    this._bindFilterTabs();
    this._bindHeroDropzone();
    this._bindToolCards();
    this._bindEditPdfModal();
    this._bindJpgToPdfModal();
    this._bindMergePdfModal();
    this._bindImageResizeModal();
    this._bindSplitPdfModal();
    this._bindRotatePdfModal();
    this._bindPdfToJpgModal();
    document.getElementById("btn-back-to-tools")?.addEventListener("click", () => this.closeToolWorkspace());
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        const ws = document.getElementById("portal-tool-workspace");
        if (ws && ws.style.display !== "none") this.closeToolWorkspace();
      }
    });

    this.advancedTools = new AdvancedToolsManager(this);
    MobileLiquidNavController.init();
  }

  // ------------------------------------------------------------------------
  // View Switching
  // ------------------------------------------------------------------------
  switchView(viewName) {
    if (viewName === "editor") {
      if (this.landingView) this.landingView.style.display = "none";
      if (this.editorView) this.editorView.style.display = "flex";
      MobileLiquidNavController.hide();
      window.scrollTo(0, 0);
      window.location.hash = "#editor";
    } else {
      if (this.editorView) this.editorView.style.display = "none";
      if (this.landingView) this.landingView.style.display = "flex";
      MobileLiquidNavController.show();
      window.scrollTo(0, 0);
      history.replaceState(null, null, " ");
    }
  }

  _bindNavigation() {
    // Logo & Home links: cleanly reset editor when navigating back to portal
    document.getElementById("portal-logo-link")?.addEventListener("click", () => {
      if (window.app && window.app.resetDocument) {
        window.app.resetDocument();
      }
      this.switchView("landing");
    });

    // Back to Home button in editor header
    document.getElementById("btn-back-to-home")?.addEventListener("click", () => {
      if (window.app && window.app.resetDocument) {
        window.app.resetDocument();
      }
      this.switchView("landing");
    });

    // Nav CTA: Open Editor
    document.querySelectorAll(".open-editor-cta").forEach(el => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        this.openEditModal();
      });
    });

    // Nav Tool buttons
    document.getElementById("nav-btn-editor")?.addEventListener("click", () => this.openEditModal());
    document.getElementById("nav-btn-merge")?.addEventListener("click", () => this.openMergeModal());
    document.getElementById("nav-btn-split")?.addEventListener("click", () => this.openSplitModal());
    document.getElementById("nav-btn-compress")?.addEventListener("click", () => this.openCompressModal());
    document.getElementById("nav-btn-jpg-to-pdf")?.addEventListener("click", () => this.openJpgToPdfModal());
    document.getElementById("nav-btn-pdf-to-jpg")?.addEventListener("click", () => this.openPdfToJpgModal());
    document.getElementById("nav-btn-resize")?.addEventListener("click", () => this.openImageResizeModal());

    // Handle hash on initial load & navigation
    const handleHash = () => {
      const h = (window.location.hash || "").toLowerCase();
      if (h === "#editor") {
        this.switchView("editor");
      } else if (h === "#compress" || h === "#compress-pdf") {
        this.openCompressModal();
      } else if (h === "#pdf-to-word" || h === "#word") {
        this.openPdfToWordModal();
      } else if (h === "#pdf-to-excel" || h === "#excel") {
        this.openPdfToExcelModal();
      } else if (h === "#pdf-to-pptx" || h === "#pptx") {
        this.openPdfToPptxModal();
      } else if (h === "#ai" || h === "#summarizer" || h === "#ai-summarizer") {
        this.openAiSummarizerModal();
      } else if (h === "#translator" || h === "#translate") {
        this.openTranslatorModal();
      } else if (h === "#scanner" || h === "#pdf-scanner") {
        this.openPdfScannerModal();
      } else if (h === "#unlock" || h === "#unlock-pdf") {
        this.openUnlockPdfModal();
      } else if (h === "#html-to-pdf") {
        this.openHtmlToPdfModal();
      } else if (h === "#merge" || h === "#merge-pdf") {
        this.openMergeModal();
      } else if (h === "#split" || h === "#split-pdf") {
        this.openSplitModal();
      } else if (h === "#rotate" || h === "#rotate-pdf") {
        this.openRotateModal();
      } else if (h === "#jpg-to-pdf") {
        this.openJpgToPdfModal();
      } else if (h === "#pdf-to-jpg") {
        this.openPdfToJpgModal();
      } else if (h === "#resize") {
        this.openImageResizeModal();
      } else if (!h || h === "#home" || h === "#all" || h === "#tools") {
        const ws = document.getElementById("portal-tool-workspace");
        if (ws && ws.style.display !== "none") {
          this.closeToolWorkspace();
        }
      }
    };

    window.addEventListener("hashchange", handleHash);
    setTimeout(handleHash, 60);
  }

  // ------------------------------------------------------------------------
  // Filter Category Tabs
  // ------------------------------------------------------------------------
  
  // ------------------------------------------------------------------------
  // Dedicated Tool Workspace Navigation (Second Front Page - No Popups)
  // ------------------------------------------------------------------------
  openToolWorkspace(panelId, title, desc, iconSvg) {
    const homeContent = document.getElementById("portal-home-content");
    const workspace = document.getElementById("portal-tool-workspace");
    if (homeContent) homeContent.style.display = "none";
    if (workspace) workspace.style.display = "block";

    const titleEl = document.getElementById("tw-tool-title");
    const descEl = document.getElementById("tw-tool-desc");
    const breadcrumbEl = document.getElementById("tw-breadcrumb-title");
    const iconEl = document.getElementById("tw-tool-icon");

    if (titleEl) titleEl.textContent = title;
    if (descEl) descEl.textContent = desc;
    if (breadcrumbEl) breadcrumbEl.textContent = title;
    if (iconEl && iconSvg) iconEl.innerHTML = iconSvg;

    const allPanels = document.querySelectorAll(".tool-workspace-panel");
    allPanels.forEach(p => p.style.display = "none");

    const targetPanel = document.getElementById(panelId);
    if (targetPanel) {
      // Reset to clean Select Files stage whenever a tool is opened fresh
      const resetBtn = targetPanel.querySelector(".tw-change-btn");
      if (resetBtn) resetBtn.click();
      targetPanel.style.display = "block";
    }

    window.scrollTo({ top: 0, behavior: "instant" });
  }

  closeToolWorkspace() {
    const homeContent = document.getElementById("portal-home-content");
    const workspace = document.getElementById("portal-tool-workspace");
    if (workspace) workspace.style.display = "none";
    if (homeContent) homeContent.style.display = "block";

    const allPanels = document.querySelectorAll(".tool-workspace-panel");
    allPanels.forEach(p => p.style.display = "none");

    if (window.location.hash) {
      history.pushState("", document.title, window.location.pathname + window.location.search);
    }
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  _bindFilterTabs() {
    const tabs = document.querySelectorAll(".filter-tab-box, .filter-tab-btn");
    const cards = document.querySelectorAll(".tool-card");

    tabs.forEach(tab => {
      tab.addEventListener("click", () => {
        tabs.forEach(t => t.classList.remove("active"));
        tab.classList.add("active");

        const category = tab.dataset.category;
        cards.forEach(card => {
          if (category === "all" || card.dataset.category.includes(category)) {
            card.style.display = "flex";
          } else {
            card.style.display = "none";
          }
        });
      });
    });
  }

  // ------------------------------------------------------------------------
  // Universal Hero Dropzone
  // ------------------------------------------------------------------------
  _bindHeroDropzone() {
    const dropzone = document.getElementById("hero-universal-dropzone");
    const fileInput = document.getElementById("hero-universal-input");

    if (!dropzone || !fileInput) return;

    // Reset value on click BEFORE file picker opens so re-selecting same file triggers change safely
    dropzone.addEventListener("click", () => {
      fileInput.value = "";
      fileInput.click();
    });

    dropzone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropzone.classList.add("drag-over");
    });

    dropzone.addEventListener("dragleave", () => {
      dropzone.classList.remove("drag-over");
    });

    dropzone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropzone.classList.remove("drag-over");
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) this._handleUniversalFiles(files);
    });

    fileInput.addEventListener("change", (e) => {
      const files = Array.from(e.target.files);
      if (files.length > 0) this._handleUniversalFiles(files);
    });
  }

  _loadPDFIntoApp(file) {
    if (file) {
      RecentHistoryManager.add({
        name: file.name,
        tool: "PDF Editor",
        type: "pdf",
        size: formatBytes(file.size)
      });
    }
    if (window.app && typeof window.app.loadPDFFile === "function") {
      window.app.loadPDFFile(file);
      return;
    }
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (window.app && typeof window.app.loadPDFFile === "function") {
        clearInterval(interval);
        window.app.loadPDFFile(file);
      } else if (attempts > 100) {
        clearInterval(interval);
        console.error("OpenPDFStudioApp failed to initialize in time.");
        if (window.app && window.app.showToast) {
          window.app.showToast("error", "Application loading timed out. Please refresh and try again.");
        }
      }
    }, 50);
  }

  _handleUniversalFiles(files) {
    const pdfFiles = files.filter(f => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
    const imgFiles = files.filter(f => f.type.startsWith("image/") || /\.(jpe?g|png|webp|gif|bmp)$/i.test(f.name));

    if (pdfFiles.length === 1 && imgFiles.length === 0) {
      this.switchView("editor");
      this._loadPDFIntoApp(pdfFiles[0]);
    } else if (pdfFiles.length > 1) {
      this.openMergeModal(pdfFiles);
    } else if (imgFiles.length > 0) {
      this.openJpgToPdfModal(imgFiles);
    }
  }

  // ------------------------------------------------------------------------
  // Tool Cards Click Handlers
  // ------------------------------------------------------------------------
  _bindToolCards() {
    const bindCard = (id, fn) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener("click", (e) => {
        e.preventDefault();
        fn();
      });
    };

    bindCard("card-tool-editor", () => this.openEditModal());
    bindCard("card-tool-merge-pdf", () => this.openMergeModal());
    bindCard("card-tool-split-pdf", () => this.openSplitModal());
    bindCard("card-tool-compress-pdf", () => this.openCompressModal());
    bindCard("card-tool-pdf-to-word", () => this.openPdfToWordModal());
    bindCard("card-tool-pdf-to-excel", () => this.openPdfToExcelModal());
    bindCard("card-tool-pdf-to-pptx", () => this.openPdfToPptxModal());
    bindCard("card-tool-word-to-pdf", () => this.openWordToPdfModal());
    bindCard("card-tool-excel-to-pdf", () => this.openExcelToPdfModal());
    bindCard("card-tool-pptx-to-pdf", () => this.openPptxToPdfModal());
    bindCard("card-tool-jpg-to-pdf", () => this.openJpgToPdfModal());
    bindCard("card-tool-pdf-to-jpg", () => this.openPdfToJpgModal());
    bindCard("card-tool-image-resize", () => this.openImageResizeModal());
    bindCard("card-tool-rotate-pdf", () => this.openRotateModal());
    bindCard("card-tool-ai-summarizer", () => this.openAiSummarizerModal());
    bindCard("card-tool-translator", () => this.openTranslatorModal());
    bindCard("card-tool-html-to-pdf", () => this.openHtmlToPdfModal());
    bindCard("card-tool-unlock-pdf", () => this.openUnlockPdfModal());
    bindCard("card-tool-pdf-scanner", () => this.openPdfScannerModal());

    bindCard("card-tool-sign-pdf", () => {
      this.switchView("editor");
      if (window.app && window.app.toolbar) {
        window.app.toolbar.setTool("signature");
      }
    });

    bindCard("card-tool-watermark-pdf", () => {
      this.switchView("editor");
      if (window.app && window.app.toolbar) {
        window.app.toolbar.setTool("watermark");
      }
    });

    bindCard("card-tool-ocr", () => {
      this.switchView("editor");
      const scannedBtn = document.getElementById("load-sample-scanned");
      if (scannedBtn) scannedBtn.click();
    });

    bindCard("card-tool-redact", () => {
      this.switchView("editor");
      if (window.app && window.app.toolbar) {
        window.app.toolbar.setTool("redact");
      }
    });
  }

  // ------------------------------------------------------------------------
  // TOOL: Edit PDF Upload
  // ------------------------------------------------------------------------
  openEditModal() {
    const picker = document.getElementById("edit-modal-file-picker");
    if (picker) picker.value = "";
    this.openToolWorkspace("modal-edit-pdf", "Edit PDF", "Edit existing text, modify fonts, insert signatures, and annotate in-place.", '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" stroke-width="2.2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>');
  }

  _bindEditPdfModal() {
    const modal = document.getElementById("modal-edit-pdf");
    const closeBtn = document.getElementById("close-edit-pdf");
    const picker = document.getElementById("edit-modal-file-picker");
    const dropzone = document.getElementById("edit-pdf-dropzone");
    const chooseBtn = document.getElementById("btn-choose-edit-pdf");
    if (!modal) return;

    closeBtn?.addEventListener("click", () => {
      this.closeToolWorkspace();
      modal.style.display = "none";
    });

    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.style.display = "none";
    });

    const triggerPick = () => {
      if (picker) {
        picker.value = "";
        picker.click();
      }
    };
    chooseBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      triggerPick();
    });
    dropzone?.addEventListener("click", triggerPick);

    picker?.addEventListener("change", (e) => {
      const files = Array.from(e.target.files || []);
      if (files.length > 0) {
        modal.style.display = "none";
        this.switchView("editor");
        this._loadPDFIntoApp(files[0]);
      }
    });

    dropzone?.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropzone.classList.add("drag-over");
    });
    dropzone?.addEventListener("dragleave", () => {
      dropzone.classList.remove("drag-over");
    });
    dropzone?.addEventListener("drop", (e) => {
      e.preventDefault();
      dropzone.classList.remove("drag-over");
      const files = Array.from(e.dataTransfer.files || []).filter(f => f.name.toLowerCase().endsWith(".pdf") || f.type === "application/pdf");
      if (files.length > 0) {
        modal.style.display = "none";
        this.switchView("editor");
        this._loadPDFIntoApp(files[0]);
      }
    });
  }

  // ------------------------------------------------------------------------
  // TOOL 1: Merge PDF
  // ------------------------------------------------------------------------
  openMergeModal(initialFiles = []) {
    const picker = document.getElementById("merge-file-picker");
    if (picker) picker.value = "";
    this.mergeFiles = initialFiles.length > 0 ? [...initialFiles] : [];
    this._renderMergeQueue();
    this.openToolWorkspace("modal-merge-pdf", "Merge PDF", "Combine multiple PDF documents into a single organized file.", '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#e5322d" stroke-width="2.2"><path d="m8 6 4-4 4 4"/><path d="M12 2v10.3a4 4 0 0 1-1.172 2.872L4 22"/><path d="m20 22-5-5"/></svg>');
  }

  _bindMergePdfModal() {
    const modal = document.getElementById("modal-merge-pdf");
    const closeBtn = document.getElementById("close-merge-pdf");
    const picker = document.getElementById("merge-file-picker");
    const dropzone = document.getElementById("merge-dropzone");
    const mergeBtn = document.getElementById("btn-merge-pdfs");

    closeBtn?.addEventListener("click", () => {
      this.closeToolWorkspace();
      modal.style.display = "none";
      this.mergeFiles = [];
      this._renderMergeQueue();
    });

    dropzone?.addEventListener("click", () => {
      if (picker) {
        picker.value = "";
        picker.click();
      }
    });

    picker?.addEventListener("change", (e) => {
      const files = Array.from(e.target.files);
      this.mergeFiles = [...this.mergeFiles, ...files];
      this._renderMergeQueue();
    });

    dropzone?.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropzone.classList.add("drag-over");
    });
    dropzone?.addEventListener("dragleave", () => dropzone.classList.remove("drag-over"));
    dropzone?.addEventListener("drop", (e) => {
      e.preventDefault();
      dropzone.classList.remove("drag-over");
      const files = Array.from(e.dataTransfer.files).filter(f => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
      this.mergeFiles = [...this.mergeFiles, ...files];
      this._renderMergeQueue();
    });

    mergeBtn?.addEventListener("click", () => this._mergePdfs());
  }

  _renderMergeQueue() {
    const list = document.getElementById("merge-queue-list");
    const countEl = document.getElementById("merge-count-badge");
    const mergeBtn = document.getElementById("btn-merge-pdfs");

    if (countEl) countEl.textContent = `${this.mergeFiles.length} PDFs Selected`;
    if (mergeBtn) mergeBtn.disabled = this.mergeFiles.length < 2;

    if (!list) return;
    list.innerHTML = "";

    this.mergeFiles.forEach((file, index) => {
      const item = document.createElement("div");
      item.className = "tool-queue-item";
      item.innerHTML = `
        <div class="tool-queue-item-info">
          <span style="font-weight:800; color:#e5322d; width:20px;">${index + 1}.</span>
          <div>
            <div class="tool-queue-item-title">${file.name}</div>
            <div class="tool-queue-item-size">${(file.size / 1024).toFixed(1)} KB</div>
          </div>
        </div>
        <div class="tool-queue-item-actions">
          <button type="button" class="tool-queue-btn move-up" ${index === 0 ? "disabled" : ""} title="Move Up">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg>
          </button>
          <button type="button" class="tool-queue-btn move-down" ${index === this.mergeFiles.length - 1 ? "disabled" : ""} title="Move Down">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <button type="button" class="tool-queue-btn danger" title="Remove PDF">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      `;

      item.querySelector(".move-up")?.addEventListener("click", () => {
        if (index > 0) {
          const temp = this.mergeFiles[index];
          this.mergeFiles[index] = this.mergeFiles[index - 1];
          this.mergeFiles[index - 1] = temp;
          this._renderMergeQueue();
        }
      });

      item.querySelector(".move-down")?.addEventListener("click", () => {
        if (index < this.mergeFiles.length - 1) {
          const temp = this.mergeFiles[index];
          this.mergeFiles[index] = this.mergeFiles[index + 1];
          this.mergeFiles[index + 1] = temp;
          this._renderMergeQueue();
        }
      });

      item.querySelector(".danger")?.addEventListener("click", () => {
        this.mergeFiles.splice(index, 1);
        this._renderMergeQueue();
      });

      list.appendChild(item);
    });
  }

  async _mergePdfs() {
    if (this.mergeFiles.length < 2) return;
    const mergeBtn = document.getElementById("btn-merge-pdfs");
    mergeBtn.disabled = true;
    mergeBtn.innerHTML = "Merging Documents...";

    try {
      const PDFLib = window.PDFLib;
      if (!PDFLib) throw new Error("PDF engine not initialized");

      const mergedPdf = await PDFLib.PDFDocument.create();

      for (const file of this.mergeFiles) {
        const buffer = await file.arrayBuffer();
        const pdf = await PDFLib.PDFDocument.load(buffer, { ignoreEncryption: true });
        const pageIndices = pdf.getPageIndices();
        const copiedPages = await mergedPdf.copyPages(pdf, pageIndices);
        copiedPages.forEach(p => mergedPdf.addPage(p));
      }

      const pdfBytes = await mergedPdf.save();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const dlUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = dlUrl;
      a.download = `merged_${Date.now()}.pdf`;
      a.click();
      URL.revokeObjectURL(dlUrl);

      document.getElementById("modal-merge-pdf").style.display = "none";
      this.mergeFiles = [];
      this._renderMergeQueue();
      alert("PDFs merged successfully! Download started.");
    } catch (err) {
      alert("Merge error: " + err.message);
    } finally {
      mergeBtn.disabled = false;
      mergeBtn.innerHTML = "Merge PDFs";
    }
  }

  // ------------------------------------------------------------------------
  // TOOL 2: JPG to PDF Converter
  // ------------------------------------------------------------------------
  openJpgToPdfModal(initialFiles = []) {
    const picker = document.getElementById("jpg-file-picker");
    if (picker) picker.value = "";
    this.jpgFiles = initialFiles.length > 0 ? [...initialFiles] : [];
    this._renderJpgQueue();
    this.openToolWorkspace("modal-jpg-to-pdf", "JPG to PDF", "Convert JPG, PNG, and WebP images into a clean PDF document.", '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2.2"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>');
  }

  _bindJpgToPdfModal() {
    const modal = document.getElementById("modal-jpg-to-pdf");
    const closeBtn = document.getElementById("close-jpg-to-pdf");
    const picker = document.getElementById("jpg-file-picker");
    const dropzone = document.getElementById("jpg-dropzone");
    const convertBtn = document.getElementById("btn-convert-jpg-to-pdf");

    closeBtn?.addEventListener("click", () => {
      this.closeToolWorkspace();
      modal.style.display = "none";
      this.jpgFiles = [];
      this._renderJpgQueue();
    });

    dropzone?.addEventListener("click", () => {
      if (picker) {
        picker.value = "";
        picker.click();
      }
    });

    picker?.addEventListener("change", (e) => {
      const files = Array.from(e.target.files);
      this.jpgFiles = [...this.jpgFiles, ...files];
      this._renderJpgQueue();
    });

    dropzone?.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropzone.classList.add("drag-over");
    });
    dropzone?.addEventListener("dragleave", () => dropzone.classList.remove("drag-over"));
    dropzone?.addEventListener("drop", (e) => {
      e.preventDefault();
      dropzone.classList.remove("drag-over");
      const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"));
      this.jpgFiles = [...this.jpgFiles, ...files];
      this._renderJpgQueue();
    });

    convertBtn?.addEventListener("click", () => this._convertJpgToPdf());
  }

  _renderJpgQueue() {
    const list = document.getElementById("jpg-queue-list");
    const countEl = document.getElementById("jpg-count-badge");
    const convertBtn = document.getElementById("btn-convert-jpg-to-pdf");

    if (countEl) countEl.textContent = `${this.jpgFiles.length} Images Selected`;
    if (convertBtn) convertBtn.disabled = this.jpgFiles.length === 0;

    if (!list) return;
    list.innerHTML = "";

    this.jpgFiles.forEach((file, index) => {
      const item = document.createElement("div");
      item.className = "tool-queue-item";
      item.innerHTML = `
        <div class="tool-queue-item-info">
          <span style="font-weight:800; color:#f59e0b; width:20px;">${index + 1}.</span>
          <div>
            <div class="tool-queue-item-title">${file.name}</div>
            <div class="tool-queue-item-size">${(file.size / 1024).toFixed(1)} KB</div>
          </div>
        </div>
        <div class="tool-queue-item-actions">
          <button type="button" class="tool-queue-btn danger" title="Remove image">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      `;

      item.querySelector(".tool-queue-btn.danger").addEventListener("click", (e) => {
        this.jpgFiles.splice(index, 1);
        this._renderJpgQueue();
      });

      list.appendChild(item);
    });
  }

  async _convertJpgToPdf() {
    if (this.jpgFiles.length === 0) return;
    const convertBtn = document.getElementById("btn-convert-jpg-to-pdf");
    const pageSizeSelect = document.getElementById("jpg-page-size")?.value || "fit";

    convertBtn.disabled = true;
    convertBtn.innerHTML = "Converting to PDF...";

    try {
      const PDFLib = window.PDFLib;
      if (!PDFLib) throw new Error("PDF engine not initialized");

      const pdfDoc = await PDFLib.PDFDocument.create();

      for (const file of this.jpgFiles) {
        const buffer = await file.arrayBuffer();
        let image;

        if (file.type === "image/png" || file.name.toLowerCase().endsWith(".png")) {
          image = await pdfDoc.embedPng(buffer);
        } else if (file.type === "image/jpeg" || file.name.toLowerCase().match(/\.(jpe?g)$/i)) {
          image = await pdfDoc.embedJpg(buffer);
        } else {
          const imgUrl = URL.createObjectURL(file);
          const img = new Image();
          await new Promise((res, rej) => {
            img.onload = res;
            img.onerror = rej;
            img.src = imgUrl;
          });
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0);
          const blob = await new Promise(r => canvas.toBlob(r, "image/jpeg", 0.95));
          image = await pdfDoc.embedJpg(await blob.arrayBuffer());
          URL.revokeObjectURL(imgUrl);
        }

        if (pageSizeSelect === "a4_portrait") {
          const page = pdfDoc.addPage([595.28, 841.89]);
          const scale = Math.min(555 / image.width, 801 / image.height);
          const w = image.width * scale;
          const h = image.height * scale;
          const x = (595.28 - w) / 2;
          const y = (841.89 - h) / 2;
          page.drawImage(image, { x, y, width: w, height: h });
        } else if (pageSizeSelect === "a4_landscape") {
          const page = pdfDoc.addPage([841.89, 595.28]);
          const scale = Math.min(801 / image.width, 555 / image.height);
          const w = image.width * scale;
          const h = image.height * scale;
          const x = (841.89 - w) / 2;
          const y = (595.28 - h) / 2;
          page.drawImage(image, { x, y, width: w, height: h });
        } else {
          const page = pdfDoc.addPage([image.width, image.height]);
          page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
        }
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const dlUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = dlUrl;
      a.download = `images_converted_${Date.now()}.pdf`;
      a.click();
      URL.revokeObjectURL(dlUrl);

      document.getElementById("modal-jpg-to-pdf").style.display = "none";
      this.jpgFiles = [];
      this._renderJpgQueue();
      alert("JPG to PDF conversion complete! File downloaded.");
    } catch (err) {
      alert("Conversion error: " + err.message);
    } finally {
      convertBtn.disabled = false;
      convertBtn.innerHTML = "Convert to PDF";
    }
  }

  // ------------------------------------------------------------------------
  // TOOL 3: Image Resize & Compressor
  // ------------------------------------------------------------------------
  openImageResizeModal() {
    this.resetImageResizeModal();
    this.openToolWorkspace("modal-image-resize", "Resize Image", "Resize images by exact pixel dimensions or percentage with aspect ratio lock.", '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>');
  }

  resetImageResizeModal() {
    this.resizeState = {
      file: null,
      img: null,
      origWidth: 0,
      origHeight: 0,
      aspectRatio: 1
    };
    const picker = document.getElementById("resize-file-picker");
    if (picker) picker.value = "";
    const previewImg = document.getElementById("resize-preview-img");
    if (previewImg) previewImg.src = "";
    const previewContainer = document.getElementById("resize-preview-container");
    if (previewContainer) previewContainer.style.display = "none";
    const controlsContainer = document.getElementById("resize-controls-container");
    if (controlsContainer) controlsContainer.style.display = "none";
    const dropzone = document.getElementById("resize-dropzone");
    if (dropzone) dropzone.style.display = "flex";
    const widthInput = document.getElementById("resize-width");
    if (widthInput) widthInput.value = "";
    const heightInput = document.getElementById("resize-height");
    if (heightInput) heightInput.value = "";
    const resizeBtn = document.getElementById("btn-do-resize");
    if (resizeBtn) {
      resizeBtn.disabled = true;
      resizeBtn.innerHTML = "Resize & Download";
    }
  }

  _bindImageResizeModal() {
    const modal = document.getElementById("modal-image-resize");
    const closeBtn = document.getElementById("close-image-resize");
    const picker = document.getElementById("resize-file-picker");
    const dropzone = document.getElementById("resize-dropzone");
    const widthInput = document.getElementById("resize-width");
    const heightInput = document.getElementById("resize-height");
    const aspectCheck = document.getElementById("resize-lock-aspect");
    const qualityInput = document.getElementById("resize-quality");
    const qualityVal = document.getElementById("resize-quality-val");
    const formatSelect = document.getElementById("resize-format");
    const resizeBtn = document.getElementById("btn-do-resize");

    closeBtn?.addEventListener("click", () => {
      this.resetImageResizeModal();
      modal.style.display = "none";
    });

    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        this.resetImageResizeModal();
        modal.style.display = "none";
      }
    });

    dropzone?.addEventListener("click", () => {
      if (picker) {
        picker.value = "";
        picker.click();
      }
    });

    picker?.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) this._loadImageForResize(file);
    });

    dropzone?.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropzone.classList.add("drag-over");
    });
    dropzone?.addEventListener("dragleave", () => dropzone.classList.remove("drag-over"));
    dropzone?.addEventListener("drop", (e) => {
      e.preventDefault();
      dropzone.classList.remove("drag-over");
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) {
        this._loadImageForResize(file);
      }
    });

    widthInput?.addEventListener("input", () => {
      if (aspectCheck?.checked && this.resizeState.aspectRatio) {
        const w = parseInt(widthInput.value, 10);
        if (!isNaN(w) && w > 0) {
          heightInput.value = Math.round(w / this.resizeState.aspectRatio);
        }
      }
    });

    heightInput?.addEventListener("input", () => {
      if (aspectCheck?.checked && this.resizeState.aspectRatio) {
        const h = parseInt(heightInput.value, 10);
        if (!isNaN(h) && h > 0) {
          widthInput.value = Math.round(h * this.resizeState.aspectRatio);
        }
      }
    });

    document.querySelectorAll(".resize-preset-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const scale = parseFloat(btn.dataset.scale);
        if (this.resizeState.origWidth && this.resizeState.origHeight) {
          widthInput.value = Math.round(this.resizeState.origWidth * scale);
          heightInput.value = Math.round(this.resizeState.origHeight * scale);
        }
      });
    });

    qualityInput?.addEventListener("input", () => {
      if (qualityVal) qualityVal.textContent = `${qualityInput.value}%`;
    });

    resizeBtn?.addEventListener("click", () => this._downloadResizedImage());
  }

  _loadImageForResize(file) {
    this.resizeState.file = file;
    const previewImg = document.getElementById("resize-preview-img");
    const previewContainer = document.getElementById("resize-preview-container");
    const controlsContainer = document.getElementById("resize-controls-container");
    const dropzone = document.getElementById("resize-dropzone");
    const widthInput = document.getElementById("resize-width");
    const heightInput = document.getElementById("resize-height");
    const resizeBtn = document.getElementById("btn-do-resize");

    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      this.resizeState.img = img;
      this.resizeState.origWidth = img.width;
      this.resizeState.origHeight = img.height;
      this.resizeState.aspectRatio = img.width / img.height;

      if (widthInput) widthInput.value = img.width;
      if (heightInput) heightInput.value = img.height;
      if (previewImg) previewImg.src = url;

      if (dropzone) dropzone.style.display = "none";
      if (previewContainer) previewContainer.style.display = "flex";
      if (controlsContainer) controlsContainer.style.display = "block";
      if (resizeBtn) resizeBtn.disabled = false;
    };
    img.src = url;
  }

  _downloadResizedImage() {
    if (!this.resizeState.img) return;

    const widthInput = document.getElementById("resize-width");
    const heightInput = document.getElementById("resize-height");
    const qualityInput = document.getElementById("resize-quality");
    const formatSelect = document.getElementById("resize-format");

    const targetWidth = parseInt(widthInput?.value, 10) || this.resizeState.origWidth;
    const targetHeight = parseInt(heightInput?.value, 10) || this.resizeState.origHeight;
    const quality = (parseInt(qualityInput?.value, 10) || 90) / 100;
    const mimeType = formatSelect?.value || "image/jpeg";
    const ext = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext("2d");

    if (mimeType === "image/jpeg") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, targetWidth, targetHeight);
    }
    ctx.drawImage(this.resizeState.img, 0, 0, targetWidth, targetHeight);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const dlUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = dlUrl;
      const baseName = (this.resizeState.file?.name || "image").replace(/\.[^/.]+$/, "");
      a.download = `${baseName}_resized_${targetWidth}x${targetHeight}.${ext}`;
      a.click();
      URL.revokeObjectURL(dlUrl);

      this.resetImageResizeModal();
      document.getElementById("modal-image-resize").style.display = "none";
      alert("Image resized successfully! Download started.");
    }, mimeType, quality);
  }

  // ------------------------------------------------------------------------
  // TOOL 4: Split PDF
  // ------------------------------------------------------------------------
  openSplitModal() {
    this.resetSplitPdfModal();
    this.openToolWorkspace("modal-split-pdf", "Split PDF", "Extract custom page ranges or separate all pages into individual files.", '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.2"><path d="M16 3h5v5"/><path d="M8 3H3v5"/><path d="M12 22v-8.3"/><path d="m9 16 3 3 3-3"/></svg>');
  }

  resetSplitPdfModal() {
    this.splitPdfDoc = null;
    this.splitFile = null;
    const picker = document.getElementById("split-file-picker");
    if (picker) picker.value = "";
    const dropzone = document.getElementById("split-dropzone");
    if (dropzone) dropzone.style.display = "flex";
    const controls = document.getElementById("split-controls");
    if (controls) controls.style.display = "none";
    const splitBtn = document.getElementById("btn-do-split");
    if (splitBtn) {
      splitBtn.disabled = true;
      splitBtn.innerHTML = "Extract & Download PDF";
    }
  }

  _bindSplitPdfModal() {
    const modal = document.getElementById("modal-split-pdf");
    const closeBtn = document.getElementById("close-split-pdf");
    const picker = document.getElementById("split-file-picker");
    const dropzone = document.getElementById("split-dropzone");
    const splitBtn = document.getElementById("btn-do-split");

    closeBtn?.addEventListener("click", () => {
      this.resetSplitPdfModal();
      modal.style.display = "none";
    });

    modal?.addEventListener("click", (e) => {
      if (e.target === modal) {
        this.resetSplitPdfModal();
        modal.style.display = "none";
      }
    });

    dropzone?.addEventListener("click", () => {
      if (picker) {
        picker.value = "";
        picker.click();
      }
    });

    picker?.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (file) {
        this.splitFile = file;
        const PDFLib = window.PDFLib;
        const buffer = await file.arrayBuffer();
        this.splitPdfDoc = await PDFLib.PDFDocument.load(buffer, { ignoreEncryption: true });
        const count = this.splitPdfDoc.getPageCount();

        document.getElementById("split-info-text").textContent = `${file.name} (${count} Pages)`;
        document.getElementById("split-page-to").value = count;
        document.getElementById("split-page-to").max = count;
        document.getElementById("split-controls").style.display = "block";
        dropzone.style.display = "none";
        splitBtn.disabled = false;
      }
    });

    splitBtn?.addEventListener("click", async () => {
      if (!this.splitPdfDoc) return;
      splitBtn.disabled = true;
      splitBtn.innerHTML = "Extracting Pages...";
      try {
        const from = Math.max(1, parseInt(document.getElementById("split-page-from").value, 10));
        const to = Math.min(this.splitPdfDoc.getPageCount(), parseInt(document.getElementById("split-page-to").value, 10));
        
        const PDFLib = window.PDFLib;
        const newDoc = await PDFLib.PDFDocument.create();
        const indices = [];
        for (let i = from - 1; i < to; i++) indices.push(i);

        const pages = await newDoc.copyPages(this.splitPdfDoc, indices);
        pages.forEach(p => newDoc.addPage(p));

        const bytes = await newDoc.save();
        const blob = new Blob([bytes], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `extracted_pages_${from}_to_${to}.pdf`;
        a.click();
        URL.revokeObjectURL(url);

        this.resetSplitPdfModal();
        modal.style.display = "none";
        alert(`Pages ${from} to ${to} extracted successfully!`);
      } catch (err) {
        alert("Split error: " + err.message);
      } finally {
        splitBtn.disabled = false;
        splitBtn.innerHTML = "Extract & Download PDF";
      }
    });
  }

  // ------------------------------------------------------------------------
  // TOOL 5: Rotate PDF
  // ------------------------------------------------------------------------
  openRotateModal() {
    this.resetRotatePdfModal();
    this.openToolWorkspace("modal-rotate-pdf", "Rotate PDF", "Rotate pages permanently clockwise or counter-clockwise.", '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" stroke-width="2.2"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>');
  }

  resetRotatePdfModal() {
    this.rotatePdfDoc = null;
    this.rotateFile = null;
    this.rotateAngle = 90;
    const picker = document.getElementById("rotate-file-picker");
    if (picker) picker.value = "";
    const dropzone = document.getElementById("rotate-dropzone");
    if (dropzone) dropzone.style.display = "flex";
    const controls = document.getElementById("rotate-controls");
    if (controls) controls.style.display = "none";
    const rotateBtn = document.getElementById("btn-do-rotate");
    if (rotateBtn) {
      rotateBtn.disabled = true;
      rotateBtn.innerHTML = "Rotate & Download PDF";
    }
  }

  _bindRotatePdfModal() {
    const modal = document.getElementById("modal-rotate-pdf");
    const closeBtn = document.getElementById("close-rotate-pdf");
    const picker = document.getElementById("rotate-file-picker");
    const dropzone = document.getElementById("rotate-dropzone");
    const rotateBtn = document.getElementById("btn-do-rotate");

    closeBtn?.addEventListener("click", () => {
      this.resetRotatePdfModal();
      modal.style.display = "none";
    });

    modal?.addEventListener("click", (e) => {
      if (e.target === modal) {
        this.resetRotatePdfModal();
        modal.style.display = "none";
      }
    });

    dropzone?.addEventListener("click", () => {
      if (picker) {
        picker.value = "";
        picker.click();
      }
    });

    picker?.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (file) {
        this.rotateFile = file;
        const PDFLib = window.PDFLib;
        const buffer = await file.arrayBuffer();
        this.rotatePdfDoc = await PDFLib.PDFDocument.load(buffer, { ignoreEncryption: true });
        
        document.getElementById("rotate-info-text").textContent = `${file.name} (${this.rotatePdfDoc.getPageCount()} Pages)`;
        document.getElementById("rotate-controls").style.display = "block";
        dropzone.style.display = "none";
        rotateBtn.disabled = false;
      }
    });

    document.querySelectorAll(".rotate-deg-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".rotate-deg-btn").forEach(b => b.classList.remove("selected"));
        btn.classList.add("selected");
        this.rotateAngle = parseInt(btn.dataset.deg, 10);
      });
    });

    rotateBtn?.addEventListener("click", async () => {
      if (!this.rotatePdfDoc) return;
      rotateBtn.disabled = true;
      rotateBtn.innerHTML = "Rotating Pages...";
      try {
        const PDFLib = window.PDFLib;
        const pages = this.rotatePdfDoc.getPages();
        pages.forEach(page => {
          const currentRotation = page.getRotation().angle;
          page.setRotation(PDFLib.degrees((currentRotation + this.rotateAngle) % 360));
        });

        const bytes = await this.rotatePdfDoc.save();
        const blob = new Blob([bytes], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `rotated_${Date.now()}.pdf`;
        a.click();
        URL.revokeObjectURL(url);

        this.resetRotatePdfModal();
        modal.style.display = "none";
        alert("PDF rotated successfully! Download started.");
      } catch (err) {
        alert("Rotation error: " + err.message);
      } finally {
        rotateBtn.disabled = false;
        rotateBtn.innerHTML = "Rotate & Download PDF";
      }
    });
  }

  // ------------------------------------------------------------------------
  // TOOL 6: Compress PDF (Custom Target Size in KB / MB / GB)
  // ------------------------------------------------------------------------
  openCompressModal() {
    const picker = document.getElementById("compress-pdf-picker");
    if (picker) picker.value = "";
    this.openToolWorkspace("modal-compress-pdf", "Compress PDF", "Reduce PDF file size to custom KB, MB, or GB with smart lossless compression.", '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.2"><path d="M4 14h6v6"/><path d="M20 10h-6V4"/><path d="m14 10 7-7"/><path d="m3 21 7-7"/></svg>');
  }

  openPdfToWordModal() {
    const picker = document.getElementById("pdf-to-word-picker");
    if (picker) picker.value = "";
    this.openToolWorkspace("modal-pdf-to-word", "PDF to Word (.docx)", "Convert PDF documents to editable Microsoft Word (.docx) files with layout preservation.", '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2.2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>');
  }

  openPdfToExcelModal() {
    const picker = document.getElementById("pdf-to-excel-picker");
    if (picker) picker.value = "";
    this.openToolWorkspace("modal-pdf-to-excel", "PDF to Excel (.xlsx, .csv)", "Extract tables and structured data from PDF into Microsoft Excel spreadsheets.", '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/><path d="M15 3v18"/></svg>');
  }

  openPdfToPptxModal() {
    const picker = document.getElementById("pdf-to-pptx-picker");
    if (picker) picker.value = "";
    this.openToolWorkspace("modal-pdf-to-pptx", "PDF to PowerPoint (.pptx)", "Convert PDF pages into editable widescreen 16:9 presentation slide decks.", '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="2.2"><rect width="20" height="15" x="2" y="3" rx="2"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/></svg>');
  }

  openWordToPdfModal() {
    const picker = document.getElementById("word-to-pdf-picker");
    if (picker) picker.value = "";
    this.openToolWorkspace("modal-word-to-pdf", "Word to PDF", "Convert Word documents (.docx, .doc, .txt) into clean, paginated PDF documents.", '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2.2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M12 18v-6"/><path d="m9 15 3 3 3-3"/></svg>');
  }

  openExcelToPdfModal() {
    const picker = document.getElementById("excel-to-pdf-picker");
    if (picker) picker.value = "";
    this.openToolWorkspace("modal-excel-to-pdf", "Excel to PDF", "Convert Excel spreadsheets (.xlsx, .csv) into executive table PDF reports.", '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 3v18"/></svg>');
  }

  openPptxToPdfModal() {
    const picker = document.getElementById("pptx-to-pdf-picker");
    if (picker) picker.value = "";
    this.openToolWorkspace("modal-pptx-to-pdf", "PowerPoint to PDF", "Convert presentation slide decks (.pptx) into high-resolution PDF documents.", '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="2.2"><rect width="20" height="15" x="2" y="3" rx="2"/><line x1="12" y1="18" x2="12" y2="22"/></svg>');
  }

  openAiSummarizerModal() {
    const picker = document.getElementById("ai-summarizer-picker");
    if (picker) picker.value = "";
    this.openToolWorkspace("modal-ai-summarizer", "PDF AI Summarizer", "Extract executive summaries, key bullet takeaways, or ask questions to your document offline.", '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="2.2"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>');
  }

  openTranslatorModal() {
    const picker = document.getElementById("translator-picker");
    if (picker) picker.value = "";
    this.openToolWorkspace("modal-translator", "PDF Translator", "Side-by-side multi-language translation for Hindi, Spanish, French, German, Bengali, and more.", '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#0284c7" stroke-width="2.2"><path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/></svg>');
  }

  openHtmlToPdfModal() {
    this.openToolWorkspace("modal-html-to-pdf", "HTML to PDF", "Real-time HTML/CSS code editor with live preview and instant A4 PDF export.", '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#0d9488" stroke-width="2.2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>');
  }

  openUnlockPdfModal() {
    const picker = document.getElementById("unlock-pdf-picker");
    if (picker) picker.value = "";
    this.openToolWorkspace("modal-unlock-pdf", "Unlock PDF", "Strip passwords, editing locks, and printing restrictions from protected PDF files.", '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.2"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>');
  }

  openPdfScannerModal() {
    const picker = document.getElementById("pdf-scanner-picker");
    if (picker) picker.value = "";
    this.openToolWorkspace("modal-pdf-scanner", "PDF Convert to Scanner", "Transform clean digital PDFs into authentic photocopies with contrast, paper grain, and skew.", '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" stroke-width="2.2"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><rect width="10" height="8" x="7" y="8" rx="1"/></svg>');
  }

  // ------------------------------------------------------------------------
  // TOOL 7: PDF to JPG Converter
  // ------------------------------------------------------------------------
  openPdfToJpgModal() {
    this.resetPdfToJpgModal();
    this.openToolWorkspace("modal-pdf-to-jpg", "PDF to JPG", "Convert and render PDF pages into high-resolution JPG images.", '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ec4899" stroke-width="2.2"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>');
  }

  resetPdfToJpgModal() {
    this.pdfToJpgFile = null;
    const picker = document.getElementById("pdf-to-jpg-file-picker");
    if (picker) picker.value = "";
    const dropzone = document.getElementById("pdf-to-jpg-dropzone");
    if (dropzone) dropzone.style.display = "flex";
    const controls = document.getElementById("pdf-to-jpg-controls");
    if (controls) controls.style.display = "none";
    const convertBtn = document.getElementById("btn-do-pdf-to-jpg");
    if (convertBtn) {
      convertBtn.disabled = true;
      convertBtn.innerHTML = "Convert & Download JPGs";
    }
  }

  _bindPdfToJpgModal() {
    const modal = document.getElementById("modal-pdf-to-jpg");
    const closeBtn = document.getElementById("close-pdf-to-jpg");
    const picker = document.getElementById("pdf-to-jpg-file-picker");
    const dropzone = document.getElementById("pdf-to-jpg-dropzone");
    const convertBtn = document.getElementById("btn-do-pdf-to-jpg");

    closeBtn?.addEventListener("click", () => {
      this.resetPdfToJpgModal();
      modal.style.display = "none";
    });

    modal?.addEventListener("click", (e) => {
      if (e.target === modal) {
        this.resetPdfToJpgModal();
        modal.style.display = "none";
      }
    });

    dropzone?.addEventListener("click", () => {
      if (picker) {
        picker.value = "";
        picker.click();
      }
    });

    picker?.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        this.pdfToJpgFile = file;
        document.getElementById("pdf-to-jpg-info-text").textContent = file.name;
        document.getElementById("pdf-to-jpg-controls").style.display = "block";
        dropzone.style.display = "none";
        convertBtn.disabled = false;
      }
    });

    convertBtn?.addEventListener("click", async () => {
      if (!this.pdfToJpgFile) return;
      convertBtn.disabled = true;
      convertBtn.innerHTML = "Rendering Pages to JPG...";

      try {
        const pdfjsLib = window.pdfjsLib;
        const buffer = await this.pdfToJpgFile.arrayBuffer();
        const doc = await pdfjsLib.getDocument({ data: buffer }).promise;
        const numPages = doc.numPages;

        for (let i = 1; i <= Math.min(numPages, 10); i++) {
          const page = await doc.getPage(i);
          const viewport = page.getViewport({ scale: 2.0 });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext("2d");

          await page.render({ canvasContext: ctx, viewport }).promise;

          const blob = await new Promise(r => canvas.toBlob(r, "image/jpeg", 0.92));
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `page_${i}.jpg`;
          a.click();
          URL.revokeObjectURL(url);
        }

        this.resetPdfToJpgModal();
        modal.style.display = "none";
        alert("PDF pages converted to JPG images! Downloads complete.");
      } catch (err) {
        alert("Conversion error: " + err.message);
      } finally {
        convertBtn.disabled = false;
        convertBtn.innerHTML = "Convert & Download JPGs";
      }
    });
  }
}

// Robust bootstrap handling both 'loading' and already 'interactive'/'complete' readyStates
function initPortal() {
  if (typeof window !== "undefined" && !window.portal) {
    window.portal = new PortalManager();
  }
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initPortal);
  } else {
    initPortal();
  }
}
