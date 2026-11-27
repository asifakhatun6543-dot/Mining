/**
 * OpenPDF Studio - Genuine PDF Content-Stream Text Editor
 *
 * Performs validated PDF content-stream text-object editing:
 * - Inspects /Resources /Font dictionaries (/Subtype, /BaseFont, /Encoding, /ToUnicode, /FirstChar, /LastChar, /Widths)
 * - Rejects unsafe edits on CID/Type0/Identity-H, Type3, or subset fonts missing required replacement glyphs
 * - Preserves surrounding text, kerning numbers, and positioning operands on substring edits in Tj and TJ arrays
 * - Never draws whiteout rectangles or background patches
 * - Shared by both live PDF.js preview rendering and final PDF export
 */

function escapePdfLiteralString(str) {
  return String(str)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n");
}

function unescapePdfLiteralString(raw) {
  let out = "";
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch !== "\\") {
      out += ch;
      continue;
    }
    i++;
    if (i >= raw.length) break;
    const esc = raw[i];
    if (esc === "n") out += "\n";
    else if (esc === "r") out += "\r";
    else if (esc === "t") out += "\t";
    else if (esc === "b") out += "\b";
    else if (esc === "f") out += "\f";
    else if (esc === "(" || esc === ")" || esc === "\\") out += esc;
    else if (esc >= "0" && esc <= "7") {
      let oct = esc;
      if (i + 1 < raw.length && raw[i + 1] >= "0" && raw[i + 1] <= "7") {
        oct += raw[++i];
        if (i + 1 < raw.length && raw[i + 1] >= "0" && raw[i + 1] <= "7") {
          oct += raw[++i];
        }
      }
      out += String.fromCharCode(parseInt(oct, 8));
    } else if (esc === "\r" || esc === "\n") {
      if (esc === "\r" && raw[i + 1] === "\n") i++;
    } else {
      out += esc;
    }
  }
  return out;
}

function decodePdfHexString(hexRaw) {
  const clean = hexRaw.replace(/\s+/g, "");
  if (!clean) return { text: "", isUtf16: false, isCidLike: false };
  const padded = clean.length % 2 === 1 ? clean + "0" : clean;
  const bytes = [];
  for (let i = 0; i < padded.length; i += 2) {
    bytes.push(parseInt(padded.slice(i, i + 2), 16));
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    let text = "";
    for (let i = 2; i + 1 < bytes.length; i += 2) {
      text += String.fromCharCode((bytes[i] << 8) | bytes[i + 1]);
    }
    return { text, isUtf16: true, isCidLike: true };
  }
  let printableCount = 0;
  let text = "";
  for (const b of bytes) {
    if (b >= 32 && b <= 126) printableCount++;
    text += String.fromCharCode(b);
  }
  const isCidLike = bytes.length >= 2 && printableCount < bytes.length * 0.5;
  return { text, isUtf16: false, isCidLike };
}

function multiplyMatrix(m1, m2) {
  return [
    m1[0] * m2[0] + m1[1] * m2[2],
    m1[0] * m2[1] + m1[1] * m2[3],
    m1[2] * m2[0] + m1[3] * m2[2],
    m1[2] * m2[1] + m1[3] * m2[3],
    m1[4] * m2[0] + m1[5] * m2[2] + m2[4],
    m1[4] * m2[1] + m1[5] * m2[3] + m2[5]
  ];
}

function applyPoint(m, x, y) {
  return [
    m[0] * x + m[2] * y + m[4],
    m[1] * x + m[3] * y + m[5]
  ];
}

function isWinAnsiSafe(str) {
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code === 10 || code === 13) return false;
    if (code < 32 || (code > 126 && code < 160) || code > 255) {
      return false;
    }
  }
  return true;
}

/**
 * Inspects a PDF page's /Resources /Font dictionary entry for encoding,
 * subset coverage, CID/Type3 status, and character widths.
 */
