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
  // Standard & System
  { key: "times-roman", label: "Times New Roman", group: "Standard & System", css: '"Times New Roman", Times, Tinos, "Liberation Serif", "Nimbus Roman No9 L", serif' },
  { key: "calibri", label: "Calibri", group: "Standard & System", css: 'Calibri, Carlito, "Segoe UI", Arial, sans-serif' },
  { key: "arial", label: "Arial", group: "Standard & System", css: 'Arial, "Helvetica Neue", Helvetica, sans-serif' },
  { key: "helvetica", label: "Helvetica", group: "Standard & System", css: 'Helvetica, Arial, "Helvetica Neue", sans-serif' },
  { key: "georgia", label: "Georgia", group: "Standard & System", css: 'Georgia, "Times New Roman", serif' },
  { key: "cambria", label: "Cambria", group: "Standard & System", css: 'Cambria, Georgia, serif' },
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
  { key: "courier", label: "Courier New", group: "Monospace & Code", css: '"Courier New", Courier, monospace' },
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
    this.currentFitMode = "expand"; // Default to expand bounds rather than shrink font size

    this._createDOM();
    this._initEvents();
  }

  _createDOM() {
    // 1. Floating Mini-Toolbar
    this.miniToolbarEl = document.createElement("div");
    this.miniToolbarEl.className = "floating-mini-toolbar";
    this.miniToolbarEl.style.display = "none";

    // Build categorized options for select
    const groups = {};
    FONT_DEFINITIONS.forEach(f => {
      if (!groups[f.group]) groups[f.group] = [];
      groups[f.group].push(f);
    });

    let fontOptionsHtml = `<optgroup id="mt-doc-fonts-group" label="Document Fonts" style="display: none;"></optgroup>`;
    for (const [groupName, fonts] of Object.entries(groups)) {
      fontOptionsHtml += `<optgroup label="${groupName}">`;
      fonts.forEach(f => {
        fontOptionsHtml += `<option value="${f.key}">${f.label}</option>`;
      });
      fontOptionsHtml += `</optgroup>`;
    }

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

      <!-- Compact Font Family Dropdown -->
      <select class="mini-select" id="mt-font-select" title="Font Family" style="max-width: 95px; height: 26px; font-size: 11.5px; padding: 0 4px;">
        ${fontOptionsHtml}
      </select>

      <!-- Font Size Input -->
      <input type="number" class="mini-size-input" id="mt-font-size" value="12" min="4" max="144" step="0.5" title="Font Size (pt)" style="width: 38px; height: 26px; font-size: 11.5px; text-align: center; padding: 0 2px;">

      <!-- Style Dropdown (B / I / U inside a dropdown as requested) -->
      <div style="position: relative;" id="mt-style-dropdown-wrap">
        <button type="button" class="mini-btn" id="mt-style-btn" title="Text Style (Bold, Italic, Underline)" style="padding: 0 6px; height: 26px; font-weight: 700; font-size: 11px; display: flex; align-items: center; gap: 3px;">
          <span>B/I/U</span>
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="6 9 12 15 18 9"/></svg>
        </button>

        <!-- Style Popover Dropdown -->
        <div id="mt-style-popover" style="display: none; position: absolute; top: calc(100% + 4px); left: 0; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; box-shadow: 0 4px 14px rgba(0,0,0,0.18); padding: 4px; gap: 4px; z-index: 120; flex-direction: row; align-items: center;">
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
    `;

    document.body.appendChild(this.miniToolbarEl);
    document.body.appendChild(this.moreMenuEl);

    this._bindMiniToolbarEvents();
  }

  _bindMiniToolbarEvents() {
    this.miniToolbarEl.querySelector("#mt-ok-btn")?.addEventListener("click", () => this.applyEdit());
    this.miniToolbarEl.querySelector("#mt-delete-btn")?.addEventListener("click", () => this.applyDelete());

    // Style Dropdown (B / I / U inside popover dropdown)
    const styleBtn = this.miniToolbarEl.querySelector("#mt-style-btn");
    const stylePopover = this.miniToolbarEl.querySelector("#mt-style-popover");
    if (styleBtn && stylePopover) {
      styleBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const isShown = stylePopover.style.display === "flex";
        stylePopover.style.display = isShown ? "none" : "flex";
        this.moreMenuEl.style.display = "none";
      });
      document.addEventListener("click", (e) => {
        if (!stylePopover.contains(e.target) && e.target !== styleBtn) {
          stylePopover.style.display = "none";
        }
      });
    }

    const updateStyleBtnState = () => {
      if (!styleBtn) return;
      const hasStyle = this.isBold || this.isItalic || this.isUnderline;
      styleBtn.style.color = hasStyle ? "#2563eb" : "#334155";
      styleBtn.style.background = hasStyle ? "#eff6ff" : "transparent";
    };

    // Bold / Italic / Underline inside dropdown
    const boldBtn = this.miniToolbarEl.querySelector("#mt-bold-btn");
    boldBtn?.addEventListener("click", () => {
      this.isBold = !this.isBold;
      boldBtn.classList.toggle("active", this.isBold);
      updateStyleBtnState();
      this._updateEditableStyle();
    });

    const italicBtn = this.miniToolbarEl.querySelector("#mt-italic-btn");
    italicBtn?.addEventListener("click", () => {
      this.isItalic = !this.isItalic;
      italicBtn.classList.toggle("active", this.isItalic);
      updateStyleBtnState();
      this._updateEditableStyle();
    });

    const underlineBtn = this.miniToolbarEl.querySelector("#mt-underline-btn");
    underlineBtn?.addEventListener("click", () => {
      this.isUnderline = !this.isUnderline;
      underlineBtn.classList.toggle("active", this.isUnderline);
      updateStyleBtnState();
      this._updateEditableStyle();
    });

    // Font Family
    const fontSelect = this.miniToolbarEl.querySelector("#mt-font-select");
    fontSelect?.addEventListener("change", (e) => {
      this.currentFont = e.target.value;
      this._updateEditableStyle();
    });

    // Font Size
    const sizeInput = this.miniToolbarEl.querySelector("#mt-font-size");
    sizeInput?.addEventListener("input", (e) => {
      this.currentFontSize = parseFloat(e.target.value) || 12;
      this._updateEditableStyle();
    });

    // Text Color
    const colorPicker = this.miniToolbarEl.querySelector("#mt-color-picker");
    colorPicker?.addEventListener("input", (e) => {
      this.currentColorHex = e.target.value;
      this.currentColorRgb = this._hexToRgbArray(e.target.value);
      this._updateEditableStyle();
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
    const docGroup = this.miniToolbarEl.querySelector("#mt-doc-fonts-group");
    if (!docGroup) return;

    docGroup.innerHTML = "";
    if (!detectedFonts || detectedFonts.length === 0) {
      docGroup.style.display = "none";
      return;
    }

    const unique = [...new Set(detectedFonts)];
    unique.forEach(f => {
      const clean = f.replace(/^[A-Z]{6}\+/, "").trim();
      const opt = document.createElement("option");
      opt.value = clean;
      opt.textContent = `PDF Font: ${clean}`;
      docGroup.appendChild(opt);
    });
    docGroup.style.display = "block";
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

    const fontSelect = this.miniToolbarEl.querySelector("#mt-font-select");
    if (fontSelect) {
      let optionExists = Array.from(fontSelect.options).some(opt => opt.value === matchedKey);
      if (!optionExists && clean) {
        const docGroup = this.miniToolbarEl.querySelector("#mt-doc-fonts-group");
        if (docGroup) {
          docGroup.style.display = "block";
          const newOpt = document.createElement("option");
          newOpt.value = clean;
          newOpt.textContent = `PDF Font: ${clean}`;
          docGroup.appendChild(newOpt);
          matchedKey = clean;
        }
      }
      fontSelect.value = matchedKey;
    }

    this.currentFont = matchedKey;
    return matchedKey;
  }

  _getCssFontFamily(fontKey) {
    if (fontKey === "times-roman" || /times|roman|tinos/i.test(fontKey)) {
      return '"Times New Roman", Times, Tinos, "Liberation Serif", "Nimbus Roman No9 L", serif';
    }
    const found = FONT_DEFINITIONS.find(f => f.key === fontKey);
    if (found) return found.css;
    return `"${fontKey}", Arial, sans-serif`;
  }

  _updateEditableStyle() {
    if (!this.activeBoxEl) return;
    const editableDiv = this.activeBoxEl.querySelector(".inplace-text-editable");
    if (!editableDiv) return;

    const scale = State.zoomScale;
    editableDiv.style.fontFamily = this._getCssFontFamily(this.currentFont);
    editableDiv.style.fontSize = `${this.currentFontSize * scale}px`;
    editableDiv.style.fontWeight = this.isBold ? "bold" : "normal";
    editableDiv.style.fontStyle = this.isItalic ? "italic" : "normal";
    editableDiv.style.textDecoration = this.isUnderline ? "underline" : "none";
    editableDiv.style.color = this.currentColorHex;
    editableDiv.style.textAlign = this.currentAlignment;
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

    // Use current replacement text if already edited, otherwise original text
    const textToShow = span.currentText !== undefined ? span.currentText : span.text;

    // Auto-detect and select original font
    const flags = span.flags || 0;
    const isSerifFlag = (flags & 4) !== 0;

    // Check if document has detected serif fonts
    const docFonts = State.documentInfo?.detected_fonts || [];
    const docHasSerif = docFonts.some(f => /times|roman|serif|georgia|cambria|tinos|lora/i.test(f));

    let fontToUse = span.currentFont || span.font;
    if (!fontToUse || fontToUse === "Helvetica" || fontToUse === "Standard Base-14" || fontToUse.toLowerCase() === "unknown") {
      if (isSerifFlag || docHasSerif) {
        fontToUse = "times-roman";
      } else {
        fontToUse = "arial";
      }
    }

    this._detectAndSelectFont(fontToUse, flags);

    const fontLower = (fontToUse || "").toLowerCase();

    // AUTOMATIC FONT SIZE: Use exact original font size rounded to 1 decimal place (e.g. 14, 13.5, 18, 12)
    const rawSize = span.currentFontSize || span.size || 12;
    this.currentFontSize = Math.round(rawSize * 10) / 10;

    this.isBold = span.isBold !== undefined ? span.isBold : ((flags & 16) !== 0 || (flags & 262144) !== 0 || /bold|black|heavy|semibold|demi/.test(fontLower));
    this.isItalic = span.isItalic !== undefined ? span.isItalic : ((flags & 2) !== 0 || (flags & 64) !== 0 || /italic|oblique/.test(fontLower));
    this.isUnderline = span.isUnderline !== undefined ? span.isUnderline : false;

    // Color decoding
    if (span.currentColorHex) {
      this.currentColorHex = span.currentColorHex;
      this.currentColorRgb = span.currentColorRgb;
    } else {
      const colorInt = span.color || 0;
      const r = (colorInt >> 16) & 255;
      const g = (colorInt >> 8) & 255;
      const b = colorInt & 255;
      this.currentColorHex = `#${[r, g, b].map(x => x.toString(16).padStart(2, "0")).join("")}`;
      this.currentColorRgb = [r / 255, g / 255, b / 255];
    }

    // Auto-detect horizontal alignment if not already set
    if (span.currentAlignment) {
      this.currentAlignment = span.currentAlignment;
    } else {
      const pageDim = State.pageDimensions[pageIndex] || { width: 612, height: 792 };
      const distLeft = span.bbox[0];
      const distRight = pageDim.width - span.bbox[2];
      const isCentered = Math.abs(distLeft - distRight) < 35;
      this.currentAlignment = isCentered ? "center" : "left";
    }

    // Update Mini-Toolbar controls
    const fontSelect = this.miniToolbarEl.querySelector("#mt-font-select");
    if (fontSelect) fontSelect.value = this.currentFont;

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
    const height = Math.max(14, (y1 - y0) * scale);

    const box = document.createElement("div");
    box.className = "inplace-text-box word-style-editor";
    box.style.position = "absolute";
    box.style.left = `${(x0 - 1) * scale}px`;
    box.style.top = `${(y0 - 1) * scale}px`;
    box.style.minWidth = `${width + 2}px`;
    box.style.width = "max-content";
    box.style.maxWidth = `calc(100% - ${(x0 - 1) * scale + 6}px)`;
    box.style.height = `${height + 2}px`;
    box.style.minHeight = `${height + 2}px`;
    box.style.boxSizing = "border-box";
    box.style.background = "#ffffff";
    box.style.border = "1.5px solid #2563eb";
    box.style.borderRadius = "2px";
    box.style.boxShadow = "0 1px 6px rgba(37, 99, 235, 0.22)";
    box.style.padding = "0 1px";
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

    window.addEventListener("scroll", () => this._positionMiniToolbar(box), { passive: true });
  }

  _positionMiniToolbar(box) {
    if (!box || !this.miniToolbarEl) return;
    const rect = box.getBoundingClientRect();
    const toolbarWidth = Math.min(300, window.innerWidth - 16);
    const toolbarHeight = 36;

    let top = rect.top - toolbarHeight - 8;
    let left = rect.left;

    if (top < 54) {
      top = rect.bottom + 8;
    }
    if (left + toolbarWidth > window.innerWidth - 8) {
      left = window.innerWidth - toolbarWidth - 8;
    }
    left = Math.max(8, left);

    this.miniToolbarEl.style.top = `${Math.round(top)}px`;
    this.miniToolbarEl.style.left = `${Math.round(left)}px`;
    this.miniToolbarEl.style.display = "flex";
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
    span.currentFontSize = this.currentFontSize;
    span.isBold = this.isBold;
    span.isItalic = this.isItalic;
    span.isUnderline = this.isUnderline;
    span.currentColorHex = this.currentColorHex;
    span.currentColorRgb = [...this.currentColorRgb];
    span.currentAlignment = this.currentAlignment;

    const editItem = {
      page_number: pageIndex,
      original_text: span.original_text,
      replacement_text: replacementText,
      bbox: [...span.bbox],
      font_name: this.currentFont,
      original_font: span.font,
      font_size: this.currentFontSize,
      fit_mode: this.currentFitMode,
      alignment: this.currentAlignment,
      is_bold: this.isBold,
      is_italic: this.isItalic,
      is_underline: this.isUnderline,
      flags: span.flags || 0,
      text_color: [...this.currentColorRgb],
      text_color_hex: this.currentColorHex
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
        this.hide();
      }
    });

    this._renderVisualTextReplacement(pageIndex, span, replacementText, span._origHighlightEl, editItem);
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
      alignment: this.currentAlignment
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

      // Click handler for re-editing — always works regardless of tool
      cover.addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (State.activeTool === "edit-text" || State.activeTool === "select") {
          this.openForSpan({
            pageIndex,
            span: origSpan,
            element: cover
          });
        } else if (State.activeTool === "redact") {
          this.quickRedactSpan({ pageIndex, span: origSpan, element: cover }, false);
        } else if (State.activeTool === "whiteout") {
          this.quickRedactSpan({ pageIndex, span: origSpan, element: cover }, true);
        }
      });

      // Prevent mousedown from propagating to avoid interference with canvas/overlay
      cover.addEventListener("mousedown", (e) => {
        e.stopPropagation();
      });
    }

    cover.style.position = "absolute";
    cover.style.left = `${(x0 - 1) * scale}px`;
    cover.style.top = `${(y0 - 1) * scale}px`;
    cover.style.minWidth = `${origWidth + 2 * scale}px`;
    cover.style.width = "max-content";
    cover.style.maxWidth = `calc(100% - ${(x0 - 1) * scale + 10}px)`;
    cover.style.height = `${origHeight + 2 * scale}px`;
    cover.style.minHeight = `${origHeight + 2 * scale}px`;
    cover.style.background = "#ffffff";
    cover.style.zIndex = "6";
    cover.style.visibility = "visible";
    cover.title = `Edited: "${replacementText}" (Click to edit again)`;
    cover.style.display = "inline-flex";
    cover.style.alignItems = "center";
    cover.style.padding = "0 1px";
    cover.style.cursor = "pointer";
    cover.style.pointerEvents = "auto";
    cover.style.overflow = "visible";

    if (editItem.alignment === "center") {
      cover.style.justifyContent = "center";
    } else if (editItem.alignment === "right") {
      cover.style.justifyContent = "flex-end";
    } else {
      cover.style.justifyContent = "flex-start";
    }

    // Use color from the edit item, not from current editor state
    const colorHex = editItem.text_color_hex || origSpan.currentColorHex || this._rgbArrayToHex(editItem.text_color) || "#000000";

    cover.innerHTML = "";
    const textEl = document.createElement("span");
    textEl.textContent = replacementText;
    textEl.style.color = colorHex;
    textEl.style.fontSize = `${(editItem.font_size || origSpan.size) * scale}px`;
    textEl.style.fontFamily = this._getCssFontFamily(editItem.font_name);
    textEl.style.fontWeight = editItem.is_bold ? "bold" : "normal";
    textEl.style.fontStyle = editItem.is_italic ? "italic" : "normal";
    textEl.style.textDecoration = editItem.is_underline ? "underline" : "none";
    textEl.style.whiteSpace = "pre";
    textEl.style.lineHeight = "1.1";
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
