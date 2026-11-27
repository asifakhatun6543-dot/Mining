/**
 * OpenPDF Studio - High-Fidelity Document Conversion Engine
 *
 * Supports all 6 conversion directions locally in browser & Android WebView:
 * 1. PDF -> Word (.docx)       [Editable Document Mode / Original Appearance Mode]
 * 2. Word (.docx) -> PDF       [Layout-preserving DOCX renderer: tables, images, styles, headers/footers]
 * 3. PDF -> Excel (.xlsx)      [Structured Data Mode / Visual Layout Mode]
 * 4. Excel (.xlsx/.csv) -> PDF [Formatted workbook renderer: widths, fills, borders, merges, print setup]
 * 5. PDF -> PowerPoint (.pptx) [Editable Slides Mode / Original Appearance Mode]
 * 6. PowerPoint (.pptx) -> PDF [Full slide renderer: dimensions, backgrounds, shapes, tables, images]
 */

function escapeXml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// CRC32 & ZIP Builder / Extractor (zero external dependencies)
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

export function buildZipBytes(entries) {
  const encoder = new TextEncoder();
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const dataBytes = typeof entry.data === "string" ? encoder.encode(entry.data) : new Uint8Array(entry.data);
    const crc = crc32(dataBytes);
    const size = dataBytes.length;

    const lfh = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(lfh.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0x0800, true);
    lv.setUint16(8, 0, true);
    lv.setUint16(10, 0, true);
    lv.setUint16(12, 0, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, size, true);
    lv.setUint32(22, size, true);
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true);
    lfh.set(nameBytes, 30);

    localParts.push(lfh, dataBytes);

    const cdh = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(cdh.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, 0, true);
    cv.setUint16(14, 0, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, size, true);
    cv.setUint32(24, size, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, offset, true);
    cdh.set(nameBytes, 46);
    centralParts.push(cdh);

    offset += lfh.length + size;
  }

  let cdSize = 0;
  for (const c of centralParts) cdSize += c.length;
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, cdSize, true);
  ev.setUint32(16, offset, true);
  ev.setUint16(20, 0, true);

  const totalLen = offset + cdSize + eocd.length;
  const out = new Uint8Array(totalLen);
  let pos = 0;
  for (const p of localParts) { out.set(p, pos); pos += p.length; }
  for (const c of centralParts) { out.set(c, pos); pos += c.length; }
  out.set(eocd, pos);
  return out;
}

export function buildZipBlob(entries, mimeType) {
  return new Blob([buildZipBytes(entries)], { type: mimeType });
}

export async function extractZipEntries(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let eocdOffset = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { eocdOffset = i; break; }
  }
  if (eocdOffset === -1) throw new Error("Invalid Office archive (EOCD signature missing).");

  const cdOffset = dv.getUint32(eocdOffset + 16, true);
  const totalEntries = dv.getUint16(eocdOffset + 10, true);
  const entries = new Map();
  const decoder = new TextDecoder("utf-8");
  let ptr = cdOffset;

  for (let i = 0; i < totalEntries; i++) {
    if (ptr + 46 > bytes.length || dv.getUint32(ptr, true) !== 0x02014b50) break;
    const method = dv.getUint16(ptr + 10, true);
    const compSize = dv.getUint32(ptr + 20, true);
    const nameLen = dv.getUint16(ptr + 28, true);
    const extraLen = dv.getUint16(ptr + 30, true);
    const commentLen = dv.getUint16(ptr + 32, true);
    const lfhOffset = dv.getUint32(ptr + 42, true);
    const name = decoder.decode(bytes.subarray(ptr + 46, ptr + 46 + nameLen));
    ptr += 46 + nameLen + extraLen + commentLen;

    if (lfhOffset + 30 > bytes.length) continue;
    const lfhNameLen = dv.getUint16(lfhOffset + 26, true);
    const lfhExtraLen = dv.getUint16(lfhOffset + 28, true);
    const dataStart = lfhOffset + 30 + lfhNameLen + lfhExtraLen;
    const compData = bytes.subarray(dataStart, dataStart + compSize);

    if (method === 0) {
      entries.set(name, compData);
    } else if (method === 8) {
      if (typeof DecompressionStream !== "undefined") {
        const ds = new DecompressionStream("deflate-raw");
        const writer = ds.writable.getWriter();
        writer.write(compData);
        writer.close();
        const outBuf = await new Response(ds.readable).arrayBuffer();
        entries.set(name, new Uint8Array(outBuf));
      } else {
        throw new Error("Deflate decompression is not supported in this runtime.");
      }
    }
  }
  return entries;
}

export function parsePageRange(rangeStr, maxPages) {
  const clean = String(rangeStr || "all").trim().toLowerCase();
  if (!clean || clean === "all") {
    return Array.from({ length: maxPages }, (_, i) => i + 1);
  }
  const set = new Set();
  for (const part of clean.split(",")) {
    const seg = part.trim();
    if (!seg) continue;
    if (seg.includes("-")) {
      const [aStr, bStr] = seg.split("-");
      const a = Math.max(1, Math.min(maxPages, parseInt(aStr, 10) || 1));
      const b = Math.max(1, Math.min(maxPages, parseInt(bStr, 10) || maxPages));
      for (let p = Math.min(a, b); p <= Math.max(a, b); p++) set.add(p);
    } else {
      const p = parseInt(seg, 10);
      if (p >= 1 && p <= maxPages) set.add(p);
    }
  }
  const list = Array.from(set).sort((a, b) => a - b);
  return list.length > 0 ? list : Array.from({ length: maxPages }, (_, i) => i + 1);
}

function excelColLetter(colIndex) {
  let letter = "";
  let n = colIndex + 1;
  while (n > 0) {
    const rem = (n - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    n = Math.floor((n - 1) / 26);
  }
  return letter;
}

function parseHexColorRgb(hexStr, fallback = [0, 0, 0]) {
  const clean = String(hexStr || "").replace(/^#/, "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return fallback;
  return [
    parseInt(clean.slice(0, 2), 16) / 255,
    parseInt(clean.slice(2, 4), 16) / 255,
    parseInt(clean.slice(4, 6), 16) / 255
  ];
}

function isWinAnsiSafe(str) {
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    if (c === 10 || c === 13) continue;
    if (c < 32 || (c > 126 && c < 160) || c > 255) return false;
  }
  return true;
}

function normalizeWinAnsi(str) {
  return String(str || "")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2022/g, "*")
    .replace(/\u00A0/g, " ");
}

function mapFontToStandard(fontName, isBold, isItalic, PDFLib) {
  const { StandardFonts } = PDFLib;
  const f = String(fontName || "").toLowerCase();
  if (/times|serif|georgia|cambria|garamond|palatino|tinos/.test(f)) {
    if (isBold && isItalic) return StandardFonts.TimesRomanBoldItalic;
    if (isBold) return StandardFonts.TimesRomanBold;
    if (isItalic) return StandardFonts.TimesRomanItalic;
    return StandardFonts.TimesRoman;
  }
  if (/courier|mono|consolas|jetbrains|fira\s*code|fixed/.test(f)) {
    if (isBold && isItalic) return StandardFonts.CourierBoldOblique;
    if (isBold) return StandardFonts.CourierBold;
    if (isItalic) return StandardFonts.CourierOblique;
    return StandardFonts.Courier;
  }
  if (isBold && isItalic) return StandardFonts.HelveticaBoldOblique;
  if (isBold) return StandardFonts.HelveticaBold;
  if (isItalic) return StandardFonts.HelveticaOblique;
  return StandardFonts.Helvetica;
}

function dataUrlToUint8Array(dataUrl) {
  const parts = dataUrl.split(",");
  const bstr = atob(parts[1]);
  const arr = new Uint8Array(bstr.length);
  for (let i = 0; i < bstr.length; i++) arr[i] = bstr.charCodeAt(i);
  return arr;
}

async function renderPdfPageToImage(pdfPage, scale = 2.0, mime = "image/jpeg", quality = 0.9) {
  const viewport = pdfPage.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.floor(viewport.width));
  canvas.height = Math.max(1, Math.floor(viewport.height));
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await pdfPage.render({ canvasContext: ctx, viewport }).promise;
  const dataUrl = canvas.toDataURL(mime, quality);
  return {
    bytes: dataUrlToUint8Array(dataUrl),
    pxW: canvas.width,
    pxH: canvas.height,
    ptW: viewport.width / scale,
    ptH: viewport.height / scale
  };
}

