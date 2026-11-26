/**
 * OpenPDF Studio - Professional In-Place WYSIWYG Text Editor
 * 
 * Features:
 * 1. Selected text gets an in-place bounding box with 8 circular resize handles.
 * 2. Floating horizontal mini-toolbar right above the text:
 *    [ ✥ | OK | Font ⌄ | Size ⌄ | B | I | U | Color ⌄ | 🗑 | ••• ]
 * 3. Exact automatic font and font size matching from original PDF typography.
 * 4. Comprehensive font library: 100+ standard, editorial, sans-serif, monospace, Indic, and script fonts.
 * 5. Unlimited re-editing: click any previously modified text to edit again in-place.
 * 6. True command-pattern Undo and Redo with complete visual DOM & state reversal.
 */

import { State } from "./state.js";
import { HistoryManager } from "./history.js";

export const FONT_DEFINITIONS = [
  // Standard & System (with metric-compatible cross-platform web fonts for Android/iOS/Linux)
  { key: "times-roman", label: "Times New Roman", group: "Standard & System", css: '"Times New Roman", Tinos, Times, "Liberation Serif", "Nimbus Roman No9 L", serif' },
  { key: "calibri", label: "Calibri", group: "Standard & System", css: 'Calibri, Carlito, "Segoe UI", Arimo, Arial, sans-serif' },
  { key: "arial", label: "Arial", group: "Standard & System", css: 'Arial, Arimo, "Helvetica Neue", Helvetica, "Liberation Sans", sans-serif' },
  { key: "helvetica", label: "Helvetica", group: "Standard & System", css: 'Helvetica, "Helvetica Neue", Arimo, Arial, "Liberation Sans", sans-serif' },
  { key: "georgia", label: "Georgia", group: "Standard & System", css: 'Georgia, Caladea, "Times New Roman", Tinos, serif' },
  { key: "cambria", label: "Cambria", group: "Standard & System", css: 'Cambria, Caladea, Georgia, serif' },
  { key: "cambria-math", label: "Cambria Math", group: "Standard & System", css: '"Cambria Math", Cambria, serif' },
  { key: "constantia", label: "Constantia", group: "Standard & System", css: 'Constantia, "Times New Roman", serif' },
  { key: "calisto-mt", label: "Calisto MT", group: "Standard & System", css: '"Calisto MT", "Book Antiqua", Palatino, serif' },
  { key: "garamond", label: "Garamond", group: "Standard & System", css: 'Garamond, "EB Garamond", serif' },
  { key: "palatino", label: "Palatino", group: "Standard & System", css: '"Palatino Linotype", "Book Antiqua", Palatino, serif' },
  { key: "verdana", label: "Verdana", group: "Standard & System", css: 'Verdana, Geneva, sans-serif' },
  { key: "tahoma", label: "Tahoma", group: "Standard & System", css: 'Tahoma, Verdana, "Segoe UI", sans-serif' },
  { key: "trebuchet", label: "Trebuchet MS", group: "Standard & System", css: '"Trebuchet MS", "Lucida Sans", sans-serif' },
  { key: "century-gothic", label: "Century Gothic", group: "Standard & System", css: '"Century Gothic", "Apple Gothic", sans-serif' },

  // Editorial & Book Serif
  { key: "charter", label: "Charter", group: "Serif & Editorial", css: 'Charter, "Bitstream Charter", serif' },
  { key: "caladea", label: "Caladea", group: "Serif & Editorial", css: 'Caladea, "Cambria", serif' },
  { key: "computer-modern", label: "Computer Modern", group: "Serif & Editorial", css: '"Computer Modern", "Latin Modern Roman", serif' },
  { key: "dejavu-serif", label: "DejaVu Serif", group: "Serif & Editorial", css: '"DejaVu Serif", serif' },
  { key: "droid-serif", label: "Droid Serif", group: "Serif & Editorial", css: '"Droid Serif", serif' },
  { key: "fontin", label: "Fontin", group: "Serif & Editorial", css: 'Fontin, Georgia, serif' },
  { key: "frank-ruhl-libre", label: "Frank Ruhl Libre", group: "Serif & Editorial", css: '"Frank Ruhl Libre", serif' },
  { key: "gentium-plus", label: "Gentium Plus", group: "Serif & Editorial", css: '"Gentium Plus", Gentium, serif' },
  { key: "ibm-plex-serif", label: "IBM Plex Serif", group: "Serif & Editorial", css: '"IBM Plex Serif", Georgia, serif' },
  { key: "libera", label: "Libera", group: "Serif & Editorial", css: 'Libera, Georgia, serif' },
  { key: "liberation-serif", label: "Liberation Serif", group: "Serif & Editorial", css: '"Liberation Serif", "Times New Roman", serif' },
  { key: "linux-libertine", label: "Linux Libertine", group: "Serif & Editorial", css: '"Linux Libertine", "Times New Roman", serif' },
  { key: "lora", label: "Lora", group: "Serif & Editorial", css: 'Lora, Georgia, serif' },
  { key: "merriweather", label: "Merriweather", group: "Serif & Editorial", css: 'Merriweather, Georgia, serif' },
  { key: "noto-serif", label: "Noto Serif", group: "Serif & Editorial", css: '"Noto Serif", Georgia, serif' },
  { key: "playfair-display", label: "Playfair Display", group: "Serif & Editorial", css: '"Playfair Display", Georgia, serif' },
  { key: "pt-serif", label: "PT Serif", group: "Serif & Editorial", css: '"PT Serif", Georgia, serif' },
  { key: "roboto-slab", label: "Roboto Slab", group: "Serif & Editorial", css: '"Roboto Slab", Georgia, serif' },
  { key: "source-serif-4", label: "Source Serif 4", group: "Serif & Editorial", css: '"Source Serif 4", Georgia, serif' },
  { key: "alegreya", label: "Alegreya", group: "Serif & Editorial", css: 'Alegreya, Georgia, serif' },
  { key: "cormorant-garamond", label: "Cormorant Garamond", group: "Serif & Editorial", css: '"Cormorant Garamond", Garamond, serif' },
  { key: "crimson-text", label: "Crimson Text", group: "Serif & Editorial", css: '"Crimson Text", Georgia, serif' },
  { key: "dm-serif-display", label: "DM Serif Display", group: "Serif & Editorial", css: '"DM Serif Display", Georgia, serif' },
  { key: "eczar", label: "Eczar", group: "Serif & Editorial", css: 'Eczar, serif' },
  { key: "instrument-serif", label: "Instrument Serif", group: "Serif & Editorial", css: '"Instrument Serif", serif' },
  { key: "spectral", label: "Spectral", group: "Serif & Editorial", css: 'Spectral, Georgia, serif' },
  { key: "vollkorn", label: "Vollkorn", group: "Serif & Editorial", css: 'Vollkorn, Georgia, serif' },
  { key: "zilla-slab", label: "Zilla Slab", group: "Serif & Editorial", css: '"Zilla Slab", Georgia, serif' },
  { key: "cinzel", label: "Cinzel", group: "Serif & Editorial", css: 'Cinzel, Georgia, serif' },

  // Modern Sans-Serif
  { key: "inter", label: "Inter", group: "Modern Sans-Serif", css: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  { key: "roboto", label: "Roboto", group: "Modern Sans-Serif", css: 'Roboto, Arial, sans-serif' },
  { key: "roboto-condensed", label: "Roboto Condensed", group: "Modern Sans-Serif", css: '"Roboto Condensed", Roboto, sans-serif' },
  { key: "poppins", label: "Poppins", group: "Modern Sans-Serif", css: 'Poppins, Arial, sans-serif' },
  { key: "montserrat", label: "Montserrat", group: "Modern Sans-Serif", css: 'Montserrat, Arial, sans-serif' },
  { key: "open-sans", label: "Open Sans", group: "Modern Sans-Serif", css: '"Open Sans", Arial, sans-serif' },
  { key: "lato", label: "Lato", group: "Modern Sans-Serif", css: 'Lato, Arial, sans-serif' },
  { key: "nunito", label: "Nunito", group: "Modern Sans-Serif", css: 'Nunito, Arial, sans-serif' },
  { key: "nunito-sans", label: "Nunito Sans", group: "Modern Sans-Serif", css: '"Nunito Sans", Arial, sans-serif' },
  { key: "dejavu-sans", label: "DejaVu Sans", group: "Modern Sans-Serif", css: '"DejaVu Sans", sans-serif' },
  { key: "dejavu-sans-condensed", label: "DejaVu Sans Condensed", group: "Modern Sans-Serif", css: '"DejaVu Sans Condensed", sans-serif' },
  { key: "droid-sans", label: "Droid Sans", group: "Modern Sans-Serif", css: '"Droid Sans", sans-serif' },
  { key: "fira-sans", label: "Fira Sans", group: "Modern Sans-Serif", css: '"Fira Sans", sans-serif' },
  { key: "fira-sans-condensed", label: "Fira Sans Condensed", group: "Modern Sans-Serif", css: '"Fira Sans Condensed", sans-serif' },
  { key: "ibm-plex-sans", label: "IBM Plex Sans", group: "Modern Sans-Serif", css: '"IBM Plex Sans", sans-serif' },
  { key: "ibm-plex-sans-condensed", label: "IBM Plex Sans Condensed", group: "Modern Sans-Serif", css: '"IBM Plex Sans Condensed", sans-serif' },
  { key: "liberation-sans", label: "Liberation Sans", group: "Modern Sans-Serif", css: '"Liberation Sans", Arial, sans-serif' },
  { key: "merriweather-sans", label: "Merriweather Sans", group: "Modern Sans-Serif", css: '"Merriweather Sans", sans-serif' },
  { key: "noto-sans", label: "Noto Sans", group: "Modern Sans-Serif", css: '"Noto Sans", sans-serif' },
  { key: "pt-sans", label: "PT Sans", group: "Modern Sans-Serif", css: '"PT Sans", sans-serif' },
  { key: "quicksand", label: "Quicksand", group: "Modern Sans-Serif", css: 'Quicksand, sans-serif' },
  { key: "raleway", label: "Raleway", group: "Modern Sans-Serif", css: 'Raleway, sans-serif' },
  { key: "source-sans-3", label: "Source Sans 3", group: "Modern Sans-Serif", css: '"Source Sans 3", sans-serif' },
  { key: "ubuntu", label: "Ubuntu", group: "Modern Sans-Serif", css: 'Ubuntu, sans-serif' },
  { key: "work-sans", label: "Work Sans", group: "Modern Sans-Serif", css: '"Work Sans", sans-serif' },
  { key: "alegreya-sans", label: "Alegreya Sans", group: "Modern Sans-Serif", css: '"Alegreya Sans", sans-serif' },
  { key: "archivo", label: "Archivo", group: "Modern Sans-Serif", css: 'Archivo, sans-serif' },
  { key: "barlow", label: "Barlow", group: "Modern Sans-Serif", css: 'Barlow, sans-serif' },
  { key: "barlow-condensed", label: "Barlow Condensed", group: "Modern Sans-Serif", css: '"Barlow Condensed", sans-serif' },
  { key: "cabin", label: "Cabin", group: "Modern Sans-Serif", css: 'Cabin, sans-serif' },
  { key: "cairo", label: "Cairo", group: "Modern Sans-Serif", css: 'Cairo, sans-serif' },
  { key: "comfortaa", label: "Comfortaa", group: "Modern Sans-Serif", css: 'Comfortaa, sans-serif' },
  { key: "dm-sans", label: "DM Sans", group: "Modern Sans-Serif", css: '"DM Sans", sans-serif' },
  { key: "dosis", label: "Dosis", group: "Modern Sans-Serif", css: 'Dosis, sans-serif' },
  { key: "exo-2", label: "Exo 2", group: "Modern Sans-Serif", css: '"Exo 2", sans-serif' },
  { key: "josefin-sans", label: "Josefin Sans", group: "Modern Sans-Serif", css: '"Josefin Sans", sans-serif' },
  { key: "karla", label: "Karla", group: "Modern Sans-Serif", css: 'Karla, sans-serif' },
  { key: "lexend", label: "Lexend", group: "Modern Sans-Serif", css: 'Lexend, sans-serif' },
  { key: "manrope", label: "Manrope", group: "Modern Sans-Serif", css: 'Manrope, sans-serif' },
  { key: "mulish", label: "Mulish", group: "Modern Sans-Serif", css: 'Mulish, sans-serif' },
  { key: "outfit", label: "Outfit", group: "Modern Sans-Serif", css: 'Outfit, sans-serif' },
  { key: "rubik", label: "Rubik", group: "Modern Sans-Serif", css: 'Rubik, sans-serif' },
  { key: "space-grotesk", label: "Space Grotesk", group: "Modern Sans-Serif", css: '"Space Grotesk", sans-serif' },
  { key: "urbanist", label: "Urbanist", group: "Modern Sans-Serif", css: 'Urbanist, sans-serif' },

  // Monospace & Code
  { key: "courier", label: "Courier New", group: "Monospace & Code", css: '"Courier New", Cousine, Courier, "Liberation Mono", monospace' },
  { key: "consolas", label: "Consolas", group: "Monospace & Code", css: 'Consolas, "Courier New", monospace' },
  { key: "dejavu-sans-mono", label: "DejaVu Sans Mono", group: "Monospace & Code", css: '"DejaVu Sans Mono", monospace' },
  { key: "fira-code", label: "Fira Code", group: "Monospace & Code", css: '"Fira Code", monospace' },
  { key: "fira-mono", label: "Fira Mono", group: "Monospace & Code", css: '"Fira Mono", monospace' },
  { key: "ibm-plex-mono", label: "IBM Plex Mono", group: "Monospace & Code", css: '"IBM Plex Mono", monospace' },
  { key: "jetbrains-mono", label: "JetBrains Mono", group: "Monospace & Code", css: '"JetBrains Mono", monospace' },
  { key: "liberation-mono", label: "Liberation Mono", group: "Monospace & Code", css: '"Liberation Mono", monospace' },
  { key: "noto-sans-mono", label: "Noto Sans Mono", group: "Monospace & Code", css: '"Noto Sans Mono", monospace' },
  { key: "roboto-mono", label: "Roboto Mono", group: "Monospace & Code", css: '"Roboto Mono", monospace' },
  { key: "source-code-pro", label: "Source Code Pro", group: "Monospace & Code", css: '"Source Code Pro", monospace' },
  { key: "ubuntu-mono", label: "Ubuntu Mono", group: "Monospace & Code", css: '"Ubuntu Mono", monospace' },
  { key: "dm-mono", label: "DM Mono", group: "Monospace & Code", css: '"DM Mono", monospace' },
  { key: "inconsolata", label: "Inconsolata", group: "Monospace & Code", css: 'Inconsolata, monospace' },
  { key: "space-mono", label: "Space Mono", group: "Monospace & Code", css: '"Space Mono", monospace' },

  // Indic & Global (Noto)
  { key: "noto-sans-devanagari", label: "Noto Sans Devanagari (Hindi)", group: "Indic & Global", css: '"Noto Sans Devanagari", sans-serif' },
  { key: "noto-serif-devanagari", label: "Noto Serif Devanagari", group: "Indic & Global", css: '"Noto Serif Devanagari", serif' },
  { key: "noto-sans-bengali", label: "Noto Sans Bengali", group: "Indic & Global", css: '"Noto Sans Bengali", sans-serif' },
  { key: "noto-serif-bengali", label: "Noto Serif Bengali", group: "Indic & Global", css: '"Noto Serif Bengali", serif' },
  { key: "noto-sans-arabic", label: "Noto Sans Arabic", group: "Indic & Global", css: '"Noto Sans Arabic", sans-serif' },
  { key: "noto-naskh-arabic", label: "Noto Naskh Arabic", group: "Indic & Global", css: '"Noto Naskh Arabic", serif' },
  { key: "noto-nastaliq-urdu", label: "Noto Nastaliq Urdu", group: "Indic & Global", css: '"Noto Nastaliq Urdu", serif' },
  { key: "noto-sans-tamil", label: "Noto Sans Tamil", group: "Indic & Global", css: '"Noto Sans Tamil", sans-serif' },
  { key: "noto-sans-telugu", label: "Noto Sans Telugu", group: "Indic & Global", css: '"Noto Sans Telugu", sans-serif' },
  { key: "noto-sans-gujarati", label: "Noto Sans Gujarati", group: "Indic & Global", css: '"Noto Sans Gujarati", sans-serif' },
  { key: "noto-sans-gurmukhi", label: "Noto Sans Gurmukhi", group: "Indic & Global", css: '"Noto Sans Gurmukhi", sans-serif' },
  { key: "noto-sans-kannada", label: "Noto Sans Kannada", group: "Indic & Global", css: '"Noto Sans Kannada", sans-serif' },
  { key: "noto-sans-malayalam", label: "Noto Sans Malayalam", group: "Indic & Global", css: '"Noto Sans Malayalam", sans-serif' },

  // Display & Headlines
  { key: "oswald", label: "Oswald", group: "Display & Headlines", css: 'Oswald, sans-serif' },
  { key: "bebas-neue", label: "Bebas Neue", group: "Display & Headlines", css: '"Bebas Neue", sans-serif' },
  { key: "anton", label: "Anton", group: "Display & Headlines", css: 'Anton, sans-serif' },
  { key: "archivo-black", label: "Archivo Black", group: "Display & Headlines", css: '"Archivo Black", sans-serif' },
  { key: "bungee", label: "Bungee", group: "Display & Headlines", css: 'Bungee, cursive' },
  { key: "abril-fatface", label: "Abril Fatface", group: "Display & Headlines", css: '"Abril Fatface", cursive' },
  { key: "impact", label: "Impact", group: "Display & Headlines", css: 'Impact, Charcoal, sans-serif' },

  // Handwriting & Script
  { key: "caveat", label: "Caveat", group: "Handwriting & Script", css: 'Caveat, cursive' },
  { key: "kalam", label: "Kalam", group: "Handwriting & Script", css: 'Kalam, cursive' },
  { key: "dancing-script", label: "Dancing Script", group: "Handwriting & Script", css: '"Dancing Script", cursive' },
  { key: "pacifico", label: "Pacifico", group: "Handwriting & Script", css: 'Pacifico, cursive' },
  { key: "great-vibes", label: "Great Vibes", group: "Handwriting & Script", css: '"Great Vibes", cursive' },
  { key: "allura", label: "Allura", group: "Handwriting & Script", css: 'Allura, cursive' },
  { key: "patrick-hand", label: "Patrick Hand", group: "Handwriting & Script", css: '"Patrick Hand", cursive' },
  { key: "permanent-marker", label: "Permanent Marker", group: "Handwriting & Script", css: '"Permanent Marker", cursive' },
  { key: "indie-flower", label: "Indie Flower", group: "Handwriting & Script", css: '"Indie Flower", cursive' },
  { key: "comic-sans", label: "Comic Sans MS", group: "Handwriting & Script", css: '"Comic Sans MS", "Comic Sans", cursive' }
];

export class InlineTextEditor {
  constructor() {
    this.activeBoxEl = null;
    this.miniToolbarEl = null;
    this.moreMenuEl = null;
    this.currentSpanData = null;
    
    // Formatting state
    this.currentFont = "times-roman";
    this.currentFontSize = 14;
    this.isBold = false;
    this.isItalic = false;
    this.isUnderline = false;
    this.currentAlignment = "left";
    this.currentColorHex = "#000000";
    this.currentColorRgb = [0.0, 0.0, 0.0];
    this.currentBgColorHex = "#ffffff";
    this.currentBgColorRgb = [1.0, 1.0, 1.0];
    this.currentLetterSpacing = 0;
    this.currentOpacity = 1.0;
    this.currentAngleDeg = 0;
    this.userChangedFont = false;
    this.userChangedStyle = false;
    this.currentFitMode = "expand"; // Default to expand bounds rather than shrink font size
    this._loadedGoogleFonts = new Set();
    this._measureCache = new Map();
    this._documentFonts = [];
    this.fontDropdownEl = null;

    this._createDOM();
    this._initEvents();
  }

  get isVisible() {
    return !!(this.activeBoxEl && this.currentSpanData);
  }

  _getUnifiedFontList() {
    const merged = [...FONT_DEFINITIONS, ...(this._documentFonts || [])];
    const seen = new Set();
    const unique = [];
    for (const f of merged) {
      if (!f || !f.key || !f.label) continue;
      const norm = f.label.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (seen.has(norm) || seen.has(f.key)) continue;
      seen.add(norm);
      seen.add(f.key);
      unique.push({
        key: f.key,
        label: f.label,
        css: f.css || `"${f.label}", sans-serif`,
        isDocumentFont: !!f.isDocumentFont
      });
    }
    unique.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
    return unique;
  }

  _renderUnifiedFontList(filterQuery = "") {
    const listEl = this.fontDropdownEl?.querySelector("#mt-font-list");
    if (!listEl) return;

    const q = (filterQuery || "").trim().toLowerCase();
    const allFonts = this._getUnifiedFontList();
    const filtered = q
      ? allFonts.filter(f => f.label.toLowerCase().includes(q) || f.key.toLowerCase().includes(q))
      : allFonts;

    listEl.innerHTML = "";
    if (filtered.length === 0) {
      const empty = document.createElement("div");
      empty.style.padding = "12px 10px";
      empty.style.fontSize = "12px";
      empty.style.color = "#64748b";
      empty.style.textAlign = "center";
      empty.textContent = "No matching fonts found";
      listEl.appendChild(empty);
      return;
    }

    const isDark = document.documentElement.classList.contains("dark") ||
      document.body.classList.contains("dark-mode") ||
      document.body.dataset.theme === "dark";

    filtered.forEach(f => {
      const isSelected = f.key === this.currentFont;
      const item = document.createElement("button");
      item.type = "button";
      item.className = `unified-font-item${isSelected ? " selected" : ""}`;
      item.dataset.fontKey = f.key;
      item.style.cssText = `
        width: 100%;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 7px 10px;
        border: none;
        border-radius: 6px;
        background: ${isSelected ? (isDark ? "rgba(37, 99, 235, 0.25)" : "#eff6ff") : "transparent"};
        color: ${isDark ? "#f1f5f9" : "#0f172a"};
        font-size: 13px;
        text-align: left;
        cursor: pointer;
        transition: background 0.12s ease;
      `;

      const check = document.createElement("span");
      check.textContent = isSelected ? "✓" : "";
      check.style.cssText = "width: 14px; font-weight: 800; color: #2563eb; flex-shrink: 0; font-size: 13px;";

      const name = document.createElement("span");
      name.textContent = f.label;
      name.style.cssText = `flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: ${f.css}; font-weight: ${isSelected ? "700" : "500"};`;

      item.appendChild(check);
      item.appendChild(name);

      item.addEventListener("mouseenter", () => {
        if (!isSelected) item.style.background = isDark ? "rgba(255,255,255,0.08)" : "#f1f5f9";
      });
      item.addEventListener("mouseleave", () => {
        if (!isSelected) item.style.background = "transparent";
      });
      item.addEventListener("click", (e) => {
        e.stopPropagation();
        this._setSelectedFont(f.key);
        this.userChangedFont = true;
        this.userChangedStyle = true;
        this._closeFontDropdown();
        this._updateFontStatusBadge();
        this._updateEditableStyle();
        this._checkTextOverflow();
      });

      listEl.appendChild(item);
    });
  }

  _setSelectedFont(fontKey) {
    this.currentFont = fontKey;
    const allFonts = this._getUnifiedFontList();
    const match = allFonts.find(f => f.key === fontKey);
    const labelEl = this.miniToolbarEl?.querySelector("#mt-font-trigger-label");
    if (labelEl) {
      labelEl.textContent = match ? match.label : fontKey;
    }
  }

  _openFontDropdown() {
    if (!this.fontDropdownEl || !this.miniToolbarEl) return;
    const trigger = this.miniToolbarEl.querySelector("#mt-font-trigger");
    if (!trigger) return;

    const isDark = document.documentElement.classList.contains("dark") ||
      document.body.classList.contains("dark-mode") ||
      document.body.dataset.theme === "dark";

    this.fontDropdownEl.style.background = isDark ? "#0f172a" : "#ffffff";
    this.fontDropdownEl.style.borderColor = isDark ? "rgba(255,255,255,0.14)" : "#cbd5e1";

    const searchInput = this.fontDropdownEl.querySelector("#mt-font-search");
    if (searchInput) {
      searchInput.value = "";
      searchInput.style.background = isDark ? "#1e293b" : "#f8fafc";
      searchInput.style.color = isDark ? "#f8fafc" : "#0f172a";
      searchInput.style.borderColor = isDark ? "rgba(255,255,255,0.14)" : "#cbd5e1";
    }

    this._renderUnifiedFontList("");

    const rect = trigger.getBoundingClientRect();
    this.fontDropdownEl.style.display = "flex";
    this.fontDropdownEl.style.left = `${Math.max(8, Math.min(window.innerWidth - 252, rect.left))}px`;
    this.fontDropdownEl.style.top = `${Math.min(window.innerHeight - 310, rect.bottom + 6)}px`;

    const selectedItem = this.fontDropdownEl.querySelector(".unified-font-item.selected");
    if (selectedItem) {
      requestAnimationFrame(() => {
        selectedItem.scrollIntoView({ block: "nearest", behavior: "smooth" });
      });
    }
    setTimeout(() => searchInput?.focus(), 20);
  }

  _closeFontDropdown() {
    if (this.fontDropdownEl) {
      this.fontDropdownEl.style.display = "none";
    }
  }

  _createDOM() {
    // 1. Floating Mini-Toolbar
    this.miniToolbarEl = document.createElement("div");
    this.miniToolbarEl.className = "floating-mini-toolbar";
    this.miniToolbarEl.style.display = "none";

    this.miniToolbarEl.innerHTML = `
      <!-- Drag Handle -->
      <div class="mini-btn drag-handle" id="mt-drag-btn" title="Drag toolbar / text box" style="cursor: move; padding: 0 4px; height: 26px; display: flex; align-items: center; justify-content: center; color: #64748b;">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="9" cy="5" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="9" cy="19" r="1.5"/><circle cx="15" cy="5" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="15" cy="19" r="1.5"/></svg>
      </div>

      <!-- Commit OK Button -->
      <button type="button" class="mini-btn ok-btn" id="mt-ok-btn" title="Confirm and apply edit (Enter)">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
        <span>OK</span>
      </button>

      <div class="mini-separator"></div>

      <!-- Unified A-Z Searchable Font Trigger (No Categories) -->
      <button type="button" class="mini-select" id="mt-font-trigger" title="Select Font Family" style="max-width: 118px; height: 26px; font-size: 11.5px; padding: 0 6px; display: inline-flex; align-items: center; justify-content: space-between; gap: 4px; cursor: pointer;">
        <span id="mt-font-trigger-label" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">Times New Roman</span>
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="flex-shrink:0;"><polyline points="6 9 12 15 18 9"/></svg>
      </button>

      <!-- Font Size Input -->
      <input type="number" class="mini-size-input" id="mt-font-size" value="12" min="4" max="144" step="0.5" title="Font Size (pt)" style="width: 38px; height: 26px; font-size: 11.5px; text-align: center; padding: 0 2px;">

      <!-- Style Dropdown (B with dropdown arrow, opens B / I / U popover) -->
      <div style="position: relative;" id="mt-style-dropdown-wrap">
        <button type="button" class="mini-btn" id="mt-style-btn" title="Style (B / I / U)" style="padding: 0 6px; height: 26px; font-weight: 700; font-size: 11px; display: flex; align-items: center; gap: 3px;">
          <span>B</span>
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="6 9 12 15 18 9"/></svg>
        </button>

        <!-- Style Popover Dropdown -->
        <div id="mt-style-popover" style="display: none; position: absolute; top: calc(100% + 4px); left: 0; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; box-shadow: 0 4px 14px rgba(0,0,0,0.18); padding: 4px; gap: 4px; z-index: 1200; flex-direction: row; align-items: center;">
          <button type="button" class="mini-btn" id="mt-bold-btn" title="Bold" style="font-weight: 800; font-family: serif; width: 28px; height: 28px; border-radius: 4px;">B</button>
          <button type="button" class="mini-btn" id="mt-italic-btn" title="Italic" style="font-style: italic; font-family: serif; width: 28px; height: 28px; border-radius: 4px;">I</button>
          <button type="button" class="mini-btn" id="mt-underline-btn" title="Underline" style="text-decoration: underline; width: 28px; height: 28px; border-radius: 4px;">U</button>
        </div>
      </div>

      <div class="mini-separator"></div>

      <!-- Text Color Picker -->
      <div style="display: flex; align-items: center; position: relative;">
        <input type="color" id="mt-color-picker" class="mini-color-picker" value="#000000" title="Text Color" style="width: 22px; height: 22px; border-radius: 50%; border: 1px solid #cbd5e1; cursor: pointer;">
      </div>

      <!-- Delete Button -->
      <button type="button" class="mini-btn delete-btn" id="mt-delete-btn" title="Delete text" style="height: 26px; padding: 0 6px;">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
      </button>

      <!-- More Options Button -->
      <button type="button" class="mini-btn" id="mt-more-btn" title="More formatting options" style="height: 26px; padding: 0 6px;">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
      </button>
      <span id="mt-overflow-pill" style="display: none; font-size: 10px; font-weight: 700; color: #b45309; background: #fef3c7; border: 1px solid #f59e0b; border-radius: 4px; padding: 1px 5px; cursor: pointer;" title="Replacement text exceeds available width. Click to scale down.">⚠ Fit</span>
    `;

    // 2. More Options Dropdown Menu
    this.moreMenuEl = document.createElement("div");
    this.moreMenuEl.className = "floating-mini-toolbar";
    this.moreMenuEl.style.display = "none";
    this.moreMenuEl.style.height = "auto";
    this.moreMenuEl.style.padding = "8px 10px";
    this.moreMenuEl.style.flexDirection = "column";
    this.moreMenuEl.style.alignItems = "stretch";
    this.moreMenuEl.style.gap = "8px";
    this.moreMenuEl.style.zIndex = "105";

    this.moreMenuEl.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
        <span style="font-size: 11px; color: #64748b; font-weight: 600;">Alignment:</span>
        <div style="display: flex; gap: 2px;">
          <button type="button" class="mini-btn" id="mt-align-left" title="Align Left">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/></svg>
          </button>
          <button type="button" class="mini-btn" id="mt-align-center" title="Center">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="10" x2="6" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="18" y1="14" x2="6" y2="14"/><line x1="21" y1="18" x2="3" y2="18"/></svg>
          </button>
          <button type="button" class="mini-btn" id="mt-align-right" title="Align Right">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="21" y1="10" x2="7" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="7" y2="14"/><line x1="21" y1="18" x2="3" y2="18"/></svg>
          </button>
        </div>
      </div>
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
        <span style="font-size: 11px; color: #64748b; font-weight: 600;">Fit Mode:</span>
        <select class="mini-select" id="mt-fit-select" style="font-size: 11px; height: 24px;">
          <option value="expand" selected>Expand Bounds</option>
          <option value="scale_down">Scale Font Down</option>
          <option value="exact">Exact BBox</option>
        </select>
      </div>
      <div id="mt-font-status" style="font-size: 10.5px; color: #334155; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 4px 6px; line-height: 1.3;"></div>
    `;

    document.body.appendChild(this.miniToolbarEl);
    document.body.appendChild(this.moreMenuEl);

    // 3. Unified Searchable A-Z Font Picker Popover (No Categories)
    this.fontDropdownEl = document.createElement("div");
    this.fontDropdownEl.id = "mt-font-dropdown";
    this.fontDropdownEl.style.cssText = `
      display: none;
      position: fixed;
      width: 244px;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      box-shadow: 0 10px 28px rgba(15, 23, 42, 0.2);
      padding: 8px;
      flex-direction: column;
      gap: 6px;
      z-index: 1300;
    `;
    this.fontDropdownEl.innerHTML = `
      <input type="search" id="mt-font-search" placeholder="Search fonts..." autocomplete="off" spellcheck="false" style="width: 100%; box-sizing: border-box; padding: 6px 9px; border-radius: 7px; border: 1px solid #cbd5e1; font-size: 12.5px; outline: none;" />
      <div id="mt-font-list" style="max-height: 240px; overflow-y: auto; scroll-behavior: smooth; display: flex; flex-direction: column; gap: 2px;"></div>
    `;
    this.fontDropdownEl.addEventListener("click", (e) => e.stopPropagation());
    this.fontDropdownEl.addEventListener("pointerdown", (e) => e.stopPropagation());
    document.body.appendChild(this.fontDropdownEl);

    this._bindMiniToolbarEvents();
  }

  _bindMiniToolbarEvents() {
    this.miniToolbarEl.querySelector("#mt-ok-btn")?.addEventListener("click", () => this.applyEdit());
    this.miniToolbarEl.querySelector("#mt-delete-btn")?.addEventListener("click", () => this.applyDelete());

    // Style Dropdown (B with popover dropdown for B / I / U)
    const styleBtn = this.miniToolbarEl.querySelector("#mt-style-btn");
    const stylePopover = this.miniToolbarEl.querySelector("#mt-style-popover");
    if (styleBtn && stylePopover) {
      const togglePopover = (e) => {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
        const isShown = stylePopover.style.display === "flex";
        stylePopover.style.display = isShown ? "none" : "flex";
        if (this.moreMenuEl) this.moreMenuEl.style.display = "none";
      };

      styleBtn.addEventListener("click", togglePopover);
      styleBtn.addEventListener("touchend", (e) => {
        e.stopPropagation();
        togglePopover(e);
      });

      // Prevent clicks/taps inside the popover from dismissing it
      stylePopover.addEventListener("click", (e) => e.stopPropagation());
      stylePopover.addEventListener("touchend", (e) => e.stopPropagation());

      // Dismiss popover when clicking/tapping outside
      const outsideDismiss = (e) => {
        if (!stylePopover.contains(e.target) && !styleBtn.contains(e.target)) {
          stylePopover.style.display = "none";
        }
      };
      document.addEventListener("click", outsideDismiss);
      document.addEventListener("touchend", outsideDismiss);
    }

    const updateStyleBtnState = () => {
      if (!styleBtn) return;
      const hasStyle = this.isBold || this.isItalic || this.isUnderline;
      styleBtn.style.color = hasStyle ? "#2563eb" : "#334155";
      styleBtn.style.background = hasStyle ? "#eff6ff" : "transparent";
    };

    // Bold / Italic / Underline inside dropdown
    const boldBtn = this.miniToolbarEl.querySelector("#mt-bold-btn");
    boldBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.isBold = !this.isBold;
      this.userChangedStyle = true;
      boldBtn.classList.toggle("active", this.isBold);
      updateStyleBtnState();
      this._updateEditableStyle();
    });

    const italicBtn = this.miniToolbarEl.querySelector("#mt-italic-btn");
    italicBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.isItalic = !this.isItalic;
      this.userChangedStyle = true;
      italicBtn.classList.toggle("active", this.isItalic);
      updateStyleBtnState();
      this._updateEditableStyle();
    });

    const underlineBtn = this.miniToolbarEl.querySelector("#mt-underline-btn");
    underlineBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.isUnderline = !this.isUnderline;
      this.userChangedStyle = true;
      underlineBtn.classList.toggle("active", this.isUnderline);
      updateStyleBtnState();
      this._updateEditableStyle();
    });

    // Unified Searchable Font Picker Trigger & Search Input
    const fontTrigger = this.miniToolbarEl.querySelector("#mt-font-trigger");
    fontTrigger?.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = this.fontDropdownEl?.style.display === "flex";
      if (isOpen) {
        this._closeFontDropdown();
      } else {
        this._openFontDropdown();
      }
    });

    const fontSearch = this.fontDropdownEl?.querySelector("#mt-font-search");
    fontSearch?.addEventListener("input", (e) => {
      this._renderUnifiedFontList(e.target.value);
    });

    document.addEventListener("click", (e) => {
      if (this.fontDropdownEl && this.fontDropdownEl.style.display === "flex") {
        if (!this.fontDropdownEl.contains(e.target) && e.target !== fontTrigger && !fontTrigger?.contains(e.target)) {
          this._closeFontDropdown();
        }
      }
    });

    // Font Size
    const sizeInput = this.miniToolbarEl.querySelector("#mt-font-size");
    sizeInput?.addEventListener("input", (e) => {
      this.currentFontSize = parseFloat(e.target.value) || 12;
      this.userChangedStyle = true;
      this._updateEditableStyle();
      this._checkTextOverflow();
    });

    // Text Color
    const colorPicker = this.miniToolbarEl.querySelector("#mt-color-picker");
    colorPicker?.addEventListener("input", (e) => {
      this.currentColorHex = e.target.value;
      this.currentColorRgb = this._hexToRgbArray(e.target.value);
      this.userChangedStyle = true;
      this._updateEditableStyle();
    });

    // Overflow "Fit" quick-action pill
    const overflowPill = this.miniToolbarEl.querySelector("#mt-overflow-pill");
    overflowPill?.addEventListener("click", (e) => {
      e.stopPropagation();
      this._fitFontSizeToAvailableWidth();
    });

    // More Options Menu Toggle
    const moreBtn = this.miniToolbarEl.querySelector("#mt-more-btn");
    moreBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      const isVisible = this.moreMenuEl.style.display === "flex";
      this.moreMenuEl.style.display = isVisible ? "none" : "flex";
      if (stylePopover) stylePopover.style.display = "none";
      if (!isVisible) {
        const rect = moreBtn.getBoundingClientRect();
        this.moreMenuEl.style.top = `${rect.bottom + 6}px`;
        this.moreMenuEl.style.left = `${Math.min(window.innerWidth - 220, rect.left - 100)}px`;
      }
    });

    // Alignments in More Menu
    const alignL = this.moreMenuEl.querySelector("#mt-align-left");
    const alignC = this.moreMenuEl.querySelector("#mt-align-center");
    const alignR = this.moreMenuEl.querySelector("#mt-align-right");

    alignL?.addEventListener("click", () => this._setAlignment("left"));
    alignC?.addEventListener("click", () => this._setAlignment("center"));
    alignR?.addEventListener("click", () => this._setAlignment("right"));

    this.moreMenuEl.querySelector("#mt-fit-select")?.addEventListener("change", (e) => {
      this.currentFitMode = e.target.value;
    });

    // Drag to move in-place box
    this._bindDragHandler();

    // Close more menu when clicking outside
    document.addEventListener("click", (e) => {
      if (!this.moreMenuEl.contains(e.target) && e.target !== moreBtn) {
        this.moreMenuEl.style.display = "none";
      }
    });
  }

  _bindDragHandler() {
    const dragBtn = this.miniToolbarEl?.querySelector("#mt-drag-btn");
    if (!dragBtn) return;
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let origLeft = 0;
    let origTop = 0;

    const startDrag = (clientX, clientY) => {
      if (!this.activeBoxEl) return;
      isDragging = true;
      startX = clientX;
      startY = clientY;
      origLeft = parseFloat(this.activeBoxEl.style.left) || 0;
      origTop = parseFloat(this.activeBoxEl.style.top) || 0;
    };

    const doDrag = (clientX, clientY) => {
      if (!isDragging || !this.activeBoxEl) return;
      const dx = clientX - startX;
      const dy = clientY - startY;
      this.activeBoxEl.style.left = `${origLeft + dx}px`;
      this.activeBoxEl.style.top = `${origTop + dy}px`;
      this._positionMiniToolbar(this.activeBoxEl);
    };

    const stopDrag = () => {
      if (isDragging) isDragging = false;
    };

    dragBtn.addEventListener("mousedown", (e) => {
      e.preventDefault();
      startDrag(e.clientX, e.clientY);
    });
    window.addEventListener("mousemove", (e) => doDrag(e.clientX, e.clientY));
    window.addEventListener("mouseup", stopDrag);

    // Mobile touch support
    dragBtn.addEventListener("touchstart", (e) => {
      if (e.touches.length === 1) {
        startDrag(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });
    window.addEventListener("touchmove", (e) => {
      if (isDragging && e.touches.length === 1) {
        doDrag(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });
    window.addEventListener("touchend", stopDrag);
    window.addEventListener("touchcancel", stopDrag);
  }

  _setAlignment(alignment) {
    this.currentAlignment = alignment;
    this.moreMenuEl.querySelector("#mt-align-left")?.classList.toggle("active", alignment === "left");
    this.moreMenuEl.querySelector("#mt-align-center")?.classList.toggle("active", alignment === "center");
    this.moreMenuEl.querySelector("#mt-align-right")?.classList.toggle("active", alignment === "right");
    this._updateEditableStyle();
  }

  populateDocumentFonts(detectedFonts) {
    this._documentFonts = [];
    if (!detectedFonts || detectedFonts.length === 0) return;

    const unique = [...new Set(detectedFonts)];
    unique.forEach(f => {
      const clean = (f || "").replace(/^[A-Za-z0-9]{6}\+/, "").trim();
      if (!clean) return;
      this._documentFonts.push({
        key: clean,
        label: clean,
        css: `"${clean}", sans-serif`,
        isDocumentFont: true
      });
    });
  }

  _detectAndSelectFont(fontName, flags = 0) {
    const clean = (fontName || "").replace(/^[A-Za-z0-9]{6}\+/, "").trim();
    // Normalize string: strip all non-alphanumeric chars
    const normClean = clean.toLowerCase().replace(/[^a-z0-9]/g, "");

    const isSerif = (flags & 4) !== 0 || /times|roman|tmsrmn|serif|cambria|georgia|garamond|baskerville|palatino|minion|century|bookman|lora|merriweather|nimbusrom|freeserif|liberationserif|tinos/.test(normClean);
    const isMono = (flags & 8) !== 0 || /courier|mono|consolas|code|typewriter|menlo|fira|jetbrains/.test(normClean);

    let matchedKey = "";

    // 1. Direct fast-path: Times New Roman & common Serif font aliases
    if (/times|roman|tmsrmn|nimbusrom|tinos|liberationserif|freeserif/.test(normClean)) {
      matchedKey = "times-roman";
    }

    // 2. Check normalized label or key containment
    if (!matchedKey) {
      const sortedDefs = [...FONT_DEFINITIONS].sort((a, b) => {
        const aNorm = a.label.toLowerCase().replace(/[^a-z0-9]/g, "").length;
        const bNorm = b.label.toLowerCase().replace(/[^a-z0-9]/g, "").length;
        return bNorm - aNorm;
      });

      for (const def of sortedDefs) {
        const defKeyNorm = def.key.toLowerCase().replace(/[^a-z0-9]/g, "");
        const defLabelNorm = def.label.toLowerCase().replace(/[^a-z0-9]/g, "");

        if (normClean === defKeyNorm || normClean === defLabelNorm ||
            normClean.includes(defKeyNorm) || normClean.includes(defLabelNorm)) {
          matchedKey = def.key;
          break;
        }
      }
    }

    // 3. Comprehensive pattern & alias fallbacks
    if (!matchedKey) {
      if (/times|roman|tmsrmn/.test(normClean)) matchedKey = "times-roman";
      else if (/calibri|carlito/.test(normClean)) matchedKey = "calibri";
      else if (/caladea/.test(normClean)) matchedKey = "caladea";
      else if (/calisto/.test(normClean)) matchedKey = "calisto-mt";
      else if (/cambriamath/.test(normClean)) matchedKey = "cambria-math";
      else if (/cambria/.test(normClean)) matchedKey = "cambria";
      else if (/charter/.test(normClean)) matchedKey = "charter";
      else if (/computermodern|latinmodern/.test(normClean)) matchedKey = "computer-modern";
      else if (/constantia/.test(normClean)) matchedKey = "constantia";
      else if (/consolas/.test(normClean)) matchedKey = "consolas";
      else if (/courier/.test(normClean)) matchedKey = "courier";
      else if (/dejavusanscondensed/.test(normClean)) matchedKey = "dejavu-sans-condensed";
      else if (/dejavusansmono/.test(normClean)) matchedKey = "dejavu-sans-mono";
      else if (/dejavuserif/.test(normClean)) matchedKey = "dejavu-serif";
      else if (/dejavusans|dejavu/.test(normClean)) matchedKey = "dejavu-sans";
      else if (/droidserif/.test(normClean)) matchedKey = "droid-serif";
      else if (/droidsans/.test(normClean)) matchedKey = "droid-sans";
      else if (/firacode/.test(normClean)) matchedKey = "fira-code";
      else if (/firamono/.test(normClean)) matchedKey = "fira-mono";
      else if (/firasanscondensed/.test(normClean)) matchedKey = "fira-sans-condensed";
      else if (/firasans/.test(normClean)) matchedKey = "fira-sans";
      else if (/fontin/.test(normClean)) matchedKey = "fontin";
      else if (/frankruhl/.test(normClean)) matchedKey = "frank-ruhl-libre";
      else if (/gentium/.test(normClean)) matchedKey = "gentium-plus";
      else if (/ibmplexmono/.test(normClean)) matchedKey = "ibm-plex-mono";
      else if (/ibmplexserif/.test(normClean)) matchedKey = "ibm-plex-serif";
      else if (/ibmplex/.test(normClean)) matchedKey = "ibm-plex-sans";
      else if (/jetbrains/.test(normClean)) matchedKey = "jetbrains-mono";
      else if (/liberationmono/.test(normClean)) matchedKey = "liberation-mono";
      else if (/liberationserif/.test(normClean)) matchedKey = "liberation-serif";
      else if (/liberationsans/.test(normClean)) matchedKey = "liberation-sans";
      else if (/libera/.test(normClean)) matchedKey = "libera";
      else if (/linuxlibertine/.test(normClean)) matchedKey = "linux-libertine";
      else if (/lora/.test(normClean)) matchedKey = "lora";
      else if (/merriweathersans/.test(normClean)) matchedKey = "merriweather-sans";
      else if (/merriweather/.test(normClean)) matchedKey = "merriweather";
      else if (/montserrat/.test(normClean)) matchedKey = "montserrat";
      else if (/notosansmono/.test(normClean)) matchedKey = "noto-sans-mono";
      else if (/notosansdevanagari/.test(normClean)) matchedKey = "noto-sans-devanagari";
      else if (/notoserifdevanagari/.test(normClean)) matchedKey = "noto-serif-devanagari";
      else if (/notosansbengali/.test(normClean)) matchedKey = "noto-sans-bengali";
      else if (/notoserifbengali/.test(normClean)) matchedKey = "noto-serif-bengali";
      else if (/notosansarabic/.test(normClean)) matchedKey = "noto-sans-arabic";
      else if (/notonaskharabic/.test(normClean)) matchedKey = "noto-naskh-arabic";
      else if (/notonastaliq/.test(normClean)) matchedKey = "noto-nastaliq-urdu";
      else if (/notosanstamil/.test(normClean)) matchedKey = "noto-sans-tamil";
      else if (/notosanstelugu/.test(normClean)) matchedKey = "noto-sans-telugu";
      else if (/notosansgujarati/.test(normClean)) matchedKey = "noto-sans-gujarati";
      else if (/notosansgurmukhi/.test(normClean)) matchedKey = "noto-sans-gurmukhi";
      else if (/notosanskannada/.test(normClean)) matchedKey = "noto-sans-kannada";
      else if (/notosansmalayalam/.test(normClean)) matchedKey = "noto-sans-malayalam";
      else if (/notoserif/.test(normClean)) matchedKey = "noto-serif";
      else if (/notosans/.test(normClean)) matchedKey = "noto-sans";
      else if (/nunitosans/.test(normClean)) matchedKey = "nunito-sans";
      else if (/nunito/.test(normClean)) matchedKey = "nunito";
      else if (/opensans/.test(normClean)) matchedKey = "open-sans";
      else if (/oswald/.test(normClean)) matchedKey = "oswald";
      else if (/pacifico/.test(normClean)) matchedKey = "pacifico";
      else if (/poppins/.test(normClean)) matchedKey = "poppins";
      else if (/ptsans/.test(normClean)) matchedKey = "pt-sans";
      else if (/ptserif/.test(normClean)) matchedKey = "pt-serif";
      else if (/playfair/.test(normClean)) matchedKey = "playfair-display";
      else if (/arial|helv/.test(normClean)) matchedKey = "arial";
      else if (/georgia/.test(normClean)) matchedKey = "georgia";
      else if (/garamond/.test(normClean)) matchedKey = "garamond";
      else if (/palatino/.test(normClean)) matchedKey = "palatino";
      else if (/verdana/.test(normClean)) matchedKey = "verdana";
      else if (/tahoma/.test(normClean)) matchedKey = "tahoma";
      else if (/trebuchet/.test(normClean)) matchedKey = "trebuchet";
      else if (/centurygothic|gothic/.test(normClean)) matchedKey = "century-gothic";
      else if (/inter/.test(normClean)) matchedKey = "inter";
      else if (/roboto/.test(normClean)) matchedKey = "roboto";
      else if (/lato/.test(normClean)) matchedKey = "lato";
      else if (isMono) matchedKey = "courier";
      else if (isSerif) matchedKey = "times-roman";
      else {
        // If document uses serif fonts, prefer Times New Roman for ambiguous text
        const docFonts = State.documentInfo?.detected_fonts || [];
        const hasSerifInDoc = docFonts.some(f => /times|roman|serif|georgia|cambria|tinos/i.test(f));
        matchedKey = hasSerifInDoc ? "times-roman" : "arial";
      }
    }

    const unified = this._getUnifiedFontList();
    const existsInUnified = unified.some(f => f.key === matchedKey);
    if (!existsInUnified && clean) {
      this._documentFonts.push({
        key: clean,
        label: clean,
        css: `"${clean}", sans-serif`,
        isDocumentFont: true
      });
      matchedKey = clean;
    }

    this._setSelectedFont(matchedKey);
    return matchedKey;
  }

  _getCssFontFamily(fontKey) {
    if (fontKey === "times-roman" || /times|roman|tinos/i.test(fontKey)) {
      return '"Times New Roman", Tinos, Times, "Liberation Serif", "Nimbus Roman No9 L", serif';
    }
    const found = FONT_DEFINITIONS.find(f => f.key === fontKey);
    if (found) return found.css;
    return `"${fontKey}", Arimo, Arial, sans-serif`;
  }

  _getSpanCssFontFamily(fontKey, loadedFontName, userChangedFont) {
    const baseCss = this._getCssFontFamily(fontKey);
    if (!userChangedFont && loadedFontName) {
      return `"${loadedFontName}", ${baseCss}`;
    }
    return baseCss;
  }

  _ensureGoogleFontLoaded(fontKey) {
    const GOOGLE_FONT_MAP = {
      "roboto": "Roboto:ital,wght@0,400;0,700;1,400;1,700",
      "roboto-condensed": "Roboto+Condensed:ital,wght@0,400;0,700;1,400;1,700",
      "roboto-slab": "Roboto+Slab:wght@400;700",
      "roboto-mono": "Roboto+Mono:ital,wght@0,400;0,700;1,400;1,700",
      "open-sans": "Open+Sans:ital,wght@0,400;0,700;1,400;1,700",
      "lato": "Lato:ital,wght@0,400;0,700;1,400;1,700",
      "poppins": "Poppins:ital,wght@0,400;0,700;1,400;1,700",
      "montserrat": "Montserrat:ital,wght@0,400;0,700;1,400;1,700",
      "merriweather": "Merriweather:ital,wght@0,400;0,700;1,400;1,700",
      "merriweather-sans": "Merriweather+Sans:ital,wght@0,400;0,700;1,400;1,700",
      "lora": "Lora:ital,wght@0,400;0,700;1,400;1,700",
      "pt-sans": "PT+Sans:ital,wght@0,400;0,700;1,400;1,700",
      "pt-serif": "PT+Serif:ital,wght@0,400;0,700;1,400;1,700",
      "source-sans-3": "Source+Sans+3:ital,wght@0,400;0,700;1,400;1,700",
      "source-serif-4": "Source+Serif+4:ital,wght@0,400;0,700;1,400;1,700",
      "source-code-pro": "Source+Code+Pro:wght@400;700",
      "ibm-plex-sans": "IBM+Plex+Sans:ital,wght@0,400;0,700;1,400;1,700",
      "ibm-plex-serif": "IBM+Plex+Serif:ital,wght@0,400;0,700;1,400;1,700",
      "ibm-plex-mono": "IBM+Plex+Mono:wght@400;700",
      "noto-sans": "Noto+Sans:ital,wght@0,400;0,700;1,400;1,700",
      "noto-serif": "Noto+Serif:ital,wght@0,400;0,700;1,400;1,700",
      "noto-sans-devanagari": "Noto+Sans+Devanagari:wght@400;700",
      "noto-serif-devanagari": "Noto+Serif+Devanagari:wght@400;700",
      "noto-sans-bengali": "Noto+Sans+Bengali:wght@400;700",
      "noto-sans-arabic": "Noto+Sans+Arabic:wght@400;700",
      "nunito": "Nunito:ital,wght@0,400;0,700;1,400;1,700",
      "nunito-sans": "Nunito+Sans:ital,wght@0,400;0,700;1,400;1,700",
      "raleway": "Raleway:ital,wght@0,400;0,700;1,400;1,700",
      "ubuntu": "Ubuntu:ital,wght@0,400;0,700;1,400;1,700",
      "work-sans": "Work+Sans:ital,wght@0,400;0,700;1,400;1,700",
      "dm-sans": "DM+Sans:ital,wght@0,400;0,700;1,400;1,700",
      "rubik": "Rubik:ital,wght@0,400;0,700;1,400;1,700",
      "oswald": "Oswald:wght@400;700",
      "playfair-display": "Playfair+Display:ital,wght@0,400;0,700;1,400;1,700",
      "garamond": "EB+Garamond:ital,wght@0,400;0,700;1,400;1,700",
      "fira-sans": "Fira+Sans:ital,wght@0,400;0,700;1,400;1,700",
      "fira-code": "Fira+Code:wght@400;700",
      "manrope": "Manrope:wght@400;700",
      "mulish": "Mulish:ital,wght@0,400;0,700;1,400;1,700",
      "outfit": "Outfit:wght@400;700",
      "quicksand": "Quicksand:wght@400;700",
      "karla": "Karla:ital,wght@0,400;0,700;1,400;1,700",
      "barlow": "Barlow:ital,wght@0,400;0,700;1,400;1,700"
    };

    const spec = GOOGLE_FONT_MAP[fontKey];
    if (!spec || this._loadedGoogleFonts.has(fontKey)) return;
    this._loadedGoogleFonts.add(fontKey);

    try {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = `https://fonts.googleapis.com/css2?family=${spec}&display=swap`;
      document.head.appendChild(link);
    } catch (_) {}
  }

  _calibrateLetterSpacing(span) {
    try {
      const text = span.original_text || span.text || "";
      if (!text || text.length < 3) return 0;
      const targetWidth = (span.bbox[2] - span.bbox[0]);
      if (!targetWidth || targetWidth < 10) return 0;

      const c = document.createElement("canvas");
      const ctx = c.getContext("2d");
      const wt = this.isBold ? "bold" : "normal";
      const st = this.isItalic ? "italic" : "normal";
      ctx.font = `${st} ${wt} ${this.currentFontSize}px ${this._getCssFontFamily(this.currentFont)}`;
      const measured = ctx.measureText(text).width;
      if (!measured || measured < 5) return 0;

      const ratio = targetWidth / measured;
      // Only calibrate subtle metric differences (within ±16%)
      if (ratio >= 0.84 && ratio <= 1.16) {
        const diffPerChar = (targetWidth - measured) / Math.max(1, text.length - 1);
        return Math.max(-0.6, Math.min(1.2, Math.round(diffPerChar * 100) / 100));
      }
      return 0;
    } catch (_) {
      return 0;
    }
  }

  _updateEditableStyle() {
    if (!this.activeBoxEl) return;
    const editableDiv = this.activeBoxEl.querySelector(".inplace-text-editable");
    if (!editableDiv) return;

    const scale = State.zoomScale;
    this._ensureGoogleFontLoaded(this.currentFont);
    this.activeBoxEl.style.backgroundImage = "none";
    this.activeBoxEl.style.backgroundColor = "rgba(37, 99, 235, 0.06)";
    const loadedFont = this.currentSpanData?.span?.loadedFontName;
    editableDiv.style.fontFamily = this._getSpanCssFontFamily(this.currentFont, loadedFont, this.userChangedFont);
    editableDiv.style.fontSize = `${this.currentFontSize * scale}px`;
    editableDiv.style.fontWeight = this.isBold ? "bold" : "normal";
    editableDiv.style.fontStyle = this.isItalic ? "italic" : "normal";
    editableDiv.style.textDecoration = this.isUnderline ? "underline" : "none";
    editableDiv.style.color = this.currentColorHex;
    editableDiv.style.textAlign = this.currentAlignment;
    editableDiv.style.letterSpacing = this.currentLetterSpacing ? `${this.currentLetterSpacing * scale}px` : "normal";
  }

  _initEvents() {
    State.subscribe("spanSelected", (selectedData) => {
      if (State.activeTool === "edit-text" || State.activeTool === "select") {
        this.openForSpan(selectedData);
      } else if (State.activeTool === "redact") {
        this.quickRedactSpan(selectedData, false);
      } else if (State.activeTool === "whiteout") {
        this.quickRedactSpan(selectedData, true);
      }
    });

    State.subscribe("documentLoaded", (docInfo) => {
      this.populateDocumentFonts(docInfo.detected_fonts || []);
    });

    State.subscribe("documentReset", () => {
      this.hide();
    });

    State.subscribe("pageRendered", ({ pageIndex }) => {
      this.reRenderPageEdits(pageIndex);
    });

    State.subscribe("zoomChanged", () => {
      if (this.activeBoxEl && this.currentSpanData) {
        const { pageIndex, span } = this.currentSpanData;
        const textToShow = span.currentText !== undefined ? span.currentText : span.text;
        this._buildInPlaceBox(pageIndex, span, span._origHighlightEl, textToShow);
      }
      for (let p = 0; p < State.pageCount; p++) {
        this.reRenderPageEdits(p);
      }
    });

    // Close active editor when clicking outside on the viewport
    document.addEventListener("click", (e) => {
      if (!this.activeBoxEl || !this.currentSpanData) return;
      // Prevent immediate mobile synthesized click from closing freshly opened editor
      if (Date.now() - (this._openedAt || 0) < 350) return;

      // Don't close if clicking on the editor box, mini toolbar, or more menu
      if (this.activeBoxEl.contains(e.target) || 
          this.miniToolbarEl.contains(e.target) || 
          this.moreMenuEl.contains(e.target)) return;
      // Don't close if clicking on a text span highlight (will open a new editor)
      if (e.target.closest(".text-span-highlight")) return;
      // Auto-apply the current edit when clicking away
      this.applyEdit();
    });
  }

  openForSpan(selectedData) {
    if (this.currentSpanData && this.activeBoxEl) {
      this.applyEdit();
    }

    this._openedAt = Date.now();
    this.currentSpanData = selectedData;
    const { pageIndex, span, element } = selectedData;
    this.userChangedFont = !!span.userChangedFont;
    this.userChangedStyle = !!span.userChangedStyle;
    this.currentOpacity = span.opacity !== undefined ? span.opacity : 1.0;
    this.currentAngleDeg = span.angleDeg || 0;

    // Use current replacement text if already edited, otherwise original text
    const textToShow = span.currentText !== undefined ? span.currentText : span.text;

    // 1. Auto-detect exact original font (prioritize real embedded font name from commonObjs!)
    const flags = span.flags || 0;
    const isSerifFlag = (flags & 4) !== 0;
    const isMonoFlag = (flags & 1) !== 0 || (flags & 8) !== 0;

    let fontToUse = span.currentFont || span.rawFontName || span.font;
    if (!fontToUse || fontToUse === "Standard Base-14" || fontToUse.toLowerCase() === "unknown") {
      if (isMonoFlag) fontToUse = "courier";
      else if (isSerifFlag) fontToUse = "times-roman";
      else fontToUse = "arial";
    }

    this._detectAndSelectFont(fontToUse, flags);
    this._ensureGoogleFontLoaded(this.currentFont);

    const fontLower = (span.rawFontName || fontToUse || "").toLowerCase();

    // 2. AUTOMATIC FONT SIZE: preserve exact numeric PDF font size without rounding
    const rawSize = span.currentFontSize !== undefined ? span.currentFontSize : (span.size || 12);
    this.currentFontSize = Number(rawSize) || 12;

    // 3. AUTOMATIC BOLD / ITALIC / UNDERLINE
    const metaBold = ((flags & 16) !== 0 || (flags & 262144) !== 0 || /bold|black|heavy|semibold|demi|extrabold|700|800|900|[-,]bd\b|[-_]b\b/.test(fontLower));
    this.isBold = span.isBold !== undefined ? span.isBold : metaBold;
    this.isItalic = span.isItalic !== undefined
      ? span.isItalic
      : ((flags & 2) !== 0 || (flags & 64) !== 0 || /italic|oblique|slant|[-,]it\b/.test(fontLower));
    this.isUnderline = span.isUnderline !== undefined ? span.isUnderline : false;

    // 4. AUTOMATIC EXACT COLOR MATCHING FROM PDF GRAPHICS STATE
    if (span.currentColorHex) {
      this.currentColorHex = span.currentColorHex;
      this.currentColorRgb = span.currentColorRgb || this._hexToRgbArray(span.currentColorHex);
    } else if (span.hasOpColor || span.color !== undefined) {
      const colorInt = span.color || 0;
      const r = (colorInt >> 16) & 255;
      const g = (colorInt >> 8) & 255;
      const b = colorInt & 255;
      this.currentColorHex = `#${[r, g, b].map(x => x.toString(16).padStart(2, "0")).join("")}`;
      this.currentColorRgb = [r / 255, g / 255, b / 255];
    } else {
      this.currentColorHex = "#000000";
      this.currentColorRgb = [0, 0, 0];
    }

    // 6. Calibrate exact horizontal letter spacing to match PDF glyph rhythm
    this.currentLetterSpacing = span.letterSpacing !== undefined
      ? span.letterSpacing
      : this._calibrateLetterSpacing(span);

    // 7. Auto-detect horizontal alignment
    if (span.currentAlignment) {
      this.currentAlignment = span.currentAlignment;
    } else {
      const pageDim = State.pageDimensions[pageIndex] || { width: 612, height: 792 };
      const distLeft = span.bbox[0];
      const distRight = pageDim.width - span.bbox[2];
      const isCentered = Math.abs(distLeft - distRight) < 35 && (span.bbox[2] - span.bbox[0]) < pageDim.width * 0.75;
      this.currentAlignment = isCentered ? "center" : "left";
    }

    // Update Mini-Toolbar controls
    this._setSelectedFont(this.currentFont);

    const sizeInput = this.miniToolbarEl.querySelector("#mt-font-size");
    if (sizeInput) {
      sizeInput.value = this.currentFontSize;
      sizeInput.step = "0.5";
    }

    this.miniToolbarEl.querySelector("#mt-bold-btn")?.classList.toggle("active", this.isBold);
    this.miniToolbarEl.querySelector("#mt-italic-btn")?.classList.toggle("active", this.isItalic);
    this.miniToolbarEl.querySelector("#mt-underline-btn")?.classList.toggle("active", this.isUnderline);
    const styleBtn = this.miniToolbarEl.querySelector("#mt-style-btn");
    if (styleBtn) {
      const hasStyle = this.isBold || this.isItalic || this.isUnderline;
      styleBtn.style.color = hasStyle ? "#2563eb" : "#334155";
      styleBtn.style.background = hasStyle ? "#eff6ff" : "transparent";
    }

    const colorPicker = this.miniToolbarEl.querySelector("#mt-color-picker");
    if (colorPicker) colorPicker.value = this.currentColorHex;
    this._setAlignment(this.currentAlignment);

    // Build In-Place Bounding Box right over the text (Word-style)
    this._buildInPlaceBox(pageIndex, span, element, textToShow);
    this._updateFontStatusBadge();
    this._checkTextOverflow();
  }

  _updateFontStatusBadge() {
    const statusEl = this.moreMenuEl?.querySelector("#mt-font-status");
    if (!statusEl || !this.currentSpanData) return;
    const { span } = this.currentSpanData;
    const origName = span.rawFontName || span.font || "Unknown";
    if (!this.userChangedFont && span.loadedFontName) {
      const subsetNote = span.isSubset ? " • Subset (fallback if missing glyphs)" : "";
      statusEl.innerHTML = `<strong style="color:#059669;">Original:</strong> ${origName} (Embedded${subsetNote})`;
    } else if (this.userChangedFont) {
      statusEl.innerHTML = `<strong style="color:#2563eb;">Custom:</strong> ${this.currentFont} (orig: ${origName})`;
    } else {
      statusEl.innerHTML = `<strong style="color:#d97706;">Fallback:</strong> ${this.currentFont} (orig: ${origName})`;
    }
  }

  _checkTextOverflow() {
    const pill = this.miniToolbarEl?.querySelector("#mt-overflow-pill");
    if (!pill || !this.activeBoxEl || !this.currentSpanData) return;
    const editableDiv = this.activeBoxEl.querySelector(".inplace-text-editable");
    if (!editableDiv) return;

    const { pageIndex, span } = this.currentSpanData;
    const pageDim = State.pageDimensions[pageIndex] || { width: 612, height: 792 };
    const text = editableDiv.innerText || "";
    const [x0] = span.bbox;
    const availW = Math.max(20, pageDim.width - x0 - 12);

    const cacheKey = `${this.currentFont}|${this.currentFontSize}|${this.isBold}|${this.isItalic}|${text}`;
    let measuredW = this._measureCache.get(cacheKey);
    if (measuredW === undefined) {
      const c = document.createElement("canvas");
      const ctx = c.getContext("2d");
      const wt = this.isBold ? "bold" : "normal";
      const st = this.isItalic ? "italic" : "normal";
      ctx.font = `${st} ${wt} ${this.currentFontSize}px ${this._getSpanCssFontFamily(this.currentFont, span.loadedFontName, this.userChangedFont)}`;
      measuredW = Math.max(...text.split("\n").map(line => ctx.measureText(line || " ").width));
      if (this._measureCache.size > 200) this._measureCache.clear();
      this._measureCache.set(cacheKey, measuredW);
    }

    if (measuredW > availW) {
      pill.style.display = "inline-block";
      this.activeBoxEl.style.borderColor = "#f59e0b";
    } else {
      pill.style.display = "none";
      this.activeBoxEl.style.borderColor = "#2563eb";
    }
  }

  _fitFontSizeToAvailableWidth() {
    if (!this.activeBoxEl || !this.currentSpanData) return;
    const editableDiv = this.activeBoxEl.querySelector(".inplace-text-editable");
    if (!editableDiv) return;
    const { pageIndex, span } = this.currentSpanData;
    const pageDim = State.pageDimensions[pageIndex] || { width: 612, height: 792 };
    const availW = Math.max(20, pageDim.width - span.bbox[0] - 12);
    const text = editableDiv.innerText || "";

    const c = document.createElement("canvas");
    const ctx = c.getContext("2d");
    const wt = this.isBold ? "bold" : "normal";
    const st = this.isItalic ? "italic" : "normal";
    ctx.font = `${st} ${wt} ${this.currentFontSize}px ${this._getSpanCssFontFamily(this.currentFont, span.loadedFontName, this.userChangedFont)}`;
    const measuredW = Math.max(...text.split("\n").map(line => ctx.measureText(line || " ").width), 1);

    if (measuredW > availW) {
      const nextSize = Math.max(5, Math.floor((this.currentFontSize * (availW / measuredW)) * 2) / 2);
      this.currentFontSize = nextSize;
      this.userChangedStyle = true;
      const sizeInput = this.miniToolbarEl.querySelector("#mt-font-size");
      if (sizeInput) sizeInput.value = nextSize;
      this._updateEditableStyle();
      this._checkTextOverflow();
    }
  }

  _buildInPlaceBox(pageIndex, span, originalHighlightEl, textToShow) {
    if (this.activeBoxEl) {
      this.activeBoxEl.remove();
      this.activeBoxEl = null;
    }

    const overlayLayer = document.getElementById(`page-overlay-${pageIndex}`);
    if (!overlayLayer) return;

    if (span._coverEl) {
      span._coverEl.style.visibility = "hidden";
    }

    const scale = State.zoomScale;
    const [x0, y0, x1, y1] = span.bbox;
    const width = Math.max(16, (x1 - x0) * scale);
    const height = Math.max(12, (y1 - y0) * scale);

    const box = document.createElement("div");
    box.className = "inplace-text-box word-style-editor";
    box.style.position = "absolute";
    box.style.left = `${x0 * scale}px`;
    box.style.top = `${y0 * scale}px`;
    box.style.minWidth = `${width}px`;
    box.style.width = "max-content";
    box.style.maxWidth = `calc(100% - ${x0 * scale + 4}px)`;
    box.style.height = `${height}px`;
    box.style.minHeight = `${height}px`;
    box.style.boxSizing = "border-box";
    box.style.background = "rgba(37, 99, 235, 0.06)";
    box.style.border = "1.5px solid #2563eb";
    box.style.borderRadius = "2px";
    box.style.boxShadow = "0 1px 6px rgba(37, 99, 235, 0.22)";
    box.style.padding = "0";
    box.style.display = "inline-flex";
    box.style.alignItems = "center";
    box.style.zIndex = "80";

    // Clean, natural Word-style editing (NO handles obscuring the text!)
    const editableDiv = document.createElement("div");
    editableDiv.className = "inplace-text-editable";
    editableDiv.contentEditable = "true";
    editableDiv.spellcheck = false;
    editableDiv.innerText = textToShow;
    editableDiv.style.whiteSpace = "pre";
    editableDiv.style.wordBreak = "normal";
    editableDiv.style.minWidth = `${width}px`;
    editableDiv.style.outline = "none";
    editableDiv.style.border = "none";
    editableDiv.style.background = "transparent";
    editableDiv.style.lineHeight = "1";
    editableDiv.style.webkitFontSmoothing = "antialiased";
    editableDiv.style.textRendering = "optimizeLegibility";

    box.appendChild(editableDiv);
    overlayLayer.appendChild(box);
    this.activeBoxEl = box;

    this._updateEditableStyle();
    this._positionMiniToolbar(box);

    editableDiv.addEventListener("input", () => {
      this._positionMiniToolbar(box);
      this._checkTextOverflow();
    });

    setTimeout(() => {
      editableDiv.focus();
      const range = document.createRange();
      range.selectNodeContents(editableDiv);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }, 50);

    box.addEventListener("click", (e) => e.stopPropagation());
    box.addEventListener("mousedown", (e) => e.stopPropagation());
    box.addEventListener("touchstart", (e) => e.stopPropagation(), { passive: true });

    editableDiv.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this.applyEdit();
      } else if (e.key === "Escape") {
        this.cancel();
      }
    });

    const onScrollReposition = () => {
      if (this.activeBoxEl) this._positionMiniToolbar(this.activeBoxEl);
    };
    window.addEventListener("scroll", onScrollReposition, { passive: true });
    document.getElementById("center-workspace")?.addEventListener("scroll", onScrollReposition, { passive: true });
  }

  _positionMiniToolbar(box) {
    if (!box || !this.miniToolbarEl) return;
    this.miniToolbarEl.style.display = "flex";
    this.miniToolbarEl.style.position = "fixed";
    const rect = box.getBoundingClientRect();
    const actualWidth = this.miniToolbarEl.offsetWidth || 310;
    const actualHeight = this.miniToolbarEl.offsetHeight || 36;
    const screenWidth = window.innerWidth;

    const minTop = screenWidth <= 768 ? 58 : 54;
    let top = rect.top - actualHeight - 8;
    if (top < minTop) {
      top = rect.bottom + 8;
    }
    if (top + actualHeight > window.innerHeight - 8) {
      top = Math.max(minTop, window.innerHeight - actualHeight - 8);
    }

    // Horizontally center toolbar over text, clamped safely within screen borders
    let left = rect.left + (rect.width - actualWidth) / 2;
    const maxLeft = Math.max(8, screenWidth - actualWidth - 8);
    left = Math.max(8, Math.min(left, maxLeft));

    this.miniToolbarEl.style.top = `${Math.round(top)}px`;
    this.miniToolbarEl.style.left = `${Math.round(left)}px`;

    // Ensure style popover does not get clipped off screen bottom
    const stylePopover = this.miniToolbarEl.querySelector("#mt-style-popover");
    if (stylePopover) {
      if (top + actualHeight + 52 > window.innerHeight) {
        stylePopover.style.top = "auto";
        stylePopover.style.bottom = "calc(100% + 4px)";
      } else {
        stylePopover.style.top = "calc(100% + 4px)";
        stylePopover.style.bottom = "auto";
      }
    }
  }

  applyEdit() {
    if (!this.currentSpanData || !this.activeBoxEl) return;

    const { pageIndex, span, element } = this.currentSpanData;
    const editableDiv = this.activeBoxEl.querySelector(".inplace-text-editable");
    const replacementText = editableDiv ? editableDiv.innerText.trim() : (span.currentText || span.text);

    // Capture previous state for undo
    const previousText = span.currentText !== undefined ? span.currentText : (span.original_text || span.text);
    const previousFont = span.currentFont || span.font;
    const previousFontSize = span.currentFontSize || span.size;
    const previousBold = span.isBold;
    const previousItalic = span.isItalic;
    const previousUnderline = span.isUnderline;
    const previousColorHex = span.currentColorHex;
    const previousColorRgb = span.currentColorRgb;
    const previousAlignment = span.currentAlignment;

    // Deep-copy the previous edit if one exists, so undo can restore it
    const previousEdit = State.pendingTextEdits.find(e => 
      e.page_number === pageIndex &&
      Math.abs(e.bbox[0] - span.bbox[0]) < 1 &&
      Math.abs(e.bbox[1] - span.bbox[1]) < 1
    );
    const previousEditCopy = previousEdit ? { ...previousEdit } : null;
    const isFirstEdit = !previousEdit;

    // Update span state with current editor values
    span.original_text = span.original_text || span.text;
    span.currentText = replacementText;
    span.currentFont = this.currentFont;
    span.userChangedFont = !!this.userChangedFont;
    span.userChangedStyle = !!this.userChangedStyle;
    span.opacity = this.currentOpacity;
    span.angleDeg = this.currentAngleDeg;
    span.currentFontSize = this.currentFontSize;
    span.isBold = this.isBold;
    span.isItalic = this.isItalic;
    span.isUnderline = this.isUnderline;
    span.currentColorHex = this.currentColorHex;
    span.currentColorRgb = [...this.currentColorRgb];
    span.letterSpacing = this.currentLetterSpacing;
    span.currentAlignment = this.currentAlignment;

    const editItem = {
      page_number: pageIndex,
      original_text: span.original_text,
      replacement_text: replacementText,
      bbox: [...span.bbox],
      baseline_y: span.baselineY,
      font_name: this.currentFont,
      original_font: span.rawFontName || span.font,
      loaded_font_name: span.loadedFontName || "",
      user_changed_font: !!this.userChangedFont,
      user_changed_style: !!this.userChangedStyle,
      opacity: this.currentOpacity !== undefined ? this.currentOpacity : 1.0,
      angle_deg: this.currentAngleDeg || 0,
      font_size: this.currentFontSize,
      fit_mode: this.currentFitMode,
      alignment: this.currentAlignment,
      is_bold: this.isBold,
      is_italic: this.isItalic,
      is_underline: this.isUnderline,
      flags: span.flags || 0,
      text_color: [...this.currentColorRgb],
      text_color_hex: this.currentColorHex,
      letter_spacing: this.currentLetterSpacing
    };

    State.addTextEdit(editItem);

    // Store original highlight element reference
    const originalHighlightEl = span._origHighlightEl || (element && !element.classList.contains("edited-text-overlay") ? element : null);
    if (!span._origHighlightEl && originalHighlightEl) {
      span._origHighlightEl = originalHighlightEl;
    }

    HistoryManager.record({
      type: "text_edit",
      description: `Edit: "${previousText.substring(0, 20)}" → "${replacementText.substring(0, 20)}"`,
      undo: () => {
        if (isFirstEdit) {
          // Completely remove the edit
          State.removeTextEdit(editItem);
          span.currentText = span.original_text;
          delete span.currentFont;
          delete span.currentFontSize;
          delete span.isBold;
          delete span.isItalic;
          delete span.isUnderline;
          delete span.currentColorHex;
          delete span.currentColorRgb;
          delete span.currentAlignment;

          // Remove the visual cover
          if (span._coverEl) {
            span._coverEl.remove();
            span._coverEl = null;
          }
          // Restore original highlight visibility
          if (span._origHighlightEl) {
            span._origHighlightEl.style.display = "";
          }
        } else {
          // Restore to previous edit state
          State.updateTextEdit(editItem, previousEditCopy);
          span.currentText = previousText;
          span.currentFont = previousFont;
          span.currentFontSize = previousFontSize;
          span.isBold = previousBold;
          span.isItalic = previousItalic;
          span.isUnderline = previousUnderline;
          span.currentColorHex = previousColorHex;
          span.currentColorRgb = previousColorRgb;
          span.currentAlignment = previousAlignment;
          this._renderVisualTextReplacement(pageIndex, span, previousText, span._origHighlightEl, previousEditCopy);
        }
        window.app?.renderer?.renderPageWithSuppressedEdits?.(pageIndex).then((ok) => {
          if (ok) this.reRenderPageEdits(pageIndex);
        });
        this.hide();
      },
      redo: () => {
        State.addTextEdit(editItem);
        span.currentText = replacementText;
        span.currentFont = editItem.font_name;
        span.currentFontSize = editItem.font_size;
        span.isBold = editItem.is_bold;
        span.isItalic = editItem.is_italic;
        span.isUnderline = editItem.is_underline;
        span.currentColorHex = editItem.text_color_hex;
        span.currentColorRgb = editItem.text_color;
        span.currentAlignment = editItem.alignment;
        this._renderVisualTextReplacement(pageIndex, span, replacementText, span._origHighlightEl, editItem);
        window.app?.renderer?.renderPageWithSuppressedEdits?.(pageIndex).then((ok) => {
          if (ok) this.reRenderPageEdits(pageIndex);
        });
        this.hide();
      }
    });

    this._renderVisualTextReplacement(pageIndex, span, replacementText, span._origHighlightEl, editItem);
    window.app?.renderer?.renderPageWithSuppressedEdits?.(pageIndex).then((ok) => {
      if (ok) this.reRenderPageEdits(pageIndex);
    });
    this.hide();
  }

  applyDelete() {
    if (!this.currentSpanData) return;
    const { pageIndex, span, element } = this.currentSpanData;

    const previousText = span.currentText !== undefined ? span.currentText : (span.original_text || span.text);
    const previousEdit = State.pendingTextEdits.find(e => 
      e.page_number === pageIndex &&
      Math.abs(e.bbox[0] - span.bbox[0]) < 1 &&
      Math.abs(e.bbox[1] - span.bbox[1]) < 1
    );

    const deleteItem = {
      page_number: pageIndex,
      original_text: span.original_text || span.text,
      replacement_text: "",
      bbox: span.bbox,
      font_name: this.currentFont,
      font_size: this.currentFontSize,
      alignment: this.currentAlignment,
      bg_color: [...this.currentBgColorRgb],
      bg_color_hex: this.currentBgColorHex
    };

    State.addTextEdit(deleteItem);
    span.currentText = "";

    const originalHighlightEl = span._origHighlightEl || (element && !element.classList.contains("edited-text-overlay") ? element : null);

    HistoryManager.record({
      type: "text_delete",
      description: `Delete: "${previousText}"`,
      undo: () => {
        if (!previousEdit) {
          State.removeTextEdit(deleteItem);
          span.currentText = span.original_text;
          if (span._coverEl) {
            span._coverEl.remove();
            span._coverEl = null;
          }
          if (originalHighlightEl) originalHighlightEl.style.display = "block";
        } else {
          State.updateTextEdit(deleteItem, previousEdit);
          span.currentText = previousText;
          this._renderVisualTextReplacement(pageIndex, span, previousText, originalHighlightEl, previousEdit);
        }
        this.hide();
      },
      redo: () => {
        State.addTextEdit(deleteItem);
        span.currentText = "";
        this._renderVisualTextReplacement(pageIndex, span, "", originalHighlightEl, deleteItem);
        this.hide();
      }
    });

    this._renderVisualTextReplacement(pageIndex, span, "", originalHighlightEl, deleteItem);
    this.hide();
  }

  quickRedactSpan(selectedData, isWhiteout = false) {
    const { pageIndex, span, element } = selectedData;
    const redactionItem = {
      page_number: pageIndex,
      bbox: span.bbox,
      color: isWhiteout ? [1.0, 1.0, 1.0] : [0.0, 0.0, 0.0],
      fill: true,
      text_to_redact: span.original_text || span.text,
      is_whiteout: isWhiteout
    };

    State.addRedaction(redactionItem);

    const overlayLayer = document.getElementById(`page-overlay-${pageIndex}`);
    let box = null;
    if (overlayLayer) {
      const scale = State.zoomScale;
      const [x0, y0, x1, y1] = span.bbox;
      box = document.createElement("div");
      box.className = "redaction-preview-box";
      box.style.position = "absolute";
      box.style.left = `${(x0 - 1) * scale}px`;
      box.style.top = `${(y0 - 1) * scale}px`;
      box.style.width = `${(x1 - x0 + 2) * scale}px`;
      box.style.height = `${(y1 - y0 + 2) * scale}px`;
      box.style.background = isWhiteout ? "#ffffff" : "#000000";
      box.style.zIndex = "5";
      overlayLayer.appendChild(box);
    }

    if (element) element.style.display = "none";

    HistoryManager.record({
      type: isWhiteout ? "whiteout" : "redaction",
      description: `${isWhiteout ? "Whiteout" : "Blackout"}: "${span.text}"`,
      undo: () => {
        State.removeRedaction(redactionItem);
        if (box) box.remove();
        if (element) element.style.display = "block";
      },
      redo: () => {
        State.addRedaction(redactionItem);
        if (box && overlayLayer) overlayLayer.appendChild(box);
        if (element) element.style.display = "none";
      }
    });
  }

  _renderVisualTextReplacement(pageIndex, origSpan, replacementText, highlightElement, editItem) {
    const overlayLayer = document.getElementById(`page-overlay-${pageIndex}`);
    if (!overlayLayer) return;

    const scale = State.zoomScale;
    const [x0, y0, x1, y1] = origSpan.bbox;
    const origWidth = (x1 - x0) * scale;
    const origHeight = (y1 - y0) * scale;

    let cover = origSpan._coverEl;
    if (!cover || !cover.parentElement) {
      cover = document.createElement("div");
      cover.className = "text-span-highlight edited-text-overlay";
      origSpan._coverEl = cover;
      overlayLayer.appendChild(cover);

      // Re-editing handler with pointerup & click support and debouncing for mobile touch
      let lastReEdit = 0;
      const triggerReEdit = (e) => {
        const now = Date.now();
        if (now - lastReEdit < 250) return;
        lastReEdit = now;
        e.stopPropagation();
        e.preventDefault();

        if (State.activeTool === "redact") {
          this.quickRedactSpan({ pageIndex, span: origSpan, element: cover }, false);
        } else if (State.activeTool === "whiteout") {
          this.quickRedactSpan({ pageIndex, span: origSpan, element: cover }, true);
        } else {
          State.setActiveTool("edit-text");
          this.openForSpan({
            pageIndex,
            span: origSpan,
            element: cover
          });
        }
      };

      cover.addEventListener("pointerup", triggerReEdit);
      cover.addEventListener("click", triggerReEdit);

      // Prevent pointerdown and mousedown from propagating to canvas tools
      cover.addEventListener("pointerdown", (e) => e.stopPropagation());
      cover.addEventListener("mousedown", (e) => e.stopPropagation());
    }

    const isRenderedOnPdfCanvas = !!window.app?.renderer?.isSpanSuppressedOnCanvas?.(pageIndex, editItem.bbox);
    const fontSizePt = editItem.font_size || origSpan.size;
    const topCoord = (editItem.baseline_y !== undefined && editItem.baseline_y !== null)
      ? (editItem.baseline_y - fontSizePt * 0.85)
      : y0;
    cover.style.position = "absolute";
    cover.style.left = `${x0 * scale}px`;
    cover.style.top = `${topCoord * scale}px`;
    cover.style.minWidth = `${origWidth}px`;
    cover.style.width = "max-content";
    cover.style.maxWidth = `calc(100% - ${x0 * scale + 4}px)`;
    cover.style.height = `${Math.max(origHeight, fontSizePt * 1.15 * scale)}px`;
    cover.style.minHeight = `${origHeight}px`;
    cover.style.backgroundColor = "transparent";
    cover.style.backgroundImage = "none";
    cover.style.zIndex = "6";
    cover.style.visibility = "visible";
    cover.title = `Edited: "${replacementText}" (Click to edit again)`;
    cover.style.display = "block";
    cover.style.padding = "0";
    cover.style.cursor = "pointer";
    cover.style.pointerEvents = "auto";
    cover.style.overflow = "visible";

    if (editItem.alignment === "center") {
      cover.style.textAlign = "center";
    } else if (editItem.alignment === "right") {
      cover.style.textAlign = "right";
    } else {
      cover.style.textAlign = "left";
    }

    // Use color from the edit item, or transparent when the modified PDF itself is rendered by PDF.js on canvas
    const colorHex = editItem.text_color_hex || origSpan.currentColorHex || this._rgbArrayToHex(editItem.text_color) || "#000000";
    const letterSpacingVal = editItem.letter_spacing !== undefined ? editItem.letter_spacing : (origSpan.letterSpacing || 0);

    cover.innerHTML = "";
    const textEl = document.createElement("span");
    textEl.textContent = replacementText;
    textEl.style.color = isRenderedOnPdfCanvas ? "transparent" : colorHex;
    textEl.style.fontSize = `${(editItem.font_size || origSpan.size) * scale}px`;
    textEl.style.fontFamily = this._getSpanCssFontFamily(
      editItem.font_name,
      editItem.loaded_font_name || origSpan.loadedFontName,
      editItem.user_changed_font
    );
    textEl.style.fontWeight = editItem.is_bold ? "bold" : "normal";
    textEl.style.fontStyle = editItem.is_italic ? "italic" : "normal";
    textEl.style.textDecoration = editItem.is_underline ? "underline" : "none";
    textEl.style.letterSpacing = letterSpacingVal ? `${letterSpacingVal * scale}px` : "normal";
    textEl.style.whiteSpace = "pre";
    textEl.style.lineHeight = "1";
    textEl.style.webkitFontSmoothing = "antialiased";
    textEl.style.textRendering = "optimizeLegibility";
    textEl.style.pointerEvents = "none"; // Text inside cover shouldn't eat clicks

    cover.appendChild(textEl);

    if (highlightElement && highlightElement !== cover) {
      highlightElement.style.display = "none";
    }
  }

  reRenderPageEdits(pageIndex) {
    const pageEdits = State.pendingTextEdits.filter(e => e.page_number === pageIndex);
    if (!pageEdits || pageEdits.length === 0) return;

    const overlayLayer = document.getElementById(`page-overlay-${pageIndex}`);
    if (!overlayLayer) return;

    // Retrieve extracted page analysis to locate spans
    const analysis = window.app?.selectionManager?.extractedPages?.get(pageIndex);

    pageEdits.forEach(edit => {
      // Find matching span
      let span = null;
      if (analysis) {
        for (const block of (analysis.blocks || [])) {
          if (block.type !== 0) continue;
          for (const line of (block.lines || [])) {
            for (const s of (line.spans || [])) {
              if (Math.abs(s.bbox[0] - edit.bbox[0]) < 1.5 && Math.abs(s.bbox[1] - edit.bbox[1]) < 1.5) {
                span = s;
                break;
              }
            }
            if (span) break;
          }
          if (span) break;
        }
      }

      if (!span) {
        // Fallback: construct span descriptor from edit item
        span = {
          bbox: [...edit.bbox],
          text: edit.original_text,
          original_text: edit.original_text,
          currentText: edit.replacement_text,
          font: edit.original_font,
          currentFont: edit.font_name,
          size: edit.font_size,
          currentFontSize: edit.font_size,
          isBold: edit.is_bold,
          isItalic: edit.is_italic,
          isUnderline: edit.is_underline,
          currentColorHex: edit.text_color_hex,
          currentColorRgb: edit.text_color,
          currentAlignment: edit.alignment,
          flags: edit.flags || 0
        };
      }

      // Hide raw highlight if it exists
      if (span._origHighlightEl) {
        span._origHighlightEl.style.display = "none";
      }

      // Ensure cover element is rendered with current zoom scale
      this._renderVisualTextReplacement(pageIndex, span, edit.replacement_text, span._origHighlightEl, edit);
    });
  }

  cancel() {
    if (this.currentSpanData && this.currentSpanData.span && this.currentSpanData.span._coverEl) {
      this.currentSpanData.span._coverEl.style.visibility = "visible";
    }
    this.hide();
  }

  hide() {
    if (this.activeBoxEl) {
      this.activeBoxEl.remove();
      this.activeBoxEl = null;
    }
    this.miniToolbarEl.style.display = "none";
    this.moreMenuEl.style.display = "none";
    this.currentSpanData = null;
    document.querySelectorAll(".text-span-highlight.selected").forEach(el => el.classList.remove("selected"));
  }

  _hexToRgbArray(hex) {
    const c = hex.replace("#", "");
    const r = parseInt(c.slice(0, 2), 16) / 255.0;
    const g = parseInt(c.slice(2, 4), 16) / 255.0;
    const b = parseInt(c.slice(4, 6), 16) / 255.0;
    return [r, g, b];
  }

  _rgbArrayToHex(rgbArr) {
    if (!rgbArr || rgbArr.length < 3) return "#000000";
    const toHex = (v) => Math.round(v * 255).toString(16).padStart(2, "0");
    return `#${toHex(rgbArr[0])}${toHex(rgbArr[1])}${toHex(rgbArr[2])}`;
  }
}