export function inspectPageFontResource(pdfDoc, page, fontResourceName, pdfLib) {
  const info = {
    found: false,
    fontResourceName: fontResourceName || null,
    subtype: "",
    baseFont: "",
    cleanBaseFont: "",
    isSubset: false,
    encodingName: "",
    hasDifferences: false,
    hasToUnicode: false,
    isCidFont: false,
    isType3: false,
    isStandardBase14: false,
    firstChar: null,
    lastChar: null,
    widths: null
  };

  try {
    const { PDFName, PDFDict, PDFArray, PDFNumber } = pdfLib || {};
    if (!PDFName || !fontResourceName) return info;

    const resources = page.node.Resources ? page.node.Resources() : null;
    const fonts = resources ? resources.lookup(PDFName.of("Font")) : null;
    if (!fonts || typeof fonts.lookup !== "function") return info;

    const fontDict = fonts.lookup(PDFName.of(fontResourceName));
    if (!fontDict || typeof fontDict.get !== "function") return info;

    info.found = true;
    const subtypeObj = fontDict.lookup(PDFName.of("Subtype"));
    info.subtype = subtypeObj ? subtypeObj.toString() : "";
    info.isCidFont = info.subtype === "/Type0";
    info.isType3 = info.subtype === "/Type3";

    const baseFontObj = fontDict.lookup(PDFName.of("BaseFont"));
    info.baseFont = baseFontObj ? baseFontObj.toString().replace(/^\//, "") : "";
    info.isSubset = /^[A-Z]{6}\+/.test(info.baseFont);
    info.cleanBaseFont = info.baseFont.replace(/^[A-Z]{6}\+/, "");

    info.isStandardBase14 = /^(Helvetica|Times-Roman|Times-Bold|Times-Italic|Times-BoldItalic|Courier|Symbol|ZapfDingbats)(-(Bold|Oblique|Italic|BoldOblique|BoldItalic))?$/i.test(info.cleanBaseFont);
    info.hasToUnicode = !!fontDict.get(PDFName.of("ToUnicode"));

    const encObj = fontDict.lookup(PDFName.of("Encoding"));
    if (encObj) {
      if (PDFDict && encObj instanceof PDFDict) {
        const baseEnc = encObj.lookup(PDFName.of("BaseEncoding"));
        info.encodingName = baseEnc ? baseEnc.toString() : "/CustomDict";
        info.hasDifferences = !!encObj.get(PDFName.of("Differences"));
      } else {
        info.encodingName = encObj.toString();
      }
    }

    if (info.encodingName === "/Identity-H" || info.encodingName === "/Identity-V") {
      info.isCidFont = true;
    }

    const fcObj = fontDict.lookup(PDFName.of("FirstChar"));
    const lcObj = fontDict.lookup(PDFName.of("LastChar"));
    const widthsObj = fontDict.lookup(PDFName.of("Widths"));

    if (PDFNumber && fcObj instanceof PDFNumber && lcObj instanceof PDFNumber && PDFArray && widthsObj instanceof PDFArray) {
      info.firstChar = fcObj.asNumber();
      info.lastChar = lcObj.asNumber();
      info.widths = [];
      for (let idx = 0; idx < widthsObj.size(); idx++) {
        const w = widthsObj.lookup(idx);
        info.widths.push(w && typeof w.asNumber === "function" ? w.asNumber() : 0);
      }
    }
  } catch (_) {}

  return info;
}

/**
 * Validates whether replacementText can be safely encoded in the original font resource.
 */
function validateFontCoverage(fontInfo, originalText, replacementText, op) {
  if (op.isCidLike || fontInfo.isCidFont) {
    return { ok: false, reason: `Font "${fontInfo.cleanBaseFont || op.font || "CID"}" uses CID/Identity-H glyph mapping; in-place byte replacement is unsupported.` };
  }
  if (fontInfo.isType3) {
    return { ok: false, reason: `Font "${fontInfo.cleanBaseFont || op.font || "Type3"}" is a Type3 bitmap/custom glyph font.` };
  }
  if (!isWinAnsiSafe(replacementText)) {
    return { ok: false, reason: "Replacement text contains characters outside single-byte WinAnsi encoding." };
  }
  if (fontInfo.hasDifferences) {
    // Allow characters already present in originalText, reject unverified new characters
    for (let i = 0; i < replacementText.length; i++) {
      const ch = replacementText[i];
      if (!originalText.includes(ch) && ch !== " ") {
        return { ok: false, reason: `Font "${fontInfo.cleanBaseFont || op.font}" uses a custom /Differences encoding.` };
      }
    }
  }
  if (fontInfo.isSubset && fontInfo.widths && fontInfo.firstChar !== null && fontInfo.lastChar !== null) {
    for (let i = 0; i < replacementText.length; i++) {
      const code = replacementText.charCodeAt(i);
      if (code === 32) continue;
      if (code < fontInfo.firstChar || code > fontInfo.lastChar) {
        return { ok: false, reason: `Subset font "${fontInfo.cleanBaseFont}" lacks glyph for "${replacementText[i]}".` };
      }
      const w = fontInfo.widths[code - fontInfo.firstChar];
      if (!w || w <= 0) {
        return { ok: false, reason: `Subset font "${fontInfo.cleanBaseFont}" has zero width for "${replacementText[i]}".` };
      }
    }
  }
  return { ok: true };
}

/**
 * Scans a PDF content stream string and extracts all text-showing operators
 * along with offsets, decoded text, and PDF (x, y) coordinates.
 */
export function scanContentStreamTextOps(contentStr) {
  const ops = [];
  const len = contentStr.length;
  let i = 0;

  let ctm = [1, 0, 0, 1, 0, 0];
  const ctmStack = [];
  let inText = false;
  let tm = [1, 0, 0, 1, 0, 0];
  let tlm = [1, 0, 0, 1, 0, 0];
  let leading = 0;
  let curFont = null;
  let curFontSize = 12;

  const operandStack = [];

  const skipWhitespaceAndComments = () => {
    while (i < len) {
      const c = contentStr[i];
      if (c === " " || c === "\t" || c === "\r" || c === "\n" || c === "\f" || c === "\0") {
        i++;
      } else if (c === "%") {
        while (i < len && contentStr[i] !== "\r" && contentStr[i] !== "\n") i++;
      } else {
        break;
      }
    }
  };

  while (i < len) {
    skipWhitespaceAndComments();
    if (i >= len) break;

    const ch = contentStr[i];

    if (ch === "(") {
      const start = i;
      i++;
      let depth = 1;
      let raw = "";
      while (i < len && depth > 0) {
        const c = contentStr[i];
        if (c === "\\") {
          raw += c;
          if (i + 1 < len) {
            raw += contentStr[i + 1];
            i += 2;
            continue;
          }
        } else if (c === "(") depth++;
        else if (c === ")") {
          depth--;
          if (depth === 0) {
            i++;
            break;
          }
        }
        raw += c;
        i++;
      }
      operandStack.push({ type: "literal", raw, start, end: i, text: unescapePdfLiteralString(raw) });
      continue;
    }

    if (ch === "<") {
      if (contentStr[i + 1] === "<") {
        const start = i;
        i += 2;
        let dictDepth = 1;
        while (i < len && dictDepth > 0) {
          if (contentStr[i] === "<" && contentStr[i + 1] === "<") { dictDepth++; i += 2; }
          else if (contentStr[i] === ">" && contentStr[i + 1] === ">") { dictDepth--; i += 2; }
          else i++;
        }
        operandStack.push({ type: "dict", start, end: i });
        continue;
      } else {
        const start = i;
        i++;
        let hexRaw = "";
        while (i < len && contentStr[i] !== ">") hexRaw += contentStr[i++];
        if (i < len && contentStr[i] === ">") i++;
        const decoded = decodePdfHexString(hexRaw);
        operandStack.push({ type: "hex", raw: hexRaw, start, end: i, text: decoded.text, isCidLike: decoded.isCidLike });
        continue;
      }
    }

    if (ch === "[") {
      const start = i;
      i++;
      const items = [];
      while (i < len) {
        skipWhitespaceAndComments();
        if (i >= len) break;
        if (contentStr[i] === "]") { i++; break; }
        if (contentStr[i] === "(") {
          const sStart = i;
          i++;
          let depth = 1;
          let raw = "";
          while (i < len && depth > 0) {
            const c = contentStr[i];
            if (c === "\\") {
              raw += c;
              if (i + 1 < len) { raw += contentStr[i + 1]; i += 2; continue; }
            } else if (c === "(") depth++;
            else if (c === ")") { depth--; if (depth === 0) { i++; break; } }
            raw += c;
            i++;
          }
          items.push({ type: "literal", raw, start: sStart, end: i, text: unescapePdfLiteralString(raw) });
        } else if (contentStr[i] === "<") {
          const hStart = i;
          i++;
          let hexRaw = "";
          while (i < len && contentStr[i] !== ">") hexRaw += contentStr[i++];
          if (i < len && contentStr[i] === ">") i++;
          const decoded = decodePdfHexString(hexRaw);
          items.push({ type: "hex", raw: hexRaw, start: hStart, end: i, text: decoded.text, isCidLike: decoded.isCidLike });
        } else {
          let numStr = "";
          while (i < len && !/[\s\[\]\(\)<>\/%]/.test(contentStr[i])) numStr += contentStr[i++];
          const num = parseFloat(numStr);
          if (!Number.isNaN(num)) items.push({ type: "num", value: num });
        }
      }
      const combinedText = items.filter(it => it.type === "literal" || it.type === "hex").map(it => it.text).join("");
      operandStack.push({
        type: "array",
        items,
        start,
        end: i,
        text: combinedText,
        hasCid: items.some(it => it.isCidLike),
        hasHex: items.some(it => it.type === "hex")
      });
      continue;
    }

    if (ch === "/") {
      const start = i;
      i++;
      let name = "";
      while (i < len && !/[\s\[\]\(\)<>\/%]/.test(contentStr[i])) name += contentStr[i++];
      operandStack.push({ type: "name", value: name, start, end: i });
      continue;
    }

    const tokStart = i;
    let tok = "";
    while (i < len && !/[\s\[\]\(\)<>\/%]/.test(contentStr[i])) tok += contentStr[i++];
    if (!tok) { i++; continue; }

    const numVal = Number(tok);
    if (!Number.isNaN(numVal) && /^-?(?:\d+\.?\d*|\.\d+)$/.test(tok)) {
      operandStack.push({ type: "num", value: numVal, start: tokStart, end: i });
      continue;
    }

    if (tok === "q") { ctmStack.push([...ctm]); operandStack.length = 0; }
    else if (tok === "Q") { if (ctmStack.length > 0) ctm = ctmStack.pop(); operandStack.length = 0; }
    else if (tok === "cm" && operandStack.length >= 6) {
      const nums = operandStack.slice(-6).map(o => o.value || 0);
      ctm = multiplyMatrix(nums, ctm);
      operandStack.length = 0;
    } else if (tok === "BT") {
      inText = true;
      tm = [1, 0, 0, 1, 0, 0];
      tlm = [1, 0, 0, 1, 0, 0];
      operandStack.length = 0;
    } else if (tok === "ET") {
      inText = false;
      operandStack.length = 0;
    } else if (tok === "Tf" && operandStack.length >= 2) {
      curFont = operandStack[operandStack.length - 2].value || null;
      curFontSize = operandStack[operandStack.length - 1].value || 12;
      operandStack.length = 0;
    } else if (tok === "TL" && operandStack.length >= 1) {
      leading = operandStack[operandStack.length - 1].value || 0;
      operandStack.length = 0;
    } else if ((tok === "Td" || tok === "TD") && inText && operandStack.length >= 2) {
      const tx = operandStack[operandStack.length - 2].value || 0;
      const ty = operandStack[operandStack.length - 1].value || 0;
      if (tok === "TD") leading = -ty;
      tlm = multiplyMatrix([1, 0, 0, 1, tx, ty], tlm);
      tm = [...tlm];
      operandStack.length = 0;
    } else if (tok === "Tm" && inText && operandStack.length >= 6) {
      const m = operandStack.slice(-6).map(o => o.value || 0);
      tm = [...m];
      tlm = [...m];
      operandStack.length = 0;
    } else if (tok === "T*" && inText) {
      tlm = multiplyMatrix([1, 0, 0, 1, 0, -leading], tlm);
      tm = [...tlm];
      operandStack.length = 0;
    } else if ((tok === "Tj" || tok === "TJ" || tok === "'" || tok === '"') && operandStack.length >= 1) {
      if (tok === "'" || tok === '"') {
        tlm = multiplyMatrix([1, 0, 0, 1, 0, -leading], tlm);
        tm = [...tlm];
      }
      const arg = operandStack[operandStack.length - 1];
      const [px, py] = applyPoint(ctm, tm[4], tm[5]);
      ops.push({
        op: tok,
        arg,
        opStart: arg.start,
        opEnd: i,
        text: arg.text || "",
        x: px,
        y: py,
        font: curFont,
        fontSize: curFontSize,
        isLiteral: arg.type === "literal" || (arg.type === "array" && !arg.hasHex && !arg.hasCid),
        isCidLike: !!arg.isCidLike || !!arg.hasCid
      });
      operandStack.length = 0;
    } else if (tok === "BI") {
      const idIdx = contentStr.indexOf("ID", i);
      if (idIdx !== -1) {
        const eiIdx = contentStr.indexOf("EI", idIdx + 2);
        i = eiIdx !== -1 ? eiIdx + 2 : len;
      }
      operandStack.length = 0;
    } else {
      operandStack.length = 0;
    }
  }

  return ops;
}

function encodeTokenLike(type, text) {
  if (type === "hex") {
    let hex = "";
    for (let idx = 0; idx < text.length; idx++) {
      hex += text.charCodeAt(idx).toString(16).padStart(2, "0").toUpperCase();
    }
    return `<${hex}>`;
  }
  return `(${escapePdfLiteralString(text)})`;
}

/**
 * Replaces ONLY a matching substring inside a TJ array, preserving kerning numbers and surrounding items.
 */
function replaceSubstringInTjArray(contentStr, op, originalText, replacementText) {
  const items = op.arg.items || [];
  let running = "";
  const ranges = [];
  for (const it of items) {
    if (it.type === "literal" || it.type === "hex") {
      const startPos = running.length;
      running += it.text;
      ranges.push({ item: it, startPos, endPos: running.length });
    }
  }
  const matchIdx = running.indexOf(originalText);
  if (matchIdx === -1) return null;
  const matchEnd = matchIdx + originalText.length;

  const patches = [];
  let inserted = false;
  for (const r of ranges) {
    if (r.endPos <= matchIdx || r.startPos >= matchEnd) continue;
    const localStart = Math.max(0, matchIdx - r.startPos);
    const localEnd = Math.min(r.item.text.length, matchEnd - r.startPos);
    const prefix = r.item.text.slice(0, localStart);
    const suffix = r.item.text.slice(localEnd);
    let newText = prefix;
    if (!inserted) {
      newText += replacementText;
      inserted = true;
    }
    newText += suffix;
    patches.push({
      start: r.item.start,
      end: r.item.end,
      text: encodeTokenLike(r.item.type, newText)
    });
  }

  if (patches.length === 0) return null;
  patches.sort((a, b) => b.start - a.start);
  let out = contentStr.slice(op.opStart, op.opEnd);
  for (const p of patches) {
    const relStart = p.start - op.opStart;
    const relEnd = p.end - op.opStart;
    out = out.slice(0, relStart) + p.text + out.slice(relEnd);
  }
  return out;
}

/**
 * Performs validated PDF content-stream editing on a page.
 * Returns { handled: true, mode: 'inplace' | 'suppressed', fontInfo }
 * or { handled: false, mode: 'rejected', reason }.
 */
export function editPageContentStream(pdfDoc, page, edit, pageBox, pdfLib) {
  try {
    const { PDFName, PDFArray, PDFRawStream, PDFRef, decodePDFRawStream } = pdfLib || {};
    if (!PDFName || !decodePDFRawStream) {
      return { handled: false, mode: "rejected", reason: "PDFLib stream decoder unavailable." };
    }

    const originalText = String(edit.original_text || "").trim();
    if (!originalText) {
      return { handled: false, mode: "rejected", reason: "Original text is empty." };
    }

    const [x0, y0, x1, y1] = edit.bbox.map(Number);
    const targetX = pageBox.x + x0;
    const targetY = pageBox.y + pageBox.height - (edit.baseline_y !== undefined && edit.baseline_y !== null ? Number(edit.baseline_y) : (y0 + (y1 - y0) * 0.82));

    const streamEntries = [];
    const contentsRef = page.node.get(PDFName.of("Contents"));
    if (contentsRef) {
      const resolved = pdfDoc.context.lookup(contentsRef);
      if (resolved instanceof PDFArray) {
        for (let idx = 0; idx < resolved.size(); idx++) {
          streamEntries.push({ ref: resolved.get(idx), parent: resolved, arrayIdx: idx });
        }
      } else {
        streamEntries.push({ ref: contentsRef, parent: page.node, key: PDFName.of("Contents") });
      }
    }

    try {
      const resources = page.node.Resources ? page.node.Resources() : null;
      const xObjects = resources ? resources.lookup(PDFName.of("XObject")) : null;
      if (xObjects && typeof xObjects.entries === "function") {
        for (const [xKey, xVal] of xObjects.entries()) {
          const xStream = pdfDoc.context.lookup(xVal);
          if (xStream && xStream instanceof PDFRawStream) {
            const subtype = xStream.dict.get(PDFName.of("Subtype"));
            if (subtype && subtype.toString() === "/Form") {
              streamEntries.push({ ref: xVal, parent: xObjects, key: xKey });
            }
          }
        }
      }
    } catch (_) {}

    let bestMatch = null;
    let bestScore = Infinity;

    for (const entry of streamEntries) {
      const stream = pdfDoc.context.lookup(entry.ref);
      if (!stream || !(stream instanceof PDFRawStream)) continue;

      const decodedBytes = decodePDFRawStream(stream).decode();
      let contentStr = "";
      for (let k = 0; k < decodedBytes.length; k++) {
        contentStr += String.fromCharCode(decodedBytes[k]);
      }

      const ops = scanContentStreamTextOps(contentStr);
      for (let oi = 0; oi < ops.length; oi++) {
        const op = ops[oi];
        const opTrim = op.text.trim();
        if (!opTrim) continue;

        const isExact = opTrim === originalText;
        const isSubstring = !isExact && opTrim.includes(originalText);
        if (isExact || isSubstring) {
          const dist = Math.hypot(op.x - targetX, op.y - targetY);
          const penalty = isExact ? 0 : 40;
          const score = dist + penalty;
          if (score < bestScore) {
            bestScore = score;
            bestMatch = { entry, contentStr, op, extraOps: [], isExact };
          }
          continue;
        }

        if (originalText.startsWith(opTrim) || originalText.includes(opTrim)) {
          let combined = op.text;
          const extraOps = [];
          for (let oj = oi + 1; oj < Math.min(ops.length, oi + 8); oj++) {
            const nextOp = ops[oj];
            if (Math.abs(nextOp.y - op.y) > 6) break;
            combined += nextOp.text;
            extraOps.push(nextOp);
            const combTrim = combined.trim();
            if (combTrim === originalText || combTrim.includes(originalText)) {
              const dist = Math.hypot(op.x - targetX, op.y - targetY);
              const score = dist + 10;
              if (score < bestScore) {
                bestScore = score;
                bestMatch = { entry, contentStr, op, extraOps, isExact: combTrim === originalText };
              }
              break;
            }
          }
        }
      }
    }

    if (!bestMatch || bestScore > 250) {
      return { handled: false, mode: "rejected", reason: "No matching vector text operator found (document may be scanned or use non-standard layout)." };
    }

    const { entry, contentStr, op, extraOps, isExact } = bestMatch;
    const replacementText = String(edit.replacement_text ?? "");
    const fontInfo = inspectPageFontResource(pdfDoc, page, op.font, pdfLib);

    // Validate in-place replacement compatibility against actual PDF font dictionary
    let canAttemptInPlace =
      !edit.forceSuppress &&
      !edit.user_changed_font &&
      !edit.is_bold &&
      !edit.is_italic &&
      !edit.is_underline &&
      (!edit.alignment || edit.alignment === "left") &&
      replacementText.length > 0;

    let coverageWarning = null;
    if (canAttemptInPlace) {
      const coverage = validateFontCoverage(fontInfo, originalText, replacementText, op);
      if (!coverage.ok) {
        if (!isWinAnsiSafe(replacementText)) {
          return { handled: false, mode: "rejected", reason: coverage.reason, fontInfo };
        }
        // WinAnsi-safe replacement on CID/subset font: suppress original operator cleanly and draw compatible vector font
        canAttemptInPlace = false;
        coverageWarning = `${coverage.reason} Replaced using closest compatible vector font without modifying background.`;
      }
    }

    let replacementSegment = "";
    let mode = "suppressed";

    if (canAttemptInPlace && isExact) {
      const tok = encodeTokenLike(op.arg.type === "hex" ? "hex" : "literal", replacementText);
      const baseOp = op.op === "'" ? `${tok} '` : op.op === '"' ? `${tok} "` : `${tok} Tj`;
      if (edit.user_changed_style && op.font && Array.isArray(edit.text_color) && edit.text_color.length >= 3) {
        const [r, g, b] = edit.text_color.map(v => Math.max(0, Math.min(1, Number(v) || 0)).toFixed(3));
        const sz = Math.max(4, Number(edit.font_size) || op.fontSize || 12);
        replacementSegment = `q ${r} ${g} ${b} rg /${op.font} ${sz} Tf ${baseOp} Q`;
      } else {
        replacementSegment = baseOp;
      }
      mode = "inplace";
    } else if (canAttemptInPlace && !isExact && extraOps.length === 0) {
      // Substring replacement inside Tj or TJ array, preserving surrounding text & kerning operands
      if (op.arg.type === "array") {
        const patchedArrayOp = replaceSubstringInTjArray(contentStr, op, originalText, replacementText);
        if (!patchedArrayOp) {
          return { handled: false, mode: "rejected", reason: "Could not safely isolate substring in TJ array.", fontInfo };
        }
        replacementSegment = patchedArrayOp;
        mode = "inplace";
      } else {
        const idx = op.text.indexOf(originalText);
        if (idx === -1) {
          return { handled: false, mode: "rejected", reason: "Substring boundary not found in text operator.", fontInfo };
        }
        const newFull = op.text.slice(0, idx) + replacementText + op.text.slice(idx + originalText.length);
        replacementSegment = `${encodeTokenLike(op.arg.type, newFull)} ${op.op}`;
        mode = "inplace";
      }
    } else if (coverageWarning || edit.user_changed_font || edit.is_bold || edit.is_italic || edit.is_underline || (edit.alignment && edit.alignment !== "left") || replacementText.length === 0 || edit.forceSuppress) {
      // Intentional style/font override or deletion: suppress ONLY if full operator or safely split substring
      if (!isExact && extraOps.length === 0) {
        if (op.arg.type === "array") {
          const patchedArrayOp = replaceSubstringInTjArray(contentStr, op, originalText, "");
          if (!patchedArrayOp) {
            return { handled: false, mode: "rejected", reason: "Cannot split TJ array substring for restyling without affecting surrounding text.", fontInfo };
          }
          replacementSegment = patchedArrayOp;
        } else {
          return { handled: false, mode: "rejected", reason: "Changing font/style on a partial substring of a single text operator is unsupported without altering surrounding characters.", fontInfo };
        }
      } else {
        replacementSegment = "() Tj";
      }
    } else {
      return { handled: false, mode: "rejected", reason: "Edit cannot be safely applied in-place.", fontInfo };
    }

    const patches = [{ start: op.opStart, end: op.opEnd, text: replacementSegment }];
    for (const ex of extraOps) {
      patches.push({ start: ex.opStart, end: ex.opEnd, text: "() Tj" });
    }
    patches.sort((a, b) => b.start - a.start);

    let updatedStr = contentStr;
    for (const p of patches) {
      updatedStr = updatedStr.slice(0, p.start) + p.text + updatedStr.slice(p.end);
    }

    const outBytes = new Uint8Array(updatedStr.length);
    for (let k = 0; k < updatedStr.length; k++) {
      outBytes[k] = updatedStr.charCodeAt(k) & 0xff;
    }
    const newStream = pdfDoc.context.stream(outBytes);

    if (entry.ref instanceof PDFRef) {
      pdfDoc.context.assign(entry.ref, newStream);
    } else if (entry.parent && entry.key) {
      entry.parent.set(entry.key, pdfDoc.context.register(newStream));
    }

    return { handled: true, mode, fontInfo, warning: coverageWarning };
  } catch (e) {
    console.warn("Content-stream text edit rejected:", e);
    return { handled: false, mode: "rejected", reason: e?.message || "Content-stream edit error." };
  }
}

/**
 * Applies validated text edits to a single page of pdfBytes using the exact same
 * content-stream / export pipeline so PDF.js preview matches exported PDF output.
 */
export async function applyPageEditsForPreview(pdfBytes, pageIndex, edits, pdfLib, drawFallbackFn) {
  const { PDFDocument } = pdfLib || {};
  if (!PDFDocument || !pdfBytes || !edits || edits.length === 0) return null;

  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const page = pdfDoc.getPages()[pageIndex];
  if (!page) return null;

  const size = page.getSize();
  let box = { x: 0, y: 0, width: size.width, height: size.height };
  try {
    const crop = page.getCropBox();
    if (crop && crop.width > 0 && crop.height > 0) box = crop;
  } catch (_) {}

  const appliedKeys = new Set();
  const warnings = [];

  for (const edit of edits) {
    const res = editPageContentStream(pdfDoc, page, edit, box, pdfLib);
    if (!res.handled) {
      warnings.push(res.reason || `Unsupported edit for "${edit.original_text}"`);
      continue;
    }
    if (res.warning) warnings.push(res.warning);
    appliedKeys.add(`${Math.round(edit.bbox[0])}_${Math.round(edit.bbox[1])}`);
    if (res.mode === "suppressed" && drawFallbackFn) {
      await drawFallbackFn(pdfDoc, page, edit, box);
    }
  }

  if (appliedKeys.size === 0) {
    return { bytes: null, appliedKeys, warnings };
  }
  const bytes = await pdfDoc.save();
  return { bytes, appliedKeys, warnings };
}
