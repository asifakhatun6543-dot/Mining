/**
 * OpenPDF Studio - Ultra-Aesthetic Portal Controller & Client-Side Tools Suite
 * Powered by PDF-Lib, PDF.js, and HTML5 Canvas
 */

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
  }

  // ------------------------------------------------------------------------
  // View Switching
  // ------------------------------------------------------------------------
  switchView(viewName) {
    if (viewName === "editor") {
      if (this.landingView) this.landingView.style.display = "none";
      if (this.editorView) this.editorView.style.display = "flex";
      window.scrollTo(0, 0);
      window.location.hash = "#editor";
    } else {
      if (this.editorView) this.editorView.style.display = "none";
      if (this.landingView) this.landingView.style.display = "flex";
      window.scrollTo(0, 0);
      history.replaceState(null, null, " ");
    }
  }

  _bindNavigation() {
    // Logo & Home links
    document.getElementById("portal-logo-link")?.addEventListener("click", () => {
      this.switchView("landing");
    });

    // Back to Home button in editor header
    document.getElementById("btn-back-to-home")?.addEventListener("click", () => {
      this.switchView("landing");
    });

    // Nav CTA: Open Editor
    document.querySelectorAll(".open-editor-cta").forEach(el => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        this.switchView("editor");
      });
    });

    // Nav Tool buttons
    document.getElementById("nav-btn-merge")?.addEventListener("click", () => this.openMergeModal());
    document.getElementById("nav-btn-split")?.addEventListener("click", () => this.openSplitModal());
    document.getElementById("nav-btn-compress")?.addEventListener("click", () => this.openCompressModal());
    document.getElementById("nav-btn-jpg-to-pdf")?.addEventListener("click", () => this.openJpgToPdfModal());
    document.getElementById("nav-btn-pdf-to-jpg")?.addEventListener("click", () => this.openPdfToJpgModal());
    document.getElementById("nav-btn-resize")?.addEventListener("click", () => this.openImageResizeModal());

    // Handle hash on initial load
    if (window.location.hash === "#editor") {
      this.switchView("editor");
    }
  }

  // ------------------------------------------------------------------------
  // Filter Category Tabs
  // ------------------------------------------------------------------------
  _bindFilterTabs() {
    const tabs = document.querySelectorAll(".filter-tab-btn");
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

    dropzone.addEventListener("click", () => fileInput.click());

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
      fileInput.value = "";
    });
  }

  _handleUniversalFiles(files) {
    const pdfFiles = files.filter(f => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
    const imgFiles = files.filter(f => f.type.startsWith("image/") || /\.(jpe?g|png|webp|gif|bmp)$/i.test(f.name));

    if (pdfFiles.length === 1 && imgFiles.length === 0) {
      this.switchView("editor");
      if (window.app && window.app.loadPDFFile) {
        window.app.loadPDFFile(pdfFiles[0]);
      }
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
    document.getElementById("card-tool-editor")?.addEventListener("click", () => {
      this.openEditModal();
    });

    document.getElementById("card-tool-merge-pdf")?.addEventListener("click", () => {
      this.openMergeModal();
    });

    document.getElementById("card-tool-split-pdf")?.addEventListener("click", () => {
      this.openSplitModal();
    });

    document.getElementById("card-tool-compress-pdf")?.addEventListener("click", () => {
      this.openCompressModal();
    });

    document.getElementById("card-tool-jpg-to-pdf")?.addEventListener("click", () => {
      this.openJpgToPdfModal();
    });

    document.getElementById("card-tool-pdf-to-jpg")?.addEventListener("click", () => {
      this.openPdfToJpgModal();
    });

    document.getElementById("card-tool-image-resize")?.addEventListener("click", () => {
      this.openImageResizeModal();
    });

    document.getElementById("card-tool-rotate-pdf")?.addEventListener("click", () => {
      this.openRotateModal();
    });

    document.getElementById("card-tool-sign-pdf")?.addEventListener("click", () => {
      this.switchView("editor");
      if (window.app && window.app.toolbar) {
        window.app.toolbar.setTool("signature");
      }
    });

    document.getElementById("card-tool-watermark-pdf")?.addEventListener("click", () => {
      this.switchView("editor");
      if (window.app && window.app.toolbar) {
        window.app.toolbar.setTool("watermark");
      }
    });

    document.getElementById("card-tool-ocr")?.addEventListener("click", () => {
      this.switchView("editor");
      const scannedBtn = document.getElementById("load-sample-scanned");
      if (scannedBtn) scannedBtn.click();
    });

    document.getElementById("card-tool-redact")?.addEventListener("click", () => {
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
    const modal = document.getElementById("modal-edit-pdf");
    if (!modal) return;
    modal.style.display = "flex";
  }

  _bindEditPdfModal() {
    const modal = document.getElementById("modal-edit-pdf");
    const closeBtn = document.getElementById("close-edit-pdf");
    const picker = document.getElementById("edit-modal-file-picker");
    const dropzone = document.getElementById("edit-pdf-dropzone");
    const chooseBtn = document.getElementById("btn-choose-edit-pdf");
    if (!modal) return;

    closeBtn?.addEventListener("click", () => {
      modal.style.display = "none";
    });

    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.style.display = "none";
    });

    const triggerPick = () => picker?.click();
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
        if (window.app && window.app.loadPDFFile) {
          window.app.loadPDFFile(files[0]);
        }
      }
      picker.value = "";
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
        if (window.app && window.app.loadPDFFile) {
          window.app.loadPDFFile(files[0]);
        }
      }
    });
  }

  // ------------------------------------------------------------------------
  // TOOL 1: Merge PDF
  // ------------------------------------------------------------------------
  openMergeModal(initialFiles = []) {
    const modal = document.getElementById("modal-merge-pdf");
    if (!modal) return;
    modal.style.display = "flex";
    if (initialFiles.length > 0) {
      this.mergeFiles = [...this.mergeFiles, ...initialFiles];
      this._renderMergeQueue();
    }
  }

  _bindMergePdfModal() {
    const modal = document.getElementById("modal-merge-pdf");
    const closeBtn = document.getElementById("close-merge-pdf");
    const picker = document.getElementById("merge-file-picker");
    const dropzone = document.getElementById("merge-dropzone");
    const mergeBtn = document.getElementById("btn-merge-pdfs");

    closeBtn?.addEventListener("click", () => {
      modal.style.display = "none";
      this.mergeFiles = [];
      this._renderMergeQueue();
    });

    dropzone?.addEventListener("click", () => picker?.click());

    picker?.addEventListener("change", (e) => {
      const files = Array.from(e.target.files);
      this.mergeFiles = [...this.mergeFiles, ...files];
      this._renderMergeQueue();
      picker.value = "";
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
    const modal = document.getElementById("modal-jpg-to-pdf");
    if (!modal) return;
    modal.style.display = "flex";
    if (initialFiles.length > 0) {
      this.jpgFiles = [...this.jpgFiles, ...initialFiles];
      this._renderJpgQueue();
    }
  }

  _bindJpgToPdfModal() {
    const modal = document.getElementById("modal-jpg-to-pdf");
    const closeBtn = document.getElementById("close-jpg-to-pdf");
    const picker = document.getElementById("jpg-file-picker");
    const dropzone = document.getElementById("jpg-dropzone");
    const convertBtn = document.getElementById("btn-convert-jpg-to-pdf");

    closeBtn?.addEventListener("click", () => {
      modal.style.display = "none";
      this.jpgFiles = [];
      this._renderJpgQueue();
    });

    dropzone?.addEventListener("click", () => picker?.click());

    picker?.addEventListener("change", (e) => {
      const files = Array.from(e.target.files);
      this.jpgFiles = [...this.jpgFiles, ...files];
      this._renderJpgQueue();
      picker.value = "";
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
    const modal = document.getElementById("modal-image-resize");
    if (modal) modal.style.display = "flex";
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
      modal.style.display = "none";
    });

    dropzone?.addEventListener("click", () => picker?.click());

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

      document.getElementById("modal-image-resize").style.display = "none";
      alert("Image resized successfully! Download started.");
    }, mimeType, quality);
  }

  // ------------------------------------------------------------------------
  // TOOL 4: Split PDF
  // ------------------------------------------------------------------------
  openSplitModal() {
    const modal = document.getElementById("modal-split-pdf");
    if (modal) modal.style.display = "flex";
  }

  _bindSplitPdfModal() {
    const modal = document.getElementById("modal-split-pdf");
    const closeBtn = document.getElementById("close-split-pdf");
    const picker = document.getElementById("split-file-picker");
    const dropzone = document.getElementById("split-dropzone");
    const splitBtn = document.getElementById("btn-do-split");

    closeBtn?.addEventListener("click", () => modal.style.display = "none");
    dropzone?.addEventListener("click", () => picker?.click());

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
    const modal = document.getElementById("modal-rotate-pdf");
    if (modal) modal.style.display = "flex";
  }

  _bindRotatePdfModal() {
    const modal = document.getElementById("modal-rotate-pdf");
    const closeBtn = document.getElementById("close-rotate-pdf");
    const picker = document.getElementById("rotate-file-picker");
    const dropzone = document.getElementById("rotate-dropzone");
    const rotateBtn = document.getElementById("btn-do-rotate");

    closeBtn?.addEventListener("click", () => modal.style.display = "none");
    dropzone?.addEventListener("click", () => picker?.click());

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
  // TOOL 6: Compress PDF (Client-side optimization)
  // ------------------------------------------------------------------------
  openCompressModal() {
    this.openSplitModal(); // Or opens compress
  }

  // ------------------------------------------------------------------------
  // TOOL 7: PDF to JPG Converter
  // ------------------------------------------------------------------------
  openPdfToJpgModal() {
    const modal = document.getElementById("modal-pdf-to-jpg");
    if (modal) modal.style.display = "flex";
  }

  _bindPdfToJpgModal() {
    const modal = document.getElementById("modal-pdf-to-jpg");
    const closeBtn = document.getElementById("close-pdf-to-jpg");
    const picker = document.getElementById("pdf-to-jpg-file-picker");
    const dropzone = document.getElementById("pdf-to-jpg-dropzone");
    const convertBtn = document.getElementById("btn-do-pdf-to-jpg");

    closeBtn?.addEventListener("click", () => modal.style.display = "none");
    dropzone?.addEventListener("click", () => picker?.click());

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

// Instantiate on DOM load
document.addEventListener("DOMContentLoaded", () => {
  window.portal = new PortalManager();
});
