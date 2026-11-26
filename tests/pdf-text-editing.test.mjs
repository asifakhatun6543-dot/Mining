import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// Load pdf-lib from vendor (same version used by website & Android app)
const PDFLib = require(path.join(ROOT, "vendor/pdf-lib/pdf-lib.min.js"));
const pdfjsLib = require(path.join(ROOT, "node_modules/pdfjs-dist/legacy/build/pdf.js"));

import {
  scanContentStreamTextOps,
  editPageContentStream
} from "../js/pdf-content-stream-editor.js";

function sha256File(relPath) {
  const buf = fs.readFileSync(path.join(ROOT, relPath));
  return crypto.createHash("sha256").update(buf).digest("hex");
}

async function extractPdfJsItems(pdfBytes) {
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(pdfBytes), verbosity: 0 }).promise;
  const page = await doc.getPage(1);
  const vp = page.getViewport({ scale: 1.0 });
  const tc = await page.getTextContent();
  return {
    width: vp.width,
    height: vp.height,
    items: tc.items.map(it => ({
      str: it.str,
      x: Math.round(it.transform[4] * 100) / 100,
      y: Math.round((vp.height - it.transform[5]) * 100) / 100,
      fontSize: Math.round(Math.hypot(it.transform[2], it.transform[3]) * 10) / 10,
      fontName: it.fontName
    }))
  };
}

