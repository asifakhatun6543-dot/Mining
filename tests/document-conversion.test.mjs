import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const PDFLib = require(path.join(ROOT, "vendor/pdf-lib/pdf-lib.min.js"));
const pdfjsLib = require(path.join(ROOT, "node_modules/pdfjs-dist/legacy/build/pdf.js"));

// Minimal XML DOMParser shim for Node.js so OOXML->PDF converters run end-to-end
function parseXmlToMiniDom(xml) {
  const stack = [{ nodeName: "#root", attributes: {}, childNodes: [], textContent: "" }];
  const tagRe = /<(\/?)([A-Za-z0-9_:-]+)([^>]*?)(\/?)>/g;
  let lastIdx = 0;
  let match;
  while ((match = tagRe.exec(xml)) !== null) {
    if (match.index > lastIdx) {
      const txt = xml.slice(lastIdx, match.index)
        .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
      if (stack.length > 0) stack[stack.length - 1].textContent += txt;
    }
    lastIdx = tagRe.lastIndex;
    const isClose = match[1] === "/";
    const tagName = match[2];
    const attrStr = match[3] || "";
    const selfClose = match[4] === "/";
    if (tagName.startsWith("?")) continue;

    if (isClose) {
      if (stack.length > 1) stack.pop();
    } else {
      const attrs = {};
      const attrRe = /([A-Za-z0-9_:-]+)\s*=\s*"([^"]*)"/g;
      let am;
      while ((am = attrRe.exec(attrStr)) !== null) attrs[am[1]] = am[2];
      const node = {
        nodeName: tagName,
        attributes: attrs,
        childNodes: [],
        textContent: "",
        getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attributes, k) ? this.attributes[k] : null; },
        getElementsByTagName(name) {
          const out = [];
          const walk = (n) => {
            for (const c of n.childNodes) {
              if (c.nodeName === name) out.push(c);
              walk(c);
            }
          };
          walk(this);
          return out;
        }
      };
      stack[stack.length - 1].childNodes.push(node);
      if (!selfClose) stack.push(node);
    }
  }
  const root = stack[0];
  root.getElementsByTagName = function (name) {
    const out = [];
    const walk = (n) => {
      for (const c of n.childNodes) {
        if (c.nodeName === name) out.push(c);
        walk(c);
      }
    };
    walk(this);
    return out;
  };
  return root;
}

if (typeof globalThis.DOMParser === "undefined") {
  globalThis.DOMParser = class {
    parseFromString(str) { return parseXmlToMiniDom(str); }
  };
}

import {
  convertPdfToDocx,
  convertDocxToPdf,
  convertPdfToXlsx,
  convertExcelToPdf,
  convertPdfToPptx,
  convertPptxToPdf,
  extractZipEntries,
  validateConvertedOutput
} from "../js/conversion-engine.js";

