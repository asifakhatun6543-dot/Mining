import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const SHARED_MODULES = [
  "pdf-content-stream-editor.js",
  "pdf-renderer.js",
  "text-editor.js",
  "export-client.js",
  "text-selection.js",
  "state.js",
  "history.js",
  "toolbar.js",
  "scanned-editor.js"
];

const TARGET_DIRS = [
  "backend/js",
  "backend/static/js",
  "openpdf_mobile/assets/web/js"
];

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

const checkOnly = process.argv.includes("--check");
let mismatches = 0;
let synced = 0;

for (const mod of SHARED_MODULES) {
  const srcPath = path.join(ROOT, "js", mod);
  if (!fs.existsSync(srcPath)) continue;
  const srcHash = sha256(srcPath);

  for (const targetDir of TARGET_DIRS) {
    const destDir = path.join(ROOT, targetDir);
    if (!fs.existsSync(destDir)) continue;
    const destPath = path.join(destDir, mod);

    const needsUpdate = !fs.existsSync(destPath) || sha256(destPath) !== srcHash;
    if (needsUpdate) {
      if (checkOnly) {
        console.error(`OUT OF SYNC: ${targetDir}/${mod}`);
        mismatches++;
      } else {
        fs.copyFileSync(srcPath, destPath);
        synced++;
      }
    }
  }
}

if (checkOnly) {
  if (mismatches > 0) {
    console.error(`Sync check failed: ${mismatches} file(s) out of sync.`);
    process.exit(1);
  }
  console.log("All shared PDF editor modules are 100% synchronized.");
} else {
  console.log(`Synchronized ${synced} file(s) from authoritative js/ core.`);
}