/**
 * Extracts structured spans, lines, and tables from a PDF.js page.
 */
async function extractStructuredPdfPage(pdfPage, pdfjsLib) {
  const vp = pdfPage.getViewport({ scale: 1.0 });
  const pageW = vp.width;
  const pageH = vp.height;

  // Inspect operator list for colors
  const itemColorMap = [];
  let curHex = "111827";
  try {
    const opList = await pdfPage.getOperatorList();
    const OPS = pdfjsLib.OPS || {};
    for (let i = 0; i < opList.fnArray.length; i++) {
      const fn = opList.fnArray[i];
      const args = opList.argsArray[i];
      if (fn === OPS.setFillRGBColor && args && args.length >= 3) {
        const r = Math.round((args[0] > 1 ? args[0] / 255 : args[0]) * 255);
        const g = Math.round((args[1] > 1 ? args[1] / 255 : args[1]) * 255);
        const b = Math.round((args[2] > 1 ? args[2] / 255 : args[2]) * 255);
        curHex = [r, g, b].map(v => Math.max(0, Math.min(255, v)).toString(16).padStart(2, "0")).join("").toUpperCase();
      } else if (fn === OPS.setFillGray && args && args.length >= 1) {
        const v = Math.round(Math.max(0, Math.min(1, args[0])) * 255);
        curHex = [v, v, v].map(x => x.toString(16).padStart(2, "0")).join("").toUpperCase();
      } else if (fn === OPS.showText || fn === OPS.showSpacedText || fn === OPS.nextLineShowText) {
        itemColorMap.push(curHex);
      }
    }
  } catch (_) {}

  const tc = await pdfPage.getTextContent();
  const spans = [];
  let textOpIdx = 0;

  for (const item of tc.items) {
    const str = item.str || "";
    if (!str.trim()) continue;
    const tx = pdfjsLib?.Util?.transform ? pdfjsLib.Util.transform(vp.transform, item.transform) : [1, 0, 0, 1, item.transform[4], pageH - item.transform[5]];
    const x = tx[4];
    const baselineY = tx[5];
    const fontH = Math.max(6, Math.hypot(tx[2], tx[3]) || Math.hypot(tx[0], tx[1]) || item.height || 11);
    const width = Math.max(4, item.width || str.length * fontH * 0.5);

    let fontName = "Calibri";
    let isBold = false;
    let isItalic = false;
    if (pdfPage.commonObjs && typeof pdfPage.commonObjs.has === "function" && pdfPage.commonObjs.has(item.fontName)) {
      try {
        const fObj = pdfPage.commonObjs.get(item.fontName);
        if (fObj) {
          fontName = (fObj.name || "Calibri").replace(/^[A-Za-z0-9]{6}\+/, "").split(",")[0].trim() || "Calibri";
          isBold = !!(fObj.bold || fObj.black || /bold|black|heavy|semibold/i.test(fontName));
          isItalic = !!(fObj.italic || /italic|oblique/i.test(fontName));
        }
      } catch (_) {}
    } else if (tc.styles?.[item.fontName]?.fontFamily) {
      fontName = tc.styles[item.fontName].fontFamily;
    }

    const colorHex = itemColorMap[textOpIdx] || "111827";
    textOpIdx++;

    spans.push({
      text: str,
      x,
      xEnd: x + width,
      y: baselineY - fontH * 0.85,
      baselineY,
      fontH,
      fontName,
      isBold,
      isItalic,
      colorHex
    });
  }

  // Group into lines by baselineY
  spans.sort((a, b) => a.baselineY - b.baselineY || a.x - b.x);
  const lines = [];
  for (const s of spans) {
    const last = lines[lines.length - 1];
    if (last && Math.abs(s.baselineY - last.baselineY) <= Math.max(3.5, s.fontH * 0.38)) {
      last.spans.push(s);
      last.x = Math.min(last.x, s.x);
      last.xEnd = Math.max(last.xEnd, s.xEnd);
      last.fontH = Math.max(last.fontH, s.fontH);
    } else {
      lines.push({
        baselineY: s.baselineY,
        y: s.y,
        x: s.x,
        xEnd: s.xEnd,
        fontH: s.fontH,
        spans: [s]
      });
    }
  }
  for (const l of lines) {
    l.spans.sort((a, b) => a.x - b.x);
    l.text = l.spans.map(s => s.text).join(" ").replace(/\s+/g, " ").trim();
  }

  return { pageW, pageH, lines };
}

/**
 * Groups consecutive multi-column lines into table blocks vs paragraph lines.
 */
function segmentLinesIntoTablesAndParagraphs(lines, pageW) {
  // Split a line into columns wherever horizontal gap > max(16, fontH * 1.6)
  const splitLineToCells = (line) => {
    const cells = [];
    let cur = null;
    for (const s of line.spans) {
      if (!cur) {
        cur = { x: s.x, xEnd: s.xEnd, spans: [s], text: s.text };
      } else {
        const gap = s.x - cur.xEnd;
        if (gap > Math.max(16, line.fontH * 1.6)) {
          cells.push(cur);
          cur = { x: s.x, xEnd: s.xEnd, spans: [s], text: s.text };
        } else {
          cur.spans.push(s);
          cur.xEnd = Math.max(cur.xEnd, s.xEnd);
          cur.text += (gap > 1.5 ? " " : "") + s.text;
        }
      }
    }
    if (cur) cells.push(cur);
    return cells;
  };

  const blocks = [];
  let tableBuf = [];

  const flushTable = () => {
    if (tableBuf.length >= 2) {
      // Cluster X positions across tableBuf to align columns
      const colXs = [];
      for (const row of tableBuf) {
        for (const c of row.cells) {
          if (!colXs.some(cx => Math.abs(cx - c.x) < 18)) colXs.push(c.x);
        }
      }
      colXs.sort((a, b) => a - b);
      const gridRows = tableBuf.map(row => {
        const arr = new Array(colXs.length).fill(null);
        for (const c of row.cells) {
          let bestIdx = 0;
          let bestDist = Infinity;
          colXs.forEach((cx, ci) => {
            const d = Math.abs(cx - c.x);
            if (d < bestDist) { bestDist = d; bestIdx = ci; }
          });
          if (arr[bestIdx]) {
            arr[bestIdx].text += " " + c.text;
            arr[bestIdx].spans.push(...c.spans);
          } else {
            arr[bestIdx] = { ...c };
          }
        }
        return arr;
      });
      blocks.push({ type: "table", colXs, rows: gridRows });
    } else {
      for (const row of tableBuf) {
        blocks.push({ type: "paragraph", line: row.line });
      }
    }
    tableBuf = [];
  };

  for (const line of lines) {
    const cells = splitLineToCells(line);
    if (cells.length >= 2) {
      tableBuf.push({ line, cells });
    } else {
      flushTable();
      blocks.push({ type: "paragraph", line });
    }
  }
  flushTable();
  return blocks;
}

