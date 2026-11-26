/**
 * OpenPDF Studio - True PDF Content-Stream Text Editor
 *
 * Performs genuine PDF content-stream text-object editing:
 * - Tracks graphics state (q/Q, cm) and text state (BT/ET, Tm, Td, TD, T*, Tf)
 * - Matches the exact text operator closest to the edited span's PDF coordinates
 * - Supports both literal (...) and hex <...> PDF strings in Tj, TJ, ', "
 * - Performs in-place vector replacement when styling/font is preserved and WinAnsi-safe
 * - Performs single-occurrence suppression (without drawing whiteout rectangles) when styling changes
 * - Preserves 100% of original backgrounds, gradients, images, watermarks, and unrelated objects
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
  // Check UTF-16BE BOM
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

/**
 * Scans a PDF content stream string and extracts all text-showing operators
 * along with their byte/char offsets, decoded text, and approximate PDF (x, y) position.
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

    // 1. Literal string (...)
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
        } else if (c === "(") {
          depth++;
        } else if (c === ")") {
          depth--;
          if (depth === 0) {
            i++;
            break;
          }
        }
        raw += c;
        i++;
      }
      operandStack.push({
        type: "literal",
        raw,
        start,
        end: i,
        text: unescapePdfLiteralString(raw)
      });
      continue;
    }

    // 2. Hex string <...> or Dict <<...>>
    if (ch === "<") {
      if (contentStr[i + 1] === "<") {
        // Dictionary << ... >>
        const start = i;
        i += 2;
        let dictDepth = 1;
        while (i < len && dictDepth > 0) {
          if (contentStr[i] === "<" && contentStr[i + 1] === "<") {
            dictDepth++;
            i += 2;
          } else if (contentStr[i] === ">" && contentStr[i + 1] === ">") {
            dictDepth--;
            i += 2;
          } else {
            i++;
          }
        }
        operandStack.push({ type: "dict", start, end: i });
        continue;
      } else {
        const start = i;
        i++;
        let hexRaw = "";
        while (i < len && contentStr[i] !== ">") {
          hexRaw += contentStr[i++];
        }
        if (i < len && contentStr[i] === ">") i++;
        const decoded = decodePdfHexString(hexRaw);
        operandStack.push({
          type: "hex",
          raw: hexRaw,
          start,
          end: i,
          text: decoded.text,
          isCidLike: decoded.isCidLike
        });
        continue;
      }
    }

    // 3. Array [...]
    if (ch === "[") {
      const start = i;
      i++;
      const items = [];
      while (i < len) {
        skipWhitespaceAndComments();
        if (i >= len) break;
        if (contentStr[i] === "]") {
          i++;
          break;
        }
        if (contentStr[i] === "(") {
          const sStart = i;
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
          items.push({ type: "literal", raw, start: sStart, end: i, text: unescapePdfLiteralString(raw) });
        } else if (contentStr[i] === "<") {
          const hStart = i;
          i++;
          let hexRaw = "";
          while (i < len && contentStr[i] !== ">") hexRaw += contentStr[i++];
          if (contentStr[i] === ">") i++;
          const decoded = decodePdfHexString(hexRaw);
          items.push({ type: "hex", raw: hexRaw, start: hStart, end: i, text: decoded.text, isCidLike: decoded.isCidLike });
        } else {
          // number inside TJ array (kerning)
          let numStr = "";
          while (i < len && !/[\s\[\]\(\)<>\/%]/.test(contentStr[i])) numStr += contentStr[i++];
          const num = parseFloat(numStr);
          if (!Number.isNaN(num)) items.push({ type: "num", value: num });
        }
      }
      const combinedText = items
        .filter(it => it.type === "literal" || it.type === "hex")
        .map(it => it.text)
        .join("");
      const hasCid = items.some(it => it.isCidLike);
      const hasHex = items.some(it => it.type === "hex");
      operandStack.push({
        type: "array",
        items,
        start,
        end: i,
        text: combinedText,
        hasCid,
        hasHex
      });
      continue;
    }

    // 4. Name /...
    if (ch === "/") {
      const start = i;
      i++;
      let name = "";
      while (i < len && !/[\s\[\]\(\)<>\/%]/.test(contentStr[i])) name += contentStr[i++];
      operandStack.push({ type: "name", value: name, start, end: i });
      continue;
    }

    // 5. Token (number or operator)
    const tokStart = i;
    let tok = "";
    while (i < len && !/[\s\[\]\(\)<>\/%]/.test(contentStr[i])) {
      tok += contentStr[i++];
    }
    if (!tok) {
      i++;
      continue;
    }

    const numVal = Number(tok);
    if (!Number.isNaN(numVal) && /^-?(?:\d+\.?\d*|\.\d+)$/.test(tok)) {
      operandStack.push({ type: "num", value: numVal, start: tokStart, end: i });
      continue;
    }

    // Operator dispatch
    if (tok === "q") {
      ctmStack.push([...ctm]);
      operandStack.length = 0;
    } else if (tok === "Q") {
      if (ctmStack.length > 0) ctm = ctmStack.pop();
      operandStack.length = 0;
    } else if (tok === "cm" && operandStack.length >= 6) {
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
      // Inline image: skip until ID ... EI
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

function isWinAnsiSafe(str) {
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code === 10 || code === 13) return false; // multiline handled separately
    if (code < 32 || (code > 126 && code < 160) || code > 255) {
      return false;
    }
  }
  return true;
}

/**
 * Attempts genuine PDF content-stream editing on a page.
 * Returns { handled: true, mode: 'inplace' | 'suppressed' } or { handled: false, mode: 'none' }.
 */
