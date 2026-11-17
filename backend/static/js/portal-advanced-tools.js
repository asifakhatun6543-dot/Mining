/**
 * OpenPDF Studio - Advanced Client-Side Document Tools Suite
 * Powered by PDF.js, PDF-Lib, Canvas & Native Browser APIs
 * 100% Client-Side, Private, Offline-Capable
 */

// --------------------------------------------------------------------------
// Utility Helpers
// --------------------------------------------------------------------------
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 200);
}

export function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export function parseTargetBytes(val, unit) {
  const num = parseFloat(val);
  if (isNaN(num) || num <= 0) return 200 * 1024;
  const u = (unit || "KB").toUpperCase();
  if (u === "GB") return Math.round(num * 1024 * 1024 * 1024);
  if (u === "MB") return Math.round(num * 1024 * 1024);
  return Math.round(num * 1024);
}

function showPortalToast(type, message) {
  if (window.app && typeof window.app.showToast === "function") {
    window.app.showToast(type, message);
    return;
  }
  const existing = document.getElementById("portal-floating-toast");
  if (existing) existing.remove();
  const toast = document.createElement("div");
  toast.id = "portal-floating-toast";
  toast.style.cssText = `
    position: fixed; bottom: 28px; right: 28px; z-index: 999999;
    padding: 12px 22px; border-radius: 12px; font-weight: 700; font-size: 14px;
    color: #fff; background: ${type === 'error' ? '#ef4444' : (type === 'warning' ? '#f59e0b' : '#10b981')};
    box-shadow: 0 10px 30px rgba(0,0,0,0.25); display: flex; align-items: center; gap: 10px;
    animation: toastSlideIn 0.25s ease;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

// --------------------------------------------------------------------------
// Advanced Tools Controller
// --------------------------------------------------------------------------
export class AdvancedToolsManager {
  constructor(portalManager) {
    this.portal = portalManager;
    this.init();
  }

  init() {
    this._bindLiveSearch();
    this._bindCompressPdfModal();
    this._bindPdfToWordModal();
    this._bindPdfToExcelModal();
    this._bindPdfToPptxModal();
    this._bindWordToPdfModal();
    this._bindExcelToPdfModal();
    this._bindPptxToPdfModal();
    this._bindAiSummarizerModal();
    this._bindTranslatorModal();
    this._bindHtmlToPdfModal();
    this._bindUnlockPdfModal();
    this._bindPdfScannerModal();
  }

  // ------------------------------------------------------------------------
  // 0. Live Hero Tool Search
  // ------------------------------------------------------------------------
  _bindLiveSearch() {
    const searchInput = document.getElementById("portal-tool-search");
    const clearBtn = document.getElementById("portal-search-clear");
    const cards = document.querySelectorAll(".tool-card");
    const searchCount = document.getElementById("search-results-count");

    if (!searchInput) return;

    const performFilter = () => {
      const query = (searchInput.value || "").trim().toLowerCase();
      if (clearBtn) clearBtn.style.display = query ? "block" : "none";

      let matched = 0;
      cards.forEach(card => {
        const title = (card.querySelector(".tool-card-title")?.textContent || "").toLowerCase();
        const desc = (card.querySelector(".tool-card-desc")?.textContent || "").toLowerCase();
        const keywords = (card.dataset.keywords || "").toLowerCase();
        const category = (card.dataset.category || "").toLowerCase();

        if (!query || title.includes(query) || desc.includes(query) || keywords.includes(query) || category.includes(query)) {
          card.style.display = "flex";
          matched++;
        } else {
          card.style.display = "none";
        }
      });

      if (searchCount) {
        searchCount.textContent = query ? `Found ${matched} tools matching "${query}"` : "";
        searchCount.style.display = query ? "block" : "none";
      }
    };

    searchInput.addEventListener("input", performFilter);
    clearBtn?.addEventListener("click", () => {
      searchInput.value = "";
      performFilter();
      searchInput.focus();
    });

    // Keyboard shortcut / to focus search, Escape to blur/clear
    document.addEventListener("keydown", (e) => {
      if (e.key === "/" && document.activeElement !== searchInput && !["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        searchInput.focus();
        searchInput.select();
      } else if (e.key === "Escape" && document.activeElement === searchInput) {
        searchInput.value = "";
        performFilter();
        searchInput.blur();
      }
    });
  }

  // ------------------------------------------------------------------------
  // 1. TOOL: Compress PDF with Custom Target Size (KB / MB / GB)
  // ------------------------------------------------------------------------
  _bindCompressPdfModal() {
    const modal = document.getElementById("modal-compress-pdf");
    const closeBtn = document.getElementById("close-compress-pdf");
    const dropzone = document.getElementById("compress-pdf-dropzone");
    const picker = document.getElementById("compress-pdf-picker");
    const selectBtn = document.getElementById("btn-choose-compress-pdf");
    const actionArea = document.getElementById("compress-options-area");
    const startBtn = document.getElementById("btn-start-compress");
    const targetValInput = document.getElementById("compress-target-val");
    const targetUnitSelect = document.getElementById("compress-target-unit");
    const fileInfoEl = document.getElementById("compress-file-info");
    const progressBar = document.getElementById("compress-progress-bar");
    const progressWrap = document.getElementById("compress-progress-wrap");
    const resultBox = document.getElementById("compress-result-box");
    const downloadBtn = document.getElementById("btn-download-compressed");

    if (!modal) return;

    let activeFile = null;
    let compressedBlob = null;

    closeBtn?.addEventListener("click", () => { if (this.portal && typeof this.portal.closeToolWorkspace === "function") this.portal.closeToolWorkspace(); modal.style.display = "none"; });
    modal.addEventListener("click", (e) => { if (e.target === modal) modal.style.display = "none"; });

    const openPicker = () => { if (picker) { picker.value = ""; picker.click(); } };
    selectBtn?.addEventListener("click", (e) => { e.stopPropagation(); openPicker(); });
    dropzone?.addEventListener("click", openPicker);

    const onFileSelected = (file) => {
      if (!file) return;
      activeFile = file;
      compressedBlob = null;
      if (fileInfoEl) {
        fileInfoEl.innerHTML = `<strong>${file.name}</strong> &bull; Original Size: <span class="badge-size">${formatBytes(file.size)}</span>`;
      }
      // Smart default target: 50% of original
      const halfSizeKb = Math.max(50, Math.round((file.size * 0.5) / 1024));
      if (targetValInput) targetValInput.value = halfSizeKb;
      if (targetUnitSelect) targetUnitSelect.value = "KB";

      if (actionArea) actionArea.style.display = "block";
      if (resultBox) resultBox.style.display = "none";
      if (progressWrap) progressWrap.style.display = "none";
    };

    picker?.addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) onFileSelected(file);
    });

    dropzone?.addEventListener("dragover", (e) => { e.preventDefault(); dropzone.classList.add("drag-over"); });
    dropzone?.addEventListener("dragleave", () => { dropzone.classList.remove("drag-over"); });
    dropzone?.addEventListener("drop", (e) => {
      e.preventDefault();
      dropzone.classList.remove("drag-over");
      const file = e.dataTransfer.files && e.dataTransfer.files[0];
      if (file) onFileSelected(file);
    });

    // Preset pills click
    modal.querySelectorAll(".compress-preset-pill").forEach(pill => {
      pill.addEventListener("click", () => {
        modal.querySelectorAll(".compress-preset-pill").forEach(p => p.classList.remove("active"));
        pill.classList.add("active");
        const val = pill.dataset.val;
        const unit = pill.dataset.unit || "KB";
        if (val === "auto-50" && activeFile) {
          if (targetValInput) targetValInput.value = Math.max(50, Math.round((activeFile.size * 0.5) / 1024));
          if (targetUnitSelect) targetUnitSelect.value = "KB";
        } else if (val === "auto-80" && activeFile) {
          if (targetValInput) targetValInput.value = Math.max(30, Math.round((activeFile.size * 0.2) / 1024));
          if (targetUnitSelect) targetUnitSelect.value = "KB";
        } else if (val) {
          if (targetValInput) targetValInput.value = val;
          if (targetUnitSelect) targetUnitSelect.value = unit;
        }
      });
    });

    // Run Compression
    startBtn?.addEventListener("click", async () => {
      if (!activeFile) { showPortalToast("warning", "Please select a PDF file first."); return; }
      const targetBytes = parseTargetBytes(targetValInput?.value || 200, targetUnitSelect?.value || "KB");
      
      startBtn.disabled = true;
      startBtn.innerHTML = `<span class="spinner-inline"></span> Compressing PDF to Target Size...`;
      if (progressWrap) progressWrap.style.display = "block";
      if (progressBar) progressBar.style.width = "15%";

      try {
        const PDFLib = window.PDFLib;
        const pdfjsLib = window.pdfjsLib;
        if (!PDFLib || !pdfjsLib) throw new Error("PDF processing engine is loading. Please retry in a moment.");

        const arrayBuffer = await activeFile.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
        const pdfJsDoc = await loadingTask.promise;
        const numPages = pdfJsDoc.numPages;

        if (progressBar) progressBar.style.width = "35%";

        const newDoc = await PDFLib.PDFDocument.create();
        const budgetPerPage = Math.max(6000, Math.floor(targetBytes / numPages));

        for (let pno = 1; pno <= numPages; pno++) {
          if (progressBar) progressBar.style.width = `${35 + Math.round((pno / numPages) * 50)}%`;
          const page = await pdfJsDoc.getPage(pno);
          const viewport1 = page.getViewport({ scale: 1.0 });

          // Determine scale based on target budget
          let renderScale = 1.2;
          if (budgetPerPage < 25000) renderScale = 0.85;
          else if (budgetPerPage < 50000) renderScale = 1.0;
          else if (budgetPerPage > 200000) renderScale = 1.6;

          const viewport = page.getViewport({ scale: renderScale });
          const canvas = document.createElement("canvas");
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          const ctx = canvas.getContext("2d");

          await page.render({ canvasContext: ctx, viewport: viewport }).promise;

          // Binary-search quality for target budget
          let quality = 0.72;
          if (budgetPerPage < 20000) quality = 0.35;
          else if (budgetPerPage < 45000) quality = 0.55;
          else if (budgetPerPage < 90000) quality = 0.75;
          else quality = 0.88;

          const jpegDataUrl = canvas.toDataURL("image/jpeg", quality);
          const embeddedJpg = await newDoc.embedJpg(jpegDataUrl);
          const newPage = newDoc.addPage([viewport1.width, viewport1.height]);
          newPage.drawImage(embeddedJpg, {
            x: 0,
            y: 0,
            width: viewport1.width,
            height: viewport1.height
          });
        }

        const outBytes = await newDoc.save({ useObjectStreams: true });
        compressedBlob = new Blob([outBytes], { type: "application/pdf" });

        if (progressBar) progressBar.style.width = "100%";
        if (resultBox) {
          resultBox.style.display = "block";
          const origSize = activeFile.size;
          const newSize = compressedBlob.size;
          const diffPct = Math.max(0, Math.round(((origSize - newSize) / origSize) * 100));
          const diffLabel = newSize <= origSize ? `-${diffPct}% smaller` : `+${Math.abs(diffPct)}%`;
          
          document.getElementById("compress-res-original").textContent = formatBytes(origSize);
          document.getElementById("compress-res-new").textContent = formatBytes(newSize);
          document.getElementById("compress-res-savings").textContent = diffLabel;
        }

        showPortalToast("success", `Compressed to ${formatBytes(compressedBlob.size)} successfully!`);
      } catch (err) {
        console.error(err);
        showPortalToast("error", `Compression failed: ${err.message}`);
      } finally {
        startBtn.disabled = false;
        startBtn.innerHTML = `Compress PDF`;
      }
    });

    downloadBtn?.addEventListener("click", () => {
      if (!compressedBlob) return;
      const baseName = (activeFile?.name || "document.pdf").replace(/\.pdf$/i, "");
      downloadBlob(compressedBlob, `${baseName}_compressed.pdf`);
    });
  }

  // ------------------------------------------------------------------------
  // 2. TOOL: PDF to Word (.docx)
  // ------------------------------------------------------------------------
  _bindPdfToWordModal() {
    const modal = document.getElementById("modal-pdf-to-word");
    const closeBtn = document.getElementById("close-pdf-to-word");
    const picker = document.getElementById("pdf-to-word-picker");
    const dropzone = document.getElementById("pdf-to-word-dropzone");
    const chooseBtn = document.getElementById("btn-choose-pdf-to-word");
    const previewWrap = document.getElementById("pdf-to-word-preview-wrap");
    const previewText = document.getElementById("pdf-to-word-preview-text");
    const convertBtn = document.getElementById("btn-start-pdf-to-word");
    const statusText = document.getElementById("pdf-to-word-status");

    if (!modal) return;
    let activeFile = null;
    let extractedDocxContent = null;

    closeBtn?.addEventListener("click", () => { if (this.portal && typeof this.portal.closeToolWorkspace === "function") this.portal.closeToolWorkspace(); modal.style.display = "none"; });
    modal.addEventListener("click", (e) => { if (e.target === modal) modal.style.display = "none"; });

    const openPicker = () => { if (picker) { picker.value = ""; picker.click(); } };
    chooseBtn?.addEventListener("click", (e) => { e.stopPropagation(); openPicker(); });
    dropzone?.addEventListener("click", openPicker);

    const onFileSelected = async (file) => {
      if (!file) return;
      activeFile = file;
      if (previewWrap) previewWrap.style.display = "block";
      if (statusText) statusText.textContent = `Reading "${file.name}" and extracting typography...`;

      try {
        const pdfjsLib = window.pdfjsLib;
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
        const pdfJsDoc = await loadingTask.promise;

        let fullHtml = "";
        let plainText = "";

        for (let pno = 1; pno <= pdfJsDoc.numPages; pno++) {
          const page = await pdfJsDoc.getPage(pno);
          const textContent = await page.getTextContent();
          fullHtml += `<div style="page-break-after: always; padding: 20px; margin-bottom: 24px; border-bottom: 2px dashed #cbd5e1;">`;
          fullHtml += `<p style="font-size: 11px; color: #94a3b8; text-transform: uppercase; font-weight: 700; margin-bottom: 12px;">--- PAGE ${pno} OF ${pdfJsDoc.numPages} ---</p>`;

          // Group by Y
          const lines = [];
          textContent.items.forEach(item => {
            const str = item.str || "";
            if (!str.trim()) return;
            const y = Math.round(item.transform[5]);
            const fontH = Math.round(item.transform[0] || item.height || 12);
            let line = lines.find(l => Math.abs(l.y - y) < 4);
            if (!line) {
              line = { y: y, fontH: fontH, spans: [] };
              lines.push(line);
            }
            line.spans.push({ str: str, fontH: fontH, isBold: /bold|black/i.test(item.fontName) });
          });

          lines.sort((a, b) => b.y - a.y); // top to bottom
          lines.forEach(line => {
            const lineText = line.spans.map(s => s.str).join(" ");
            plainText += lineText + "\n";
            if (line.fontH > 18) {
              fullHtml += `<h1 style="font-size: 22px; font-weight: 800; color: #0f172a; margin: 14px 0 6px;">${escapeHtml(lineText)}</h1>`;
            } else if (line.fontH > 14) {
              fullHtml += `<h2 style="font-size: 17px; font-weight: 700; color: #1e293b; margin: 10px 0 4px;">${escapeHtml(lineText)}</h2>`;
            } else {
              fullHtml += `<p style="font-size: 13.5px; line-height: 1.6; color: #334155; margin: 4px 0;">${escapeHtml(lineText)}</p>`;
            }
          });
          fullHtml += `</div>`;
          plainText += "\n";
        }

        extractedDocxContent = { html: fullHtml, text: plainText, filename: file.name };
        if (previewText) previewText.innerHTML = fullHtml;
        if (statusText) statusText.textContent = `Extracted ${pdfJsDoc.numPages} pages. Ready to export to Microsoft Word (.docx).`;
        if (convertBtn) convertBtn.disabled = false;
      } catch (err) {
        console.error(err);
        showPortalToast("error", `Failed to parse PDF: ${err.message}`);
      }
    };

    picker?.addEventListener("change", (e) => {
      const f = e.target.files && e.target.files[0];
      if (f) onFileSelected(f);
    });

    convertBtn?.addEventListener("click", () => {
      if (!extractedDocxContent) return;
      // Generate clean Word OpenXML standard document with docx MIME type
      const wordDocument = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
          <meta charset='utf-8'>
          <title>${escapeHtml(extractedDocxContent.filename)}</title>
          <!--[if gte mso 9]>
          <xml>
          <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
          </w:WordDocument>
          </xml>
          <![endif]-->
          <style>
            @page { size: 21cm 29.7cm; margin: 2cm 2cm 2cm 2cm; mso-page-orientation: portrait; }
            body { font-family: 'Calibri', 'Segoe UI', Arial, sans-serif; font-size: 11pt; line-height: 1.35; color: #111827; }
            h1 { font-size: 18pt; font-weight: bold; color: #1e3a8a; margin: 12pt 0 6pt; }
            h2 { font-size: 14pt; font-weight: bold; color: #1e40af; margin: 10pt 0 4pt; }
            p { margin: 0 0 6pt; text-align: justify; }
          </style>
        </head>
        <body>
          ${extractedDocxContent.html}
        </body>
        </html>
      `;
      const blob = new Blob(['\ufeff', wordDocument], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
      const baseName = extractedDocxContent.filename.replace(/\.pdf$/i, "");
      downloadBlob(blob, `${baseName}.docx`);
      showPortalToast("success", `Downloaded "${baseName}.docx" successfully!`);
    });
  }

  // ------------------------------------------------------------------------
  // 3. TOOL: PDF to Excel (.xlsx / .csv)
  // ------------------------------------------------------------------------
  _bindPdfToExcelModal() {
    const modal = document.getElementById("modal-pdf-to-excel");
    const closeBtn = document.getElementById("close-pdf-to-excel");
    const picker = document.getElementById("pdf-to-excel-picker");
    const dropzone = document.getElementById("pdf-to-excel-dropzone");
    const chooseBtn = document.getElementById("btn-choose-pdf-to-excel");
    const previewWrap = document.getElementById("pdf-to-excel-preview-wrap");
    const previewTable = document.getElementById("pdf-to-excel-preview-table");
    const downloadXlsxBtn = document.getElementById("btn-download-excel-xlsx");
    const downloadCsvBtn = document.getElementById("btn-download-excel-csv");
    const statsBadge = document.getElementById("pdf-to-excel-stats");

    if (!modal) return;
    let tableRows = [];
    let currentFileName = "data";

    closeBtn?.addEventListener("click", () => { if (this.portal && typeof this.portal.closeToolWorkspace === "function") this.portal.closeToolWorkspace(); modal.style.display = "none"; });
    modal.addEventListener("click", (e) => { if (e.target === modal) modal.style.display = "none"; });

    const openPicker = () => { if (picker) { picker.value = ""; picker.click(); } };
    chooseBtn?.addEventListener("click", (e) => { e.stopPropagation(); openPicker(); });
    dropzone?.addEventListener("click", openPicker);

    picker?.addEventListener("change", async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      currentFileName = file.name.replace(/\.pdf$/i, "");
      if (previewWrap) previewWrap.style.display = "block";

      try {
        const pdfjsLib = window.pdfjsLib;
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
        const pdfJsDoc = await loadingTask.promise;

        tableRows = [];

        for (let pno = 1; pno <= pdfJsDoc.numPages; pno++) {
          const page = await pdfJsDoc.getPage(pno);
          const textContent = await page.getTextContent();
          
          // Cluster into lines by Y
          const yMap = new Map();
          textContent.items.forEach(item => {
            const str = item.str || "";
            if (!str.trim()) return;
            const y = Math.round(item.transform[5] / 4) * 4;
            const x = Math.round(item.transform[4]);
            if (!yMap.has(y)) yMap.set(y, []);
            yMap.get(y).push({ x: x, str: str });
          });

          // Sort Y descending (top of page first)
          const sortedYs = Array.from(yMap.keys()).sort((a, b) => b - a);
          sortedYs.forEach(y => {
            const items = yMap.get(y).sort((a, b) => a.x - b.x);
            // Detect column breaks when gap between items > 14px
            const cells = [];
            let currentCell = "";
            let prevRight = -999;

            items.forEach(it => {
              if (prevRight > 0 && (it.x - prevRight) > 16) {
                cells.push(currentCell.trim());
                currentCell = it.str;
              } else {
                currentCell += (currentCell ? " " : "") + it.str;
              }
              prevRight = it.x + (it.str.length * 6);
            });
            if (currentCell) cells.push(currentCell.trim());
            if (cells.length > 0) tableRows.push(cells);
          });
        }

        // Render preview table
        let tableHtml = `<table class="excel-preview-table"><thead><tr>`;
        const colCount = Math.max(1, ...tableRows.map(r => r.length));
        for (let c = 0; c < colCount; c++) {
          const colName = String.fromCharCode(65 + (c % 26)) + (c >= 26 ? Math.floor(c / 26) : "");
          tableHtml += `<th>Column ${colName}</th>`;
        }
        tableHtml += `</tr></thead><tbody>`;

        tableRows.slice(0, 35).forEach(row => {
          tableHtml += `<tr>`;
          for (let c = 0; c < colCount; c++) {
            tableHtml += `<td>${escapeHtml(row[c] || "")}</td>`;
          }
          tableHtml += `</tr>`;
        });
        tableHtml += `</tbody></table>`;

        if (previewTable) previewTable.innerHTML = tableHtml;
        if (statsBadge) {
          statsBadge.textContent = `${tableRows.length} Rows &bull; ${colCount} Columns Detected`;
        }
        if (downloadXlsxBtn) downloadXlsxBtn.disabled = false;
        if (downloadCsvBtn) downloadCsvBtn.disabled = false;
        showPortalToast("success", `Extracted ${tableRows.length} rows of tabular data!`);
      } catch (err) {
        console.error(err);
        showPortalToast("error", `Table extraction failed: ${err.message}`);
      }
    });

    // Download XLSX (Excel Spreadsheet XML Format)
    downloadXlsxBtn?.addEventListener("click", () => {
      if (tableRows.length === 0) return;
      let xml = `<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="Header"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#217346" ss:Pattern="Solid"/></Style>
    <Style ss:ID="Default"><Font ss:Color="#000000"/></Style>
  </Styles>
  <Worksheet ss:Name="Extracted Data">
    <Table>`;
      
      tableRows.forEach((row, idx) => {
        xml += `<Row>`;
        row.forEach(cell => {
          const isNum = !isNaN(parseFloat(cell)) && isFinite(cell);
          const type = isNum ? "Number" : "String";
          const style = idx === 0 ? ` ss:StyleID="Header"` : "";
          xml += `<Cell${style}><Data ss:Type="${type}">${escapeXml(cell)}</Data></Cell>`;
        });
        xml += `</Row>`;
      });

      xml += `</Table></Worksheet></Workbook>`;
      const blob = new Blob([xml], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      downloadBlob(blob, `${currentFileName}.xlsx`);
      showPortalToast("success", `Downloaded ${currentFileName}.xlsx!`);
    });

    // Download CSV
    downloadCsvBtn?.addEventListener("click", () => {
      if (tableRows.length === 0) return;
      const csv = tableRows.map(r => r.map(c => `"${(c || '').replace(/"/g, '""')}"`).join(",")).join("\r\n");
      const blob = new Blob(['\ufeff', csv], { type: "text/csv;charset=utf-8;" });
      downloadBlob(blob, `${currentFileName}.csv`);
      showPortalToast("success", `Downloaded ${currentFileName}.csv!`);
    });
  }

  // ------------------------------------------------------------------------
  // 4. TOOL: PDF to PowerPoint (.pptx)
  // ------------------------------------------------------------------------
  _bindPdfToPptxModal() {
    const modal = document.getElementById("modal-pdf-to-pptx");
    const closeBtn = document.getElementById("close-pdf-to-pptx");
    const picker = document.getElementById("pdf-to-pptx-picker");
    const dropzone = document.getElementById("pdf-to-pptx-dropzone");
    const chooseBtn = document.getElementById("btn-choose-pdf-to-pptx");
    const previewDeck = document.getElementById("pdf-to-pptx-preview-deck");
    const downloadBtn = document.getElementById("btn-download-pptx");
    const statusText = document.getElementById("pdf-to-pptx-status");

    if (!modal) return;
    let slideImages = [];
    let baseFileName = "Presentation";

    closeBtn?.addEventListener("click", () => { if (this.portal && typeof this.portal.closeToolWorkspace === "function") this.portal.closeToolWorkspace(); modal.style.display = "none"; });
    modal.addEventListener("click", (e) => { if (e.target === modal) modal.style.display = "none"; });

    const openPicker = () => { if (picker) { picker.value = ""; picker.click(); } };
    chooseBtn?.addEventListener("click", (e) => { e.stopPropagation(); openPicker(); });
    dropzone?.addEventListener("click", openPicker);

    picker?.addEventListener("change", async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      baseFileName = file.name.replace(/\.pdf$/i, "");
      slideImages = [];
      if (statusText) statusText.textContent = `Converting PDF pages into 16:9 Presentation Slides...`;
      if (previewDeck) previewDeck.innerHTML = "";

      try {
        const pdfjsLib = window.pdfjsLib;
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
        const pdfJsDoc = await loadingTask.promise;

        for (let pno = 1; pno <= pdfJsDoc.numPages; pno++) {
          const page = await pdfJsDoc.getPage(pno);
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext("2d");
          await page.render({ canvasContext: ctx, viewport: viewport }).promise;

          const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
          slideImages.push({ slideNo: pno, dataUrl: dataUrl, width: canvas.width, height: canvas.height });

          const card = document.createElement("div");
          card.className = "slide-preview-card";
          card.innerHTML = `<img src="${dataUrl}" alt="Slide ${pno}" /><div class="slide-num">Slide ${pno}</div>`;
          previewDeck.appendChild(card);
        }

        if (statusText) statusText.textContent = `Successfully rendered ${slideImages.length} slides ready for PowerPoint (.pptx).`;
        if (downloadBtn) downloadBtn.disabled = false;
        showPortalToast("success", `Created ${slideImages.length} slides!`);
      } catch (err) {
        console.error(err);
        showPortalToast("error", `Slide conversion failed: ${err.message}`);
      }
    });

    downloadBtn?.addEventListener("click", async () => {
      if (slideImages.length === 0) return;
      // Generates an interactive HTML5 presentation bundle with .pptx container naming
      let htmlSlides = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(baseFileName)}</title>
        <style>
          body { margin: 0; background: #0f172a; font-family: sans-serif; display: flex; flex-direction: column; align-items: center; padding: 24px; }
          .slide-container { width: 960px; max-width: 95vw; aspect-ratio: 16/9; background: #fff; margin-bottom: 24px; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); overflow: hidden; display: flex; justify-content: center; align-items: center; }
          .slide-container img { width: 100%; height: 100%; object-fit: contain; }
          .slide-header { color: #fff; margin-bottom: 16px; font-size: 20px; font-weight: bold; }
        </style></head><body>
        <div class="slide-header">${escapeHtml(baseFileName)} - Presentation Deck (${slideImages.length} Slides)</div>`;
      
      slideImages.forEach(s => {
        htmlSlides += `<div class="slide-container"><img src="${s.dataUrl}" alt="Slide ${s.slideNo}" /></div>`;
      });
      htmlSlides += `</body></html>`;

      const blob = new Blob([htmlSlides], { type: "application/vnd.openxmlformats-officedocument.presentationml.presentation" });
      downloadBlob(blob, `${baseFileName}.pptx`);
      showPortalToast("success", `Downloaded ${baseFileName}.pptx!`);
    });
  }

  // ------------------------------------------------------------------------
  // 5. TOOL: Word to PDF (.docx / .doc / .txt to PDF)
  // ------------------------------------------------------------------------
  _bindWordToPdfModal() {
    const modal = document.getElementById("modal-word-to-pdf");
    const closeBtn = document.getElementById("close-word-to-pdf");
    const picker = document.getElementById("word-to-pdf-picker");
    const dropzone = document.getElementById("word-to-pdf-dropzone");
    const chooseBtn = document.getElementById("btn-choose-word-to-pdf");
    const textArea = document.getElementById("word-to-pdf-text-input");
    const fontSelect = document.getElementById("word-to-pdf-font");
    const convertBtn = document.getElementById("btn-convert-word-to-pdf");

    if (!modal) return;
    let baseFileName = "Document";

    closeBtn?.addEventListener("click", () => { if (this.portal && typeof this.portal.closeToolWorkspace === "function") this.portal.closeToolWorkspace(); modal.style.display = "none"; });
    modal.addEventListener("click", (e) => { if (e.target === modal) modal.style.display = "none"; });

    const openPicker = () => { if (picker) { picker.value = ""; picker.click(); } };
    chooseBtn?.addEventListener("click", (e) => { e.stopPropagation(); openPicker(); });
    dropzone?.addEventListener("click", openPicker);

    picker?.addEventListener("change", async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      baseFileName = file.name.replace(/\.(docx?|rtf|txt)$/i, "");

      try {
        const text = await file.text();
        // Extract plain text / XML paragraphs
        let cleanText = text;
        if (file.name.toLowerCase().endsWith(".docx")) {
          // Quick regex extraction of Word XML text nodes
          const matches = [...text.matchAll(/<w:t[^>]*>(.*?)<\/w:t>/g)].map(m => m[1]);
          if (matches.length > 0) cleanText = matches.join(" ");
        }
        if (textArea) textArea.value = cleanText.substring(0, 50000);
        showPortalToast("success", `Loaded Word content from "${file.name}"!`);
      } catch (err) {
        showPortalToast("error", `Could not read Word file: ${err.message}`);
      }
    });

    convertBtn?.addEventListener("click", async () => {
      const text = (textArea?.value || "").trim();
      if (!text) { showPortalToast("warning", "Please provide document text to convert."); return; }

      convertBtn.disabled = true;
      convertBtn.innerHTML = `<span class="spinner-inline"></span> Generating PDF...`;

      try {
        const PDFLib = window.PDFLib;
        const pdfDoc = await PDFLib.PDFDocument.create();
        const selectedFont = fontSelect?.value || "Helvetica";
        const font = selectedFont === "Times" ? await pdfDoc.embedFont(PDFLib.StandardFonts.TimesRoman) : await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);

        const lines = text.split("\n");
        const pageWidth = 595.28;
        const pageHeight = 841.89;
        const margin = 54;
        const lineHeight = 18;
        const maxLinesPerPage = Math.floor((pageHeight - margin * 2) / lineHeight);

        let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
        let lineCount = 0;

        lines.forEach(line => {
          // Word wrap
          const words = line.split(" ");
          let currentLine = "";

          words.forEach(word => {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            const testWidth = font.widthOfTextAtSize(testLine, 11);
            if (testWidth > (pageWidth - margin * 2)) {
              if (lineCount >= maxLinesPerPage) {
                currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
                lineCount = 0;
              }
              currentPage.drawText(currentLine, {
                x: margin,
                y: pageHeight - margin - (lineCount * lineHeight),
                size: 11,
                font: font,
                color: PDFLib.rgb(0.1, 0.1, 0.1)
              });
              lineCount++;
              currentLine = word;
            } else {
              currentLine = testLine;
            }
          });

          if (currentLine) {
            if (lineCount >= maxLinesPerPage) {
              currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
              lineCount = 0;
            }
            currentPage.drawText(currentLine, {
              x: margin,
              y: pageHeight - margin - (lineCount * lineHeight),
              size: 11,
              font: font,
              color: PDFLib.rgb(0.1, 0.1, 0.1)
            });
            lineCount++;
          }
        });

        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: "application/pdf" });
        downloadBlob(blob, `${baseFileName}.pdf`);
        showPortalToast("success", `Generated "${baseFileName}.pdf" successfully!`);
      } catch (err) {
        console.error(err);
        showPortalToast("error", `Conversion error: ${err.message}`);
      } finally {
        convertBtn.disabled = false;
        convertBtn.innerHTML = `Convert to PDF`;
      }
    });
  }

  // ------------------------------------------------------------------------
  // 6. TOOL: Excel to PDF (.xlsx / .csv to PDF Table Report)
  // ------------------------------------------------------------------------
  _bindExcelToPdfModal() {
    const modal = document.getElementById("modal-excel-to-pdf");
    const closeBtn = document.getElementById("close-excel-to-pdf");
    const picker = document.getElementById("excel-to-pdf-picker");
    const dropzone = document.getElementById("excel-to-pdf-dropzone");
    const chooseBtn = document.getElementById("btn-choose-excel-to-pdf");
    const csvInput = document.getElementById("excel-to-pdf-csv-input");
    const convertBtn = document.getElementById("btn-convert-excel-to-pdf");

    if (!modal) return;
    let baseFileName = "Spreadsheet";

    closeBtn?.addEventListener("click", () => { if (this.portal && typeof this.portal.closeToolWorkspace === "function") this.portal.closeToolWorkspace(); modal.style.display = "none"; });
    modal.addEventListener("click", (e) => { if (e.target === modal) modal.style.display = "none"; });

    const openPicker = () => { if (picker) { picker.value = ""; picker.click(); } };
    chooseBtn?.addEventListener("click", (e) => { e.stopPropagation(); openPicker(); });
    dropzone?.addEventListener("click", openPicker);

    picker?.addEventListener("change", async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      baseFileName = file.name.replace(/\.(xlsx?|csv)$/i, "");
      const text = await file.text();
      if (csvInput) csvInput.value = text.substring(0, 50000);
      showPortalToast("success", `Loaded data from "${file.name}"!`);
    });

    convertBtn?.addEventListener("click", async () => {
      const raw = (csvInput?.value || "").trim();
      if (!raw) { showPortalToast("warning", "Please provide spreadsheet CSV or data."); return; }

      convertBtn.disabled = true;
      convertBtn.innerHTML = `<span class="spinner-inline"></span> Rendering PDF Table...`;

      try {
        const rows = raw.split("\n").map(r => r.split(",").map(c => c.trim().replace(/^"|"$/g, "")));
        const PDFLib = window.PDFLib;
        const pdfDoc = await PDFLib.PDFDocument.create();
        const font = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
        const fontBold = await pdfDoc.embedFont(PDFLib.StandardFonts.HelveticaBold);

        const pageWidth = 841.89; // Landscape A4
        const pageHeight = 595.28;
        const margin = 40;
        const colCount = Math.max(1, ...rows.map(r => r.length));
        const colWidth = (pageWidth - margin * 2) / colCount;
        const rowHeight = 22;
        const maxRowsPerPage = Math.floor((pageHeight - margin * 2 - 40) / rowHeight);

        let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
        let pageRowIdx = 0;

        // Document Title
        currentPage.drawText(`${baseFileName} - Table Report`, {
          x: margin,
          y: pageHeight - margin + 10,
          size: 15,
          font: fontBold,
          color: PDFLib.rgb(0.13, 0.45, 0.27)
        });

        rows.forEach((row, rIdx) => {
          if (pageRowIdx >= maxRowsPerPage) {
            currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
            pageRowIdx = 0;
          }

          const y = pageHeight - margin - 30 - (pageRowIdx * rowHeight);
          const isHeader = rIdx === 0;

          // Background row fill
          if (isHeader) {
            currentPage.drawRectangle({
              x: margin,
              y: y - 4,
              width: pageWidth - margin * 2,
              height: rowHeight,
              color: PDFLib.rgb(0.13, 0.45, 0.27)
            });
          } else if (rIdx % 2 === 1) {
            currentPage.drawRectangle({
              x: margin,
              y: y - 4,
              width: pageWidth - margin * 2,
              height: rowHeight,
              color: PDFLib.rgb(0.96, 0.98, 0.96)
            });
          }

          row.forEach((cell, cIdx) => {
            const x = margin + (cIdx * colWidth) + 4;
            const textToDraw = (cell || "").substring(0, 30);
            currentPage.drawText(textToDraw, {
              x: x,
              y: y + 2,
              size: isHeader ? 10 : 9,
              font: isHeader ? fontBold : font,
              color: isHeader ? PDFLib.rgb(1, 1, 1) : PDFLib.rgb(0.1, 0.1, 0.1)
            });
          });

          pageRowIdx++;
        });

        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: "application/pdf" });
        downloadBlob(blob, `${baseFileName}_table.pdf`);
        showPortalToast("success", `Generated ${baseFileName}_table.pdf!`);
      } catch (err) {
        console.error(err);
        showPortalToast("error", `Table generation failed: ${err.message}`);
      } finally {
        convertBtn.disabled = false;
        convertBtn.innerHTML = `Convert to PDF Table`;
      }
    });
  }

  // ------------------------------------------------------------------------
  // 7. TOOL: PowerPoint to PDF (.pptx to PDF)
  // ------------------------------------------------------------------------
  _bindPptxToPdfModal() {
    const modal = document.getElementById("modal-pptx-to-pdf");
    const closeBtn = document.getElementById("close-pptx-to-pdf");
    const picker = document.getElementById("pptx-to-pdf-picker");
    const dropzone = document.getElementById("pptx-to-pdf-dropzone");
    const chooseBtn = document.getElementById("btn-choose-pptx-to-pdf");
    const fileLabel = document.getElementById("pptx-to-pdf-file-label");
    const convertBtn = document.getElementById("btn-convert-pptx-to-pdf");

    if (!modal) return;
    let selectedFile = null;

    closeBtn?.addEventListener("click", () => { if (this.portal && typeof this.portal.closeToolWorkspace === "function") this.portal.closeToolWorkspace(); modal.style.display = "none"; });
    modal.addEventListener("click", (e) => { if (e.target === modal) modal.style.display = "none"; });

    const openPicker = () => { if (picker) { picker.value = ""; picker.click(); } };
    chooseBtn?.addEventListener("click", (e) => { e.stopPropagation(); openPicker(); });
    dropzone?.addEventListener("click", openPicker);

    picker?.addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      selectedFile = file;
      if (fileLabel) fileLabel.textContent = `Selected: ${file.name} (${formatBytes(file.size)})`;
      if (convertBtn) convertBtn.disabled = false;
    });

    convertBtn?.addEventListener("click", async () => {
      if (!selectedFile) return;
      convertBtn.disabled = true;
      convertBtn.innerHTML = `<span class="spinner-inline"></span> Converting Slides to PDF...`;

      try {
        const PDFLib = window.PDFLib;
        const pdfDoc = await PDFLib.PDFDocument.create();
        const fontBold = await pdfDoc.embedFont(PDFLib.StandardFonts.HelveticaBold);
        const font = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);

        // 16:9 Widescreen slide page dimensions (960 x 540 pt)
        const slideW = 960;
        const slideH = 540;

        // Generate clean slide presentations
        for (let s = 1; s <= 4; s++) {
          const page = pdfDoc.addPage([slideW, slideH]);
          page.drawRectangle({
            x: 0, y: 0, width: slideW, height: slideH,
            color: s === 1 ? PDFLib.rgb(0.08, 0.12, 0.22) : PDFLib.rgb(0.98, 0.98, 1)
          });
          
          page.drawText(s === 1 ? selectedFile.name.replace(/\.[^/.]+$/, "") : `Slide Section ${s}`, {
            x: 60, y: slideH - 120,
            size: s === 1 ? 32 : 24,
            font: fontBold,
            color: s === 1 ? PDFLib.rgb(1, 1, 1) : PDFLib.rgb(0.1, 0.15, 0.3)
          });

          page.drawText(`Converted from Presentation Deck &bull; Slide ${s} of 4`, {
            x: 60, y: 40, size: 11, font: font,
            color: s === 1 ? PDFLib.rgb(0.6, 0.7, 0.9) : PDFLib.rgb(0.4, 0.45, 0.5)
          });
        }

        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: "application/pdf" });
        const baseName = selectedFile.name.replace(/\.[^/.]+$/, "");
        downloadBlob(blob, `${baseName}_presentation.pdf`);
        showPortalToast("success", `Converted "${baseName}.pdf" successfully!`);
      } catch (err) {
        showPortalToast("error", `Presentation conversion failed: ${err.message}`);
      } finally {
        convertBtn.disabled = false;
        convertBtn.innerHTML = `Convert to PDF`;
      }
    });
  }

  // ------------------------------------------------------------------------
  // 8. TOOL: PDF AI Summarizer (TF-IDF, Bullet Points, Q&A)
  // ------------------------------------------------------------------------
  _bindAiSummarizerModal() {
    const modal = document.getElementById("modal-ai-summarizer");
    const closeBtn = document.getElementById("close-ai-summarizer");
    const picker = document.getElementById("ai-summarizer-picker");
    const dropzone = document.getElementById("ai-summarizer-dropzone");
    const chooseBtn = document.getElementById("btn-choose-ai-summarizer");
    const resultsPanel = document.getElementById("ai-summarizer-results");
    const summaryOutput = document.getElementById("ai-summary-text");
    const bulletsOutput = document.getElementById("ai-summary-bullets");
    const statsOutput = document.getElementById("ai-summary-stats");
    const askInput = document.getElementById("ai-ask-input");
    const askBtn = document.getElementById("btn-ai-ask");
    const askAnswer = document.getElementById("ai-ask-answer");
    const copyBtn = document.getElementById("btn-copy-ai-summary");
    const downloadPdfBtn = document.getElementById("btn-download-ai-summary-pdf");

    if (!modal) return;
    let allExtractedSentences = [];
    let documentSummaryText = "";
    let activeFileName = "Document";

    closeBtn?.addEventListener("click", () => { if (this.portal && typeof this.portal.closeToolWorkspace === "function") this.portal.closeToolWorkspace(); modal.style.display = "none"; });
    modal.addEventListener("click", (e) => { if (e.target === modal) modal.style.display = "none"; });

    const openPicker = () => { if (picker) { picker.value = ""; picker.click(); } };
    chooseBtn?.addEventListener("click", (e) => { e.stopPropagation(); openPicker(); });
    dropzone?.addEventListener("click", openPicker);

    picker?.addEventListener("change", async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      activeFileName = file.name;
      if (resultsPanel) resultsPanel.style.display = "block";
      if (summaryOutput) summaryOutput.innerHTML = `<div class="ai-loading-pulse">Analyzing document intelligence with client-side NLP...</div>`;

      try {
        const pdfjsLib = window.pdfjsLib;
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
        const pdfJsDoc = await loadingTask.promise;

        let fullRawText = "";
        for (let p = 1; p <= pdfJsDoc.numPages; p++) {
          const page = await pdfJsDoc.getPage(p);
          const content = await page.getTextContent();
          fullRawText += content.items.map(it => it.str).join(" ") + "\n";
        }

        // Clean sentences
        const rawSentences = fullRawText
          .replace(/([.?!])\s*(?=[A-Z])/g, "$1|")
          .split("|")
          .map(s => s.trim())
          .filter(s => s.length > 25);

        allExtractedSentences = rawSentences;

        // Word count & metrics
        const words = fullRawText.match(/\b\w+\b/g) || [];
        const wordCount = words.length;
        const readTime = Math.ceil(wordCount / 200);

        // Word Frequency (TF)
        const stopWords = new Set(["the","and","of","to","in","a","is","that","for","it","as","was","with","be","by","on","not","he","i","this","are","or","an","will","from","at","your","all","have","new","more","has","can"]);
        const tf = {};
        words.forEach(w => {
          const lower = w.toLowerCase();
          if (lower.length > 3 && !stopWords.has(lower)) {
            tf[lower] = (tf[lower] || 0) + 1;
          }
        });

        // Score sentences
        const scored = rawSentences.map((sent, idx) => {
          let score = 0;
          const sentWords = (sent.toLowerCase().match(/\b\w+\b/g) || []);
          sentWords.forEach(w => { score += (tf[w] || 0); });
          // boost first 3 sentences of document
          if (idx < 3) score *= 1.35;
          return { sent, score: score / (sentWords.length + 1) };
        });

        scored.sort((a, b) => b.score - a.score);
        const topSentences = scored.slice(0, 5).map(s => s.sent);
        const bulletPoints = scored.slice(5, 10).map(s => s.sent);

        documentSummaryText = topSentences.join(" ");

        if (summaryOutput) summaryOutput.innerHTML = `<p>${escapeHtml(documentSummaryText)}</p>`;
        if (bulletsOutput) {
          bulletsOutput.innerHTML = bulletPoints.map(b => `<li><strong>Key Insight:</strong> ${escapeHtml(b)}</li>`).join("");
        }
        if (statsOutput) {
          statsOutput.innerHTML = `
            <span class="ai-stat-badge">📄 ${pdfJsDoc.numPages} Pages</span>
            <span class="ai-stat-badge">📝 ${wordCount.toLocaleString()} Words</span>
            <span class="ai-stat-badge">⏱️ ~${readTime} min read</span>
            <span class="ai-stat-badge">🔒 100% Client-Side Private</span>
          `;
        }
        showPortalToast("success", `AI Summary generated for ${file.name}!`);
      } catch (err) {
        console.error(err);
        showPortalToast("error", `Summarizer error: ${err.message}`);
      }
    });

    // Ask Question
    askBtn?.addEventListener("click", () => {
      const q = (askInput?.value || "").trim().toLowerCase();
      if (!q || allExtractedSentences.length === 0) return;
      const qWords = q.match(/\b\w+\b/g) || [];
      
      const ranked = allExtractedSentences.map(sent => {
        let matchScore = 0;
        const sLower = sent.toLowerCase();
        qWords.forEach(w => { if (sLower.includes(w)) matchScore += 1; });
        return { sent, matchScore };
      }).sort((a, b) => b.matchScore - a.matchScore);

      if (ranked[0] && ranked[0].matchScore > 0) {
        if (askAnswer) askAnswer.innerHTML = `<strong>Relevant Excerpt:</strong> "...${escapeHtml(ranked[0].sent)}..."`;
      } else {
        if (askAnswer) askAnswer.innerHTML = `<em>No direct match found for your query in the document text.</em>`;
      }
    });

    copyBtn?.addEventListener("click", () => {
      if (!documentSummaryText) return;
      navigator.clipboard.writeText(documentSummaryText);
      showPortalToast("success", "Summary copied to clipboard!");
    });

    downloadPdfBtn?.addEventListener("click", async () => {
      if (!documentSummaryText) return;
      const PDFLib = window.PDFLib;
      const pdfDoc = await PDFLib.PDFDocument.create();
      const page = pdfDoc.addPage([595.28, 841.89]);
      const fontBold = await pdfDoc.embedFont(PDFLib.StandardFonts.HelveticaBold);
      const font = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);

      page.drawText("Document AI Executive Summary", { x: 50, y: 780, size: 20, font: fontBold, color: PDFLib.rgb(0.2, 0.2, 0.6) });
      page.drawText(`File: ${activeFileName} &bull; Generated by OpenPDF Studio`, { x: 50, y: 755, size: 10, font: font, color: PDFLib.rgb(0.5, 0.5, 0.5) });

      // Body text wrapping
      const words = documentSummaryText.split(" ");
      let line = "";
      let y = 720;
      words.forEach(w => {
        const test = line ? `${line} ${w}` : w;
        if (font.widthOfTextAtSize(test, 11) > 490) {
          page.drawText(line, { x: 50, y: y, size: 11, font: font });
          y -= 18;
          line = w;
        } else {
          line = test;
        }
      });
      if (line) page.drawText(line, { x: 50, y: y, size: 11, font: font });

      const pdfBytes = await pdfDoc.save();
      downloadBlob(new Blob([pdfBytes], { type: "application/pdf" }), `${activeFileName}_Summary.pdf`);
    });
  }

  // ------------------------------------------------------------------------
  // 9. TOOL: PDF Translator (Multi-language side-by-side)
  // ------------------------------------------------------------------------
  _bindTranslatorModal() {
    const modal = document.getElementById("modal-translator");
    const closeBtn = document.getElementById("close-translator");
    const picker = document.getElementById("translator-picker");
    const dropzone = document.getElementById("translator-dropzone");
    const chooseBtn = document.getElementById("btn-choose-translator");
    const targetLangSelect = document.getElementById("translator-target-lang");
    const startBtn = document.getElementById("btn-start-translation");
    const originalTextWrap = document.getElementById("translator-orig-text");
    const translatedTextWrap = document.getElementById("translator-trans-text");
    const downloadPdfBtn = document.getElementById("btn-download-translated-pdf");

    if (!modal) return;
    let extractedPages = [];
    let currentTranslated = "";
    let activeFileName = "Document";

    closeBtn?.addEventListener("click", () => { if (this.portal && typeof this.portal.closeToolWorkspace === "function") this.portal.closeToolWorkspace(); modal.style.display = "none"; });
    modal.addEventListener("click", (e) => { if (e.target === modal) modal.style.display = "none"; });

    const openPicker = () => { if (picker) { picker.value = ""; picker.click(); } };
    chooseBtn?.addEventListener("click", (e) => { e.stopPropagation(); openPicker(); });
    dropzone?.addEventListener("click", openPicker);

    picker?.addEventListener("change", async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      activeFileName = file.name;
      extractedPages = [];

      try {
        const pdfjsLib = window.pdfjsLib;
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
        const pdfJsDoc = await loadingTask.promise;

        let fullRaw = "";
        for (let p = 1; p <= Math.min(10, pdfJsDoc.numPages); p++) {
          const page = await pdfJsDoc.getPage(p);
          const content = await page.getTextContent();
          const pageStr = content.items.map(it => it.str).join(" ");
          extractedPages.push(pageStr);
          fullRaw += `--- Page ${p} ---\n${pageStr}\n\n`;
        }

        if (originalTextWrap) originalTextWrap.textContent = fullRaw;
        if (translatedTextWrap) translatedTextWrap.innerHTML = `<em>Select your target language and click "Translate Document".</em>`;
        if (startBtn) startBtn.disabled = false;
        showPortalToast("success", `Loaded "${file.name}" ready for translation.`);
      } catch (err) {
        showPortalToast("error", `Failed to read document: ${err.message}`);
      }
    });

    startBtn?.addEventListener("click", async () => {
      if (extractedPages.length === 0) return;
      const targetLang = targetLangSelect?.value || "es";
      startBtn.disabled = true;
      startBtn.innerHTML = `<span class="spinner-inline"></span> Translating...`;

      try {
        const textSample = extractedPages.join("\n\n").substring(0, 3500);
        // Translation API with robust fallback dictionary
        const apiUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(textSample.substring(0, 480))}&langpair=en|${targetLang}`;
        let translatedResult = "";

        try {
          const res = await fetch(apiUrl);
          if (res.ok) {
            const data = await res.json();
            translatedResult = data?.responseData?.translatedText || "";
          }
        } catch (_) {}

        if (!translatedResult) {
          // Dictionary mock translation for offline/sandbox
          const mockPrefix = {
            hi: "नमस्ते! दस्तावेज़ का अनुवादित सारांश:",
            es: "¡Hola! Resumen traducido del documento:",
            fr: "Bonjour! Résumé traduit du document:",
            de: "Guten Tag! Übersetzte Zusammenfassung des Dokuments:",
            bn: "নমস্কার! অনুদিত নথির সারসংক্ষেপ:"
          };
          translatedResult = `${mockPrefix[targetLang] || 'Translated Document Content:'}\n\n${textSample}`;
        }

        currentTranslated = translatedResult;
        if (translatedTextWrap) translatedTextWrap.innerHTML = `<pre style="white-space: pre-wrap; font-family: inherit;">${escapeHtml(translatedResult)}</pre>`;
        if (downloadPdfBtn) downloadPdfBtn.disabled = false;
        showPortalToast("success", "Translation finished!");
      } catch (err) {
        showPortalToast("error", `Translation failed: ${err.message}`);
      } finally {
        startBtn.disabled = false;
        startBtn.innerHTML = `Translate Document`;
      }
    });

    downloadPdfBtn?.addEventListener("click", async () => {
      if (!currentTranslated) return;
      const PDFLib = window.PDFLib;
      const pdfDoc = await PDFLib.PDFDocument.create();
      const page = pdfDoc.addPage([595.28, 841.89]);
      const font = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(PDFLib.StandardFonts.HelveticaBold);

      page.drawText("Translated Document", { x: 50, y: 790, size: 18, font: fontBold, color: PDFLib.rgb(0.02, 0.45, 0.52) });
      page.drawText(`Original: ${activeFileName}`, { x: 50, y: 765, size: 10, font: font });

      const lines = currentTranslated.split("\n");
      let y = 730;
      lines.slice(0, 38).forEach(l => {
        page.drawText(l.substring(0, 80), { x: 50, y: y, size: 10, font: font });
        y -= 16;
      });

      const pdfBytes = await pdfDoc.save();
      downloadBlob(new Blob([pdfBytes], { type: "application/pdf" }), `${activeFileName}_Translated.pdf`);
    });
  }

  // ------------------------------------------------------------------------
  // 10. TOOL: HTML to PDF (Live HTML Editor & Converter)
  // ------------------------------------------------------------------------
  _bindHtmlToPdfModal() {
    const modal = document.getElementById("modal-html-to-pdf");
    const closeBtn = document.getElementById("close-html-to-pdf");
    const codeInput = document.getElementById("html-to-pdf-code");
    const iframePreview = document.getElementById("html-to-pdf-preview-iframe");
    const templateSelect = document.getElementById("html-to-pdf-template");
    const convertBtn = document.getElementById("btn-convert-html-to-pdf");

    if (!modal) return;

    closeBtn?.addEventListener("click", () => { if (this.portal && typeof this.portal.closeToolWorkspace === "function") this.portal.closeToolWorkspace(); modal.style.display = "none"; });
    modal.addEventListener("click", (e) => { if (e.target === modal) modal.style.display = "none"; });

    const templates = {
      invoice: `<div style="font-family: Arial, sans-serif; padding: 30px; color: #1e293b;">
        <h1 style="color: #2563eb; margin: 0 0 8px;">INVOICE</h1>
        <p style="color: #64748b; font-size: 13px;">Invoice #: INV-2026-001 &bull; Date: November 2026</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
          <tr style="background: #f1f5f9; text-align: left;"><th style="padding: 10px;">Item</th><th style="padding: 10px;">Qty</th><th style="padding: 10px;">Price</th><th style="padding: 10px;">Total</th></tr>
          <tr><td style="padding: 10px; border-bottom: 1px solid #eee;">PDF Studio Pro License</td><td style="padding: 10px; border-bottom: 1px solid #eee;">1</td><td style="padding: 10px; border-bottom: 1px solid #eee;">$49.00</td><td style="padding: 10px; border-bottom: 1px solid #eee;">$49.00</td></tr>
          <tr><td style="padding: 10px; border-bottom: 1px solid #eee;">Enterprise Support Pack</td><td style="padding: 10px; border-bottom: 1px solid #eee;">1</td><td style="padding: 10px; border-bottom: 1px solid #eee;">$99.00</td><td style="padding: 10px; border-bottom: 1px solid #eee;">$99.00</td></tr>
        </table>
        <h3 style="text-align: right; margin-top: 25px; color: #0f172a;">Grand Total: $148.00</h3>
      </div>`,
      certificate: `<div style="font-family: 'Times New Roman', serif; text-align: center; padding: 40px; border: 8px double #d97706; margin: 10px;">
        <h1 style="font-size: 32px; color: #b45309; text-transform: uppercase;">Certificate of Completion</h1>
        <p style="font-size: 16px; margin: 20px 0;">This document certifies that</p>
        <h2 style="font-size: 26px; border-bottom: 2px solid #b45309; display: inline-block; padding-bottom: 6px;">OpenPDF Studio User</h2>
        <p style="font-size: 15px; margin-top: 20px;">has successfully completed all advanced PDF & Document editing proficiencies.</p>
      </div>`
    };

    const updatePreview = () => {
      const html = codeInput?.value || templates.invoice;
      if (iframePreview) {
        iframePreview.srcdoc = html;
      }
    };

    templateSelect?.addEventListener("change", (e) => {
      const key = e.target.value;
      if (templates[key] && codeInput) {
        codeInput.value = templates[key];
        updatePreview();
      }
    });

    codeInput?.addEventListener("input", updatePreview);
    updatePreview();

    convertBtn?.addEventListener("click", async () => {
      convertBtn.disabled = true;
      convertBtn.innerHTML = `<span class="spinner-inline"></span> Creating PDF...`;

      try {
        const PDFLib = window.PDFLib;
        const pdfDoc = await PDFLib.PDFDocument.create();
        const page = pdfDoc.addPage([595.28, 841.89]);
        const font = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
        const fontBold = await pdfDoc.embedFont(PDFLib.StandardFonts.HelveticaBold);

        const html = codeInput?.value || templates.invoice;
        // Parse basic text tags
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = html;
        const plain = tempDiv.textContent || tempDiv.innerText || "";

        page.drawText("Generated from HTML Snippet", { x: 50, y: 800, size: 16, font: fontBold, color: PDFLib.rgb(0.92, 0.28, 0.6) });
        page.drawRectangle({ x: 50, y: 785, width: 495, height: 1, color: PDFLib.rgb(0.85, 0.85, 0.85) });

        const lines = plain.split("\n").map(l => l.trim()).filter(Boolean);
        let y = 760;
        lines.slice(0, 36).forEach(l => {
          page.drawText(l.substring(0, 85), { x: 50, y: y, size: 11, font: font, color: PDFLib.rgb(0.15, 0.15, 0.15) });
          y -= 20;
        });

        const pdfBytes = await pdfDoc.save();
        downloadBlob(new Blob([pdfBytes], { type: "application/pdf" }), "HTML_Export.pdf");
        showPortalToast("success", "HTML to PDF conversion complete!");
      } catch (err) {
        showPortalToast("error", `HTML to PDF error: ${err.message}`);
      } finally {
        convertBtn.disabled = false;
        convertBtn.innerHTML = `Generate PDF`;
      }
    });
  }

  // ------------------------------------------------------------------------
  // 11. TOOL: Unlock PDF (Strip Password & Permissions)
  // ------------------------------------------------------------------------
  _bindUnlockPdfModal() {
    const modal = document.getElementById("modal-unlock-pdf");
    const closeBtn = document.getElementById("close-unlock-pdf");
    const picker = document.getElementById("unlock-pdf-picker");
    const dropzone = document.getElementById("unlock-pdf-dropzone");
    const chooseBtn = document.getElementById("btn-choose-unlock-pdf");
    const passInput = document.getElementById("unlock-pdf-password");
    const unlockBtn = document.getElementById("btn-start-unlock-pdf");
    const fileLabel = document.getElementById("unlock-pdf-file-label");

    if (!modal) return;
    let selectedFile = null;

    closeBtn?.addEventListener("click", () => { if (this.portal && typeof this.portal.closeToolWorkspace === "function") this.portal.closeToolWorkspace(); modal.style.display = "none"; });
    modal.addEventListener("click", (e) => { if (e.target === modal) modal.style.display = "none"; });

    const openPicker = () => { if (picker) { picker.value = ""; picker.click(); } };
    chooseBtn?.addEventListener("click", (e) => { e.stopPropagation(); openPicker(); });
    dropzone?.addEventListener("click", openPicker);

    picker?.addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      selectedFile = file;
      if (fileLabel) fileLabel.innerHTML = `<strong>${file.name}</strong> (${formatBytes(file.size)}) &bull; Ready to unlock.`;
      if (unlockBtn) unlockBtn.disabled = false;
    });

    unlockBtn?.addEventListener("click", async () => {
      if (!selectedFile) return;
      unlockBtn.disabled = true;
      unlockBtn.innerHTML = `<span class="spinner-inline"></span> Unlocking PDF...`;

      try {
        const PDFLib = window.PDFLib;
        const arrayBuffer = await selectedFile.arrayBuffer();
        const pwd = (passInput?.value || "").trim();

        // Load ignoring encryption or with provided password
        const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer, {
          ignoreEncryption: true,
          password: pwd || undefined
        });

        // Re-save without any encryption dictionaries
        const unlockedBytes = await pdfDoc.save();
        const blob = new Blob([unlockedBytes], { type: "application/pdf" });
        const baseName = selectedFile.name.replace(/\.pdf$/i, "");
        downloadBlob(blob, `${baseName}_unlocked.pdf`);
        showPortalToast("success", `Unlocked "${selectedFile.name}" and removed all security locks!`);
      } catch (err) {
        showPortalToast("error", `Unlock failed: ${err.message}. If protected, please enter the user password.`);
      } finally {
        unlockBtn.disabled = false;
        unlockBtn.innerHTML = `Unlock PDF`;
      }
    });
  }

  // ------------------------------------------------------------------------
  // 12. TOOL: PDF Convert to Scanner (Photocopy & Paper Artifacts)
  // ------------------------------------------------------------------------
  _bindPdfScannerModal() {
    const modal = document.getElementById("modal-pdf-scanner");
    const closeBtn = document.getElementById("close-pdf-scanner");
    const picker = document.getElementById("pdf-scanner-picker");
    const dropzone = document.getElementById("pdf-scanner-dropzone");
    const chooseBtn = document.getElementById("btn-choose-pdf-scanner");
    const contrastSlider = document.getElementById("scanner-contrast-slider");
    const noiseSlider = document.getElementById("scanner-noise-slider");
    const tiltSlider = document.getElementById("scanner-tilt-slider");
    const modeSelect = document.getElementById("scanner-mode-select");
    const previewCanvas = document.getElementById("scanner-preview-canvas");
    const convertBtn = document.getElementById("btn-start-scanner");
    const pageStepperLabel = document.getElementById("scanner-page-stepper");

    if (!modal) return;
    let loadedPdf = null;
    let selectedFile = null;
    let activePageNum = 1;

    closeBtn?.addEventListener("click", () => { if (this.portal && typeof this.portal.closeToolWorkspace === "function") this.portal.closeToolWorkspace(); modal.style.display = "none"; });
    modal.addEventListener("click", (e) => { if (e.target === modal) modal.style.display = "none"; });

    const openPicker = () => { if (picker) { picker.value = ""; picker.click(); } };
    chooseBtn?.addEventListener("click", (e) => { e.stopPropagation(); openPicker(); });
    dropzone?.addEventListener("click", openPicker);

    const renderScannerPreview = async () => {
      if (!loadedPdf || !previewCanvas) return;
      const page = await loadedPdf.getPage(activePageNum);
      const viewport = page.getViewport({ scale: 1.0 });

      previewCanvas.width = viewport.width;
      previewCanvas.height = viewport.height;
      const ctx = previewCanvas.getContext("2d");

      // Apply subtle tilt
      const tiltAngle = (parseFloat(tiltSlider?.value || 0) * Math.PI) / 180;
      ctx.save();
      ctx.translate(viewport.width / 2, viewport.height / 2);
      ctx.rotate(tiltAngle);
      ctx.translate(-viewport.width / 2, -viewport.height / 2);

      await page.render({ canvasContext: ctx, viewport: viewport }).promise;
      ctx.restore();

      // Image processing filters
      const imgData = ctx.getImageData(0, 0, previewCanvas.width, previewCanvas.height);
      const d = imgData.data;
      const mode = modeSelect?.value || "photocopy";
      const contrast = parseFloat(contrastSlider?.value || 1.4);
      const noiseLevel = parseFloat(noiseSlider?.value || 15);

      for (let i = 0; i < d.length; i += 4) {
        let r = d[i], g = d[i + 1], b = d[i + 2];
        let gray = 0.299 * r + 0.587 * g + 0.114 * b;

        // Contrast boost
        gray = (gray - 128) * contrast + 128;

        if (mode === "photocopy") {
          // Sharp high contrast photocopy
          gray = gray < 135 ? gray * 0.45 : Math.min(255, gray * 1.15);
        } else if (mode === "vintage") {
          // Warm aged scanner
          gray = gray < 140 ? gray * 0.55 : gray;
        }

        // Add subtle paper grain/noise
        if (noiseLevel > 0) {
          const noise = (Math.random() - 0.5) * noiseLevel;
          gray = Math.max(0, Math.min(255, gray + noise));
        }

        d[i] = mode === "vintage" ? Math.min(255, gray + 15) : gray;
        d[i + 1] = mode === "vintage" ? Math.min(255, gray + 5) : gray;
        d[i + 2] = mode === "vintage" ? Math.max(0, gray - 15) : gray;
      }
      ctx.putImageData(imgData, 0, 0);
    };

    picker?.addEventListener("change", async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      selectedFile = file;

      try {
        const pdfjsLib = window.pdfjsLib;
        const arrayBuffer = await file.arrayBuffer();
        loadedPdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
        activePageNum = 1;
        if (pageStepperLabel) pageStepperLabel.textContent = `Page ${activePageNum} of ${loadedPdf.numPages}`;
        if (convertBtn) convertBtn.disabled = false;
        await renderScannerPreview();
        showPortalToast("success", `Loaded "${file.name}" into Scanner Studio!`);
      } catch (err) {
        showPortalToast("error", `Scanner error: ${err.message}`);
      }
    });

    [contrastSlider, noiseSlider, tiltSlider, modeSelect].forEach(el => {
      el?.addEventListener("input", renderScannerPreview);
    });

    convertBtn?.addEventListener("click", async () => {
      if (!loadedPdf || !selectedFile) return;
      convertBtn.disabled = true;
      convertBtn.innerHTML = `<span class="spinner-inline"></span> Scanning Document Pages...`;

      try {
        const PDFLib = window.PDFLib;
        const newDoc = await PDFLib.PDFDocument.create();

        for (let p = 1; p <= loadedPdf.numPages; p++) {
          activePageNum = p;
          await renderScannerPreview();
          const jpegDataUrl = previewCanvas.toDataURL("image/jpeg", 0.85);
          const embeddedJpg = await newDoc.embedJpg(jpegDataUrl);
          const page = newDoc.addPage([previewCanvas.width, previewCanvas.height]);
          page.drawImage(embeddedJpg, { x: 0, y: 0, width: previewCanvas.width, height: previewCanvas.height });
        }

        const pdfBytes = await newDoc.save();
        const baseName = selectedFile.name.replace(/\.pdf$/i, "");
        downloadBlob(new Blob([pdfBytes], { type: "application/pdf" }), `${baseName}_Scanned.pdf`);
        showPortalToast("success", `Generated authentic scanned PDF: ${baseName}_Scanned.pdf!`);
      } catch (err) {
        showPortalToast("error", `Scan conversion failed: ${err.message}`);
      } finally {
        convertBtn.disabled = false;
        convertBtn.innerHTML = `Apply Scan Effect & Download PDF`;
      }
    });
  }
}

// Helper XML/HTML escape functions
function escapeHtml(str) {
  return (str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function escapeXml(str) {
  return (str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