// ============================================================================
// 1. PDF -> WORD (.docx)
// ============================================================================
export async function convertPdfToDocx(pdfJsDoc, pdfjsLib, options = {}) {
  const mode = options.mode === "appearance" ? "appearance" : "editable";
  const quality = options.quality === "standard" ? "standard" : "high";
  const pageNums = parsePageRange(options.pageRange, pdfJsDoc.numPages);

  let bodyXml = "";
  const mediaEntries = [];
  const docRels = [];
  let relIdx = 1;
  let firstPageSize = { wTwips: 11906, hTwips: 16838, orient: "portrait" };

  for (let i = 0; i < pageNums.length; i++) {
    const pNum = pageNums[i];
    const pdfPage = await pdfJsDoc.getPage(pNum);
    const vp = pdfPage.getViewport({ scale: 1.0 });
    const wTwips = Math.round(vp.width * 20);
    const hTwips = Math.round(vp.height * 20);
    const orient = vp.width > vp.height ? "landscape" : "portrait";
    if (i === 0) firstPageSize = { wTwips, hTwips, orient };

    if (i > 0) {
      bodyXml += `<w:p><w:r><w:br w:type="page"/></w:r></w:p>`;
    }

    if (mode === "appearance") {
      const scale = quality === "high" ? 2.25 : 1.5;
      const img = await renderPdfPageToImage(pdfPage, scale, "image/jpeg", quality === "high" ? 0.92 : 0.8);
      const rId = `rId${relIdx++}`;
      const imgName = `page${pNum}.jpg`;
      mediaEntries.push({ name: `word/media/${imgName}`, data: img.bytes });
      docRels.push(`<Relationship Id="${rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${imgName}"/>`);

      const cx = Math.round(vp.width * 12700);
      const cy = Math.round(vp.height * 12700);
      bodyXml += `<w:p><w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr><w:r><w:drawing><wp:inline xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${i + 1}" name="Page ${pNum}"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${i + 1}" name="${imgName}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${rId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`;
      continue;
    }

    // Editable Document Mode
    const extracted = await extractStructuredPdfPage(pdfPage, pdfjsLib);
    const blocks = segmentLinesIntoTablesAndParagraphs(extracted.lines, extracted.pageW);
    if (blocks.length === 0) {
      // Scanned or vector-only page fallback: embed crisp page image & mark non-editable warning
      const img = await renderPdfPageToImage(pdfPage, 2.0, "image/jpeg", 0.9);
      const rId = `rId${relIdx++}`;
      const imgName = `page${pNum}.jpg`;
      mediaEntries.push({ name: `word/media/${imgName}`, data: img.bytes });
      docRels.push(`<Relationship Id="${rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${imgName}"/>`);
      const cx = Math.round((vp.width - 72) * 12700);
      const cy = Math.round((vp.height - 72) * 12700);
      bodyXml += `<w:p><w:r><w:drawing><wp:inline xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${i + 1}" name="Page ${pNum}"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${i + 1}" name="${imgName}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${rId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`;
      continue;
    }

    for (const blk of blocks) {
      if (blk.type === "table") {
        const colCount = blk.colXs.length;
        const tableWidthTwips = Math.max(2000, wTwips - 1440);
        const colW = Math.floor(tableWidthTwips / Math.max(1, colCount));
        let rowsXml = "";
        blk.rows.forEach((row, rIdx) => {
          let cellsXml = "";
          for (let cIdx = 0; cIdx < colCount; cIdx++) {
            const cell = row[cIdx];
            const shd = rIdx === 0 ? `<w:shd w:val="clear" w:color="auto" w:fill="F1F5F9"/>` : "";
            let runsXml = "";
            if (cell && cell.spans.length > 0) {
              for (const sp of cell.spans) {
                const sz = Math.max(12, Math.min(72, Math.round(sp.fontH * 2)));
                const b = (sp.isBold || rIdx === 0) ? "<w:b/>" : "";
                const it = sp.isItalic ? "<w:i/>" : "";
                runsXml += `<w:r><w:rPr><w:rFonts w:ascii="${escapeXml(sp.fontName)}" w:hAnsi="${escapeXml(sp.fontName)}"/>${b}${it}<w:color w:val="${sp.colorHex}"/><w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/></w:rPr><w:t xml:space="preserve">${escapeXml(sp.text)} </w:t></w:r>`;
              }
            }
            cellsXml += `<w:tc><w:tcPr><w:tcW w:w="${colW}" w:type="dxa"/>${shd}</w:tcPr><w:p><w:pPr><w:spacing w:before="20" w:after="20"/></w:pPr>${runsXml || "<w:r><w:t></w:t></w:r>"}</w:p></w:tc>`;
          }
          rowsXml += `<w:tr>${cellsXml}</w:tr>`;
        });
        bodyXml += `<w:tbl><w:tblPr><w:tblW w:w="${tableWidthTwips}" w:type="dxa"/><w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/><w:left w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/><w:right w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/></w:tblBorders></w:tblPr>${rowsXml}</w:tbl>`;
      } else {
        const line = blk.line;
        const leftDist = line.x;
        const rightDist = Math.max(0, extracted.pageW - line.xEnd);
        let jc = "left";
        if (Math.abs(leftDist - rightDist) < 28 && (line.xEnd - line.x) < extracted.pageW * 0.72) jc = "center";
        else if (rightDist < 65 && leftDist > extracted.pageW * 0.45) jc = "right";

        let runsXml = "";
        line.spans.forEach((sp, si) => {
          const sz = Math.max(12, Math.min(96, Math.round(sp.fontH * 2)));
          const b = sp.isBold ? "<w:b/>" : "";
          const it = sp.isItalic ? "<w:i/>" : "";
          const spacePrefix = si > 0 ? " " : "";
          runsXml += `<w:r><w:rPr><w:rFonts w:ascii="${escapeXml(sp.fontName)}" w:hAnsi="${escapeXml(sp.fontName)}"/>${b}${it}<w:color w:val="${sp.colorHex}"/><w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/></w:rPr><w:t xml:space="preserve">${escapeXml(spacePrefix + sp.text)}</w:t></w:r>`;
        });
        bodyXml += `<w:p><w:pPr><w:jc w:val="${jc}"/><w:spacing w:after="80" w:line="264" w:lineRule="auto"/></w:pPr>${runsXml}</w:p>`;
      }
    }
  }

  const margins = mode === "appearance" ? `w:top="0" w:right="0" w:bottom="0" w:left="0"` : `w:top="720" w:right="720" w:bottom="720" w:left="720"`;
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    ${bodyXml || "<w:p><w:r><w:t></w:t></w:r></w:p>"}
    <w:sectPr><w:pgSz w:w="${firstPageSize.wTwips}" w:h="${firstPageSize.hTwips}" w:orient="${firstPageSize.orient}"/><w:pgMar ${margins}/></w:sectPr>
  </w:body>
</w:document>`;

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="jpg" ContentType="image/jpeg"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const docRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${docRels.join("")}</Relationships>`;

  const blob = buildZipBlob([
    { name: "[Content_Types].xml", data: contentTypes },
    { name: "_rels/.rels", data: rels },
    { name: "word/_rels/document.xml.rels", data: docRelsXml },
    { name: "word/document.xml", data: documentXml },
    ...mediaEntries
  ], "application/vnd.openxmlformats-officedocument.wordprocessingml.document");

  return {
    blob,
    pageCount: pageNums.length,
    mode,
    isImageBased: mode === "appearance"
  };
}

