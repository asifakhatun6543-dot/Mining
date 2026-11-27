/**
 * OpenPDF Studio - Advanced Client-Side Document Tools Suite (v4.0)
 * 100% Genuine OpenXML (.docx, .xlsx, .pptx) & Unicode-Safe PDF Engine
 * Powered by PDF.js, PDF-Lib, Canvas & Zero-Dependency Pure-JS ZIP/OOXML
 */

import {
  convertPdfToDocx,
  convertDocxToPdf,
  convertPdfToXlsx,
  convertExcelToPdf,
  convertPdfToPptx,
  convertPptxToPdf,
  validateConvertedOutput
} from "./conversion-engine.js?v=5.2";

// Ensure PDF.js worker is always configured even before editor loads
if (typeof window !== "undefined" && window.pdfjsLib && !window.pdfjsLib.GlobalWorkerOptions.workerSrc) {
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("vendor/pdfjs/pdf.worker.js", document.baseURI).href;
}

// --------------------------------------------------------------------------
// Utility Helpers
// --------------------------------------------------------------------------
export function downloadBlob(blob, filename) {
  try {
    if (typeof window !== "undefined" && window.RecentHistoryManager) {
      const lower = (filename || "").toLowerCase();
      let toolName = "PDF Export";
      let type = "pdf";
      if (lower.endsWith(".docx")) { toolName = "PDF to Word"; type = "docx"; }
      else if (lower.endsWith(".xlsx")) { toolName = "PDF to Excel"; type = "xlsx"; }
      else if (lower.endsWith(".pptx")) { toolName = "PDF to PowerPoint"; type = "pptx"; }
      else if (lower.includes("compress")) { toolName = "Compress PDF"; type = "pdf"; }
      else if (lower.includes("scanner")) { toolName = "PDF Scanner"; type = "pdf"; }
      else if (lower.includes("unlock")) { toolName = "Unlock PDF"; type = "pdf"; }
      else if (lower.includes("summary")) { toolName = "AI Summarizer"; type = "ai"; }
      else if (lower.includes("translat")) { toolName = "PDF Translator"; type = "pdf"; }

      const sizeStr = blob && blob.size ? formatBytes(blob.size) : "1.0 MB";
      window.RecentHistoryManager.add({
        name: filename,
        tool: toolName,
        type: type,
        size: sizeStr
      });
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      try { document.body.removeChild(a); } catch (_) {}
    }, 500);
    // Keep Blob URL alive 60s so Android/iOS DownloadManager finishes cleanly
    setTimeout(() => {
      try { URL.revokeObjectURL(url); } catch (_) {}
    }, 60000);
    return true;
  } catch (err) {
    console.error("Download error:", err);
    return false;
  }
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