async function runTests() {
  let passed = 0;

  // TEST 1: Colored/vector background preservation + targeted single-occurrence in-place edit
  {
    const { PDFDocument, StandardFonts, rgb } = PDFLib;
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]);
    const timesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

    // Draw colored background + border line + watermark
    page.drawRectangle({ x: 30, y: 100, width: 552, height: 620, color: rgb(0.15, 0.35, 0.65) });
    page.drawLine({ start: { x: 30, y: 400 }, end: { x: 582, y: 400 }, thickness: 2, color: rgb(1, 0.8, 0.2) });
    page.drawText("CONFIDENTIAL", { x: 200, y: 420, size: 28, font: timesBold, color: rgb(0.9, 0.9, 0.9), opacity: 0.35 });

    // Two identical words at different Y positions
    page.drawText("Invoice", { x: 72, y: 680, size: 18, font: timesBold, color: rgb(1, 1, 1) });
    page.drawText("Invoice", { x: 72, y: 200, size: 18, font: timesBold, color: rgb(1, 1, 1) });

    const origBytes = await pdfDoc.save();
    const editDoc = await PDFDocument.load(origBytes);
    const editPage = editDoc.getPages()[0];
    const box = { x: 0, y: 0, width: 612, height: 792 };

    // Target ONLY the second "Invoice" (y=200 in PDF -> baseline_y = 792 - 200 = 592)
    const result = editPageContentStream(
      editDoc,
      editPage,
      {
        original_text: "Invoice",
        replacement_text: "Receipt",
        bbox: [72, 576, 130, 596],
        baseline_y: 592,
        user_changed_font: false,
        user_changed_style: false
      },
      box,
      PDFLib
    );

    assert.equal(result.handled, true, "Content-stream edit should handle vector text");
    assert.equal(result.mode, "inplace", "Unstyled text change should use true in-place vector replacement");

    const outBytes = await editDoc.save();
    const parsed = await extractPdfJsItems(outBytes);

    assert.equal(parsed.width, 612);
    assert.equal(parsed.height, 792);

    const strings = parsed.items.map(i => i.str);
    assert.ok(strings.includes("CONFIDENTIAL"), "Watermark must remain intact");
    assert.ok(strings.includes("Invoice"), "First Invoice at y=680 must remain untouched");
    assert.ok(strings.includes("Receipt"), "Second Invoice must be replaced with Receipt");
    assert.equal(strings.filter(s => s === "Invoice").length, 1, "Only 1 Invoice should remain");

    const receiptItem = parsed.items.find(i => i.str === "Receipt");
    assert.ok(Math.abs(receiptItem.x - 72) < 1, "X coordinate must be preserved");
    assert.ok(Math.abs(receiptItem.y - 592) < 1, "Baseline Y coordinate must be preserved");
    assert.equal(receiptItem.fontSize, 18, "Font size 18pt must be preserved");

    passed++;
    console.log("PASS [1/5]: Background preservation + exact coordinate in-place vector edit");
  }

  // TEST 2: Substring editing inside a single text operator
  {
    const { PDFDocument, StandardFonts, rgb } = PDFLib;
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]);
    const helv = await pdfDoc.embedFont(StandardFonts.Helvetica);

    page.drawText("Total Amount: $100.00", { x: 50, y: 700, size: 14, font: helv, color: rgb(0, 0, 0) });
    const origBytes = await pdfDoc.save();
    const editDoc = await PDFDocument.load(origBytes);
    const editPage = editDoc.getPages()[0];

    const result = editPageContentStream(
      editDoc,
      editPage,
      {
        original_text: "$100.00",
        replacement_text: "$250.00",
        bbox: [50, 80, 190, 96],
        baseline_y: 92,
        user_changed_font: false,
        user_changed_style: false
      },
      { x: 0, y: 0, width: 612, height: 792 },
      PDFLib
    );

    assert.equal(result.mode, "inplace");
    const outBytes = await editDoc.save();
    const parsed = await extractPdfJsItems(outBytes);
    assert.ok(parsed.items.some(i => i.str === "Total Amount: $250.00"), "Prefix must be preserved on substring edit");

    passed++;
    console.log("PASS [2/5]: Substring editing preserves surrounding prefix/suffix");
  }

  // TEST 3: Hex string <...> and kerning array [...] TJ scanning & editing
  {
    const sampleStream = `
      q
      1 0 0 1 0 0 cm
      BT
      /F1 12 Tf
      1 0 0 1 72 700 Tm
      [(Hel) -20 (lo)] TJ
      0 -20 Td
      <576F726C64> Tj
      ET
      Q
    `;
    const ops = scanContentStreamTextOps(sampleStream);
    assert.equal(ops.length, 2);
    assert.equal(ops[0].text, "Hello");
    assert.equal(ops[0].x, 72);
    assert.equal(ops[0].y, 700);
    assert.equal(ops[1].text, "World");
    assert.equal(ops[1].x, 72);
    assert.equal(ops[1].y, 680);

    passed++;
    console.log("PASS [3/5]: Content-stream tokenizer decodes TJ kerning arrays, hex strings & Tm/Td coords");
  }

  // TEST 4: Style change suppression without whiteout rectangles
  {
    const { PDFDocument, StandardFonts, rgb } = PDFLib;
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]);
    const helv = await pdfDoc.embedFont(StandardFonts.Helvetica);

    page.drawText("Heading", { x: 60, y: 700, size: 16, font: helv, color: rgb(0, 0, 0) });
    const origBytes = await pdfDoc.save();
    const editDoc = await PDFDocument.load(origBytes);
    const editPage = editDoc.getPages()[0];

    const result = editPageContentStream(
      editDoc,
      editPage,
      {
        original_text: "Heading",
        replacement_text: "Updated Heading",
        bbox: [60, 78, 130, 96],
        baseline_y: 92,
        user_changed_font: true,
        user_changed_style: true
      },
      { x: 0, y: 0, width: 612, height: 792 },
      PDFLib
    );

    assert.equal(result.handled, true);
    assert.equal(result.mode, "suppressed", "Style-changed edit should suppress original op without whiteout");

    const outBytes = await editDoc.save();
    const parsed = await extractPdfJsItems(outBytes);
    assert.equal(parsed.items.filter(i => i.str.includes("Heading")).length, 0, "Old text must not remain underneath");

    passed++;
    console.log("PASS [4/5]: Style-changed edit suppresses original operator cleanly with zero whiteout");
  }

  // TEST 5: Website & Android WebView Engine Parity
  {
    const sharedModules = [
      "pdf-content-stream-editor.js",
      "text-editor.js",
      "pdf-renderer.js"
    ];
    for (const file of sharedModules) {
      const webSha = sha256File(`js/${file}`);
      const appSha = sha256File(`openpdf_mobile/assets/web/js/${file}`);
      assert.equal(webSha, appSha, `Website and Android copies of ${file} must stay identical`);
    }
    passed++;
    console.log("PASS [5/5]: Website and Android WebView editing modules are 100% in sync");
  }

  console.log(`\nALL ${passed}/5 PDF TEXT EDITING REGRESSION TESTS PASSED.`);
}

runTests().catch(err => {
  console.error("REGRESSION TEST FAILED:", err);
  process.exit(1);
});