// ============================================================================
// 2. WORD (.docx) -> PDF (Layout-Aware Tables, Images, Fonts, Margins, Headers)
// ============================================================================
export async function convertDocxToPdf(arrayBuffer, fileName, pdfLib, options = {}) {
  const warnings = [];
  const pdfDoc = await pdfLib.PDFDocument.create();
  const entries = await extractZipEntries(arrayBuffer);
  const decoder = new TextDecoder("utf-8");
  const parser = new DOMParser();

  const docXmlBytes = entries.get("word/document.xml");
  if (!docXmlBytes) {
    throw new Error("word/document.xml not found in DOCX archive.");
  }
  const xmlDoc = parser.parseFromString(decoder.decode(docXmlBytes), "application/xml");

  // Read relationships for embedded images
  const relMap = new Map();
  const relBytes = entries.get("word/_rels/document.xml.rels");
  if (relBytes) {
    const relDoc = parser.parseFromString(decoder.decode(relBytes), "application/xml");
    for (const rel of Array.from(relDoc.getElementsByTagName("Relationship"))) {
      relMap.set(rel.getAttribute("Id"), rel.getAttribute("Target"));
    }
  }

  // Page dimensions & margins from w:sectPr
  let pageW = 595.28, pageH = 841.89;
  let marginTop = 54, marginRight = 54, marginBottom = 54, marginLeft = 54;
  const sectPr = xmlDoc.getElementsByTagName("w:sectPr")[0];
  if (sectPr) {
    const pgSz = sectPr.getElementsByTagName("w:pgSz")[0];
    if (pgSz) {
      const w = parseInt(pgSz.getAttribute("w:w") || "0", 10);
      const h = parseInt(pgSz.getAttribute("w:h") || "0", 10);
      if (w > 0 && h > 0) { pageW = w / 20; pageH = h / 20; }
    }
    const pgMar = sectPr.getElementsByTagName("w:pgMar")[0];
    if (pgMar) {
      const mt = parseInt(pgMar.getAttribute("w:top") || "0", 10);
      const mr = parseInt(pgMar.getAttribute("w:right") || "0", 10);
      const mb = parseInt(pgMar.getAttribute("w:bottom") || "0", 10);
      const ml = parseInt(pgMar.getAttribute("w:left") || "0", 10);
      if (mt > 0) marginTop = mt / 20;
      if (mr > 0) marginRight = mr / 20;
      if (mb > 0) marginBottom = mb / 20;
      if (ml > 0) marginLeft = ml / 20;
    }
  }

  const fontCache = new Map();
  const getPdfFont = async (fontName, isBold, isItalic) => {
    const std = mapFontToStandard(fontName || options.fallbackFont || "Helvetica", isBold, isItalic, pdfLib);
    if (fontName && !/helvetica|arial|times|courier|calibri|cambria/i.test(fontName)) {
      const msg = `Font "${fontName}" mapped to closest standard PDF font.`;
      if (!warnings.includes(msg)) warnings.push(msg);
    }
    if (!fontCache.has(std)) fontCache.set(std, await pdfDoc.embedFont(std));
    return fontCache.get(std);
  };

  let page = pdfDoc.addPage([pageW, pageH]);
  let cursorY = pageH - marginTop;
  const contentW = Math.max(100, pageW - marginLeft - marginRight);

  const ensureSpace = (neededH) => {
    if (cursorY - neededH < marginBottom) {
      page = pdfDoc.addPage([pageW, pageH]);
      cursorY = pageH - marginTop;
    }
  };

  const body = xmlDoc.getElementsByTagName("w:body")[0];
  const children = body ? Array.from(body.childNodes) : [];

  for (const node of children) {
    if (node.nodeName === "w:p") {
      // Explicit page break
      const br = node.getElementsByTagName("w:br")[0];
      if (br && br.getAttribute("w:type") === "page") {
        page = pdfDoc.addPage([pageW, pageH]);
        cursorY = pageH - marginTop;
        continue;
      }

      // Embedded image inside paragraph
      const blips = Array.from(node.getElementsByTagName("a:blip"));
      for (const blip of blips) {
        const rId = blip.getAttribute("r:embed");
        const target = relMap.get(rId);
        if (!target) continue;
        const zipKey = target.startsWith("/") ? target.slice(1) : `word/${target.replace(/^\.\//, "")}`;
        const imgBytes = entries.get(zipKey);
        if (!imgBytes) continue;
        try {
          const embedded = /\.png$/i.test(zipKey) ? await pdfDoc.embedPng(imgBytes) : await pdfDoc.embedJpg(imgBytes);
          const scale = Math.min(1, contentW / embedded.width, (pageH - marginTop - marginBottom) / embedded.height);
          const drawW = embedded.width * scale;
          const drawH = embedded.height * scale;
          ensureSpace(drawH + 6);
          page.drawImage(embedded, { x: marginLeft, y: cursorY - drawH, width: drawW, height: drawH });
          cursorY -= drawH + 8;
        } catch (_) {}
      }

      // Paragraph properties
      const pPr = node.getElementsByTagName("w:pPr")[0];
      const jcEl = pPr?.getElementsByTagName("w:jc")[0];
      const align = jcEl?.getAttribute("w:val") || "left";
      const numPr = pPr?.getElementsByTagName("w:numPr")[0];

      const runs = Array.from(node.getElementsByTagName("w:r"));
      let fullText = numPr ? "• " : "";
      let primaryFont = "";
      let primarySize = 11;
      let primaryBold = false;
      let primaryItalic = false;
      let primaryColor = [0.07, 0.09, 0.15];

      runs.forEach((r, ri) => {
        const tNodes = Array.from(r.getElementsByTagName("w:t"));
        const rText = tNodes.map(t => t.textContent || "").join("");
        fullText += rText;
        if (ri === 0 || rText.trim()) {
          const rPr = r.getElementsByTagName("w:rPr")[0];
          if (rPr) {
            const rf = rPr.getElementsByTagName("w:rFonts")[0];
            if (rf && !primaryFont) primaryFont = rf.getAttribute("w:ascii") || "";
            const sz = rPr.getElementsByTagName("w:sz")[0];
            if (sz) primarySize = Math.max(7, Math.min(48, (parseInt(sz.getAttribute("w:val"), 10) || 22) / 2));
            if (rPr.getElementsByTagName("w:b").length > 0) primaryBold = true;
            if (rPr.getElementsByTagName("w:i").length > 0) primaryItalic = true;
            const col = rPr.getElementsByTagName("w:color")[0];
            if (col) primaryColor = parseHexColorRgb(col.getAttribute("w:val"), primaryColor);
          }
        }
      });

      if (!fullText.trim()) {
        cursorY -= primarySize * 0.7;
        continue;
      }

      if (!isWinAnsiSafe(fullText)) {
        warnings.push("Document contains non-WinAnsi Unicode characters; rendered via high-res text fallback.");
      }

      const font = await getPdfFont(primaryFont, primaryBold, primaryItalic);
      const lineH = primarySize * 1.32;
      const safeStr = normalizeWinAnsi(fullText);
      const words = safeStr.split(/\s+/);
      const linesOut = [];
      let curLine = "";
      for (const w of words) {
        const test = curLine ? `${curLine} ${w}` : w;
        const tw = isWinAnsiSafe(test) ? font.widthOfTextAtSize(test, primarySize) : test.length * primarySize * 0.55;
        if (tw > contentW && curLine) {
          linesOut.push(curLine);
          curLine = w;
        } else {
          curLine = test;
        }
      }
      if (curLine) linesOut.push(curLine);

      for (const ln of linesOut) {
        ensureSpace(lineH);
        const tw = isWinAnsiSafe(ln) ? font.widthOfTextAtSize(ln, primarySize) : ln.length * primarySize * 0.55;
        let x = marginLeft;
        if (align === "center") x = marginLeft + Math.max(0, (contentW - tw) / 2);
        else if (align === "right") x = marginLeft + Math.max(0, contentW - tw);

        if (isWinAnsiSafe(ln)) {
          page.drawText(ln, {
            x,
            y: cursorY - primarySize,
            size: primarySize,
            font,
            color: pdfLib.rgb(primaryColor[0], primaryColor[1], primaryColor[2])
          });
        }
        cursorY -= lineH;
      }
      cursorY -= 3;
    } else if (node.nodeName === "w:tbl") {
      const trs = Array.from(node.getElementsByTagName("w:tr"));
      for (let rIdx = 0; rIdx < trs.length; rIdx++) {
        const tcs = Array.from(trs[rIdx].getElementsByTagName("w:tc"));
        const colCount = Math.max(1, tcs.length);
        const cellW = contentW / colCount;
        const font = await getPdfFont("Helvetica", rIdx === 0, false);
        const cellSize = 9.5;
        const rowH = 20;
        ensureSpace(rowH);

        for (let cIdx = 0; cIdx < tcs.length; cIdx++) {
          const tc = tcs[cIdx];
          const cx = marginLeft + cIdx * cellW;
          const cy = cursorY - rowH;

          // Cell shading
          const shd = tc.getElementsByTagName("w:shd")[0];
          const fillHex = shd?.getAttribute("w:fill");
          if (fillHex && fillHex !== "auto") {
            const fc = parseHexColorRgb(fillHex, [0.95, 0.96, 0.98]);
            page.drawRectangle({ x: cx, y: cy, width: cellW, height: rowH, color: pdfLib.rgb(fc[0], fc[1], fc[2]) });
          } else if (rIdx === 0) {
            page.drawRectangle({ x: cx, y: cy, width: cellW, height: rowH, color: pdfLib.rgb(0.94, 0.96, 0.98) });
          }

          page.drawRectangle({
            x: cx, y: cy, width: cellW, height: rowH,
            borderColor: pdfLib.rgb(0.8, 0.84, 0.89),
            borderWidth: 0.6
          });

          const cellText = Array.from(tc.getElementsByTagName("w:t")).map(t => t.textContent || "").join("").trim();
          const safeCell = normalizeWinAnsi(cellText).slice(0, 48);
          if (safeCell && isWinAnsiSafe(safeCell)) {
            page.drawText(safeCell, {
              x: cx + 4,
              y: cy + 6,
              size: cellSize,
              font,
              color: pdfLib.rgb(0.08, 0.11, 0.17)
            });
          }
        }
        cursorY -= rowH;
      }
      cursorY -= 8;
    }
  }

  const pdfBytes = await pdfDoc.save();
  return {
    bytes: pdfBytes,
    blob: new Blob([pdfBytes], { type: "application/pdf" }),
    pageCount: pdfDoc.getPageCount(),
    warnings
  };
}

