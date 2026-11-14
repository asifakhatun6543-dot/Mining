/**
 * OpenPDF Studio - Main Application Controller
 */

import { State, getApiUrl } from "./state.js";
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
    // Expose app instance globally immediately
    window.app = this;

    // DOM Elements
    const viewportContainer = document.getElementById("pages-viewport");
    const thumbnailsContainer = document.getElementById("thumbnails-container");

    try {
      this.renderer = new PDFRenderer(viewportContainer, thumbnailsContainer);
    } catch (e) {
      console.error("Failed to initialize PDFRenderer:", e);
    }

    try {
      this.selectionManager = new TextSelectionManager();
    } catch (e) {
      console.error("Failed to initialize TextSelectionManager:", e);
    }

    try {
      this.textEditor = new InlineTextEditor();
    } catch (e) {
      console.error("Failed to initialize InlineTextEditor:", e);
    }

    try {
      this.scannedEditor = new ScannedEditor();
    } catch (e) {
      console.error("Failed to initialize ScannedEditor:", e);
    }

    try {
      this.toolbar = new ToolbarManager();
    } catch (e) {
      console.error("Failed to initialize ToolbarManager:", e);
    }

    try {
      this.exportClient = new ExportClient();
    } catch (e) {
      console.error("Failed to initialize ExportClient:", e);
    }

    try {
      this._bindHeaderActions();
      this._bindPageActions();
      this._bindZoomAndNavigation();
      this._bindInspector();
      this._bindDropzoneAndSamples();
      this._bindKeyboardShortcuts();
      this._bindToastSystem();
      this._bindFindAndReplace();
    } catch (e) {
      console.error("Failed to bind UI actions:", e);
    }

    // Set default tool to edit-text to match UI active state
    if (this.toolbar && typeof this.toolbar.setTool === "function") {
      this.toolbar.setTool("edit-text");
    }

    // Check backend health
    this._checkHealth();
  }

  async _checkHealth() {
    try {
      const res = await fetch(getApiUrl("/api/health"));
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

    // Done button (Desktop & Mobile)
    document.getElementById("header-done-btn")?.addEventListener("click", () => {
      this.exportClient.exportCurrentDocument();
    });
    document.getElementById("mobile-toolbar-done-btn")?.addEventListener("click", () => {
      this.exportClient.exportCurrentDocument();
    });

    // Filename input
    const filenameInput = document.getElementById("document-title-input");
    if (filenameInput) {
      filenameInput.addEventListener("change", (e) => {
        State.filename = e.target.value.trim() || "document.pdf";
      });
    }

    // 3-Horizontal-Line Hamburger Menu & Dropdown
    const menuBtn = document.getElementById("header-menu-btn");
    const dropdownMenu = document.getElementById("header-dropdown-menu");

    menuBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!dropdownMenu) return;
      const isOpen = dropdownMenu.style.display === "flex";
      dropdownMenu.style.display = isOpen ? "none" : "flex";
      menuBtn.setAttribute("aria-expanded", !isOpen);
    });

    document.addEventListener("click", (e) => {
      if (dropdownMenu && !dropdownMenu.contains(e.target) && e.target !== menuBtn && !menuBtn?.contains(e.target)) {
        dropdownMenu.style.display = "none";
        menuBtn?.setAttribute("aria-expanded", "false");
      }
    });

    document.getElementById("menu-opt-download")?.addEventListener("click", () => {
      if (dropdownMenu) dropdownMenu.style.display = "none";
      this.exportClient.exportCurrentDocument();
    });

    document.getElementById("menu-opt-save")?.addEventListener("click", () => {
      if (dropdownMenu) dropdownMenu.style.display = "none";
      document.getElementById("header-save-btn")?.click();
    });

    document.getElementById("menu-opt-print")?.addEventListener("click", () => {
      if (dropdownMenu) dropdownMenu.style.display = "none";
      document.getElementById("header-print-btn")?.click();
    });

    document.getElementById("menu-opt-open")?.addEventListener("click", () => {
      if (dropdownMenu) dropdownMenu.style.display = "none";
      document.getElementById("header-open-btn")?.click();
    });

    // Open file button
    document.getElementById("header-open-btn")?.addEventListener("click", () => {
      const picker = document.getElementById("pdf-file-picker");
      if (picker) {
        picker.value = "";
        picker.click();
      }
    });

    document.getElementById("pdf-file-picker")?.addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) this.loadPDFFile(file);
      e.target.value = ""; // Always reset value so selecting same file triggers change
    });
  }

  _bindPageActions() {
    // Rotate Page with immediate visual feedback
    document.getElementById("sidebar-rotate-btn")?.addEventListener("click", () => {
      const pno = State.currentPage;
      const op = { type: "rotate", page_number: pno, rotation_angle: 90 };
      State.addPageOperation(op);

      // Visual feedback: apply CSS rotation to page container and thumbnail
      const pageEl = document.getElementById(`page-container-${pno}`);
      const thumbEl = document.getElementById(`thumb-page-${pno}`);
      const currentRot = (parseInt(pageEl?.dataset.rotation || "0") + 90) % 360;
      if (pageEl) {
        pageEl.dataset.rotation = currentRot;
        const canvas = pageEl.querySelector(".pdf-canvas-layer");
        if (canvas) canvas.style.transform = `rotate(${currentRot}deg)`;
      }
      if (thumbEl) {
        thumbEl.dataset.rotation = currentRot;
        const thumbCanvas = thumbEl.querySelector("canvas");
        if (thumbCanvas) thumbCanvas.style.transform = `rotate(${currentRot}deg)`;
      }
      this.showToast("info", `Rotated Page ${pno + 1} by 90°`);
    });

    // Delete Page with immediate visual feedback
    document.getElementById("sidebar-delete-btn")?.addEventListener("click", () => {
      if (State.pageCount <= 1) {
        this.showToast("warning", "Cannot delete the only page in the document.");
        return;
      }
      const pno = State.currentPage;
      if (confirm(`Delete Page ${pno + 1}?`)) {
        const op = { type: "delete", page_number: pno };
        State.addPageOperation(op);
        const pageEl = document.getElementById(`page-container-${pno}`);
        const thumbEl = document.getElementById(`thumb-page-${pno}`);
        if (pageEl) {
          pageEl.style.opacity = "0.35";
          pageEl.style.filter = "grayscale(90%)";
        }
        if (thumbEl) {
          thumbEl.style.opacity = "0.35";
          thumbEl.style.border = "2px dashed #ef4444";
        }
        this.showToast("info", `Page ${pno + 1} marked for deletion on export.`);
      }
    });

    // Duplicate Page
    document.getElementById("sidebar-duplicate-btn")?.addEventListener("click", () => {
      const op = { type: "duplicate", page_number: State.currentPage };
      State.addPageOperation(op);
      this.showToast("info", `Page ${State.currentPage + 1} duplicated.`);
    });

    // Insert Blank Page (Support both sidebar-insert-btn and sidebar-add-btn)
    const handleInsert = () => {
      const op = { type: "insert_blank", target_page: State.currentPage + 1 };
      State.addPageOperation(op);
      this.showToast("info", `Blank page inserted after Page ${State.currentPage + 1}.`);
    };
    document.getElementById("sidebar-insert-btn")?.addEventListener("click", handleInsert);
    document.getElementById("sidebar-add-btn")?.addEventListener("click", handleInsert);

    // Sidebar Toggle with smooth mobile slide-in drawer & backdrop
    const sidebar = document.getElementById("left-sidebar");
    const backdrop = document.getElementById("sidebar-backdrop");

    const closeSidebarMobile = () => {
      if (sidebar) {
        sidebar.classList.remove("mobile-open");
        if (window.innerWidth <= 768) {
          setTimeout(() => {
            if (!sidebar.classList.contains("mobile-open")) {
              sidebar.style.display = "none";
            }
          }, 280);
        } else {
          sidebar.style.display = "none";
        }
      }
      if (backdrop) {
        backdrop.classList.remove("active");
        setTimeout(() => {
          if (!backdrop.classList.contains("active")) {
            backdrop.style.display = "none";
          }
        }, 250);
      }
    };

    const toggleSidebar = () => {
      if (!sidebar) return;
      const isMobile = window.innerWidth <= 768;
      if (isMobile) {
        const isOpen = sidebar.classList.contains("mobile-open");
        if (isOpen) {
          closeSidebarMobile();
        } else {
          sidebar.style.display = "flex";
          void sidebar.offsetWidth;
          sidebar.classList.add("mobile-open");
          if (backdrop) {
            backdrop.style.display = "block";
            void backdrop.offsetWidth;
            backdrop.classList.add("active");
          }
        }
      } else {
        const isVisible = sidebar.style.display !== "none" && getComputedStyle(sidebar).display !== "none";
        sidebar.style.display = isVisible ? "none" : "flex";
      }
    };

    document.getElementById("btn-toggle-pages")?.addEventListener("click", toggleSidebar);
    document.getElementById("sidebar-close-btn")?.addEventListener("click", closeSidebarMobile);
    backdrop?.addEventListener("click", closeSidebarMobile);

    // On mobile, tap on thumbnail closes the sidebar so user can edit right away
    sidebar?.addEventListener("click", (e) => {
      if (window.innerWidth <= 768 && e.target.closest(".thumb-item")) {
        closeSidebarMobile();
      }
    });

    // On mobile, tap on workspace automatically closes the sidebar drawer
    document.getElementById("center-workspace")?.addEventListener("click", (e) => {
      if (window.innerWidth <= 768 && sidebar && (sidebar.style.display !== "none" || sidebar.classList.contains("mobile-open")) && !sidebar.contains(e.target) && !e.target.closest("#btn-toggle-pages")) {
        closeSidebarMobile();
      }
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
      const firstPage = State.pageDimensions?.[0];
      const pageW = firstPage?.width || 612;
      const ws = document.getElementById("center-workspace");
      const availableW = (ws ? ws.clientWidth : window.innerWidth) - 32;
      const fitScale = Math.min(2.0, Math.max(0.35, Math.round((availableW / pageW) * 100) / 100));
      State.setZoom(fitScale);
      this.renderer.updateZoom();
      this._updateZoomUI();
    });

    State.subscribe("pageChanged", (pno) => {
      const pageDisplay = document.getElementById("page-num-display");
      if (pageDisplay) pageDisplay.textContent = pno + 1;
    });

    // Real-time dynamic page stepper update on scrolling workspace
    const workspace = document.getElementById("center-workspace");
    if (workspace) {
      let scrollTimer = null;
      workspace.addEventListener("scroll", () => {
        if (scrollTimer) return;
        scrollTimer = setTimeout(() => {
          scrollTimer = null;
          const wsRect = workspace.getBoundingClientRect();
          const centerY = wsRect.top + wsRect.height / 2;
          for (let pno = 0; pno < State.pageCount; pno++) {
            const pageEl = document.getElementById(`page-container-${pno}`);
            if (pageEl) {
              const pRect = pageEl.getBoundingClientRect();
              if (pRect.top <= centerY && pRect.bottom >= centerY) {
                if (State.currentPage !== pno) {
                  State.currentPage = pno;
                  const pageDisplay = document.getElementById("page-num-display");
                  if (pageDisplay) pageDisplay.textContent = pno + 1;
                }
                break;
              }
            }
          }
        }, 80);
      }, { passive: true });
    }
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
      const sampleUrl = new URL("sample_docs/sample_digital_contract.pdf", document.baseURI).href;
      await this.loadSampleDocument(sampleUrl, "sample_digital_contract.pdf");
    });

    document.getElementById("load-sample-scanned")?.addEventListener("click", async () => {
      welcomeModal.style.display = "none";
      const sampleUrl = new URL("sample_docs/sample_scanned_receipt.pdf", document.baseURI).href;
      await this.loadSampleDocument(sampleUrl, "sample_scanned_receipt.pdf");
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

  // ------------------------------------------------------------------------
  // Loading Modal System
  // ------------------------------------------------------------------------
  _showLoadingModal(title, desc, status, pct) {
    const modal = document.getElementById("modal-loading-pdf");
    if (!modal) return;
    const titleEl = document.getElementById("loading-pdf-title");
    const descEl = document.getElementById("loading-pdf-desc");
    const statusEl = document.getElementById("loading-pdf-status-text");
    const barEl = document.getElementById("loading-pdf-bar");

    if (titleEl && title) titleEl.textContent = title;
    if (descEl && desc) descEl.textContent = desc;
    if (statusEl && status) statusEl.textContent = status;
    if (barEl && pct !== undefined) barEl.style.width = `${pct}%`;

    modal.style.display = "flex";
  }

  _updateLoadingProgress(status, pct) {
    const statusEl = document.getElementById("loading-pdf-status-text");
    const barEl = document.getElementById("loading-pdf-bar");
    if (statusEl && status) statusEl.textContent = status;
    if (barEl && pct !== undefined) barEl.style.width = `${pct}%`;
  }

  _hideLoadingModal() {
    const modal = document.getElementById("modal-loading-pdf");
    if (!modal) return;
    modal.style.opacity = "0";
    modal.style.transition = "opacity 0.25s ease";
    setTimeout(() => {
      modal.style.display = "none";
      modal.style.opacity = "1";
    }, 250);
  }

  // ------------------------------------------------------------------------
  // Ultra-Fast Client-Side PDF Text & Typography Extractor
  // Powered by PDF.js (Zero backend dependency / 100% offline & fast)
  // ------------------------------------------------------------------------
  _extractRawPDFFonts(arrayBuffer) {
    if (!arrayBuffer) return [];
    try {
      const text = new TextDecoder("latin1").decode(new Uint8Array(arrayBuffer));
      const fontMatches = [...text.matchAll(/\/BaseFont\s*\/([A-Za-z0-9_\-+]+)/g)].map(m => m[1]);
      const cleanFonts = fontMatches.map(f => f.replace(/^[A-Z]{6}\+/, ""));
      return [...new Set(cleanFonts)];
    } catch (e) {
      return [];
    }
  }

  async _extractClientSidePages(pdfJsDoc, filename, arrayBuffer) {
    const pages = [];
    const detectedFonts = new Set();
    const pageDimensions = [];

    const rawDocFonts = this._extractRawPDFFonts(arrayBuffer);
    const docHasSerif = rawDocFonts.some(f => /times|roman|serif|georgia|cambria|garamond|palatino|century|tinos/i.test(f));
    const docHasMono = rawDocFonts.some(f => /courier|mono|consolas|fixed/i.test(f));

    for (let pageNum = 1; pageNum <= pdfJsDoc.numPages; pageNum++) {
      const page = await pdfJsDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.0 });
      const pageW = viewport.width;
      const pageH = viewport.height;
      pageDimensions.push({ width: pageW, height: pageH });

      // Pre-populate commonObjs with font objects
      try {
        await page.getOperatorList();
      } catch (e) {}

      const textContent = await page.getTextContent();
      const rawSpans = [];

      textContent.items.forEach((item, itemIdx) => {
        const text = item.str;
        if (!text || !text.trim()) return;

        const tx = item.transform[4];
        const ty = item.transform[5];
        const fontH = Math.hypot(item.transform[2], item.transform[3]) || item.height || 12;

        // Top-left coordinate conversion
        const baselineY = pageH - ty;
        const topY = Math.max(0, baselineY - fontH);
        const bottomY = baselineY + fontH * 0.25;
        const x0 = tx;
        const x1 = tx + item.width;

        // Retrieve real font object from PDF.js commonObjs if available
        let realFontName = "";
        let isFontBold = false;
        let isFontItalic = false;

        if (page.commonObjs && page.commonObjs.has(item.fontName)) {
          const fontObj = page.commonObjs.get(item.fontName);
          realFontName = fontObj.name || fontObj.loadedName || "";
          isFontBold = !!fontObj.bold || !!fontObj.black;
          isFontItalic = !!fontObj.italic;
        }

        const cleanReal = realFontName.replace(/^[A-Z]{6}\+/, "");
        const style = textContent.styles?.[item.fontName];
        const fontFam = (style?.fontFamily || "").toLowerCase();
        const combined = `${cleanReal} ${item.fontName} ${fontFam}`.toLowerCase();

        let detectedFamily = "Helvetica";
        let flags = 0;

        if (/times|roman|georgia|cambria|serif|garamond|palatino|century|tinos/i.test(combined) || (docHasSerif && !/sans|arial|helvetica|calibri/i.test(combined))) {
          detectedFamily = "times-roman";
          flags |= 4; // Serif flag
          detectedFonts.add("Times New Roman / Serif");
        } else if (/courier|mono|consolas|fixed/i.test(combined) || (docHasMono && !/sans|arial|helvetica/i.test(combined))) {
          detectedFamily = "courier";
          flags |= 1; // Monospace flag
          detectedFonts.add("Courier New / Monospace");
        } else if (/calibri|carlito/i.test(combined)) {
          detectedFamily = "calibri";
          flags |= 0;
          detectedFonts.add("Calibri");
        } else if (/arial/i.test(combined)) {
          detectedFamily = "arial";
          flags |= 0;
          detectedFonts.add("Arial");
        } else {
          detectedFamily = "helvetica";
          detectedFonts.add("Helvetica / Arial (Standard)");
        }

        if (isFontBold || /bold|black|heavy|semibold/i.test(combined)) {
          flags |= 16; // Bold flag
        }
        if (isFontItalic || /italic|oblique/i.test(combined)) {
          flags |= 2; // Italic flag
        }

        rawSpans.push({
          id: `span_${pageNum - 1}_${itemIdx}`,
          text: text,
          currentText: text,
          bbox: [
            Math.round(x0 * 100) / 100,
            Math.round(topY * 100) / 100,
            Math.round(x1 * 100) / 100,
            Math.round(bottomY * 100) / 100
          ],
          size: Math.round(fontH * 10) / 10,
          font: detectedFamily,
          fontName: item.fontName,
          flags: flags,
          color: 0
        });
      });

      // Group spans by line for structural navigation
      rawSpans.sort((a, b) => a.bbox[1] - b.bbox[1] || a.bbox[0] - b.bbox[0]);
      const lines = [];
      let currentLine = null;

      rawSpans.forEach(span => {
        if (!currentLine) {
          currentLine = { bbox: [...span.bbox], spans: [span] };
          lines.push(currentLine);
        } else {
          const lastSpan = currentLine.spans[currentLine.spans.length - 1];
          if (Math.abs(span.bbox[1] - lastSpan.bbox[1]) < 4) {
            currentLine.spans.push(span);
            currentLine.bbox[0] = Math.min(currentLine.bbox[0], span.bbox[0]);
            currentLine.bbox[1] = Math.min(currentLine.bbox[1], span.bbox[1]);
            currentLine.bbox[2] = Math.max(currentLine.bbox[2], span.bbox[2]);
            currentLine.bbox[3] = Math.max(currentLine.bbox[3], span.bbox[3]);
          } else {
            currentLine = { bbox: [...span.bbox], spans: [span] };
            lines.push(currentLine);
          }
        }
      });

      const blocks = lines.map((line, lineIdx) => ({
        number: lineIdx,
        type: 0,
        bbox: line.bbox,
        lines: [line]
      }));

      pages.push({
        page_number: pageNum - 1,
        width: pageW,
        height: pageH,
        blocks: blocks
      });
    }

    const docInfo = {
      document_id: `doc_${Date.now()}`,
      filename: filename || "document.pdf",
      page_count: pdfJsDoc.numPages,
      page_dimensions: pageDimensions,
      is_scanned: pages.every(p => p.blocks.length === 0),
      is_mixed: false,
      is_encrypted: false,
      detected_fonts: Array.from(detectedFonts),
      has_insufficient_text: pages.every(p => p.blocks.length === 0),
      unsupportedFeatures: []
    };

    return { docInfo, pages };
  }

  resetDocument() {
    if (this.textEditor) this.textEditor.hide();
    if (this.selectionManager) this.selectionManager.clear();
    HistoryManager.clear();
    State.reset();
    const viewport = document.getElementById("pages-viewport");
    if (viewport) viewport.innerHTML = "";
    const thumbs = document.getElementById("thumbnails-container");
    if (thumbs) thumbs.innerHTML = "";
    const titleInput = document.getElementById("document-title-input");
    if (titleInput) titleInput.value = "Untitled.pdf";
    const statusBadge = document.getElementById("header-status-badge");
    if (statusBadge) {
      statusBadge.textContent = "No Document";
      statusBadge.className = "doc-status-badge";
    }
    const pageNumDisplay = document.getElementById("page-num-display");
    if (pageNumDisplay) pageNumDisplay.textContent = "1";
    const totalPagesLabel = document.getElementById("total-pages-label");
    if (totalPagesLabel) totalPagesLabel.textContent = "1";
  }

  async loadPDFFile(file) {
    if (!file) return;

    const welcomeModal = document.getElementById("welcome-modal");
    if (welcomeModal) welcomeModal.style.display = "none";

    // Clean reset of previous document state before reading new file
    this.resetDocument();

    // Ensure editor view is active
    if (window.portal && window.portal.switchView) {
      window.portal.switchView("editor");
    }

    // Step 1: Open popup loading dialog immediately
    this._showLoadingModal(
      "Uploading PDF...",
      `Uploading "${file.name}" and preparing live editor. Please wait...`,
      "Reading document file...",
      18
    );

    try {
      // Step 2: Read raw array buffer SAFELY (do NOT touch input.value before reading!)
      const arrayBuffer = await file.arrayBuffer();
      this._updateLoadingProgress("Extracting pages & vector text content...", 42);

      // Step 3: Initialize PDF.js document
      const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
      const pdfJsDoc = await loadingTask.promise;
      this._updateLoadingProgress("Analyzing typography and detecting original fonts...", 68);

      // Step 4: Extract text spans & layout client-side immediately
      const clientAnalysis = await this._extractClientSidePages(pdfJsDoc, file.name, arrayBuffer);
      const docInfo = clientAnalysis.docInfo;
      const pages = clientAnalysis.pages;

      // Register in State
      State.setDocument(docInfo, pdfJsDoc, arrayBuffer);

      // Auto-fit to screen width on mobile devices so document is fully readable without horizontal scrolling
      if (window.innerWidth <= 768) {
        const firstPageWidth = docInfo.page_dimensions?.[0]?.width || 612;
        const availableWidth = window.innerWidth - 20;
        const mobileScale = Math.min(1.0, Math.max(0.4, Math.round((availableWidth / firstPageWidth) * 100) / 100));
        State.setZoom(mobileScale);
        this._updateZoomUI();
      }

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

      // Step 5: Render Document on Canvas
      this._updateLoadingProgress("Rendering high-resolution page canvas...", 88);
      await this.renderer.renderDocument();

      // Ensure overlays and annotations are active immediately
      this.selectionManager.updateSelectionOverlays(State.activeTool);
      this.toolbar.renderAnnotationsOnPage(State.currentPage);

      // Concurrently query backend to enrich if available
      (async () => {
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 2500);
          const formData = new FormData();
          formData.append("file", file);
          const apiRes = await fetch(getApiUrl("/api/documents/analyze"), {
            method: "POST",
            body: formData,
            signal: controller.signal
          });
          clearTimeout(timer);
          if (apiRes.ok) {
            const analysisData = await apiRes.json();
            if (analysisData && analysisData.pages && analysisData.pages.length > 0) {
              analysisData.pages.forEach((p, idx) => {
                this.selectionManager.setPageAnalysis(idx, p);
              });
              this.selectionManager.updateSelectionOverlays(State.activeTool);
            }
          }
        } catch (_) {
          // Gracefully continue with client-side extraction
        }
      })();

      this._updateLoadingProgress("Ready! Opening document in editor...", 100);
      setTimeout(() => {
        this._hideLoadingModal();
        this.showToast("success", `Loaded "${file.name}" (${docInfo.page_count} pages). Ready for editing.`);
      }, 350);

    } catch (err) {
      console.error(err);
      this._hideLoadingModal();
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
    const prevBtn = document.getElementById("find-prev-btn");
    const nextBtn = document.getElementById("find-next-btn");
    const closeBtn = document.getElementById("find-close-btn");

    let matches = [];
    let currentMatchIndex = -1;

    const clearHighlights = () => {
      document.querySelectorAll(".dynamic-search-match").forEach(el => el.remove());
      document.querySelectorAll(".text-span-highlight.search-match, .text-span-highlight.search-active-match").forEach(el => {
        el.classList.remove("search-match", "search-active-match");
        if (!el.classList.contains("selected") && !el.classList.contains("edited-text-overlay")) {
          const isTextTool = State.activeTool === "edit-text" || State.activeTool === "select";
          el.style.display = isTextTool ? "block" : "none";
        }
      });
    };

    const updateMatchUI = () => {
      if (!matchBadge) return;
      if (matches.length === 0) {
        matchBadge.textContent = "0 / 0";
      } else {
        matchBadge.textContent = `${currentMatchIndex + 1} / ${matches.length}`;
      }
    };

    const jumpToMatch = (index) => {
      if (matches.length === 0) return;
      if (index < 0) index = matches.length - 1;
      if (index >= matches.length) index = 0;
      currentMatchIndex = index;
      updateMatchUI();

      const match = matches[currentMatchIndex];
      if (!match) return;

      document.querySelectorAll(".text-span-highlight.search-active-match").forEach(el => {
        el.classList.remove("search-active-match");
        el.classList.add("search-match");
      });

      // Scroll document to match page and update page stepper
      this.renderer.scrollToPage(match.pageIndex);
      if (State.currentPage !== match.pageIndex) {
        State.setCurrentPage(match.pageIndex);
        const pageDisplay = document.getElementById("page-num-display");
        if (pageDisplay) pageDisplay.textContent = match.pageIndex + 1;
      }

      if (match.element) {
        match.element.classList.remove("search-match");
        match.element.classList.add("search-active-match");
        match.element.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
      }
    };

    const performSearch = () => {
      clearHighlights();
      matches = [];
      currentMatchIndex = -1;

      const query = findInput ? findInput.value.trim().toLowerCase() : "";
      if (!query || !this.selectionManager || !this.selectionManager.extractedPages) {
        updateMatchUI();
        return;
      }

      this.selectionManager.extractedPages.forEach((analysis, pageIndex) => {
        const overlayLayer = document.getElementById(`page-overlay-${pageIndex}`);
        if (!analysis || !analysis.blocks) return;

        analysis.blocks.forEach(block => {
          if (block.type !== 0 || !block.lines) return;
          block.lines.forEach(line => {
            if (!line.spans) return;
            line.spans.forEach(span => {
              const text = (span.currentText || span.text || "").toLowerCase();
              if (text.includes(query)) {
                let el = (span._origHighlightEl && span._origHighlightEl.isConnected)
                  ? span._origHighlightEl
                  : (span._coverEl ? span._coverEl : null);

                if (!el && overlayLayer) {
                  const scale = State.zoomScale || 1.0;
                  const [x0, y0, x1, y1] = span.bbox;
                  el = document.createElement("div");
                  el.className = "text-span-highlight search-match dynamic-search-match";
                  el.style.position = "absolute";
                  el.style.left = `${x0 * scale}px`;
                  el.style.top = `${y0 * scale}px`;
                  el.style.width = `${Math.max(8, (x1 - x0) * scale)}px`;
                  el.style.height = `${Math.max(10, (y1 - y0) * scale)}px`;
                  el.style.display = "block";
                  el.title = `Found: "${span.text}"`;
                  overlayLayer.appendChild(el);
                } else if (el) {
                  el.classList.add("search-match");
                  el.style.display = "block";
                }
                matches.push({ pageIndex, span, element: el });
              }
            });
          });
        });
      });

      if (matches.length > 0) {
        jumpToMatch(0);
      } else {
        updateMatchUI();
      }
    };

    findInput?.addEventListener("input", performSearch);

    findInput?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (e.shiftKey) {
          jumpToMatch(currentMatchIndex - 1);
        } else {
          jumpToMatch(currentMatchIndex + 1);
        }
      } else if (e.key === "Escape") {
        this._toggleFindDrawer(false);
      }
    });

    prevBtn?.addEventListener("click", () => jumpToMatch(currentMatchIndex - 1));
    nextBtn?.addEventListener("click", () => jumpToMatch(currentMatchIndex + 1));
    closeBtn?.addEventListener("click", () => this._toggleFindDrawer(false));
  }

  _toggleFindDrawer(force) {
    const drawer = document.getElementById("find-replace-drawer");
    if (!drawer) return;
    const isVisible = drawer.style.display === "flex";
    const nextState = force !== undefined ? force : !isVisible;
    drawer.style.display = nextState ? "flex" : "none";
    if (nextState) {
      const input = document.getElementById("find-search-input");
      input?.focus();
      input?.select();
    } else {
      document.querySelectorAll(".dynamic-search-match").forEach(el => el.remove());
      document.querySelectorAll(".text-span-highlight.search-match, .text-span-highlight.search-active-match").forEach(el => {
        el.classList.remove("search-match", "search-active-match");
        if (!el.classList.contains("selected") && !el.classList.contains("edited-text-overlay")) {
          const isTextTool = State.activeTool === "edit-text" || State.activeTool === "select";
          el.style.display = isTextTool ? "block" : "none";
        }
      });
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

// Bootstrap on DOM ready with robust readyState check and global window.app assignment
function initApp() {
  if (typeof window !== "undefined" && !window.app) {
    window.app = new OpenPDFStudioApp();
    window.app.init();
  }
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initApp);
  } else {
    initApp();
  }
}