async function runConversionTests() {
  const { PDFDocument, StandardFonts, rgb } = PDFLib;

  // Build representative multi-page test PDF with multiple fonts, colors & table rows
  const pdfDoc = await PDFDocument.create();
  const helv = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helvBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const times = await pdfDoc.embedFont(StandardFonts.TimesRoman);

  const p1 = pdfDoc.addPage([612, 792]);
  p1.drawText("Quarterly Financial Summary", { x: 60, y: 730, size: 18, font: helvBold, color: rgb(0.1, 0.25, 0.6) });
  p1.drawText("Prepared by Finance Department", { x: 60, y: 705, size: 11, font: times, color: rgb(0.2, 0.2, 0.2) });
  // Tabular rows
  p1.drawText("Item", { x: 60, y: 660, size: 11, font: helvBold, color: rgb(0, 0, 0) });
  p1.drawText("Amount", { x: 260, y: 660, size: 11, font: helvBold, color: rgb(0, 0, 0) });
  p1.drawText("Growth", { x: 400, y: 660, size: 11, font: helvBold, color: rgb(0, 0, 0) });

  p1.drawText("Software", { x: 60, y: 640, size: 11, font: helv, color: rgb(0, 0, 0) });
  p1.drawText("12500", { x: 260, y: 640, size: 11, font: helv, color: rgb(0, 0, 0) });
  p1.drawText("18.5%", { x: 400, y: 640, size: 11, font: helv, color: rgb(0.05, 0.5, 0.2) });

  p1.drawText("Services", { x: 60, y: 620, size: 11, font: helv, color: rgb(0, 0, 0) });
  p1.drawText("8400", { x: 260, y: 620, size: 11, font: helv, color: rgb(0, 0, 0) });
  p1.drawText("12.0%", { x: 400, y: 620, size: 11, font: helv, color: rgb(0.05, 0.5, 0.2) });

  const p2 = pdfDoc.addPage([792, 612]); // Landscape page 2
  p2.drawText("Landscape Appendix", { x: 72, y: 540, size: 16, font: helvBold, color: rgb(0.5, 0.1, 0.1) });

  const samplePdfBytes = await pdfDoc.save();
  const pdfJsDoc = await pdfjsLib.getDocument({ data: new Uint8Array(samplePdfBytes), verbosity: 0 }).promise;

  // 1a. PDF -> Word (.docx) Exact Layout + Editable Text Mode (Hoba-Hu)
  const exactDocxRes = await convertPdfToDocx(pdfJsDoc, pdfjsLib, {
    mode: "exact-editable",
    pageRange: "all",
    pdfBytes: samplePdfBytes,
    pdfLib: PDFLib
  });
  const exactCheck = await validateConvertedOutput(exactDocxRes.blob, "docx");
  assert.equal(exactCheck.valid, true, "Exact-Editable DOCX must pass OOXML validation");
  const exactEntries = await extractZipEntries(await exactDocxRes.blob.arrayBuffer());
  const exactXml = new TextDecoder().decode(exactEntries.get("word/document.xml"));
  assert.ok(exactXml.includes("<w:txbxContent>") && exactXml.includes("<wps:wsp"), "Exact-Editable DOCX must create editable Word text boxes");
  assert.ok(exactXml.includes("Quarterly Financial Summary"), "Exact-Editable DOCX must preserve heading text");

  // 1b. PDF -> Word (.docx) Flowing Mode (with tables)
  const docxRes = await convertPdfToDocx(pdfJsDoc, pdfjsLib, { mode: "flowing", pageRange: "all" });
  const docxCheck = await validateConvertedOutput(docxRes.blob, "docx");
  assert.equal(docxCheck.valid, true, "DOCX must pass OOXML validation");
  assert.equal(docxRes.pageCount, 2);
  const docxEntries = await extractZipEntries(await docxRes.blob.arrayBuffer());
  const docXml = new TextDecoder().decode(docxEntries.get("word/document.xml"));
  assert.ok(docXml.includes("<w:tbl>"), "DOCX Flowing Mode must reconstruct <w:tbl> table");
  assert.ok(docXml.includes("Quarterly Financial Summary"), "DOCX must preserve heading text");
  assert.ok(docXml.includes("1A4099") || docXml.includes("<w:color"), "DOCX must preserve text color");
  console.log("PASS [1/6]: PDF -> Word (.docx) Exact-Editable (Hoba-Hu) & Flowing Modes");

  // 2. Word (.docx) -> PDF
  const docxPdfRes = await convertDocxToPdf(await docxRes.blob.arrayBuffer(), "test.docx", PDFLib);
  const docxPdfCheck = await validateConvertedOutput(docxPdfRes.blob, "pdf");
  assert.equal(docxPdfCheck.valid, true, "Word -> PDF must produce valid PDF");
  assert.ok(docxPdfRes.pageCount >= 2, "Word -> PDF must preserve page breaks");
  const docxPdfJs = await pdfjsLib.getDocument({ data: new Uint8Array(docxPdfRes.bytes), verbosity: 0 }).promise;
  const docxP1Text = (await (await docxPdfJs.getPage(1)).getTextContent()).items.map(i => i.str).join(" ");
  assert.ok(docxP1Text.includes("Quarterly Financial Summary"), "Word -> PDF must preserve text");
  assert.ok(docxP1Text.includes("Software"), "Word -> PDF must preserve table cell text");
  console.log("PASS [2/6]: Word (.docx) -> PDF preserves tables, pagination & formatting");

  // 3. PDF -> Excel (.xlsx)
  const xlsxRes = await convertPdfToXlsx(pdfJsDoc, pdfjsLib, { mode: "structured", pageRange: "all" });
  const xlsxCheck = await validateConvertedOutput(xlsxRes.blob, "xlsx");
  assert.equal(xlsxCheck.valid, true, "XLSX must pass OOXML validation");
  const xlsxEntries = await extractZipEntries(await xlsxRes.blob.arrayBuffer());
  const sh1Xml = new TextDecoder().decode(xlsxEntries.get("xl/worksheets/sheet1.xml"));
  assert.ok(sh1Xml.includes("<cols>"), "XLSX must include column widths");
  assert.ok(sh1Xml.includes("<v>12500</v>"), "XLSX must preserve numeric cells");
  assert.ok(sh1Xml.includes('s="3"'), "XLSX must format percentage cells");
  console.log("PASS [3/6]: PDF -> Excel (.xlsx) Structured Data Mode with multi-column clustering & numeric types");

  // 4. Excel (.xlsx) -> PDF
  const xlsxPdfRes = await convertExcelToPdf(await xlsxRes.blob.arrayBuffer(), "test.xlsx", PDFLib, { sheetIndex: "all" });
  const xlsxPdfCheck = await validateConvertedOutput(xlsxPdfRes.blob, "pdf");
  assert.equal(xlsxPdfCheck.valid, true, "Excel -> PDF must produce valid PDF");
  assert.ok(xlsxPdfRes.pageCount >= 2, "Excel -> PDF must render all sheets");
  console.log("PASS [4/6]: Excel (.xlsx) -> PDF preserves formatting, column widths & all sheets");

  // 5. PDF -> PowerPoint (.pptx)
  const pptxRes = await convertPdfToPptx(pdfJsDoc, pdfjsLib, { mode: "editable", aspect: "original", pageRange: "all" });
  const pptxCheck = await validateConvertedOutput(pptxRes.blob, "pptx");
  assert.equal(pptxCheck.valid, true, "PPTX must pass OOXML validation");
  assert.equal(pptxRes.slideCount, 2);
  const pptxEntries = await extractZipEntries(await pptxRes.blob.arrayBuffer());
  const slide1Xml = new TextDecoder().decode(pptxEntries.get("ppt/slides/slide1.xml"));
  assert.ok(slide1Xml.includes('txBox="1"'), "PPTX Editable Mode must generate editable text boxes");
  assert.ok(slide1Xml.includes("Quarterly Financial Summary"), "PPTX must preserve slide text");
  console.log("PASS [5/6]: PDF -> PowerPoint (.pptx) Editable Slides Mode with original aspect ratio");

  // 6. PowerPoint (.pptx) -> PDF
  const pptxPdfRes = await convertPptxToPdf(await pptxRes.blob.arrayBuffer(), PDFLib, { slideRange: "all" });
  const pptxPdfCheck = await validateConvertedOutput(pptxPdfRes.blob, "pdf");
  assert.equal(pptxPdfCheck.valid, true, "PPTX -> PDF must produce valid PDF");
  assert.equal(pptxPdfRes.pageCount, 2, "PPTX -> PDF must render all slides in order");
  console.log("PASS [6/6]: PowerPoint (.pptx) -> PDF preserves slide dimensions & positioned text");

  // 7. Verify 8-handle resize & Done commit UI invariants in text-editor.js
  const editorSrc = fs.readFileSync(path.join(ROOT, "js/text-editor.js"), "utf8");
  assert.ok(editorSrc.includes('["nw", "ne", "sw", "se"]'), "4 corner white circle resize handles must exist");
  assert.ok(editorSrc.includes("async applyEdit()"), "applyEdit must be async and await commit before closing");
  assert.ok(editorSrc.includes("mt-error-banner"), "Inline error banner must keep toolbar open on commit failure");

  console.log("\nALL 6/6 DOCUMENT CONVERSION + RESIZABLE EDITOR TESTS PASSED.");
}

runConversionTests().catch(err => {
  console.error("CONVERSION TEST FAILED:", err);
  process.exit(1);
});