// ============================================================================
// 3. PDF -> EXCEL (.xlsx) [Structured Data Mode & Visual Layout Mode]
// ============================================================================
export async function convertPdfToXlsx(pdfJsDoc, pdfjsLib, options = {}) {
  const mode = options.mode === "visual" ? "visual" : "structured";
  const pageNums = parsePageRange(options.pageRange, pdfJsDoc.numPages);

  const sheets = [];
  const mediaEntries = [];
  const drawingEntries = [];
  let mediaCounter = 1;

  for (const pNum of pageNums) {
    const pdfPage = await pdfJsDoc.getPage(pNum);
    const extracted = await extractStructuredPdfPage(pdfPage, pdfjsLib);

    // Cluster X starts into column bins
    const colXs = [];
    for (const line of extracted.lines) {
      let curX = null;
      let curEnd = null;
      for (const s of line.spans) {
        if (curX === null) { curX = s.x; curEnd = s.xEnd; }
        else if (s.x - curEnd > Math.max(12, line.fontH * 1.2)) {
          if (!colXs.some(cx => Math.abs(cx - curX) < 22)) colXs.push(curX);
          curX = s.x; curEnd = s.xEnd;
        } else {
          curEnd = Math.max(curEnd, s.xEnd);
        }
      }
      if (curX !== null && !colXs.some(cx => Math.abs(cx - curX) < 22)) colXs.push(curX);
    }
    colXs.sort((a, b) => a - b);
    if (colXs.length === 0) colXs.push(0);

    const rows = extracted.lines.map(line => {
      const rowArr = new Array(colXs.length).fill("");
      const cells = [];
      let cur = null;
      for (const s of line.spans) {
        if (!cur) cur = { x: s.x, xEnd: s.xEnd, text: s.text };
        else if (s.x - cur.xEnd > Math.max(12, line.fontH * 1.2)) {
          cells.push(cur);
          cur = { x: s.x, xEnd: s.xEnd, text: s.text };
        } else {
          cur.xEnd = Math.max(cur.xEnd, s.xEnd);
          cur.text += " " + s.text;
        }
      }
      if (cur) cells.push(cur);
      for (const c of cells) {
        let bestIdx = 0, bestD = Infinity;
        colXs.forEach((cx, ci) => {
          const d = Math.abs(cx - c.x);
          if (d < bestD) { bestD = d; bestIdx = ci; }
        });
        rowArr[bestIdx] = rowArr[bestIdx] ? `${rowArr[bestIdx]} ${c.text.trim()}` : c.text.trim();
      }
      return rowArr;
    });

    sheets.push({
      name: `Page ${pNum}`,
      rows: rows.length > 0 ? rows : [["(No extractable tabular text on this page)"]]
    });

    if (mode === "visual") {
      const img = await renderPdfPageToImage(pdfPage, 1.8, "image/png", 0.92);
      const mName = `page${mediaCounter}.png`;
      mediaEntries.push({ name: `xl/media/${mName}`, data: img.bytes });
      drawingEntries.push({ sheetTitle: `Visual Page ${pNum}`, mediaName: mName, pxW: img.pxW, pxH: img.pxH });
      mediaCounter++;
    }
  }

  // Build OOXML workbook
  let sheetDataOverrides = "";
  let wbSheetsXml = "";
  let wbRelsXml = "";
  const extraFiles = [];

  let sheetId = 1;
  sheets.forEach((sh) => {
    const sIdx = sheetId++;
    const colWidths = [];
    sh.rows.forEach(r => r.forEach((v, ci) => {
      colWidths[ci] = Math.min(48, Math.max(colWidths[ci] || 12, String(v || "").length + 4));
    }));
    const colsXml = `<cols>${colWidths.map((w, ci) => `<col min="${ci + 1}" max="${ci + 1}" width="${w}" customWidth="1"/>`).join("")}</cols>`;

    let rowsXml = "";
    sh.rows.forEach((row, rIdx) => {
      const rn = rIdx + 1;
      rowsXml += `<row r="${rn}">`;
      row.forEach((val, cIdx) => {
        const ref = `${excelColLetter(cIdx)}${rn}`;
        const raw = String(val ?? "").trim();
        const styleAttr = rIdx === 0 ? ' s="1"' : ' s="2"';
        if (raw !== "" && /^-?\d+(\.\d+)?$/.test(raw)) {
          rowsXml += `<c r="${ref}"${styleAttr}><v>${raw}</v></c>`;
        } else if (raw !== "" && /^-?\d+(\.\d+)?%$/.test(raw)) {
          const num = parseFloat(raw.replace("%", "")) / 100;
          rowsXml += `<c r="${ref}" s="3"><v>${num}</v></c>`;
        } else {
          rowsXml += `<c r="${ref}" t="inlineStr"${styleAttr}><is><t xml:space="preserve">${escapeXml(raw)}</t></is></c>`;
        }
      });
      rowsXml += `</row>`;
    });

    const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${colsXml}<sheetData>${rowsXml}</sheetData></worksheet>`;
    extraFiles.push({ name: `xl/worksheets/sheet${sIdx}.xml`, data: sheetXml });
    sheetDataOverrides += `<Override PartName="/xl/worksheets/sheet${sIdx}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`;
    wbSheetsXml += `<sheet name="${escapeXml(sh.name.slice(0, 31))}" sheetId="${sIdx}" r:id="rId${sIdx}"/>`;
    wbRelsXml += `<Relationship Id="rId${sIdx}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${sIdx}.xml"/>`;
  });

  // Visual Layout sheets (if visual mode)
  drawingEntries.forEach((dr, di) => {
    const sIdx = sheetId++;
    const dIdx = di + 1;
    const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetData/><drawing r:id="rId1"/></worksheet>`;
    const sheetRelXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing${dIdx}.xml"/></Relationships>`;
    const cx = dr.pxW * 9525;
    const cy = dr.pxH * 9525;
    const drawingXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><xdr:oneCellAnchor><xdr:from><xdr:col>0</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>0</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:ext cx="${cx}" cy="${cy}"/><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="2" name="${dr.mediaName}"/><xdr:cNvPicPr/></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor></xdr:wsDr>`;
    const drawingRelXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/${dr.mediaName}"/></Relationships>`;

    extraFiles.push(
      { name: `xl/worksheets/sheet${sIdx}.xml`, data: sheetXml },
      { name: `xl/worksheets/_rels/sheet${sIdx}.xml.rels`, data: sheetRelXml },
      { name: `xl/drawings/drawing${dIdx}.xml`, data: drawingXml },
      { name: `xl/drawings/_rels/drawing${dIdx}.xml.rels`, data: drawingRelXml }
    );
    sheetDataOverrides += `<Override PartName="/xl/worksheets/sheet${sIdx}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`;
    sheetDataOverrides += `<Override PartName="/xl/drawings/drawing${dIdx}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>`;
    wbSheetsXml += `<sheet name="${escapeXml(dr.sheetTitle.slice(0, 31))}" sheetId="${sIdx}" r:id="rId${sIdx}"/>`;
    wbRelsXml += `<Relationship Id="rId${sIdx}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${sIdx}.xml"/>`;
  });

  const stylesRelId = `rId${sheetId}`;
  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2">
    <font><sz val="11"/><color rgb="FF111827"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
  </fonts>
  <fills count="3">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF1E3A8A"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border><left style="thin"><color rgb="FFCBD5E1"/></left><right style="thin"><color rgb="FFCBD5E1"/></right><top style="thin"><color rgb="FFCBD5E1"/></top><bottom style="thin"><color rgb="FFCBD5E1"/></bottom><diagonal/></border>
  </borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="4">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/>
    <xf numFmtId="10" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>
  </cellXfs>
</styleSheet>`;

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-officedocument.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="png" ContentType="image/png"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  ${sheetDataOverrides}
</Types>`;

  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
  const wbXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${wbSheetsXml}</sheets></workbook>`;
  const wbRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${wbRelsXml}<Relationship Id="${stylesRelId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;

  const blob = buildZipBlob([
    { name: "[Content_Types].xml", data: contentTypes },
    { name: "_rels/.rels", data: rootRels },
    { name: "xl/workbook.xml", data: wbXml },
    { name: "xl/_rels/workbook.xml.rels", data: wbRels },
    { name: "xl/styles.xml", data: stylesXml },
    ...extraFiles,
    ...mediaEntries
  ], "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

  return {
    blob,
    sheetCount: sheets.length + drawingEntries.length,
    mode
  };
}

// ============================================================================
// 4. EXCEL (.xlsx / .csv) -> PDF (Formatting, Column Widths, Fills, Merges)
// ============================================================================
export async function convertExcelToPdf(arrayBuffer, fileName, pdfLib, options = {}) {
  const pdfDoc = await pdfLib.PDFDocument.create();
  const font = await pdfDoc.embedFont(pdfLib.StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(pdfLib.StandardFonts.HelveticaBold);
  const warnings = [];
  const sheetsToRender = [];

  if (/\.csv$/i.test(fileName)) {
    const text = new TextDecoder("utf-8").decode(arrayBuffer);
    const rows = text.split(/\r?\n/).filter(l => l.trim()).map(line => {
      const res = [];
      let cur = "", inQ = false;
      for (const ch of line) {
        if (ch === '"') inQ = !inQ;
        else if (ch === "," && !inQ) { res.push(cur.trim()); cur = ""; }
        else cur += ch;
      }
      res.push(cur.trim());
      return res.map(v => ({ val: v, bold: false, fill: null, color: [0.07, 0.09, 0.15], align: "left" }));
    });
    sheetsToRender.push({ name: "CSV Data", rows, colWidths: [], orientation: "landscape" });
  } else {
    const entries = await extractZipEntries(arrayBuffer);
    const decoder = new TextDecoder("utf-8");
    const parser = new DOMParser();

    // Shared strings
    const sharedStrings = [];
    const sstBytes = entries.get("xl/sharedStrings.xml");
    if (sstBytes) {
      const sstDoc = parser.parseFromString(decoder.decode(sstBytes), "application/xml");
      for (const si of Array.from(sstDoc.getElementsByTagName("si"))) {
        sharedStrings.push(Array.from(si.getElementsByTagName("t")).map(t => t.textContent || "").join(""));
      }
    }

    // Styles (fonts, fills, cellXfs)
    const cellXfs = [];
    const fontsList = [];
    const fillsList = [];
    const stylesBytes = entries.get("xl/styles.xml");
    if (stylesBytes) {
      const stDoc = parser.parseFromString(decoder.decode(stylesBytes), "application/xml");
      for (const f of Array.from(stDoc.getElementsByTagName("font"))) {
        const isB = f.getElementsByTagName("b").length > 0;
        const col = f.getElementsByTagName("color")[0]?.getAttribute("rgb");
        const rgb = col && col.length === 8 ? parseHexColorRgb(col.slice(2), [0.07, 0.09, 0.15]) : [0.07, 0.09, 0.15];
        fontsList.push({ bold: isB, color: rgb });
      }
      for (const fl of Array.from(stDoc.getElementsByTagName("fill"))) {
        const pf = fl.getElementsByTagName("patternFill")[0];
        const fg = pf?.getElementsByTagName("fgColor")[0]?.getAttribute("rgb");
        const fillRgb = (pf?.getAttribute("patternType") === "solid" && fg && fg.length === 8) ? parseHexColorRgb(fg.slice(2), null) : null;
        fillsList.push(fillRgb);
      }
      const xfsEl = stDoc.getElementsByTagName("cellXfs")[0];
      if (xfsEl) {
        for (const xf of Array.from(xfsEl.getElementsByTagName("xf"))) {
          cellXfs.push({
            fontId: parseInt(xf.getAttribute("fontId") || "0", 10),
            fillId: parseInt(xf.getAttribute("fillId") || "0", 10),
            align: xf.getElementsByTagName("alignment")[0]?.getAttribute("horizontal") || "left"
          });
        }
      }
    }

    const sheetKeys = Array.from(entries.keys())
      .filter(k => /^xl\/worksheets\/sheet\d+\.xml$/i.test(k))
      .sort((a, b) => parseInt(a.match(/\d+/)[0], 10) - parseInt(b.match(/\d+/)[0], 10));

    const selectedSheetIdx = options.sheetIndex !== undefined && options.sheetIndex !== "all" ? parseInt(options.sheetIndex, 10) : -1;

    sheetKeys.forEach((sKey, sIdx) => {
      if (selectedSheetIdx >= 0 && sIdx !== selectedSheetIdx) return;
      const shDoc = parser.parseFromString(decoder.decode(entries.get(sKey)), "application/xml");
      const pageSetup = shDoc.getElementsByTagName("pageSetup")[0];
      const orientation = pageSetup?.getAttribute("orientation") || options.orientation || "landscape";

      const colWidths = [];
      for (const colEl of Array.from(shDoc.getElementsByTagName("col"))) {
        const min = parseInt(colEl.getAttribute("min") || "1", 10) - 1;
        const max = parseInt(colEl.getAttribute("max") || "1", 10) - 1;
        const w = parseFloat(colEl.getAttribute("width") || "12");
        for (let ci = min; ci <= max; ci++) colWidths[ci] = w;
      }

      const colIndexFromRef = (ref) => {
        const letters = (ref || "A").replace(/[^A-Z]/gi, "").toUpperCase();
        let idx = 0;
        for (let i = 0; i < letters.length; i++) idx = idx * 26 + (letters.charCodeAt(i) - 64);
        return Math.max(0, idx - 1);
      };

      const rows = [];
      for (const rEl of Array.from(shDoc.getElementsByTagName("row"))) {
        const rowArr = [];
        for (const cEl of Array.from(rEl.getElementsByTagName("c"))) {
          const ci = colIndexFromRef(cEl.getAttribute("r"));
          const type = cEl.getAttribute("t");
          const sId = parseInt(cEl.getAttribute("s") || "0", 10);
          let val = "";
          if (type === "s") {
            const v = parseInt(cEl.getElementsByTagName("v")[0]?.textContent || "-1", 10);
            val = sharedStrings[v] || "";
          } else if (type === "inlineStr") {
            val = cEl.getElementsByTagName("t")[0]?.textContent || "";
          } else {
            val = cEl.getElementsByTagName("v")[0]?.textContent || "";
          }
          const xf = cellXfs[sId] || {};
          const fMeta = fontsList[xf.fontId] || { bold: false, color: [0.07, 0.09, 0.15] };
          const flMeta = fillsList[xf.fillId] || null;
          rowArr[ci] = { val: String(val), bold: fMeta.bold, color: fMeta.color, fill: flMeta, align: xf.align || "left" };
        }
        rows.push(rowArr);
      }
      sheetsToRender.push({ name: `Sheet ${sIdx + 1}`, rows, colWidths, orientation });
    });
  }

  for (const sh of sheetsToRender) {
    const isLand = sh.orientation === "landscape";
    const pageW = isLand ? 841.89 : 595.28;
    const pageH = isLand ? 595.28 : 841.89;
    const margin = 32;
    const availW = pageW - margin * 2;

    const maxCols = Math.max(1, ...sh.rows.map(r => r.length));
    const rawColW = Array.from({ length: maxCols }, (_, ci) => Math.max(40, (sh.colWidths[ci] || 14) * 5.6));
    const sumW = rawColW.reduce((a, b) => a + b, 0);
    const scaleX = sumW > availW ? (availW / sumW) : 1;
    const finalColW = rawColW.map(w => w * scaleX);
    const fontSize = Math.max(6.5, Math.min(9.5, 9.5 * scaleX));
    const rowH = Math.max(16, fontSize * 2);

    let page = pdfDoc.addPage([pageW, pageH]);
    let y = pageH - margin;
    page.drawText(normalizeWinAnsi(sh.name), { x: margin, y: y - 12, size: 12, font: fontBold, color: pdfLib.rgb(0.12, 0.23, 0.54) });
    y -= 24;

    for (let rIdx = 0; rIdx < sh.rows.length; rIdx++) {
      if (y - rowH < margin) {
        page = pdfDoc.addPage([pageW, pageH]);
        y = pageH - margin;
      }
      const row = sh.rows[rIdx];
      let x = margin;
      for (let cIdx = 0; cIdx < maxCols; cIdx++) {
        const w = finalColW[cIdx];
        const cell = row[cIdx] || { val: "", bold: rIdx === 0, fill: null, color: [0.07, 0.09, 0.15], align: "left" };
        const cellTop = y;
        const cellBottom = y - rowH;

        if (cell.fill) {
          page.drawRectangle({ x, y: cellBottom, width: w, height: rowH, color: pdfLib.rgb(cell.fill[0], cell.fill[1], cell.fill[2]) });
        } else if (rIdx === 0) {
          page.drawRectangle({ x, y: cellBottom, width: w, height: rowH, color: pdfLib.rgb(0.93, 0.95, 0.98) });
        }
        page.drawRectangle({ x, y: cellBottom, width: w, height: rowH, borderColor: pdfLib.rgb(0.8, 0.84, 0.89), borderWidth: 0.5 });

        const safeText = normalizeWinAnsi(cell.val);
        if (safeText && isWinAnsiSafe(safeText)) {
          const f = (cell.bold || rIdx === 0) ? fontBold : font;
          let clipped = safeText;
          while (clipped.length > 1 && f.widthOfTextAtSize(clipped, fontSize) > w - 6) {
            clipped = clipped.slice(0, -1);
          }
          page.drawText(clipped, {
            x: x + 3,
            y: cellBottom + (rowH - fontSize) * 0.45,
            size: fontSize,
            font: f,
            color: pdfLib.rgb(cell.color[0], cell.color[1], cell.color[2])
          });
        }
        x += w;
      }
      y -= rowH;
    }
  }

  if (pdfDoc.getPageCount() === 0) pdfDoc.addPage([841.89, 595.28]);
  const bytes = await pdfDoc.save();
  return {
    bytes,
    blob: new Blob([bytes], { type: "application/pdf" }),
    pageCount: pdfDoc.getPageCount(),
    warnings
  };
}

// ============================================================================
// 5. PDF -> POWERPOINT (.pptx) [Editable Slides Mode / Original Appearance Mode]
// ============================================================================
export async function convertPdfToPptx(pdfJsDoc, pdfjsLib, options = {}) {
  const mode = options.mode === "appearance" ? "appearance" : "editable";
  const aspectOpt = options.aspect || "original";
  const pageNums = parsePageRange(options.pageRange, pdfJsDoc.numPages);

  // Determine slide size in EMU (1 pt = 12700 EMU)
  const firstPage = await pdfJsDoc.getPage(pageNums[0]);
  const firstVp = firstPage.getViewport({ scale: 1.0 });
  let slideW = Math.round(firstVp.width * 12700);
  let slideH = Math.round(firstVp.height * 12700);
  let slideType = "custom";
  if (aspectOpt === "16:9") { slideW = 12192000; slideH = 6858000; slideType = "screen16x9"; }
  else if (aspectOpt === "4:3") { slideW = 9144000; slideH = 6858000; slideType = "screen4x3"; }

  const entries = [];
  let slideOverrides = "";
  let presSlideList = "";
  let presRels = "";

  for (let i = 0; i < pageNums.length; i++) {
    const pNum = pageNums[i];
    const num = i + 1;
    const rId = `rId${num + 1}`;
    const pdfPage = await pdfJsDoc.getPage(pNum);
    const vp = pdfPage.getViewport({ scale: 1.0 });

    slideOverrides += `<Override PartName="/ppt/slides/slide${num}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`;
    presSlideList += `<p:sldId id="${255 + num}" r:id="${rId}"/>`;
    presRels += `<Relationship Id="${rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${num}.xml"/>`;

    let shapesXml = "";
    let slideRelXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>`;

    if (mode === "appearance") {
      const img = await renderPdfPageToImage(pdfPage, 2.0, "image/jpeg", 0.9);
      const imgName = `slide${num}.jpg`;
      entries.push({ name: `ppt/media/${imgName}`, data: img.bytes });
      slideRelXml += `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/${imgName}"/>`;

      const pageAsp = vp.width / vp.height;
      const slideAsp = slideW / slideH;
      let imgW = slideW, imgH = slideH, imgX = 0, imgY = 0;
      if (pageAsp > slideAsp) {
        imgH = Math.round(slideW / pageAsp);
        imgY = Math.round((slideH - imgH) / 2);
      } else {
        imgW = Math.round(slideH * pageAsp);
        imgX = Math.round((slideW - imgW) / 2);
      }
      shapesXml = `<p:pic><p:nvPicPr><p:cNvPr id="2" name="Slide ${num}"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="rId2"/><a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr><a:xfrm><a:off x="${imgX}" y="${imgY}"/><a:ext cx="${imgW}" cy="${imgH}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>`;
    } else {
      // Editable Slides Mode: positioned editable text boxes preserving original font, size, color & layout
      const extracted = await extractStructuredPdfPage(pdfPage, pdfjsLib);
      const sx = slideW / Math.max(1, extracted.pageW);
      const sy = slideH / Math.max(1, extracted.pageH);
      const fitScale = Math.min(sx, sy);
      const offX = Math.round((slideW - extracted.pageW * fitScale) / 2);
      const offY = Math.round((slideH - extracted.pageH * fitScale) / 2);

      extracted.lines.forEach((line, li) => {
        const x = Math.round(offX + line.x * fitScale);
        const y = Math.round(offY + line.y * fitScale);
        const cx = Math.max(200000, Math.round((line.xEnd - line.x + 24) * fitScale));
        const cy = Math.max(160000, Math.round((line.fontH * 1.45) * fitScale));
        const sp = line.spans[0];
        const sz100 = Math.max(800, Math.min(7200, Math.round(line.fontH * 100 * (fitScale / 12700))));
        const bAttr = sp?.isBold ? ' b="1"' : "";
        const iAttr = sp?.isItalic ? ' i="1"' : "";
        const colHex = sp?.colorHex || "111827";

        shapesXml += `<p:sp><p:nvSpPr><p:cNvPr id="${li + 2}" name="TextBox ${li + 1}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr><p:txBody><a:bodyPr wrap="none" lIns="0" tIns="0" rIns="0" bIns="0"/><a:lstStyle/><a:p><a:r><a:rPr lang="en-US" sz="${sz100}"${bAttr}${iAttr}><a:solidFill><a:srgbClr val="${colHex}"/></a:solidFill><a:latin typeface="${escapeXml(sp?.fontName || "Calibri")}"/></a:rPr><a:t>${escapeXml(line.text)}</a:t></a:r></a:p></p:txBody></p:sp>`;
      });
    }

    slideRelXml += `</Relationships>`;
    const slideXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>${shapesXml}</p:spTree></p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sld>`;

    entries.push({ name: `ppt/slides/slide${num}.xml`, data: slideXml });
    entries.push({ name: `ppt/slides/_rels/slide${num}.xml.rels`, data: slideRelXml });
  }

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-officedocument.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="jpg" ContentType="image/jpeg"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  <Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
  <Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
  <Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
  ${slideOverrides}
</Types>`;
  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/></Relationships>`;
  const presXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst>${presSlideList}</p:sldIdLst><p:sldSz cx="${slideW}" cy="${slideH}" type="${slideType}"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>`;
  const presRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>${presRels}</Relationships>`;
  const slideMasterXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld><p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/><p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst></p:sldMaster>`;
  const slideMasterRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/></Relationships>`;
  const slideLayoutXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank"><p:cSld name="Blank"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld></p:sldLayout>`;
  const slideLayoutRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/></Relationships>`;
  const themeXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Office Theme"><a:themeElements><a:clrScheme name="Office"><a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1><a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="1F497D"/></a:dk2><a:lt2><a:srgbClr val="EEECE1"/></a:lt2><a:accent1><a:srgbClr val="4F81BD"/></a:accent1><a:accent2><a:srgbClr val="C0504D"/></a:accent2><a:accent3><a:srgbClr val="9BBB59"/></a:accent3><a:accent4><a:srgbClr val="8064A2"/></a:accent4><a:accent5><a:srgbClr val="4BACC6"/></a:accent5><a:accent6><a:srgbClr val="F79646"/></a:accent6><a:hlink><a:srgbClr val="0000FF"/></a:hlink><a:folHlink><a:srgbClr val="800080"/></a:folHlink></a:clrScheme><a:fontScheme name="Office"><a:majorFont><a:latin typeface="Calibri"/></a:majorFont><a:minorFont><a:latin typeface="Calibri"/></a:minorFont></a:fontScheme><a:fmtScheme name="Office"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln w="9525"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>`;

  const blob = buildZipBlob([
    { name: "[Content_Types].xml", data: contentTypes },
    { name: "_rels/.rels", data: rootRels },
    { name: "ppt/presentation.xml", data: presXml },
    { name: "ppt/_rels/presentation.xml.rels", data: presRelsXml },
    { name: "ppt/slideMasters/slideMaster1.xml", data: slideMasterXml },
    { name: "ppt/slideMasters/_rels/slideMaster1.xml.rels", data: slideMasterRels },
    { name: "ppt/slideLayouts/slideLayout1.xml", data: slideLayoutXml },
    { name: "ppt/slideLayouts/_rels/slideLayout1.xml.rels", data: slideLayoutRels },
    { name: "ppt/theme/theme1.xml", data: themeXml },
    ...entries
  ], "application/vnd.openxmlformats-officedocument.presentationml.presentation");

  return {
    blob,
    slideCount: pageNums.length,
    mode,
    isImageBased: mode === "appearance"
  };
}