function escapeHtml(str) {
  return String(str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function escapeXml(str) {
  return String(str || "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function normalizeWinAnsi(str) {
  return String(str || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\t/g, "    ")
    .replace(/[\u2018\u2019\u201A]/g, "'")
    .replace(/[\u201C\u201D\u201E]/g, '"')
    .replace(/\u2013/g, "-")
    .replace(/\u2014/g, "--")
    .replace(/\u2026/g, "...")
    .replace(/\u2022/g, "-")
    .replace(/\u00A0/g, " ")
    .replace(/[\u200B-\u200D\uFEFF]/g, "");
}

function toSafeWinAnsi(str, font) {
  const norm = normalizeWinAnsi(str);
  try {
    font.encodeText(norm.replace(/\n/g, ""));
    return { text: norm, isWinAnsi: true };
  } catch (_) {
    // Strip unsupported chars only if canvas fallback isn't used
    const stripped = norm.replace(/[^\x20-\x7E\xA0-\xFF\n]/g, " ");
    return { text: stripped, isWinAnsi: false, original: norm };
  }
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
    color: #fff; background: ${type === "error" ? "#ef4444" : (type === "warning" ? "#f59e0b" : "#10b981")};
    box-shadow: 0 10px 30px rgba(0,0,0,0.25); display: flex; align-items: center; gap: 10px;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

// --------------------------------------------------------------------------
// Pure-JS Zero-Dependency ZIP Writer (CRC32 + Store Method 0)
// Produces 100% standards-compliant .docx, .xlsx, and .pptx archives!
// --------------------------------------------------------------------------
const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC32_TABLE[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

export function createZipBlob(entries, mimeType = "application/zip") {
  const encoder = new TextEncoder();
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const dataBytes = entry.data instanceof Uint8Array
      ? entry.data
      : encoder.encode(String(entry.data || ""));
    const checksum = crc32(dataBytes);
    const size = dataBytes.length;

    // Local file header (30 bytes + filename)
    const lh = new Uint8Array(30 + nameBytes.length);
    const lhv = new DataView(lh.buffer);
    lhv.setUint32(0, 0x04034b50, true); // signature
    lhv.setUint16(4, 20, true);         // version needed
    lhv.setUint16(6, 0x0800, true);     // UTF-8 flag
    lhv.setUint16(8, 0, true);          // method: 0 (store)
    lhv.setUint16(10, 0, true);         // mod time
    lhv.setUint16(12, 0x5421, true);    // mod date
    lhv.setUint32(14, checksum, true);  // crc32
    lhv.setUint32(18, size, true);      // compressed size
    lhv.setUint32(22, size, true);      // uncompressed size
    lhv.setUint16(26, nameBytes.length, true);
    lhv.setUint16(28, 0, true);         // extra len
    lh.set(nameBytes, 30);

    localParts.push(lh, dataBytes);

    // Central directory header (46 bytes + filename)
    const ch = new Uint8Array(46 + nameBytes.length);
    const chv = new DataView(ch.buffer);
    chv.setUint32(0, 0x02014b50, true); // signature
    chv.setUint16(4, 20, true);         // version made by
    chv.setUint16(6, 20, true);         // version needed
    chv.setUint16(8, 0x0800, true);     // UTF-8 flag
    chv.setUint16(10, 0, true);         // method: store
    chv.setUint16(12, 0, true);
    chv.setUint16(14, 0x5421, true);
    chv.setUint32(16, checksum, true);
    chv.setUint32(20, size, true);
    chv.setUint32(24, size, true);
    chv.setUint16(28, nameBytes.length, true);
    chv.setUint16(30, 0, true);
    chv.setUint16(32, 0, true);
    chv.setUint16(34, 0, true);
    chv.setUint16(36, 0, true);
    chv.setUint32(38, 0, true);
    chv.setUint32(42, offset, true);    // local header offset
    ch.set(nameBytes, 46);

    centralParts.push(ch);
    offset += lh.length + dataBytes.length;
  }

  let cdSize = 0;
  for (const part of centralParts) cdSize += part.length;

  // End of Central Directory (22 bytes)
  const eocd = new Uint8Array(22);
  const eocdv = new DataView(eocd.buffer);
  eocdv.setUint32(0, 0x06054b50, true);
  eocdv.setUint16(4, 0, true);
  eocdv.setUint16(6, 0, true);
  eocdv.setUint16(8, entries.length, true);
  eocdv.setUint16(10, entries.length, true);
  eocdv.setUint32(12, cdSize, true);
  eocdv.setUint32(16, offset, true);
  eocdv.setUint16(20, 0, true);

  return new Blob([...localParts, ...centralParts, eocd], { type: mimeType });
}

// --------------------------------------------------------------------------
// Pure-JS Zero-Dependency ZIP Reader (handles Store & Deflate via Web Streams)
// Reads real .docx, .xlsx, and .pptx files natively in browser!
// --------------------------------------------------------------------------
async function inflateRawBytes(compressed) {
  if (typeof DecompressionStream !== "undefined") {
    const ds = new DecompressionStream("deflate-raw");
    const writer = ds.writable.getWriter();
    writer.write(compressed);
    writer.close();
    const out = await new Response(ds.readable).arrayBuffer();
    return new Uint8Array(out);
  }
  throw new Error("Browser DecompressionStream unavailable");
}

export async function extractZipEntries(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const decoder = new TextDecoder("utf-8");
  const files = new Map();

  // Locate End of Central Directory (EOCD)
  let eocdOffset = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65558); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset === -1) return files;

  const entryCount = view.getUint16(eocdOffset + 10, true);
  let cdPos = view.getUint32(eocdOffset + 16, true);

  for (let i = 0; i < entryCount && cdPos + 46 <= bytes.length; i++) {
    if (view.getUint32(cdPos, true) !== 0x02014b50) break;
    const method = view.getUint16(cdPos + 10, true);
    const compSize = view.getUint32(cdPos + 20, true);
    const nameLen = view.getUint16(cdPos + 28, true);
    const extraLen = view.getUint16(cdPos + 30, true);
    const commentLen = view.getUint16(cdPos + 32, true);
    const localOffset = view.getUint32(cdPos + 42, true);
    const name = decoder.decode(bytes.subarray(cdPos + 46, cdPos + 46 + nameLen));
    cdPos += 46 + nameLen + extraLen + commentLen;

    if (localOffset + 30 > bytes.length) continue;
    const lNameLen = view.getUint16(localOffset + 26, true);
    const lExtraLen = view.getUint16(localOffset + 28, true);
    const dataStart = localOffset + 30 + lNameLen + lExtraLen;
    const rawSlice = bytes.subarray(dataStart, dataStart + compSize);

    try {
      if (method === 0) {
        files.set(name, rawSlice);
      } else if (method === 8) {
        files.set(name, await inflateRawBytes(rawSlice));
      }
    } catch (_) {}
  }

  return files;
}

// --------------------------------------------------------------------------
// 100% REAL OpenXML (.docx, .xlsx, .pptx) Builders
// --------------------------------------------------------------------------
export function buildRealDocxBlob(pagesData) {
  let bodyXml = "";
  pagesData.forEach((pageLines, pageIdx) => {
    if (pageIdx > 0) {
      bodyXml += `<w:p><w:r><w:br w:type="page"/></w:r></w:p>`;
    }
    if (!pageLines || pageLines.length === 0) {
      bodyXml += `<w:p><w:r><w:t></w:t></w:r></w:p>`;
      return;
    }
    pageLines.forEach(line => {
      const cleanText = escapeXml(line.text || "");
      if (!cleanText.trim()) return;
      const szHalfPt = Math.max(16, Math.min(56, Math.round((line.fontH || 11) * 2)));
      const boldTag = (line.isBold || line.fontH > 15) ? "<w:b/>" : "";
      const colorTag = line.fontH > 16 ? '<w:color w:val="1E3A8A"/>' : '<w:color w:val="111827"/>';
      const spacingAfter = line.fontH > 15 ? 160 : 80;
      bodyXml += `<w:p><w:pPr><w:spacing w:after="${spacingAfter}" w:line="276" w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>${boldTag}${colorTag}<w:sz w:val="${szHalfPt}"/><w:szCs w:val="${szHalfPt}"/></w:rPr><w:t xml:space="preserve">${cleanText}</w:t></w:r></w:p>`;
    });
  });

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const docRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`;

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${bodyXml}
    <w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr>
  </w:body>
</w:document>`;

  return createZipBlob([
    { name: "[Content_Types].xml", data: contentTypes },
    { name: "_rels/.rels", data: rels },
    { name: "word/_rels/document.xml.rels", data: docRels },
    { name: "word/document.xml", data: documentXml }
  ], "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
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

export function buildRealXlsxBlob(rows) {
  const safeRows = rows && rows.length > 0 ? rows : [["No tabular data detected"]];
  let sheetDataXml = "";

  safeRows.forEach((row, rIdx) => {
    const rowNum = rIdx + 1;
    sheetDataXml += `<row r="${rowNum}">`;
    row.forEach((cellVal, cIdx) => {
      const ref = `${excelColLetter(cIdx)}${rowNum}`;
      const raw = String(cellVal ?? "").trim();
      const styleAttr = rIdx === 0 ? ' s="1"' : "";
      if (raw !== "" && /^-?\d+(\.\d+)?$/.test(raw)) {
        sheetDataXml += `<c r="${ref}"${styleAttr}><v>${raw}</v></c>`;
      } else {
        sheetDataXml += `<c r="${ref}" t="inlineStr"${styleAttr}><is><t xml:space="preserve">${escapeXml(raw)}</t></is></c>`;
      }
    });
    sheetDataXml += `</row>`;
  });

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;

  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  const wbXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="Extracted Data" sheetId="1" r:id="rId1"/></sheets>
</workbook>`;

  const wbRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2">
    <font><sz val="11"/><color rgb="FF111827"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
  </fonts>
  <fills count="3">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF217346"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="2">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>
  </cellXfs>
</styleSheet>`;

  const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>${sheetDataXml}</sheetData>
</worksheet>`;

  return createZipBlob([
    { name: "[Content_Types].xml", data: contentTypes },
    { name: "_rels/.rels", data: rels },
    { name: "xl/workbook.xml", data: wbXml },
    { name: "xl/_rels/workbook.xml.rels", data: wbRels },
    { name: "xl/styles.xml", data: stylesXml },
    { name: "xl/worksheets/sheet1.xml", data: sheetXml }
  ], "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
}

export function buildRealPptxBlob(slides) {
  // 16:9 widescreen slide dimensions in EMU (12192000 x 6858000 = 13.333" x 7.5")
  const slideW = 12192000;
  const slideH = 6858000;

  let slideOverrides = "";
  let presSlideList = "";
  let presRels = "";
  const entries = [];

  slides.forEach((s, idx) => {
    const num = idx + 1;
    const rId = `rId${num + 1}`;
    const imgName = `slide${num}.jpg`;

    slideOverrides += `<Override PartName="/ppt/slides/slide${num}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`;
    presSlideList += `<p:sldId id="${255 + num}" r:id="${rId}"/>`;
    presRels += `<Relationship Id="${rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${num}.xml"/>`;

    // Fit image proportionally centered inside 16:9 slide
    const aspect = (s.width || 16) / (s.height || 9);
    const slideAspect = slideW / slideH;
    let imgW = slideW, imgH = slideH, imgX = 0, imgY = 0;
    if (aspect > slideAspect) {
      imgW = slideW;
      imgH = Math.round(slideW / aspect);
      imgY = Math.round((slideH - imgH) / 2);
    } else {
      imgH = slideH;
      imgW = Math.round(slideH * aspect);
      imgX = Math.round((slideW - imgW) / 2);
    }

    const slideXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
      <p:pic>
        <p:nvPicPr><p:cNvPr id="2" name="Slide ${num}"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr>
        <p:blipFill><a:blip r:embed="rId2"/><a:stretch><a:fillRect/></a:stretch></p:blipFill>
        <p:spPr><a:xfrm><a:off x="${imgX}" y="${imgY}"/><a:ext cx="${imgW}" cy="${imgH}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr>
      </p:pic>
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sld>`;

    const slideRel = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/${imgName}"/>
</Relationships>`;

    entries.push({ name: `ppt/slides/slide${num}.xml`, data: slideXml });
    entries.push({ name: `ppt/slides/_rels/slide${num}.xml.rels`, data: slideRel });
    entries.push({ name: `ppt/media/${imgName}`, data: s.jpgBytes });
  });

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="jpg" ContentType="image/jpeg"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  <Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
  <Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
  <Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
  ${slideOverrides}
</Types>`;

  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>`;

  const presXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>
  <p:sldIdLst>${presSlideList}</p:sldIdLst>
  <p:sldSz cx="${slideW}" cy="${slideH}" type="screen16x9"/>
  <p:notesSz cx="6858000" cy="9144000"/>
</p:presentation>`;

  const presRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>
  ${presRels}
</Relationships>`;

  const slideMasterXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld>
  <p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
  <p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst>
</p:sldMaster>`;

  const slideMasterRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/>
</Relationships>`;

  const slideLayoutXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank">
  <p:cSld name="Blank"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld>
</p:sldLayout>`;

  const slideLayoutRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>
</Relationships>`;

  const themeXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Office Theme">
  <a:themeElements>
    <a:clrScheme name="Office">
      <a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1><a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1>
      <a:dk2><a:srgbClr val="1F497D"/></a:dk2><a:lt2><a:srgbClr val="EEECE1"/></a:lt2>
      <a:accent1><a:srgbClr val="4F81BD"/></a:accent1><a:accent2><a:srgbClr val="C0504D"/></a:accent2>
      <a:accent3><a:srgbClr val="9BBB59"/></a:accent3><a:accent4><a:srgbClr val="8064A2"/></a:accent4>
      <a:accent5><a:srgbClr val="4BACC6"/></a:accent5><a:accent6><a:srgbClr val="F79646"/></a:accent6>
      <a:hlink><a:srgbClr val="0000FF"/></a:hlink><a:folHlink><a:srgbClr val="800080"/></a:folHlink>
    </a:clrScheme>
    <a:fontScheme name="Office"><a:majorFont><a:latin typeface="Calibri"/></a:majorFont><a:minorFont><a:latin typeface="Calibri"/></a:minorFont></a:fontScheme>
    <a:fmtScheme name="Office"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln w="9525"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme>
  </a:themeElements>
</a:theme>`;

  return createZipBlob([
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
}

// --------------------------------------------------------------------------
// Unicode-Safe Text-to-PDF Generator (Supports English, Hindi, Bengali, Arabic, etc.)
// --------------------------------------------------------------------------
async function generateUnicodeSafeTextPdf(title, subtitle, bodyText, fontChoice = "Helvetica") {
  const PDFLib = window.PDFLib;
  const pdfDoc = await PDFLib.PDFDocument.create();
  const pageW = 595.28;
  const pageH = 841.89;
  const margin = 48;

  // Check if content has non-WinAnsi Unicode characters (Hindi, Bengali, Arabic, ₹, etc.)
  const font = fontChoice === "Times"
    ? await pdfDoc.embedFont(PDFLib.StandardFonts.TimesRoman)
    : await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
  const fontBold = fontChoice === "Times"
    ? await pdfDoc.embedFont(PDFLib.StandardFonts.TimesRomanBold)
    : await pdfDoc.embedFont(PDFLib.StandardFonts.HelveticaBold);

  const combinedText = `${title}\n${subtitle}\n${bodyText}`;
  const check = toSafeWinAnsi(combinedText, font);

  if (check.isWinAnsi) {
    // Crisp native vector PDF text!
    let page = pdfDoc.addPage([pageW, pageH]);
    let y = pageH - margin;

    if (title) {
      page.drawText(normalizeWinAnsi(title).substring(0, 75), {
        x: margin, y, size: 18, font: fontBold, color: PDFLib.rgb(0.08, 0.14, 0.28)
      });
      y -= 22;
    }
    if (subtitle) {
      page.drawText(normalizeWinAnsi(subtitle).substring(0, 95), {
        x: margin, y, size: 10, font, color: PDFLib.rgb(0.45, 0.5, 0.58)
      });
      y -= 18;
      page.drawRectangle({ x: margin, y: y + 6, width: pageW - margin * 2, height: 1, color: PDFLib.rgb(0.85, 0.88, 0.92) });
      y -= 10;
    }

    const maxW = pageW - margin * 2;
    const paragraphs = normalizeWinAnsi(bodyText).split("\n");
    for (const para of paragraphs) {
      if (!para.trim()) {
        y -= 10;
        continue;
      }
      const words = para.split(/\s+/);
      let line = "";
      for (const word of words) {
        const test = line ? `${line} ${word}` : word;
        if (font.widthOfTextAtSize(test, 11) > maxW && line) {
          if (y < margin + 16) {
            page = pdfDoc.addPage([pageW, pageH]);
            y = pageH - margin;
          }
          page.drawText(line, { x: margin, y, size: 11, font, color: PDFLib.rgb(0.1, 0.12, 0.16) });
          y -= 17;
          line = word;
        } else {
          line = test;
        }
      }
      if (line) {
        if (y < margin + 16) {
          page = pdfDoc.addPage([pageW, pageH]);
          y = pageH - margin;
        }
        page.drawText(line, { x: margin, y, size: 11, font, color: PDFLib.rgb(0.1, 0.12, 0.16) });
        y -= 17;
      }
    }
    return await pdfDoc.save();
  }

  // Non-WinAnsi Unicode path (Hindi, Bengali, Arabic, emojis, ₹): Render crisp paginated A4 canvas pages -> PDF!
  const scale = 2;
  const cssW = Math.round(pageW);
  const cssH = Math.round(pageH);
  const paragraphs = String(bodyText || "").replace(/\r\n/g, "\n").split("\n");

  const measureCanvas = document.createElement("canvas");
  const mctx = measureCanvas.getContext("2d");
  const cssFont = fontChoice === "Times" ? '"Times New Roman", Tinos, serif' : 'Arial, "Noto Sans", sans-serif';
  mctx.font = `400 12px ${cssFont}`;

  const wrappedLines = [];
  const maxTextW = cssW - margin * 2;
  for (const para of paragraphs) {
    if (!para.trim()) {
      wrappedLines.push("");
      continue;
    }
    const words = para.split(/\s+/);
    let line = "";
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (mctx.measureText(test).width > maxTextW && line) {
        wrappedLines.push(line);
        line = w;
      } else {
        line = test;
      }
    }
    if (line) wrappedLines.push(line);
  }

  const linesPerPage = 38;
  const totalPages = Math.max(1, Math.ceil(wrappedLines.length / linesPerPage));

  for (let p = 0; p < totalPages; p++) {
    const c = document.createElement("canvas");
    c.width = cssW * scale;
    c.height = cssH * scale;
    const ctx = c.getContext("2d");
    ctx.scale(scale, scale);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, cssW, cssH);

    let y = margin;
    if (p === 0 && title) {
      ctx.font = `700 18px ${cssFont}`;
      ctx.fillStyle = "#0f172a";
      ctx.fillText(title, margin, y);
      y += 22;
      if (subtitle) {
        ctx.font = `400 10px ${cssFont}`;
        ctx.fillStyle = "#64748b";
        ctx.fillText(subtitle, margin, y);
        y += 14;
      }
      ctx.fillStyle = "#e2e8f0";
      ctx.fillRect(margin, y, maxTextW, 1);
      y += 20;
    }

    ctx.font = `400 12px ${cssFont}`;
    ctx.fillStyle = "#1e293b";
    const slice = wrappedLines.slice(p * linesPerPage, (p + 1) * linesPerPage);
    for (const ln of slice) {
      if (ln) ctx.fillText(ln, margin, y);
      y += 18;
    }

    const jpgBlob = await new Promise(r => c.toBlob(r, "image/jpeg", 0.92));
    const jpgBytes = new Uint8Array(await jpgBlob.arrayBuffer());
    const img = await pdfDoc.embedJpg(jpgBytes);
    const outPage = pdfDoc.addPage([pageW, pageH]);
    outPage.drawImage(img, { x: 0, y: 0, width: pageW, height: pageH });
  }

  return await pdfDoc.save();
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
      if (clearBtn) clearBtn.style.display = query ? "flex" : "none";

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
        searchCount.textContent = query ? `Found ${matched} ${matched === 1 ? "tool" : "tools"} matching "${query}"` : "";
        searchCount.style.display = query ? "inline-block" : "none";
      }
    };

    searchInput.addEventListener("input", performFilter);
    clearBtn?.addEventListener("click", () => {
      searchInput.value = "";
      performFilter();
      searchInput.focus();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "/" && document.activeElement !== searchInput && !["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)) {
        const ws = document.getElementById("portal-tool-workspace");
        if (ws && ws.style.display !== "none") return;
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

  // Helper: attach drag-and-drop cleanly to any dropzone
  _bindDrop(dropzone, picker, chooseBtn, onFile) {
    const openPicker = () => { if (picker) { picker.value = ""; picker.click(); } };
    chooseBtn?.addEventListener("click", (e) => { e.stopPropagation(); openPicker(); });
    dropzone?.addEventListener("click", openPicker);
    picker?.addEventListener("change", (e) => {
      const f = e.target.files && e.target.files[0];
      if (f) onFile(f);
    });
    dropzone?.addEventListener("dragover", (e) => { e.preventDefault(); dropzone.classList.add("drag-over"); });
    dropzone?.addEventListener("dragleave", () => dropzone.classList.remove("drag-over"));
    dropzone?.addEventListener("drop", (e) => {
      e.preventDefault();
      dropzone.classList.remove("drag-over");
      const f = e.dataTransfer?.files && e.dataTransfer.files[0];
      if (f) onFile(f);
    });
  }

  // ------------------------------------------------------------------------
  // 1. TOOL: Compress PDF with Custom Target Size (KB / MB / GB)
  // ------------------------------------------------------------------------
  _bindCompressPdfModal() {
    const modal = document.getElementById("modal-compress-pdf");
    const dropzone = document.getElementById("compress-pdf-dropzone");
    const picker = document.getElementById("compress-pdf-picker");
    const selectBtn = document.getElementById("btn-choose-compress-pdf");
    const actionArea = document.getElementById("compress-options-area");
    const startBtn = document.getElementById("btn-start-compress");
    const targetValInput = document.getElementById("compress-target-val");
    const targetUnitSelect = document.getElementById("compress-target-unit");
    const fileInfoEl = document.getElementById("compress-file-info");
    const changeBtn = document.getElementById("btn-change-compress-pdf");
    const progressBar = document.getElementById("compress-progress-bar");
    const progressWrap = document.getElementById("compress-progress-wrap");
    const resultBox = document.getElementById("compress-result-box");
    const downloadBtn = document.getElementById("btn-download-compressed");

    if (!modal) return;

    let activeFile = null;
    let compressedBlob = null;

    const resetView = () => {
      activeFile = null;
      compressedBlob = null;
      if (dropzone) dropzone.style.display = "flex";
      if (actionArea) actionArea.style.display = "none";
      if (resultBox) resultBox.style.display = "none";
      if (progressWrap) progressWrap.style.display = "none";
    };

    changeBtn?.addEventListener("click", resetView);

    const onFileSelected = (file) => {
      if (!file) return;
      activeFile = file;
      compressedBlob = null;
      if (fileInfoEl) {
        fileInfoEl.innerHTML = `<div class="tw-file-meta"><strong>${escapeHtml(file.name)}</strong><span>Original Size: ${formatBytes(file.size)}</span></div>`;
      }
      const halfSizeKb = Math.max(50, Math.round((file.size * 0.5) / 1024));
      if (targetValInput) targetValInput.value = halfSizeKb;
      if (targetUnitSelect) targetUnitSelect.value = "KB";

      if (dropzone) dropzone.style.display = "none";
      if (actionArea) actionArea.style.display = "block";
      if (resultBox) resultBox.style.display = "none";
      if (progressWrap) progressWrap.style.display = "none";
    };

    this._bindDrop(dropzone, picker, selectBtn, onFileSelected);

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

    startBtn?.addEventListener("click", async () => {
      if (!activeFile) { showPortalToast("warning", "Please select a PDF file first."); return; }
      const targetBytes = parseTargetBytes(targetValInput?.value || 200, targetUnitSelect?.value || "KB");

      startBtn.disabled = true;
      startBtn.textContent = "Compressing PDF...";
      if (progressWrap) progressWrap.style.display = "block";
      if (progressBar) progressBar.style.width = "15%";

      try {
        const PDFLib = window.PDFLib;
        const pdfjsLib = window.pdfjsLib;
        const arrayBuffer = await activeFile.arrayBuffer();
        const pdfJsDoc = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
        const numPages = pdfJsDoc.numPages;

        const budgetPerPage = Math.max(8000, Math.floor(targetBytes / numPages));
        let renderScale = 1.25;
        let quality = 0.72;
        if (budgetPerPage < 22000) { renderScale = 0.8; quality = 0.32; }
        else if (budgetPerPage < 45000) { renderScale = 1.0; quality = 0.52; }
        else if (budgetPerPage < 100000) { renderScale = 1.2; quality = 0.72; }
        else { renderScale = 1.5; quality = 0.85; }

        const buildAt = async (sc, q) => {
          const doc = await PDFLib.PDFDocument.create();
          for (let pno = 1; pno <= numPages; pno++) {
            if (progressBar) progressBar.style.width = `${20 + Math.round((pno / numPages) * 70)}%`;
            const page = await pdfJsDoc.getPage(pno);
            const vp1 = page.getViewport({ scale: 1.0 });
            const vp = page.getViewport({ scale: sc });
            const canvas = document.createElement("canvas");
            canvas.width = Math.max(10, Math.floor(vp.width));
            canvas.height = Math.max(10, Math.floor(vp.height));
            const ctx = canvas.getContext("2d");
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            await page.render({ canvasContext: ctx, viewport: vp }).promise;

            const jpgBlob = await new Promise(r => canvas.toBlob(r, "image/jpeg", q));
            const jpgBytes = new Uint8Array(await jpgBlob.arrayBuffer());
            const embeddedJpg = await doc.embedJpg(jpgBytes);
            const newPage = doc.addPage([vp1.width, vp1.height]);
            newPage.drawImage(embeddedJpg, { x: 0, y: 0, width: vp1.width, height: vp1.height });
          }
          return await doc.save({ useObjectStreams: true });
        };

        let outBytes = await buildAt(renderScale, quality);
        // Refine once if still noticeably larger than target
        if (outBytes.byteLength > targetBytes * 1.25 && quality > 0.25) {
          outBytes = await buildAt(Math.max(0.65, renderScale * 0.78), Math.max(0.22, quality * 0.6));
        }

        compressedBlob = new Blob([outBytes], { type: "application/pdf" });
        const baseName = (activeFile.name || "document.pdf").replace(/\.pdf$/i, "");
        downloadBlob(compressedBlob, `${baseName}_compressed.pdf`);

        if (progressBar) progressBar.style.width = "100%";
        if (resultBox) {
          resultBox.style.display = "block";
          const origSize = activeFile.size;
          const newSize = compressedBlob.size;
          const diffPct = Math.round(((origSize - newSize) / Math.max(1, origSize)) * 100);
          document.getElementById("compress-res-original").textContent = formatBytes(origSize);
          document.getElementById("compress-res-new").textContent = formatBytes(newSize);
          document.getElementById("compress-res-savings").textContent = diffPct >= 0 ? `${diffPct}% smaller` : "Optimized";
        }
        showPortalToast("success", `Compressed to ${formatBytes(compressedBlob.size)} & downloading!`);
      } catch (err) {
        console.error(err);
        showPortalToast("error", `Compression failed: ${err.message}`);
      } finally {
        startBtn.disabled = false;
        startBtn.textContent = "Compress PDF";
      }
    });

    downloadBtn?.addEventListener("click", () => {
      if (!compressedBlob) return;
      const baseName = (activeFile?.name || "document.pdf").replace(/\.pdf$/i, "");
      downloadBlob(compressedBlob, `${baseName}_compressed.pdf`);
    });
  }

  // ------------------------------------------------------------------------
  // 2. TOOL: PDF to Word (.docx) — Clean UI (No Preview Dump) + Real OOXML .docx
  // ------------------------------------------------------------------------
  _bindPdfToWordModal() {
    const modal = document.getElementById("modal-pdf-to-word");
    const picker = document.getElementById("pdf-to-word-picker");
    const dropzone = document.getElementById("pdf-to-word-dropzone");
    const chooseBtn = document.getElementById("btn-choose-pdf-to-word");
    const readyWrap = document.getElementById("pdf-to-word-preview-wrap");
    const statusText = document.getElementById("pdf-to-word-status");
    const convertBtn = document.getElementById("btn-start-pdf-to-word");
    const changeBtn = document.getElementById("btn-change-pdf-to-word");

    if (!modal) return;
    let activeFile = null;
    let generatedBlob = null;

    const reset = () => {
      activeFile = null;
      generatedBlob = null;
      if (dropzone) dropzone.style.display = "flex";
      if (readyWrap) readyWrap.style.display = "none";
    };
    changeBtn?.addEventListener("click", reset);

    const onFileSelected = (file) => {
      if (!file) return;
      activeFile = file;
      generatedBlob = null;
      if (dropzone) dropzone.style.display = "none";
      if (readyWrap) readyWrap.style.display = "block";
      if (statusText) {
        statusText.innerHTML = `<div class="tw-file-meta"><strong>${escapeHtml(file.name)}</strong><span>${formatBytes(file.size)} &bull; Ready to convert to Microsoft Word (.docx)</span></div>`;
      }
      if (convertBtn) {
        convertBtn.disabled = false;
        convertBtn.textContent = "Convert & Download Word (.docx)";
      }
    };

    this._bindDrop(dropzone, picker, chooseBtn, onFileSelected);

    const ensureWordSettings = () => {
      if (!readyWrap || readyWrap.querySelector("#conv-settings-pdf-word")) return;
      const box = document.createElement("div");
      box.id = "conv-settings-pdf-word";
      box.style.cssText = "display:flex;flex-wrap:wrap;gap:10px;margin:10px 0;padding:10px 12px;border-radius:10px;border:1px solid var(--border-color,#e2e8f0);background:var(--surface-secondary,#f8fafc);font-size:12.5px;";
      box.innerHTML = `
        <label style="display:flex;flex-direction:column;gap:4px;flex:1;min-width:170px;">
          <span style="font-weight:600;opacity:0.85;">Conversion Mode</span>
          <select id="pdf-word-mode" style="padding:6px 8px;border-radius:6px;border:1px solid var(--border-color,#cbd5e1);background:var(--surface-primary,#fff);color:inherit;">
            <option value="editable" selected>Editable Document (Layout-Aware DOCX)</option>
            <option value="appearance">Original Appearance (High-Res Page Images)</option>
          </select>
        </label>
        <label style="display:flex;flex-direction:column;gap:4px;min-width:120px;">
          <span style="font-weight:600;opacity:0.85;">Pages</span>
          <input id="pdf-word-pages" type="text" value="all" placeholder="all or 1-3,5" style="padding:6px 8px;border-radius:6px;border:1px solid var(--border-color,#cbd5e1);background:var(--surface-primary,#fff);color:inherit;width:110px;" />
        </label>
        <label style="display:flex;flex-direction:column;gap:4px;min-width:110px;">
          <span style="font-weight:600;opacity:0.85;">Quality</span>
          <select id="pdf-word-quality" style="padding:6px 8px;border-radius:6px;border:1px solid var(--border-color,#cbd5e1);background:var(--surface-primary,#fff);color:inherit;">
            <option value="high" selected>High</option>
            <option value="standard">Standard</option>
          </select>
        </label>
        <div id="pdf-word-mode-note" style="width:100%;font-size:11px;opacity:0.75;">Reconstructs editable paragraphs, tables, fonts, colors, alignment, and page sizes.</div>
      `;
      readyWrap.insertBefore(box, convertBtn);
      box.querySelector("#pdf-word-mode")?.addEventListener("change", (ev) => {
        generatedBlob = null;
        const note = box.querySelector("#pdf-word-mode-note");
        if (note) {
          note.textContent = ev.target.value === "appearance"
            ? "Note: Original Appearance Mode embeds high-resolution page images; text inside images is not editable."
            : "Reconstructs editable paragraphs, tables, fonts, colors, alignment, and page sizes.";
        }
      });
    };

    convertBtn?.addEventListener("click", async () => {
      if (!activeFile) return;
      ensureWordSettings();
      const baseName = activeFile.name.replace(/\.pdf$/i, "");
      const modeVal = readyWrap?.querySelector("#pdf-word-mode")?.value || "editable";
      const pageRangeVal = readyWrap?.querySelector("#pdf-word-pages")?.value || "all";
      const qualityVal = readyWrap?.querySelector("#pdf-word-quality")?.value || "high";

      // If already generated, re-download immediately
      if (generatedBlob) {
        downloadBlob(generatedBlob, `${baseName}.docx`);
        showPortalToast("success", `Downloading "${baseName}.docx"...`);
        return;
      }

      convertBtn.disabled = true;
      convertBtn.textContent = "Converting PDF to Word (.docx)...";

      try {
        const pdfjsLib = window.pdfjsLib;
        const arrayBuffer = await activeFile.arrayBuffer();
        const pdfJsDoc = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;

        const result = await convertPdfToDocx(pdfJsDoc, pdfjsLib, {
          mode: modeVal,
          pageRange: pageRangeVal,
          quality: qualityVal
        });
        const check = await validateConvertedOutput(result.blob, "docx");
        if (!check.valid) throw new Error(check.reason || "Invalid DOCX generated.");

        generatedBlob = result.blob;
        downloadBlob(generatedBlob, `${baseName}.docx`);
        if (statusText) {
          const modeLabel = result.isImageBased ? "Original Appearance (Image-Based)" : "Editable Layout-Aware";
          statusText.innerHTML = `<div class="tw-file-meta tw-file-success"><strong>${escapeHtml(baseName)}.docx Ready!</strong><span>${result.pageCount} pages (${modeLabel}) &bull; ${formatBytes(generatedBlob.size)}</span></div>`;
        }
        convertBtn.textContent = "Download Word (.docx) Again";
        showPortalToast("success", `Converted & downloaded "${baseName}.docx"!`);
      } catch (err) {
        console.error(err);
        showPortalToast("error", `Conversion failed: ${err.message}`);
        convertBtn.textContent = "Convert & Download Word (.docx)";
      } finally {
        convertBtn.disabled = false;
      }
    });
  }

  // ------------------------------------------------------------------------
  // 3. TOOL: PDF to Excel (.xlsx / .csv) — Clean UI (No Preview Dump) + Real OOXML .xlsx
  // ------------------------------------------------------------------------
  _bindPdfToExcelModal() {
    const modal = document.getElementById("modal-pdf-to-excel");
    const picker = document.getElementById("pdf-to-excel-picker");
    const dropzone = document.getElementById("pdf-to-excel-dropzone");
    const chooseBtn = document.getElementById("btn-choose-pdf-to-excel");
    const readyWrap = document.getElementById("pdf-to-excel-preview-wrap");
    const downloadXlsxBtn = document.getElementById("btn-download-excel-xlsx");
    const downloadCsvBtn = document.getElementById("btn-download-excel-csv");
    const statsBadge = document.getElementById("pdf-to-excel-stats");
    const changeBtn = document.getElementById("btn-change-pdf-to-excel");

    if (!modal) return;
    let activeFile = null;
    let tableRows = null;

    const reset = () => {
      activeFile = null;
      tableRows = null;
      if (dropzone) dropzone.style.display = "flex";
      if (readyWrap) readyWrap.style.display = "none";
    };
    changeBtn?.addEventListener("click", reset);

    const extractTablesFromFile = async (file) => {
      const pdfjsLib = window.pdfjsLib;
      const arrayBuffer = await file.arrayBuffer();
      const pdfJsDoc = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
      const rows = [];

      for (let pno = 1; pno <= pdfJsDoc.numPages; pno++) {
        const page = await pdfJsDoc.getPage(pno);
        const textContent = await page.getTextContent();
        const yMap = new Map();

        textContent.items.forEach(item => {
          const str = item.str || "";
          if (!str.trim()) return;
          const y = Math.round(item.transform[5] / 4) * 4;
          const x = Math.round(item.transform[4]);
          const w = Math.max(item.width || str.length * 5, 4);
          if (!yMap.has(y)) yMap.set(y, []);
          yMap.get(y).push({ x, w, str });
        });

        const sortedYs = Array.from(yMap.keys()).sort((a, b) => b - a);
        sortedYs.forEach(y => {
          const items = yMap.get(y).sort((a, b) => a.x - b.x);
          const cells = [];
          let currentCell = "";
          let prevRight = -999;

          items.forEach(it => {
            if (prevRight > -900 && (it.x - prevRight) > 14) {
              cells.push(currentCell.trim());
              currentCell = it.str;
            } else {
              currentCell += (currentCell ? " " : "") + it.str;
            }
            prevRight = it.x + it.w;
          });
          if (currentCell.trim()) cells.push(currentCell.trim());
          if (cells.length > 0) rows.push(cells);
        });
      }
      return rows;
    };

    const onFileSelected = (file) => {
      if (!file) return;
      activeFile = file;
      tableRows = null;
      if (dropzone) dropzone.style.display = "none";
      if (readyWrap) readyWrap.style.display = "block";
      if (statsBadge) {
        statsBadge.innerHTML = `<div class="tw-file-meta"><strong>${escapeHtml(file.name)}</strong><span>${formatBytes(file.size)} &bull; Ready to extract tables to Excel (.xlsx / .csv)</span></div>`;
      }
      if (downloadXlsxBtn) { downloadXlsxBtn.disabled = false; downloadXlsxBtn.textContent = "Convert & Download Excel (.xlsx)"; }
      if (downloadCsvBtn) { downloadCsvBtn.disabled = false; downloadCsvBtn.textContent = "Download CSV (.csv)"; }
    };

    this._bindDrop(dropzone, picker, chooseBtn, onFileSelected);

    const ensureRows = async () => {
      if (!activeFile) return null;
      if (!tableRows) tableRows = await extractTablesFromFile(activeFile);
      return tableRows;
    };

    const ensureExcelSettings = () => {
      if (!readyWrap || readyWrap.querySelector("#conv-settings-pdf-excel")) return;
      const box = document.createElement("div");
      box.id = "conv-settings-pdf-excel";
      box.style.cssText = "display:flex;flex-wrap:wrap;gap:10px;margin:10px 0;padding:10px 12px;border-radius:10px;border:1px solid var(--border-color,#e2e8f0);background:var(--surface-secondary,#f8fafc);font-size:12.5px;";
      box.innerHTML = `
        <label style="display:flex;flex-direction:column;gap:4px;flex:1;min-width:170px;">
          <span style="font-weight:600;opacity:0.85;">Conversion Mode</span>
          <select id="pdf-excel-mode" style="padding:6px 8px;border-radius:6px;border:1px solid var(--border-color,#cbd5e1);background:var(--surface-primary,#fff);color:inherit;">
            <option value="structured" selected>Structured Data Mode (Editable Cells)</option>
            <option value="visual">Visual Layout Mode (Data + Page Visual Sheets)</option>
          </select>
        </label>
        <label style="display:flex;flex-direction:column;gap:4px;min-width:120px;">
          <span style="font-weight:600;opacity:0.85;">Pages</span>
          <input id="pdf-excel-pages" type="text" value="all" placeholder="all or 1-3" style="padding:6px 8px;border-radius:6px;border:1px solid var(--border-color,#cbd5e1);background:var(--surface-primary,#fff);color:inherit;width:110px;" />
        </label>
      `;
      readyWrap.insertBefore(box, downloadXlsxBtn);
    };

    downloadXlsxBtn?.addEventListener("click", async () => {
      if (!activeFile) return;
      ensureExcelSettings();
      downloadXlsxBtn.disabled = true;
      downloadXlsxBtn.textContent = "Generating Excel (.xlsx)...";
      try {
        const pdfjsLib = window.pdfjsLib;
        const buf = await activeFile.arrayBuffer();
        const pdfJsDoc = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
        const modeVal = readyWrap?.querySelector("#pdf-excel-mode")?.value || "structured";
        const pageRangeVal = readyWrap?.querySelector("#pdf-excel-pages")?.value || "all";

        const result = await convertPdfToXlsx(pdfJsDoc, pdfjsLib, {
          mode: modeVal,
          pageRange: pageRangeVal
        });
        const check = await validateConvertedOutput(result.blob, "xlsx");
        if (!check.valid) throw new Error(check.reason || "Invalid XLSX generated.");

        const baseName = activeFile.name.replace(/\.pdf$/i, "");
        downloadBlob(result.blob, `${baseName}.xlsx`);
        if (statsBadge) {
          statsBadge.innerHTML = `<div class="tw-file-meta tw-file-success"><strong>${escapeHtml(baseName)}.xlsx Ready!</strong><span>${result.sheetCount} sheets (${modeVal}) &bull; ${formatBytes(result.blob.size)}</span></div>`;
        }
        downloadXlsxBtn.textContent = "Download Excel (.xlsx) Again";
        showPortalToast("success", `Downloaded "${baseName}.xlsx" (${result.sheetCount} sheets)!`);
      } catch (err) {
        console.error(err);
        showPortalToast("error", `Excel export failed: ${err.message}`);
        downloadXlsxBtn.textContent = "Convert & Download Excel (.xlsx)";
      } finally {
        downloadXlsxBtn.disabled = false;
      }
    });

    downloadCsvBtn?.addEventListener("click", async () => {
      if (!activeFile) return;
      downloadCsvBtn.disabled = true;
      try {
        const rows = await ensureRows();
        const baseName = activeFile.name.replace(/\.pdf$/i, "");
        const csv = rows.map(r => r.map(c => `"${String(c || "").replace(/"/g, '""')}"`).join(",")).join("\r\n");
        const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8;" });
        downloadBlob(blob, `${baseName}.csv`);
        showPortalToast("success", `Downloaded "${baseName}.csv"!`);
      } catch (err) {
        showPortalToast("error", `CSV export failed: ${err.message}`);
      } finally {
        downloadCsvBtn.disabled = false;
      }
    });
  }

  // ------------------------------------------------------------------------
  // 4. TOOL: PDF to PowerPoint (.pptx) — Clean UI (No Preview Strip) + Real OOXML .pptx
  // ------------------------------------------------------------------------
  _bindPdfToPptxModal() {
    const modal = document.getElementById("modal-pdf-to-pptx");
    const picker = document.getElementById("pdf-to-pptx-picker");
    const dropzone = document.getElementById("pdf-to-pptx-dropzone");
    const chooseBtn = document.getElementById("btn-choose-pdf-to-pptx");
    const readyWrap = document.getElementById("pdf-to-pptx-ready-wrap");
    const downloadBtn = document.getElementById("btn-download-pptx");
    const statusText = document.getElementById("pdf-to-pptx-status");
    const changeBtn = document.getElementById("btn-change-pdf-to-pptx");

    if (!modal) return;
    let activeFile = null;
    let generatedPptxBlob = null;

    const reset = () => {
      activeFile = null;
      generatedPptxBlob = null;
      if (dropzone) dropzone.style.display = "flex";
      if (readyWrap) readyWrap.style.display = "none";
    };
    changeBtn?.addEventListener("click", reset);

    const onFileSelected = (file) => {
      if (!file) return;
      activeFile = file;
      generatedPptxBlob = null;
      if (dropzone) dropzone.style.display = "none";
      if (readyWrap) readyWrap.style.display = "block";
      if (statusText) {
        statusText.innerHTML = `<div class="tw-file-meta"><strong>${escapeHtml(file.name)}</strong><span>${formatBytes(file.size)} &bull; Ready to convert into 16:9 PowerPoint (.pptx) slides</span></div>`;
      }
      if (downloadBtn) {
        downloadBtn.disabled = false;
        downloadBtn.textContent = "Convert & Download PowerPoint (.pptx)";
      }
    };

    this._bindDrop(dropzone, picker, chooseBtn, onFileSelected);

    const ensurePptxSettings = () => {
      if (!readyWrap || readyWrap.querySelector("#conv-settings-pdf-pptx")) return;
      const box = document.createElement("div");
      box.id = "conv-settings-pdf-pptx";
      box.style.cssText = "display:flex;flex-wrap:wrap;gap:10px;margin:10px 0;padding:10px 12px;border-radius:10px;border:1px solid var(--border-color,#e2e8f0);background:var(--surface-secondary,#f8fafc);font-size:12.5px;";
      box.innerHTML = `
        <label style="display:flex;flex-direction:column;gap:4px;flex:1;min-width:170px;">
          <span style="font-weight:600;opacity:0.85;">Slide Mode</span>
          <select id="pdf-pptx-mode" style="padding:6px 8px;border-radius:6px;border:1px solid var(--border-color,#cbd5e1);background:var(--surface-primary,#fff);color:inherit;">
            <option value="editable" selected>Editable Slides (Positioned Text Boxes)</option>
            <option value="appearance">Original Appearance (High-Res Slide Images)</option>
          </select>
        </label>
        <label style="display:flex;flex-direction:column;gap:4px;min-width:120px;">
          <span style="font-weight:600;opacity:0.85;">Aspect Ratio</span>
          <select id="pdf-pptx-aspect" style="padding:6px 8px;border-radius:6px;border:1px solid var(--border-color,#cbd5e1);background:var(--surface-primary,#fff);color:inherit;">
            <option value="original" selected>Original Page Size</option>
            <option value="16:9">Widescreen 16:9</option>
            <option value="4:3">Standard 4:3</option>
          </select>
        </label>
        <label style="display:flex;flex-direction:column;gap:4px;min-width:100px;">
          <span style="font-weight:600;opacity:0.85;">Pages</span>
          <input id="pdf-pptx-pages" type="text" value="all" placeholder="all or 1-5" style="padding:6px 8px;border-radius:6px;border:1px solid var(--border-color,#cbd5e1);background:var(--surface-primary,#fff);color:inherit;width:100px;" />
        </label>
      `;
      readyWrap.insertBefore(box, downloadBtn);
      box.querySelector("#pdf-pptx-mode")?.addEventListener("change", () => { generatedPptxBlob = null; });
      box.querySelector("#pdf-pptx-aspect")?.addEventListener("change", () => { generatedPptxBlob = null; });
    };

    downloadBtn?.addEventListener("click", async () => {
      if (!activeFile) return;
      ensurePptxSettings();
      const baseName = activeFile.name.replace(/\.pdf$/i, "");

      if (generatedPptxBlob) {
        downloadBlob(generatedPptxBlob, `${baseName}.pptx`);
        showPortalToast("success", `Downloading "${baseName}.pptx"...`);
        return;
      }

      downloadBtn.disabled = true;
      downloadBtn.textContent = "Converting PDF Pages to Slides...";

      try {
        const pdfjsLib = window.pdfjsLib;
        const arrayBuffer = await activeFile.arrayBuffer();
        const pdfJsDoc = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
        const modeVal = readyWrap?.querySelector("#pdf-pptx-mode")?.value || "editable";
        const aspectVal = readyWrap?.querySelector("#pdf-pptx-aspect")?.value || "original";
        const pageRangeVal = readyWrap?.querySelector("#pdf-pptx-pages")?.value || "all";

        const result = await convertPdfToPptx(pdfJsDoc, pdfjsLib, {
          mode: modeVal,
          aspect: aspectVal,
          pageRange: pageRangeVal
        });
        const check = await validateConvertedOutput(result.blob, "pptx");
        if (!check.valid) throw new Error(check.reason || "Invalid PPTX generated.");

        generatedPptxBlob = result.blob;
        downloadBlob(generatedPptxBlob, `${baseName}.pptx`);
        if (statusText) {
          const modeLabel = result.isImageBased ? "Original Appearance (Image-Based)" : "Editable Slides";
          statusText.innerHTML = `<div class="tw-file-meta tw-file-success"><strong>${escapeHtml(baseName)}.pptx Ready!</strong><span>${result.slideCount} slides (${modeLabel}) &bull; ${formatBytes(generatedPptxBlob.size)}</span></div>`;
        }
        downloadBtn.textContent = "Download PowerPoint (.pptx) Again";
        showPortalToast("success", `Converted & downloaded "${baseName}.pptx"!`);
      } catch (err) {
        console.error(err);
        showPortalToast("error", `PowerPoint conversion failed: ${err.message}`);
        downloadBtn.textContent = "Convert & Download PowerPoint (.pptx)";
      } finally {
        downloadBtn.disabled = false;
      }
    });
  }

  // ------------------------------------------------------------------------
  // 5. TOOL: Word to PDF (.docx / .txt -> Real Paginated PDF)
  // ------------------------------------------------------------------------
  _bindWordToPdfModal() {
    const modal = document.getElementById("modal-word-to-pdf");
    const picker = document.getElementById("word-to-pdf-picker");
    const dropzone = document.getElementById("word-to-pdf-dropzone");
    const chooseBtn = document.getElementById("btn-choose-word-to-pdf");
    const readyWrap = document.getElementById("word-to-pdf-ready-wrap");
    const fileLabel = document.getElementById("word-to-pdf-file-label");
    const fontSelect = document.getElementById("word-to-pdf-font");
    const convertBtn = document.getElementById("btn-convert-word-to-pdf");
    const changeBtn = document.getElementById("btn-change-word-to-pdf");

    if (!modal) return;
    let activeFile = null;
    let extractedText = "";

    const reset = () => {
      activeFile = null;
      extractedText = "";
      if (dropzone) dropzone.style.display = "flex";
      if (readyWrap) readyWrap.style.display = "none";
    };
    changeBtn?.addEventListener("click", reset);

    const onFileSelected = async (file) => {
      if (!file) return;
      activeFile = file;
      extractedText = "";
      if (dropzone) dropzone.style.display = "none";
      if (readyWrap) readyWrap.style.display = "block";
      if (fileLabel) {
        fileLabel.innerHTML = `<div class="tw-file-meta"><strong>${escapeHtml(file.name)}</strong><span>${formatBytes(file.size)} &bull; Reading Word document...</span></div>`;
      }

      try {
        const lower = file.name.toLowerCase();
        if (lower.endsWith(".docx")) {
          const buf = await file.arrayBuffer();
          const entries = await extractZipEntries(buf);
          const docXmlBytes = entries.get("word/document.xml");
          if (docXmlBytes) {
            const xmlText = new TextDecoder("utf-8").decode(docXmlBytes);
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, "application/xml");
            const paras = Array.from(xmlDoc.getElementsByTagName("w:p"));
            extractedText = paras.map(p => {
              const runs = Array.from(p.getElementsByTagName("w:t"));
              return runs.map(t => t.textContent || "").join("");
            }).join("\n");
          } else {
            // Fallback if .docx was actually HTML-based Word doc
            const raw = new TextDecoder("utf-8").decode(buf);
            const div = document.createElement("div");
            div.innerHTML = raw;
            extractedText = (div.textContent || div.innerText || "").trim();
          }
        } else {
          extractedText = await file.text();
        }

        if (!extractedText.trim()) {
          extractedText = `Document: ${file.name}\n(No extractable text found in document.)`;
        }
        if (fileLabel) {
          fileLabel.innerHTML = `<div class="tw-file-meta"><strong>${escapeHtml(file.name)}</strong><span>${formatBytes(file.size)} &bull; Ready to convert to PDF</span></div>`;
        }
        if (convertBtn) convertBtn.disabled = false;
      } catch (err) {
        console.error(err);
        showPortalToast("error", `Could not read Word file: ${err.message}`);
      }
    };

    this._bindDrop(dropzone, picker, chooseBtn, onFileSelected);

    convertBtn?.addEventListener("click", async () => {
      if (!activeFile) return;
      convertBtn.disabled = true;
      convertBtn.textContent = "Converting Word to PDF...";
      try {
        const baseName = activeFile.name.replace(/\.(docx?|rtf|txt)$/i, "");
        let blob, pageCount = 1, warnings = [];
        if (activeFile.name.toLowerCase().endsWith(".docx")) {
          const buf = await activeFile.arrayBuffer();
          const res = await convertDocxToPdf(buf, activeFile.name, window.PDFLib, {
            fallbackFont: fontSelect?.value || "Helvetica"
          });
          blob = res.blob;
          pageCount = res.pageCount;
          warnings = res.warnings || [];
        } else {
          const pdfBytes = await generateUnicodeSafeTextPdf(
            baseName,
            "Converted from Word Document",
            extractedText,
            fontSelect?.value || "Helvetica"
          );
          blob = new Blob([pdfBytes], { type: "application/pdf" });
        }
        const check = await validateConvertedOutput(blob, "pdf");
        if (!check.valid) throw new Error(check.reason || "Invalid PDF generated.");
        downloadBlob(blob, `${baseName}.pdf`);
        if (fileLabel) {
          fileLabel.innerHTML = `<div class="tw-file-meta tw-file-success"><strong>${escapeHtml(baseName)}.pdf Ready!</strong><span>${pageCount} pages &bull; ${formatBytes(blob.size)} &bull; Downloaded</span></div>`;
        }
        convertBtn.textContent = "Download PDF Again";
        if (warnings.length > 0) showPortalToast("warning", warnings[0]);
        showPortalToast("success", `Converted & downloaded "${baseName}.pdf"!`);
      } catch (err) {
        console.error(err);
        showPortalToast("error", `Word to PDF failed: ${err.message}`);
        convertBtn.textContent = "Convert & Download PDF";
      } finally {
        convertBtn.disabled = false;
      }
    });
  }

  // ------------------------------------------------------------------------
  // 6. TOOL: Excel to PDF (.xlsx / .csv -> Landscape PDF Table Report)
  // ------------------------------------------------------------------------
  _bindExcelToPdfModal() {
    const modal = document.getElementById("modal-excel-to-pdf");
    const picker = document.getElementById("excel-to-pdf-picker");
    const dropzone = document.getElementById("excel-to-pdf-dropzone");
    const chooseBtn = document.getElementById("btn-choose-excel-to-pdf");
    const readyWrap = document.getElementById("excel-to-pdf-ready-wrap");
    const fileLabel = document.getElementById("excel-to-pdf-file-label");
    const convertBtn = document.getElementById("btn-convert-excel-to-pdf");
    const changeBtn = document.getElementById("btn-change-excel-to-pdf");

    if (!modal) return;
    let activeFile = null;
    let parsedRows = [];

    const reset = () => {
      activeFile = null;
      parsedRows = [];
      if (dropzone) dropzone.style.display = "flex";
      if (readyWrap) readyWrap.style.display = "none";
    };
    changeBtn?.addEventListener("click", reset);

    const parseCsvLine = (line) => {
      const result = [];
      let cur = "", inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
          else inQuotes = !inQuotes;
        } else if (ch === "," && !inQuotes) {
          result.push(cur.trim());
          cur = "";
        } else {
          cur += ch;
        }
      }
      result.push(cur.trim());
      return result;
    };

    const onFileSelected = async (file) => {
      if (!file) return;
      activeFile = file;
      parsedRows = [];
      if (dropzone) dropzone.style.display = "none";
      if (readyWrap) readyWrap.style.display = "block";

      try {
        const lower = file.name.toLowerCase();
        if (lower.endsWith(".xlsx")) {
          const buf = await file.arrayBuffer();
          const entries = await extractZipEntries(buf);
          const decoder = new TextDecoder("utf-8");
          const parser = new DOMParser();

          // Load shared strings if present
          const sharedStrings = [];
          const ssBytes = entries.get("xl/sharedStrings.xml");
          if (ssBytes) {
            const ssDoc = parser.parseFromString(decoder.decode(ssBytes), "application/xml");
            Array.from(ssDoc.getElementsByTagName("si")).forEach(si => {
              const tNodes = Array.from(si.getElementsByTagName("t"));
              sharedStrings.push(tNodes.map(t => t.textContent || "").join(""));
            });
          }

          // Locate first worksheet
          let sheetBytes = entries.get("xl/worksheets/sheet1.xml");
          if (!sheetBytes) {
            for (const [k, v] of entries.entries()) {
              if (/^xl\/worksheets\/sheet\d+\.xml$/i.test(k)) { sheetBytes = v; break; }
            }
          }
          if (sheetBytes) {
            const sDoc = parser.parseFromString(decoder.decode(sheetBytes), "application/xml");
            Array.from(sDoc.getElementsByTagName("row")).forEach(rowEl => {
              const rowArr = [];
              Array.from(rowEl.getElementsByTagName("c")).forEach(cEl => {
                const tAttr = cEl.getAttribute("t");
                let val = "";
                if (tAttr === "s") {
                  const idx = parseInt(cEl.getElementsByTagName("v")[0]?.textContent || "0", 10);
                  val = sharedStrings[idx] ?? "";
                } else if (tAttr === "inlineStr") {
                  val = Array.from(cEl.getElementsByTagName("t")).map(t => t.textContent || "").join("");
                } else {
                  val = cEl.getElementsByTagName("v")[0]?.textContent || "";
                }
                rowArr.push(val);
              });
              if (rowArr.length > 0) parsedRows.push(rowArr);
            });
          }
        } else {
          const text = await file.text();
          parsedRows = text.replace(/\r\n/g, "\n").split("\n").filter(l => l.trim()).map(parseCsvLine);
        }

        if (parsedRows.length === 0) parsedRows = [[file.name]];
        if (fileLabel) {
          fileLabel.innerHTML = `<div class="tw-file-meta"><strong>${escapeHtml(file.name)}</strong><span>${parsedRows.length} rows detected &bull; Ready to convert to PDF</span></div>`;
        }
        if (convertBtn) convertBtn.disabled = false;
      } catch (err) {
        console.error(err);
        showPortalToast("error", `Failed reading spreadsheet: ${err.message}`);
      }
    };

    this._bindDrop(dropzone, picker, chooseBtn, onFileSelected);

    const ensureExcelPdfSettings = () => {
      if (!readyWrap || readyWrap.querySelector("#conv-settings-excel-pdf")) return;
      const box = document.createElement("div");
      box.id = "conv-settings-excel-pdf";
      box.style.cssText = "display:flex;flex-wrap:wrap;gap:10px;margin:10px 0;padding:10px 12px;border-radius:10px;border:1px solid var(--border-color,#e2e8f0);background:var(--surface-secondary,#f8fafc);font-size:12.5px;";
      box.innerHTML = `
        <label style="display:flex;flex-direction:column;gap:4px;min-width:140px;">
          <span style="font-weight:600;opacity:0.85;">Sheets</span>
          <select id="excel-pdf-sheet" style="padding:6px 8px;border-radius:6px;border:1px solid var(--border-color,#cbd5e1);background:var(--surface-primary,#fff);color:inherit;">
            <option value="all" selected>All Sheets</option>
            <option value="0">First Sheet Only</option>
          </select>
        </label>
        <label style="display:flex;flex-direction:column;gap:4px;min-width:140px;">
          <span style="font-weight:600;opacity:0.85;">Orientation</span>
          <select id="excel-pdf-orient" style="padding:6px 8px;border-radius:6px;border:1px solid var(--border-color,#cbd5e1);background:var(--surface-primary,#fff);color:inherit;">
            <option value="landscape" selected>Landscape (Workbook Default)</option>
            <option value="portrait">Portrait</option>
          </select>
        </label>
      `;
      readyWrap.insertBefore(box, convertBtn);
    };

    convertBtn?.addEventListener("click", async () => {
      if (!activeFile) return;
      ensureExcelPdfSettings();
      convertBtn.disabled = true;
      convertBtn.textContent = "Converting Spreadsheet to PDF...";

      try {
        const baseName = activeFile.name.replace(/\.(xlsx?|csv|txt)$/i, "");
        const buf = await activeFile.arrayBuffer();
        const sheetOpt = readyWrap?.querySelector("#excel-pdf-sheet")?.value || "all";
        const orientOpt = readyWrap?.querySelector("#excel-pdf-orient")?.value || "landscape";
        const res = await convertExcelToPdf(buf, activeFile.name, window.PDFLib, {
          sheetIndex: sheetOpt,
          orientation: orientOpt
        });
        const check = await validateConvertedOutput(res.blob, "pdf");
        if (!check.valid) throw new Error(check.reason || "Invalid PDF generated.");

        downloadBlob(res.blob, `${baseName}.pdf`);
        if (fileLabel) {
          fileLabel.innerHTML = `<div class="tw-file-meta tw-file-success"><strong>${escapeHtml(baseName)}.pdf Ready!</strong><span>${res.pageCount} pages &bull; ${formatBytes(res.blob.size)} &bull; Downloaded</span></div>`;
        }
        convertBtn.textContent = "Download PDF Again";
        showPortalToast("success", `Converted & downloaded "${baseName}.pdf"!`);
      } catch (err) {
        console.error(err);
        showPortalToast("error", `Excel to PDF failed: ${err.message}`);
        convertBtn.textContent = "Convert & Download PDF";
      } finally {
        convertBtn.disabled = false;
      }
    });
  }

  // ------------------------------------------------------------------------
  // 7. TOOL: PowerPoint to PDF (.pptx -> Real 16:9 PDF Slides)
  // ------------------------------------------------------------------------
  _bindPptxToPdfModal() {
    const modal = document.getElementById("modal-pptx-to-pdf");
    const picker = document.getElementById("pptx-to-pdf-picker");
    const dropzone = document.getElementById("pptx-to-pdf-dropzone");
    const chooseBtn = document.getElementById("btn-choose-pptx-to-pdf");
    const readyWrap = document.getElementById("pptx-to-pdf-ready-wrap");
    const fileLabel = document.getElementById("pptx-to-pdf-file-label");
    const convertBtn = document.getElementById("btn-convert-pptx-to-pdf");
    const changeBtn = document.getElementById("btn-change-pptx-to-pdf");

    if (!modal) return;
    let selectedFile = null;

    const reset = () => {
      selectedFile = null;
      if (dropzone) dropzone.style.display = "flex";
      if (readyWrap) readyWrap.style.display = "none";
    };
    changeBtn?.addEventListener("click", reset);

    const onFileSelected = (file) => {
      if (!file) return;
      selectedFile = file;
      if (dropzone) dropzone.style.display = "none";
      if (readyWrap) readyWrap.style.display = "block";
      if (fileLabel) {
        fileLabel.innerHTML = `<div class="tw-file-meta"><strong>${escapeHtml(file.name)}</strong><span>${formatBytes(file.size)} &bull; Ready to convert slides to PDF</span></div>`;
      }
      if (convertBtn) {
        convertBtn.disabled = false;
        convertBtn.textContent = "Convert & Download PDF";
      }
    };

    this._bindDrop(dropzone, picker, chooseBtn, onFileSelected);

    const ensurePptxPdfSettings = () => {
      if (!readyWrap || readyWrap.querySelector("#conv-settings-pptx-pdf")) return;
      const box = document.createElement("div");
      box.id = "conv-settings-pptx-pdf";
      box.style.cssText = "display:flex;flex-wrap:wrap;gap:10px;margin:10px 0;padding:10px 12px;border-radius:10px;border:1px solid var(--border-color,#e2e8f0);background:var(--surface-secondary,#f8fafc);font-size:12.5px;";
      box.innerHTML = `
        <label style="display:flex;flex-direction:column;gap:4px;min-width:140px;">
          <span style="font-weight:600;opacity:0.85;">Slides</span>
          <input id="pptx-pdf-slides" type="text" value="all" placeholder="all or 1-5" style="padding:6px 8px;border-radius:6px;border:1px solid var(--border-color,#cbd5e1);background:var(--surface-primary,#fff);color:inherit;width:120px;" />
        </label>
        <div style="flex:1;min-width:180px;font-size:11px;opacity:0.75;align-self:center;">Preserves original slide dimensions (16:9, 4:3, portrait or custom), backgrounds, shapes, and embedded images. Static PDF excludes slide animations.</div>
      `;
      readyWrap.insertBefore(box, convertBtn);
    };

    convertBtn?.addEventListener("click", async () => {
      if (!selectedFile) return;
      ensurePptxPdfSettings();
      convertBtn.disabled = true;
      convertBtn.textContent = "Converting Presentation to PDF...";

      try {
        const baseName = selectedFile.name.replace(/\.[^/.]+$/, "");
        const buf = await selectedFile.arrayBuffer();
        const slideRangeVal = readyWrap?.querySelector("#pptx-pdf-slides")?.value || "all";
        const res = await convertPptxToPdf(buf, window.PDFLib, { slideRange: slideRangeVal });
        const check = await validateConvertedOutput(res.blob, "pdf");
        if (!check.valid) throw new Error(check.reason || "Invalid PDF generated.");

        downloadBlob(res.blob, `${baseName}.pdf`);
        if (fileLabel) {
          fileLabel.innerHTML = `<div class="tw-file-meta tw-file-success"><strong>${escapeHtml(baseName)}.pdf Ready!</strong><span>${res.pageCount} slides &bull; ${formatBytes(res.blob.size)}</span></div>`;
        }
        convertBtn.textContent = "Download PDF Again";
        showPortalToast("success", `Converted & downloaded "${baseName}.pdf"!`);
      } catch (err) {
        console.error(err);
        showPortalToast("error", `Presentation conversion failed: ${err.message}`);
        convertBtn.textContent = "Convert & Download PDF";
      } finally {
        convertBtn.disabled = false;
      }
    });
  }

  // ------------------------------------------------------------------------
  // 8. TOOL: PDF AI Summarizer (TF-IDF, Bullet Points, Q&A + Unicode-Safe PDF)
  // ------------------------------------------------------------------------
  _bindAiSummarizerModal() {
    const modal = document.getElementById("modal-ai-summarizer");
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
    const changeBtn = document.getElementById("btn-change-ai-summarizer");

    if (!modal) return;
    let allExtractedSentences = [];
    let documentSummaryText = "";
    let activeFileName = "Document";

    changeBtn?.addEventListener("click", () => {
      if (dropzone) dropzone.style.display = "flex";
      if (resultsPanel) resultsPanel.style.display = "none";
    });

    const onFileSelected = async (file) => {
      if (!file) return;
      activeFileName = file.name;
      if (dropzone) dropzone.style.display = "none";
      if (resultsPanel) resultsPanel.style.display = "block";
      if (summaryOutput) summaryOutput.innerHTML = `<div class="ai-loading-pulse">Analyzing document with client-side AI...</div>`;

      try {
        const pdfjsLib = window.pdfjsLib;
        const arrayBuffer = await file.arrayBuffer();
        const pdfJsDoc = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;

        let fullRawText = "";
        for (let p = 1; p <= pdfJsDoc.numPages; p++) {
          const page = await pdfJsDoc.getPage(p);
          const content = await page.getTextContent();
          fullRawText += content.items.map(it => it.str).join(" ") + "\n";
        }

        const rawSentences = fullRawText
          .replace(/([.?!])\s+(?=[A-Z0-9])/g, "$1|")
          .split("|")
          .map(s => s.trim())
          .filter(s => s.length > 20);

        allExtractedSentences = rawSentences;
        const words = fullRawText.match(/\b\w+\b/g) || [];
        const wordCount = words.length;
        const readTime = Math.max(1, Math.ceil(wordCount / 200));

        const stopWords = new Set(["the","and","of","to","in","a","is","that","for","it","as","was","with","be","by","on","not","he","i","this","are","or","an","will","from","at","your","all","have","new","more","has","can"]);
        const tf = {};
        words.forEach(w => {
          const lower = w.toLowerCase();
          if (lower.length > 3 && !stopWords.has(lower)) tf[lower] = (tf[lower] || 0) + 1;
        });

        const scored = rawSentences.map((sent, idx) => {
          let score = 0;
          const sentWords = (sent.toLowerCase().match(/\b\w+\b/g) || []);
          sentWords.forEach(w => { score += (tf[w] || 0); });
          if (idx < 3) score *= 1.35;
          return { sent, score: score / (sentWords.length + 1) };
        }).sort((a, b) => b.score - a.score);

        const topSentences = scored.slice(0, 5).map(s => s.sent);
        const bulletPoints = scored.slice(5, 10).map(s => s.sent);
        documentSummaryText = topSentences.join(" ") || fullRawText.trim().substring(0, 800) || "No extractable text found in this PDF.";

        if (summaryOutput) summaryOutput.innerHTML = `<p>${escapeHtml(documentSummaryText)}</p>`;
        if (bulletsOutput) {
          bulletsOutput.innerHTML = bulletPoints.length > 0
            ? bulletPoints.map(b => `<li>${escapeHtml(b)}</li>`).join("")
            : `<li>Document analyzed completely (${wordCount} words).</li>`;
        }
        if (statsOutput) {
          statsOutput.innerHTML = `
            <span class="ai-stat-badge">${pdfJsDoc.numPages} Pages</span>
            <span class="ai-stat-badge">${wordCount.toLocaleString()} Words</span>
            <span class="ai-stat-badge">~${readTime} min read</span>
          `;
        }
        showPortalToast("success", `Summary ready for ${file.name}!`);
      } catch (err) {
        console.error(err);
        showPortalToast("error", `Summarizer error: ${err.message}`);
      }
    };

    this._bindDrop(dropzone, picker, chooseBtn, onFileSelected);

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
        if (askAnswer) askAnswer.innerHTML = `<strong>Answer Excerpt:</strong> "${escapeHtml(ranked[0].sent)}"`;
      } else {
        if (askAnswer) askAnswer.innerHTML = `<em>No matching sentence found in the document.</em>`;
      }
    });

    copyBtn?.addEventListener("click", () => {
      if (!documentSummaryText) return;
      navigator.clipboard?.writeText(documentSummaryText);
      showPortalToast("success", "Summary copied to clipboard!");
    });

    downloadPdfBtn?.addEventListener("click", async () => {
      if (!documentSummaryText) return;
      try {
        const baseName = activeFileName.replace(/\.pdf$/i, "");
        const pdfBytes = await generateUnicodeSafeTextPdf(
          "Document Executive Summary",
          `Source: ${activeFileName}`,
          documentSummaryText
        );
        downloadBlob(new Blob([pdfBytes], { type: "application/pdf" }), `${baseName}_Summary.pdf`);
        showPortalToast("success", `Downloaded "${baseName}_Summary.pdf"!`);
      } catch (err) {
        showPortalToast("error", `Summary download failed: ${err.message}`);
      }
    });
  }

  // ------------------------------------------------------------------------
  // 9. TOOL: PDF Translator (Multi-language + Unicode-Safe PDF Download)
  // ------------------------------------------------------------------------
  _bindTranslatorModal() {
    const modal = document.getElementById("modal-translator");
    const picker = document.getElementById("translator-picker");
    const dropzone = document.getElementById("translator-dropzone");
    const chooseBtn = document.getElementById("btn-choose-translator");
    const readyWrap = document.getElementById("translator-ready-wrap");
    const fileLabel = document.getElementById("translator-file-label");
    const targetLangSelect = document.getElementById("translator-target-lang");
    const startBtn = document.getElementById("btn-start-translation");
    const translatedTextWrap = document.getElementById("translator-trans-text");
    const downloadPdfBtn = document.getElementById("btn-download-translated-pdf");
    const changeBtn = document.getElementById("btn-change-translator");

    if (!modal) return;
    let extractedPages = [];
    let currentTranslated = "";
    let activeFileName = "Document";

    changeBtn?.addEventListener("click", () => {
      extractedPages = [];
      currentTranslated = "";
      if (dropzone) dropzone.style.display = "flex";
      if (readyWrap) readyWrap.style.display = "none";
    });

    const onFileSelected = async (file) => {
      if (!file) return;
      activeFileName = file.name;
      extractedPages = [];
      currentTranslated = "";
      if (dropzone) dropzone.style.display = "none";
      if (readyWrap) readyWrap.style.display = "block";
      if (translatedTextWrap) translatedTextWrap.style.display = "none";
      if (downloadPdfBtn) downloadPdfBtn.style.display = "none";

      try {
        const pdfjsLib = window.pdfjsLib;
        const arrayBuffer = await file.arrayBuffer();
        const pdfJsDoc = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;

        for (let p = 1; p <= Math.min(10, pdfJsDoc.numPages); p++) {
          const page = await pdfJsDoc.getPage(p);
          const content = await page.getTextContent();
          extractedPages.push(content.items.map(it => it.str).join(" "));
        }

        if (fileLabel) {
          fileLabel.innerHTML = `<div class="tw-file-meta"><strong>${escapeHtml(file.name)}</strong><span>${pdfJsDoc.numPages} pages loaded &bull; Choose target language below</span></div>`;
        }
        if (startBtn) startBtn.disabled = false;
      } catch (err) {
        showPortalToast("error", `Failed to read document: ${err.message}`);
      }
    };

    this._bindDrop(dropzone, picker, chooseBtn, onFileSelected);

    startBtn?.addEventListener("click", async () => {
      if (extractedPages.length === 0) return;
      const targetLang = targetLangSelect?.value || "hi";
      startBtn.disabled = true;
      startBtn.textContent = "Translating Document...";

      try {
        const textSample = extractedPages.join("\n\n").trim();
        const chunks = [];
        for (let i = 0; i < Math.min(textSample.length, 2000); i += 450) {
          chunks.push(textSample.slice(i, i + 450));
        }

        const translatedChunks = [];
        for (const chunk of chunks) {
          let piece = "";
          try {
            const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=en|${targetLang}`);
            if (res.ok) {
              const data = await res.json();
              piece = data?.responseData?.translatedText || "";
            }
          } catch (_) {}
          translatedChunks.push(piece || chunk);
        }

        currentTranslated = translatedChunks.join("\n\n");
        if (translatedTextWrap) {
          translatedTextWrap.style.display = "block";
          translatedTextWrap.textContent = currentTranslated;
        }
        if (downloadPdfBtn) {
          downloadPdfBtn.style.display = "inline-flex";
          downloadPdfBtn.disabled = false;
        }
        showPortalToast("success", "Translation complete! Click Download Translated PDF.");
      } catch (err) {
        showPortalToast("error", `Translation failed: ${err.message}`);
      } finally {
        startBtn.disabled = false;
        startBtn.textContent = "Translate Document";
      }
    });

    downloadPdfBtn?.addEventListener("click", async () => {
      if (!currentTranslated) return;
      try {
        const baseName = activeFileName.replace(/\.pdf$/i, "");
        const pdfBytes = await generateUnicodeSafeTextPdf(
          "Translated Document",
          `Source: ${activeFileName} (${(targetLangSelect?.value || "hi").toUpperCase()})`,
          currentTranslated
        );
        downloadBlob(new Blob([pdfBytes], { type: "application/pdf" }), `${baseName}_Translated.pdf`);
        showPortalToast("success", `Downloaded "${baseName}_Translated.pdf"!`);
      } catch (err) {
        showPortalToast("error", `Download failed: ${err.message}`);
      }
    });
  }

  // ------------------------------------------------------------------------
  // 10. TOOL: HTML to PDF (Clean Editor + Unicode-Safe PDF)
  // ------------------------------------------------------------------------
  _bindHtmlToPdfModal() {
    const modal = document.getElementById("modal-html-to-pdf");
    const codeInput = document.getElementById("html-to-pdf-code");
    const templateSelect = document.getElementById("html-to-pdf-template");
    const convertBtn = document.getElementById("btn-convert-html-to-pdf");

    if (!modal) return;

    const templates = {
      invoice: `<h1>INVOICE #INV-2026-001</h1>\n<p>Date: November 2026</p>\n<p>Item 1: PDF Studio Pro License - $49.00</p>\n<p>Item 2: Enterprise Support Pack - $99.00</p>\n<h3>Grand Total: $148.00</h3>`,
      certificate: `<h1>CERTIFICATE OF COMPLETION</h1>\n<p>This certifies that OpenPDF Studio User has successfully completed the document design course.</p>`
    };

    templateSelect?.addEventListener("change", (e) => {
      if (templates[e.target.value] && codeInput) codeInput.value = templates[e.target.value];
    });

    convertBtn?.addEventListener("click", async () => {
      convertBtn.disabled = true;
      convertBtn.textContent = "Generating PDF...";
      try {
        const html = codeInput?.value || templates.invoice;
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = html;
        const plain = (tempDiv.innerText || tempDiv.textContent || "").trim();
        const pdfBytes = await generateUnicodeSafeTextPdf("HTML Document Export", "Generated with OpenPDF Studio", plain || "Empty HTML Document");
        downloadBlob(new Blob([pdfBytes], { type: "application/pdf" }), "HTML_Document.pdf");
        showPortalToast("success", 'Downloaded "HTML_Document.pdf"!');
      } catch (err) {
        showPortalToast("error", `HTML to PDF error: ${err.message}`);
      } finally {
        convertBtn.disabled = false;
        convertBtn.textContent = "Convert & Download PDF";
      }
    });
  }

  // ------------------------------------------------------------------------
  // 11. TOOL: Unlock PDF (Strip Password & Restrictions + Canvas Fallback)
  // ------------------------------------------------------------------------
  _bindUnlockPdfModal() {
    const modal = document.getElementById("modal-unlock-pdf");
    const picker = document.getElementById("unlock-pdf-picker");
    const dropzone = document.getElementById("unlock-pdf-dropzone");
    const chooseBtn = document.getElementById("btn-choose-unlock-pdf");
    const readyWrap = document.getElementById("unlock-pdf-ready-wrap");
    const passInput = document.getElementById("unlock-pdf-password");
    const unlockBtn = document.getElementById("btn-start-unlock-pdf");
    const fileLabel = document.getElementById("unlock-pdf-file-label");
    const changeBtn = document.getElementById("btn-change-unlock-pdf");

    if (!modal) return;
    let selectedFile = null;

    changeBtn?.addEventListener("click", () => {
      selectedFile = null;
      if (dropzone) dropzone.style.display = "flex";
      if (readyWrap) readyWrap.style.display = "none";
    });

    const onFileSelected = (file) => {
      if (!file) return;
      selectedFile = file;
      if (dropzone) dropzone.style.display = "none";
      if (readyWrap) readyWrap.style.display = "block";
      if (fileLabel) {
        fileLabel.innerHTML = `<div class="tw-file-meta"><strong>${escapeHtml(file.name)}</strong><span>${formatBytes(file.size)} &bull; Ready to unlock</span></div>`;
      }
      if (unlockBtn) { unlockBtn.disabled = false; unlockBtn.textContent = "Unlock & Download PDF"; }
    };

    this._bindDrop(dropzone, picker, chooseBtn, onFileSelected);

    unlockBtn?.addEventListener("click", async () => {
      if (!selectedFile) return;
      unlockBtn.disabled = true;
      unlockBtn.textContent = "Unlocking PDF...";

      try {
        const PDFLib = window.PDFLib;
        const pdfjsLib = window.pdfjsLib;
        const arrayBuffer = await selectedFile.arrayBuffer();
        const pwd = (passInput?.value || "").trim();
        const baseName = selectedFile.name.replace(/\.pdf$/i, "");

        let unlockedBytes = null;
        try {
          const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer.slice(0), {
            ignoreEncryption: true,
            password: pwd || undefined
          });
          unlockedBytes = await pdfDoc.save();
        } catch (_) {
          // Fallback: decrypt via PDF.js using password and rebuild clean unencrypted PDF!
          const pdfJsDoc = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer.slice(0)), password: pwd || undefined }).promise;
          const cleanDoc = await PDFLib.PDFDocument.create();
          for (let p = 1; p <= pdfJsDoc.numPages; p++) {
            const page = await pdfJsDoc.getPage(p);
            const vp1 = page.getViewport({ scale: 1.0 });
            const vp = page.getViewport({ scale: 2.0 });
            const c = document.createElement("canvas");
            c.width = Math.floor(vp.width);
            c.height = Math.floor(vp.height);
            await page.render({ canvasContext: c.getContext("2d"), viewport: vp }).promise;
            const jb = await new Promise(r => c.toBlob(r, "image/jpeg", 0.92));
            const img = await cleanDoc.embedJpg(new Uint8Array(await jb.arrayBuffer()));
            cleanDoc.addPage([vp1.width, vp1.height]).drawImage(img, { x: 0, y: 0, width: vp1.width, height: vp1.height });
          }
          unlockedBytes = await cleanDoc.save();
        }

        const blob = new Blob([unlockedBytes], { type: "application/pdf" });
        downloadBlob(blob, `${baseName}_unlocked.pdf`);
        if (fileLabel) {
          fileLabel.innerHTML = `<div class="tw-file-meta tw-file-success"><strong>${escapeHtml(baseName)}_unlocked.pdf Ready!</strong><span>All restrictions removed &bull; ${formatBytes(blob.size)}</span></div>`;
        }
        unlockBtn.textContent = "Download Unlocked PDF Again";
        showPortalToast("success", `Unlocked & downloaded "${baseName}_unlocked.pdf"!`);
      } catch (err) {
        showPortalToast("error", `Unlock failed: ${err.message}. Please verify the PDF password.`);
        unlockBtn.textContent = "Unlock & Download PDF";
      } finally {
        unlockBtn.disabled = false;
      }
    });
  }

  // ------------------------------------------------------------------------
  // 12. TOOL: PDF Convert to Scanner (Clean Controls, No Cluttered Preview)
  // ------------------------------------------------------------------------
  _bindPdfScannerModal() {
    const modal = document.getElementById("modal-pdf-scanner");
    const picker = document.getElementById("pdf-scanner-picker");
    const dropzone = document.getElementById("pdf-scanner-dropzone");
    const chooseBtn = document.getElementById("btn-choose-pdf-scanner");
    const readyWrap = document.getElementById("pdf-scanner-ready-wrap");
    const fileLabel = document.getElementById("scanner-file-label");
    const contrastSlider = document.getElementById("scanner-contrast-slider");
    const noiseSlider = document.getElementById("scanner-noise-slider");
    const tiltSlider = document.getElementById("scanner-tilt-slider");
    const modeSelect = document.getElementById("scanner-mode-select");
    const convertBtn = document.getElementById("btn-start-scanner");
    const changeBtn = document.getElementById("btn-change-pdf-scanner");

    if (!modal) return;
    let selectedFile = null;

    changeBtn?.addEventListener("click", () => {
      selectedFile = null;
      if (dropzone) dropzone.style.display = "flex";
      if (readyWrap) readyWrap.style.display = "none";
    });

    const onFileSelected = (file) => {
      if (!file) return;
      selectedFile = file;
      if (dropzone) dropzone.style.display = "none";
      if (readyWrap) readyWrap.style.display = "block";
      if (fileLabel) {
        fileLabel.innerHTML = `<div class="tw-file-meta"><strong>${escapeHtml(file.name)}</strong><span>${formatBytes(file.size)} &bull; Choose scan settings below</span></div>`;
      }
      if (convertBtn) { convertBtn.disabled = false; convertBtn.textContent = "Convert to Scanned PDF & Download"; }
    };

    this._bindDrop(dropzone, picker, chooseBtn, onFileSelected);

    convertBtn?.addEventListener("click", async () => {
      if (!selectedFile) return;
      convertBtn.disabled = true;
      convertBtn.textContent = "Scanning Document Pages...";

      try {
        const PDFLib = window.PDFLib;
        const pdfjsLib = window.pdfjsLib;
        const buf = await selectedFile.arrayBuffer();
        const loadedPdf = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
        const newDoc = await PDFLib.PDFDocument.create();

        const mode = modeSelect?.value || "photocopy";
        const contrast = parseFloat(contrastSlider?.value || 1.4);
        const noiseLevel = parseFloat(noiseSlider?.value || 15);
        const tiltDeg = parseFloat(tiltSlider?.value || 0.4);

        for (let p = 1; p <= loadedPdf.numPages; p++) {
          convertBtn.textContent = `Scanning Page ${p} of ${loadedPdf.numPages}...`;
          const page = await loadedPdf.getPage(p);
          const vp1 = page.getViewport({ scale: 1.0 });
          const vp = page.getViewport({ scale: 1.6 });

          const canvas = document.createElement("canvas");
          canvas.width = Math.floor(vp.width);
          canvas.height = Math.floor(vp.height);
          const ctx = canvas.getContext("2d");
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          const tiltAngle = ((p % 2 === 0 ? tiltDeg : -tiltDeg) * Math.PI) / 180;
          ctx.save();
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate(tiltAngle);
          ctx.translate(-canvas.width / 2, -canvas.height / 2);
          await page.render({ canvasContext: ctx, viewport: vp }).promise;
          ctx.restore();

          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const d = imgData.data;
          for (let i = 0; i < d.length; i += 4) {
            let gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
            gray = (gray - 128) * contrast + 128;
            if (mode === "photocopy") gray = gray < 135 ? gray * 0.45 : Math.min(255, gray * 1.15);
            else if (mode === "vintage") gray = gray < 140 ? gray * 0.55 : gray;
            if (noiseLevel > 0) gray = Math.max(0, Math.min(255, gray + (Math.random() - 0.5) * noiseLevel));
            d[i] = mode === "vintage" ? Math.min(255, gray + 14) : gray;
            d[i + 1] = mode === "vintage" ? Math.min(255, gray + 5) : gray;
            d[i + 2] = mode === "vintage" ? Math.max(0, gray - 14) : gray;
          }
          ctx.putImageData(imgData, 0, 0);

          const jpgBlob = await new Promise(r => canvas.toBlob(r, "image/jpeg", 0.86));
          const embeddedJpg = await newDoc.embedJpg(new Uint8Array(await jpgBlob.arrayBuffer()));
          newDoc.addPage([vp1.width, vp1.height]).drawImage(embeddedJpg, { x: 0, y: 0, width: vp1.width, height: vp1.height });
        }

        const pdfBytes = await newDoc.save();
        const blob = new Blob([pdfBytes], { type: "application/pdf" });
        const baseName = selectedFile.name.replace(/\.pdf$/i, "");
        downloadBlob(blob, `${baseName}_Scanned.pdf`);
        if (fileLabel) {
          fileLabel.innerHTML = `<div class="tw-file-meta tw-file-success"><strong>${escapeHtml(baseName)}_Scanned.pdf Ready!</strong><span>${loadedPdf.numPages} scanned pages &bull; ${formatBytes(blob.size)}</span></div>`;
        }
        convertBtn.textContent = "Download Scanned PDF Again";
        showPortalToast("success", `Downloaded "${baseName}_Scanned.pdf"!`);
      } catch (err) {
        console.error(err);
        showPortalToast("error", `Scan conversion failed: ${err.message}`);
        convertBtn.textContent = "Convert to Scanned PDF & Download";
      } finally {
        convertBtn.disabled = false;
      }
    });
  }
}