export function editPageContentStream(pdfDoc, page, edit, pageBox, pdfLib) {
  try {
    const { PDFName, PDFArray, PDFRawStream, PDFRef, decodePDFRawStream } = pdfLib || {};
    if (!PDFName || !decodePDFRawStream) return { handled: false, mode: "none" };

    const originalText = String(edit.original_text || "").trim();
    if (!originalText) return { handled: false, mode: "none" };

    const [x0, y0, x1, y1] = edit.bbox.map(Number);
    const targetX = pageBox.x + x0;
    const targetY = pageBox.y + pageBox.height - (edit.baseline_y !== undefined && edit.baseline_y !== null ? Number(edit.baseline_y) : (y0 + (y1 - y0) * 0.82));

    // Collect page content stream refs + Form XObject stream refs
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

    // Also inspect Form XObjects if present
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
      for (const op of ops) {
        const opTrim = op.text.trim();
        if (!opTrim) continue;

        const isExact = opTrim === originalText;
        const isSubstring = !isExact && opTrim.includes(originalText);
        if (!isExact && !isSubstring) continue;

        const dist = Math.hypot(op.x - targetX, op.y - targetY);
        // Prefer exact match and closest spatial coordinate
        const penalty = isExact ? 0 : 40;
        const score = dist + penalty;
        if (score < bestScore) {
          bestScore = score;
          bestMatch = { entry, contentStr, op, isExact };
        }
      }
    }

    if (!bestMatch || bestScore > 250) {
      return { handled: false, mode: "none" };
    }

    const { entry, contentStr, op, isExact } = bestMatch;
    const replacementText = String(edit.replacement_text ?? "");

    // Determine if we can do true in-place vector replacement in the original embedded font
    const canDoInPlace =
      !edit.user_changed_font &&
      !edit.user_changed_style &&
      isExact &&
      !op.isCidLike &&
      replacementText.length > 0 &&
      isWinAnsiSafe(replacementText);

    let replacementSegment = "";
    let mode = "suppressed";

    const encodeReplacementToken = (text) => {
      if (op.arg.type === "hex") {
        let hex = "";
        for (let idx = 0; idx < text.length; idx++) {
          hex += text.charCodeAt(idx).toString(16).padStart(2, "0").toUpperCase();
        }
        return `<${hex}>`;
      }
      return `(${escapePdfLiteralString(text)})`;
    };

    if (canDoInPlace) {
      const tok = encodeReplacementToken(replacementText);
      if (op.op === "'") replacementSegment = `${tok} '`;
      else if (op.op === '"') replacementSegment = `${tok} "`;
      else replacementSegment = `${tok} Tj`;
      mode = "inplace";
    } else if (!isExact && !op.isCidLike && (op.arg.type === "literal" || op.arg.type === "hex")) {
      // Substring edit inside a larger Tj: replace ONLY the edited portion
      const idx = op.text.indexOf(originalText);
      if (idx !== -1 && isWinAnsiSafe(replacementText) && !edit.user_changed_font && !edit.user_changed_style) {
        const newFull = op.text.slice(0, idx) + replacementText + op.text.slice(idx + originalText.length);
        replacementSegment = `${encodeReplacementToken(newFull)} ${op.op}`;
        mode = "inplace";
      } else {
        replacementSegment = "() Tj";
      }
    } else {
      replacementSegment = "() Tj";
    }

    const updatedStr =
      contentStr.slice(0, op.opStart) +
      replacementSegment +
      contentStr.slice(op.opEnd);

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

    return { handled: true, mode };
  } catch (e) {
    console.warn("Content-stream text edit fallback:", e);
    return { handled: false, mode: "none" };
  }
}