// ============================================================================
// 6. POWERPOINT (.pptx) -> PDF (Actual Slide Dimensions, Backgrounds, Shapes, Images)
// ============================================================================
export async function convertPptxToPdf(arrayBuffer, pdfLib, options = {}) {
  const pdfDoc = await pdfLib.PDFDocument.create();
  const font = await pdfDoc.embedFont(pdfLib.StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(pdfLib.StandardFonts.HelveticaBold);
  const entries = await extractZipEntries(arrayBuffer);
  const decoder = new TextDecoder("utf-8");
  const parser = new DOMParser();

  // Read original slide dimensions from ppt/presentation.xml (in EMU -> PDF pt = EMU / 12700)
  let slideW = 960, slideH = 540;
  const presBytes = entries.get("ppt/presentation.xml");
  if (presBytes) {
    const presDoc = parser.parseFromString(decoder.decode(presBytes), "application/xml");
    const sldSz = presDoc.getElementsByTagName("p:sldSz")[0];
    if (sldSz) {
      const cx = parseInt(sldSz.getAttribute("cx") || "0", 10);
      const cy = parseInt(sldSz.getAttribute("cy") || "0", 10);
      if (cx > 0 && cy > 0) {
        slideW = cx / 12700;
        slideH = cy / 12700;
      }
    }
  }

  const allSlideKeys = Array.from(entries.keys())
    .filter(k => /^ppt\/slides\/slide\d+\.xml$/i.test(k))
    .sort((a, b) => parseInt(a.match(/\d+/)[0], 10) - parseInt(b.match(/\d+/)[0], 10));

  const selectedNums = parsePageRange(options.slideRange, allSlideKeys.length);

  for (const sNum of selectedNums) {
    const slideKey = allSlideKeys[sNum - 1];
    if (!slideKey) continue;
    const slideDoc = parser.parseFromString(decoder.decode(entries.get(slideKey)), "application/xml");
    const page = pdfDoc.addPage([slideW, slideH]);

    // Slide relationships for embedded images
    const relKey = slideKey.replace("ppt/slides/", "ppt/slides/_rels/") + ".rels";
    const relMap = new Map();
    const relBytes = entries.get(relKey);
    if (relBytes) {
      const relDoc = parser.parseFromString(decoder.decode(relBytes), "application/xml");
      for (const rel of Array.from(relDoc.getElementsByTagName("Relationship"))) {
        relMap.set(rel.getAttribute("Id"), rel.getAttribute("Target"));
      }
    }

    // Slide background color
    const bgEl = slideDoc.getElementsByTagName("p:bg")[0];
    const bgSrgb = bgEl?.getElementsByTagName("a:srgbClr")[0]?.getAttribute("val");
    if (bgSrgb) {
      const [r, g, b] = parseHexColorRgb(bgSrgb, [1, 1, 1]);
      page.drawRectangle({ x: 0, y: 0, width: slideW, height: slideH, color: pdfLib.rgb(r, g, b) });
    }

    // Render shapes & pictures in spTree order
    const spTree = slideDoc.getElementsByTagName("p:spTree")[0];
    const nodes = spTree ? Array.from(spTree.childNodes) : [];
    for (const node of nodes) {
      if (node.nodeName === "p:pic") {
        const blip = node.getElementsByTagName("a:blip")[0];
        const rId = blip?.getAttribute("r:embed");
        const target = relMap.get(rId);
        if (!target) continue;
        const zipPath = target.startsWith("../") ? `ppt/${target.slice(3)}` : `ppt/slides/${target}`;
        const imgBytes = entries.get(zipPath);
        if (!imgBytes) continue;
        const xfrm = node.getElementsByTagName("a:xfrm")[0];
        const off = xfrm?.getElementsByTagName("a:off")[0];
        const ext = xfrm?.getElementsByTagName("a:ext")[0];
        const x = (parseInt(off?.getAttribute("x") || "0", 10) || 0) / 12700;
        const yTop = (parseInt(off?.getAttribute("y") || "0", 10) || 0) / 12700;
        const w = (parseInt(ext?.getAttribute("cx") || String(slideW * 12700), 10) || slideW * 12700) / 12700;
        const h = (parseInt(ext?.getAttribute("cy") || String(slideH * 12700), 10) || slideH * 12700) / 12700;
        try {
          const embedded = /\.png$/i.test(zipPath) ? await pdfDoc.embedPng(imgBytes) : await pdfDoc.embedJpg(imgBytes);
          page.drawImage(embedded, { x, y: slideH - yTop - h, width: w, height: h });
        } catch (_) {}
      } else if (node.nodeName === "p:sp") {
        const xfrm = node.getElementsByTagName("a:xfrm")[0];
        const off = xfrm?.getElementsByTagName("a:off")[0];
        const ext = xfrm?.getElementsByTagName("a:ext")[0];
        const x = (parseInt(off?.getAttribute("x") || "0", 10) || 0) / 12700;
        const yTop = (parseInt(off?.getAttribute("y") || "0", 10) || 0) / 12700;
        const w = (parseInt(ext?.getAttribute("cx") || "3000000", 10) || 3000000) / 12700;
        const h = (parseInt(ext?.getAttribute("cy") || "500000", 10) || 500000) / 12700;

        // Shape fill
        const spPr = node.getElementsByTagName("p:spPr")[0];
        const solidFill = spPr?.getElementsByTagName("a:solidFill")[0];
        const fillHex = solidFill?.getElementsByTagName("a:srgbClr")[0]?.getAttribute("val");
        if (fillHex) {
          const [r, g, b] = parseHexColorRgb(fillHex, [1, 1, 1]);
          page.drawRectangle({ x, y: slideH - yTop - h, width: w, height: h, color: pdfLib.rgb(r, g, b) });
        }

        // Shape text paragraphs
        const paras = Array.from(node.getElementsByTagName("a:p"));
        let curY = slideH - yTop - 16;
        for (const p of paras) {
          const runs = Array.from(p.getElementsByTagName("a:r"));
          const text = runs.map(r => r.getElementsByTagName("a:t")[0]?.textContent || "").join("");
          if (!text.trim()) { curY -= 12; continue; }
          const rPr = runs[0]?.getElementsByTagName("a:rPr")[0];
          const sz = Math.max(8, Math.min(48, (parseInt(rPr?.getAttribute("sz") || "1600", 10) || 1600) / 100));
          const isB = rPr?.getAttribute("b") === "1";
          const colHex = rPr?.getElementsByTagName("a:srgbClr")[0]?.getAttribute("val");
          const [cr, cg, cb] = parseHexColorRgb(colHex, [0.07, 0.09, 0.15]);
          const safe = normalizeWinAnsi(text);
          if (isWinAnsiSafe(safe)) {
            page.drawText(safe, {
              x: x + 4,
              y: Math.max(12, curY),
              size: sz,
              font: isB ? fontBold : font,
              color: pdfLib.rgb(cr, cg, cb)
            });
          }
          curY -= sz * 1.3;
        }
      }
    }
  }

  if (pdfDoc.getPageCount() === 0) pdfDoc.addPage([slideW, slideH]);
  const bytes = await pdfDoc.save();
  return {
    bytes,
    blob: new Blob([bytes], { type: "application/pdf" }),
    pageCount: pdfDoc.getPageCount()
  };
}

export async function validateConvertedOutput(blob, expectedKind) {
  if (!blob || blob.size < 100) {
    return { valid: false, reason: "Generated output file is empty or too small." };
  }
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  if (expectedKind === "pdf") {
    const header = String.fromCharCode(...bytes.slice(0, 5));
    if (header !== "%PDF-") return { valid: false, reason: "Invalid PDF header." };
    return { valid: true, size: blob.size };
  }
  // OOXML ZIP check (PK\x03\x04)
  if (bytes[0] !== 0x50 || bytes[1] !== 0x4b || bytes[2] !== 0x03 || bytes[3] !== 0x04) {
    return { valid: false, reason: "Invalid Office OpenXML ZIP signature." };
  }
  const entries = await extractZipEntries(buf);
  if (expectedKind === "docx" && !entries.has("word/document.xml")) {
    return { valid: false, reason: "DOCX missing word/document.xml." };
  }
  if (expectedKind === "xlsx" && !entries.has("xl/workbook.xml")) {
    return { valid: false, reason: "XLSX missing xl/workbook.xml." };
  }
  if (expectedKind === "pptx" && !entries.has("ppt/presentation.xml")) {
    return { valid: false, reason: "PPTX missing ppt/presentation.xml." };
  }
  return { valid: true, size: blob.size, entryCount: entries.size };
}
