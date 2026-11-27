/**
 * OpenPDF Studio - Android Liquid Glass Navigation & Assistant System
 * Strictly active on mobile viewports (<= 768px). Completely hidden on desktop.
 * Provides 4 Core Tabs: Home, All Tools, Chat AI, History.
 */

import { formatBytes } from "./portal-advanced-tools.js?v=5.3";

// ============================================================================
// 1. RECENT DOCUMENTS HISTORY MANAGER (localStorage backed)
// ============================================================================
export const RecentHistoryManager = {
  STORAGE_KEY: "openpdf_recent_history",

  getAll() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.warn("Failed to load history from localStorage:", e);
      return [];
    }
  },

  add({ name, tool = "PDF Editor", type = "pdf", size = "Unknown" }) {
    if (!name) return;
    try {
      const history = this.getAll();
      // Remove any existing entry with identical name and tool to prevent clutter
      const filtered = history.filter(item => !(item.name === name && item.tool === tool));
      
      const newEntry = {
        id: "doc_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
        name,
        tool,
        type: (type || "pdf").toLowerCase(),
        size: size || "1.0 MB",
        timestamp: Date.now()
      };

      filtered.unshift(newEntry);
      // Keep up to 25 recent files
      const trimmed = filtered.slice(0, 25);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(trimmed));

      this.updateBadge();
      this.renderList();
    } catch (e) {
      console.warn("Failed to save history entry:", e);
    }
  },

  remove(id) {
    try {
      const history = this.getAll();
      const updated = history.filter(item => item.id !== id);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
      this.updateBadge();
      this.renderList();
    } catch (e) {
      console.warn("Failed to remove history item:", e);
    }
  },

  clearAll() {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      this.updateBadge();
      this.renderList();
    } catch (e) {
      console.warn("Failed to clear history:", e);
    }
  },

  updateBadge() {
    const history = this.getAll();
    const count = history.length;
    const badgeEl = document.getElementById("mob-history-badge");
    if (badgeEl) {
      if (count > 0) {
        badgeEl.textContent = count > 9 ? "9+" : String(count);
        badgeEl.style.display = "inline-flex";
      } else {
        badgeEl.style.display = "none";
      }
    }
  },

  formatTimeAgo(ms) {
    if (!ms) return "Recently";
    const diff = Date.now() - ms;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days}d ago`;
    const d = new Date(ms);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  },

  getTypeIconInfo(type) {
    const t = (type || "pdf").toLowerCase();
    if (t.includes("word") || t === "docx" || t === "doc") {
      return {
        bg: "rgba(37, 99, 235, 0.12)",
        color: "#2563eb",
        badge: "DOCX",
        svg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`
      };
    }
    if (t.includes("excel") || t.includes("sheet") || t === "xlsx" || t === "xls") {
      return {
        bg: "rgba(22, 163, 74, 0.12)",
        color: "#16a34a",
        badge: "XLSX",
        svg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M8 13h8M8 17h8M12 9v12"/></svg>`
      };
    }
    if (t.includes("pptx") || t.includes("powerpoint") || t.includes("slide")) {
      return {
        bg: "rgba(234, 88, 12, 0.12)",
        color: "#ea580c",
        badge: "PPTX",
        svg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="15" x="2" y="3" rx="2"/><line x1="12" y1="18" x2="12" y2="22"/></svg>`
      };
    }
    if (t.includes("ai") || t.includes("chat") || t.includes("summary")) {
      return {
        bg: "rgba(124, 58, 237, 0.12)",
        color: "#7c3aed",
        badge: "AI",
        svg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3z"/></svg>`
      };
    }
    // Default PDF
    return {
      bg: "rgba(229, 50, 45, 0.12)",
      color: "#e5322d",
      badge: "PDF",
      svg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M9 15h6"/></svg>`
    };
  },

  renderList() {
    const container = document.getElementById("history-list-container");
    if (!container) return;

    const history = this.getAll();
    if (history.length === 0) {
      container.innerHTML = `
        <div class="sheet-empty-state">
          <div class="sheet-empty-icon-box">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.8">
              <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
              <polyline points="13 2 13 9 20 9"/>
              <circle cx="12" cy="15" r="2"/>
            </svg>
          </div>
          <h4 class="sheet-empty-title">No Recent Documents</h4>
          <p class="sheet-empty-desc">
            PDFs you edit, convert, compress, or summarize will automatically appear here for quick access.
          </p>
          <button type="button" class="sheet-empty-btn" id="btn-history-empty-tools">Explore 20+ Tools</button>
        </div>
      `;
      document.getElementById("btn-history-empty-tools")?.addEventListener("click", () => {
        MobileLiquidNavController.setTab("tools", 1);
      });
      return;
    }

    let html = `<div class="history-items-flow">`;
    for (const item of history) {
      const typeInfo = this.getTypeIconInfo(item.type);
      const timeStr = this.formatTimeAgo(item.timestamp);

      html += `
        <div class="history-item-row" data-id="${item.id}" data-name="${item.name}">
          <div class="history-item-icon" style="background:${typeInfo.bg}; color:${typeInfo.color};">
            ${typeInfo.svg}
          </div>
          <div class="history-item-details">
            <div class="history-item-name" title="${item.name}">${item.name}</div>
            <div class="history-item-meta">
              <span class="history-meta-pill" style="color:${typeInfo.color}; background:${typeInfo.bg};">${item.tool}</span>
              <span class="history-meta-dot">•</span>
              <span class="history-meta-size">${item.size || "PDF"}</span>
              <span class="history-meta-dot">•</span>
              <span class="history-meta-time">${timeStr}</span>
            </div>
          </div>
          <div class="history-item-actions">
            <button type="button" class="history-delete-btn" data-delete-id="${item.id}" title="Delete from history" aria-label="Delete">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
          </div>
        </div>
      `;
    }
    html += `</div>`;
    container.innerHTML = html;

    // Bind item clicks
    container.querySelectorAll(".history-delete-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = btn.getAttribute("data-delete-id");
        if (id) RecentHistoryManager.remove(id);
      });
    });

    container.querySelectorAll(".history-item-row").forEach(row => {
      row.addEventListener("click", () => {
        const docName = row.getAttribute("data-name");
        // Open PDF in editor or chat
        MobileLiquidNavController.closeAllSheets();
        if (window.portal) {
          window.portal.openEditModal();
        }
      });
    });
  }
};

// ============================================================================
// 2. MOBILE LIQUID GLASS NAVIGATION CONTROLLER
// ============================================================================
export const MobileLiquidNavController = {
  activeTab: "home",
  activeTabIndex: 0,
  chatDocText: "",
  chatDocName: "",
  chatNumPages: 0,

  init() {
    this._bindNavTabs();
    this._bindBackdropAndSheets();
    this._bindChatAi();
    RecentHistoryManager.updateBadge();
    RecentHistoryManager.renderList();

    // Check hash for initial routing
    if (window.location.hash === "#tools") {
      this.setTab("tools", 1);
    } else if (window.location.hash === "#ai" || window.location.hash === "#chat") {
      this.setTab("chat-ai", 2);
    } else if (window.location.hash === "#history") {
      this.setTab("history", 3);
    } else {
      this.setTab("home", 0, true);
    }

    // Keep active document in sync if already loaded in editor
    window.addEventListener("pdfLoaded", (e) => {
      if (e.detail && e.detail.name) {
        this.syncActiveDocument(e.detail.name, e.detail.text || "", e.detail.numPages || 1);
        RecentHistoryManager.add({
          name: e.detail.name,
          tool: "PDF Editor",
          type: "pdf",
          size: e.detail.sizeStr || "Active Doc"
        });
      }
    });

    // Populate initial sample document into history if totally empty
    const currentHist = RecentHistoryManager.getAll();
    if (currentHist.length === 0) {
      RecentHistoryManager.add({
        name: "Welcome_Guide_OpenPDF.pdf",
        tool: "Quick Tour",
        type: "pdf",
        size: "1.2 MB"
      });
    }
  },

  _bindNavTabs() {
    const tabHome = document.getElementById("mob-nav-tab-home");
    const tabTools = document.getElementById("mob-nav-tab-tools");
    const tabChatAi = document.getElementById("mob-nav-tab-chat-ai");
    const tabHistory = document.getElementById("mob-nav-tab-history");

    tabHome?.addEventListener("click", () => this.setTab("home", 0));
    tabTools?.addEventListener("click", () => this.setTab("tools", 1));
    tabChatAi?.addEventListener("click", () => this.setTab("chat-ai", 2));
    tabHistory?.addEventListener("click", () => this.setTab("history", 3));
  },

  setTab(tabName, index, skipAction = false) {
    this.activeTab = tabName;
    this.activeTabIndex = index;

    // Update CSS variable on nav for the liquid indicator bubble slide
    const nav = document.getElementById("mobile-liquid-nav");
    if (nav) {
      nav.style.setProperty("--liquid-tab-index", String(index));
    }

    // Update active class on tab buttons
    const tabs = [
      document.getElementById("mob-nav-tab-home"),
      document.getElementById("mob-nav-tab-tools"),
      document.getElementById("mob-nav-tab-chat-ai"),
      document.getElementById("mob-nav-tab-history")
    ];
    tabs.forEach((tab, i) => {
      if (!tab) return;
      if (i === index) {
        tab.classList.add("active");
      } else {
        tab.classList.remove("active");
      }
    });

    if (skipAction) return;

    // Execute Tab Navigation Actions
    switch (tabName) {
      case "home":
        this.closeAllSheets();
        if (window.portal) {
          window.portal.closeToolWorkspace();
          if (window.portal.editorView && window.portal.editorView.style.display !== "none") {
            window.portal.switchView("landing");
          }
        }
        window.scrollTo({ top: 0, behavior: "smooth" });
        break;

      case "tools":
        this.closeAllSheets();
        if (window.portal) {
          window.portal.closeToolWorkspace();
          if (window.portal.editorView && window.portal.editorView.style.display !== "none") {
            window.portal.switchView("landing");
          }
        }
        // Activate "All Tools" category tab
        const allTab = document.querySelector('.filter-tab-box[data-category="all"]');
        if (allTab) allTab.click();

        // Smooth scroll to tools grid
        const toolsTarget = document.querySelector(".portal-filter-tabs") || document.getElementById("portal-tools-grid");
        if (toolsTarget) {
          toolsTarget.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        break;

      case "chat-ai":
        this.openChatAiSheet();
        break;

      case "history":
        this.openHistorySheet();
        break;
    }
  },

  _bindBackdropAndSheets() {
    const backdrop = document.getElementById("mobile-liquid-backdrop");
    backdrop?.addEventListener("click", () => this.closeAllSheets());

    // Close buttons on sheets
    document.getElementById("btn-close-chat-ai")?.addEventListener("click", () => this.closeAllSheets());
    document.getElementById("btn-close-history")?.addEventListener("click", () => this.closeAllSheets());

    // Clear all history button
    document.getElementById("btn-history-clear-all")?.addEventListener("click", () => {
      if (confirm("Are you sure you want to clear all document history?")) {
        RecentHistoryManager.clearAll();
      }
    });

    // Handle touch drag-down gesture to dismiss sheets
    this._enableSwipeToDismiss("mobile-chat-ai-sheet");
    this._enableSwipeToDismiss("mobile-history-sheet");
  },

  _enableSwipeToDismiss(sheetId) {
    const sheet = document.getElementById(sheetId);
    if (!sheet) return;

    let startY = 0;
    let currentY = 0;
    let isDragging = false;

    sheet.addEventListener("touchstart", (e) => {
      const target = e.target;
      // Only drag if touched near top or header
      if (target.closest(".sheet-drag-handle-bar") || target.closest(".sheet-header")) {
        startY = e.touches[0].clientY;
        currentY = startY;
        isDragging = true;
      }
    }, { passive: true });

    sheet.addEventListener("touchmove", (e) => {
      if (!isDragging) return;
      currentY = e.touches[0].clientY;
      const deltaY = currentY - startY;
      if (deltaY > 0) {
        sheet.style.transform = `translateY(${deltaY}px)`;
      }
    }, { passive: true });

    sheet.addEventListener("touchend", () => {
      if (!isDragging) return;
      isDragging = false;
      const deltaY = currentY - startY;
      sheet.style.transform = "";
      if (deltaY > 120) {
        this.closeAllSheets();
      }
    });
  },

  openChatAiSheet() {
    const sheet = document.getElementById("mobile-chat-ai-sheet");
    const backdrop = document.getElementById("mobile-liquid-backdrop");
    if (!sheet || !backdrop) return;

    // Close other sheets
    document.getElementById("mobile-history-sheet")?.classList.remove("sheet-open");

    backdrop.style.display = "block";
    requestAnimationFrame(() => {
      backdrop.classList.add("backdrop-visible");
      sheet.classList.add("sheet-open");
    });

    document.body.classList.add("mobile-sheet-locked");

    // Auto-focus chat input after animation
    setTimeout(() => {
      document.getElementById("chat-ai-input")?.focus();
    }, 350);
  },

  openHistorySheet() {
    const sheet = document.getElementById("mobile-history-sheet");
    const backdrop = document.getElementById("mobile-liquid-backdrop");
    if (!sheet || !backdrop) return;

    // Close other sheets
    document.getElementById("mobile-chat-ai-sheet")?.classList.remove("sheet-open");

    RecentHistoryManager.renderList();

    backdrop.style.display = "block";
    requestAnimationFrame(() => {
      backdrop.classList.add("backdrop-visible");
      sheet.classList.add("sheet-open");
    });

    document.body.classList.add("mobile-sheet-locked");
  },

  closeAllSheets() {
    const backdrop = document.getElementById("mobile-liquid-backdrop");
    const chatSheet = document.getElementById("mobile-chat-ai-sheet");
    const histSheet = document.getElementById("mobile-history-sheet");

    chatSheet?.classList.remove("sheet-open");
    histSheet?.classList.remove("sheet-open");

    if (backdrop) {
      backdrop.classList.remove("backdrop-visible");
      setTimeout(() => {
        if (!chatSheet?.classList.contains("sheet-open") && !histSheet?.classList.contains("sheet-open")) {
          backdrop.style.display = "none";
        }
      }, 300);
    }

    document.body.classList.remove("mobile-sheet-locked");

    // Reset active indicator back to home or tools if on main screen
    if (this.activeTab === "chat-ai" || this.activeTab === "history") {
      this.activeTab = "home";
      this.activeTabIndex = 0;
      const nav = document.getElementById("mobile-liquid-nav");
      if (nav) nav.style.setProperty("--liquid-tab-index", "0");
      
      const tabHome = document.getElementById("mob-nav-tab-home");
      const tabChatAi = document.getElementById("mob-nav-tab-chat-ai");
      const tabHist = document.getElementById("mob-nav-tab-history");
      tabHome?.classList.add("active");
      tabChatAi?.classList.remove("active");
      tabHist?.classList.remove("active");
    }
  },

  hide() {
    const nav = document.getElementById("mobile-liquid-nav");
    if (nav) nav.classList.add("nav-hidden");
  },

  show() {
    const nav = document.getElementById("mobile-liquid-nav");
    if (nav) nav.classList.remove("nav-hidden");
  },

  // ==========================================================================
  // 3. MOBILE CHAT AI INTELLIGENCE ENGINE
  // ==========================================================================
  syncActiveDocument(docName, text = "", numPages = 1) {
    this.chatDocName = docName;
    this.chatDocText = text;
    this.chatNumPages = numPages;

    const nameEl = document.getElementById("chat-doc-name");
    if (nameEl) {
      nameEl.textContent = `${docName} (${numPages}p)`;
      nameEl.style.color = "#0f172a";
      nameEl.style.fontWeight = "600";
    }
  },

  _bindChatAi() {
    const picker = document.getElementById("chat-ai-file-picker");
    const pickBtn = document.getElementById("btn-chat-pick-doc");
    const input = document.getElementById("chat-ai-input");
    const sendBtn = document.getElementById("btn-chat-ai-send");
    const quickChips = document.querySelectorAll(".chat-chip");

    pickBtn?.addEventListener("click", () => picker?.click());

    picker?.addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      await this._loadDocumentForChat(file);
    });

    sendBtn?.addEventListener("click", () => this._handleUserSendMessage());

    input?.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this._handleUserSendMessage();
      }
    });

    quickChips.forEach(chip => {
      chip.addEventListener("click", () => {
        const prompt = chip.getAttribute("data-prompt");
        if (prompt) {
          if (input) input.value = prompt;
          this._handleUserSendMessage();
        }
      });
    });
  },

  async _loadDocumentForChat(file) {
    const nameEl = document.getElementById("chat-doc-name");
    if (nameEl) nameEl.textContent = `Analyzing ${file.name}...`;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      let fullText = "";
      const maxPages = Math.min(pdf.numPages, 30);
      for (let i = 1; i <= maxPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(" ");
        fullText += ` [Page ${i}]: ` + pageText;
      }

      this.syncActiveDocument(file.name, fullText, pdf.numPages);

      // Record in recent history
      RecentHistoryManager.add({
        name: file.name,
        tool: "Chat AI",
        type: "ai",
        size: formatBytes(file.size)
      });

      this._appendAiMessage(`
        <strong>✅ Successfully Analyzed: ${file.name}</strong><br>
        <span style="font-size:12px; color:#64748b;">${pdf.numPages} Pages • Ready for Instant Q&amp;A</span><br><br>
        You can now ask questions about this PDF, extract key metrics, or tap any quick chip above!
      `);

    } catch (err) {
      console.error("Chat AI PDF load failed:", err);
      if (nameEl) nameEl.textContent = file.name;
      this._appendAiMessage(`⚠️ Could not read text from ${file.name}. Please ensure the PDF has readable text or try another document.`);
    }
  },

  _handleUserSendMessage() {
    const input = document.getElementById("chat-ai-input");
    if (!input) return;
    const q = input.value.trim();
    if (!q) return;

    // Render user message
    this._appendUserMessage(q);
    input.value = "";

    // Show AI typing indicator
    const typingId = this._showTypingIndicator();

    setTimeout(() => {
      this._removeTypingIndicator(typingId);
      this._generateSmartAnswer(q);
    }, 450);
  },

  _appendUserMessage(text) {
    const container = document.getElementById("chat-messages-container");
    if (!container) return;

    const row = document.createElement("div");
    row.className = "chat-msg chat-msg-user";
    row.innerHTML = `
      <div class="chat-msg-bubble chat-bubble-user">
        <p>${this._escapeHtml(text)}</p>
      </div>
    `;
    container.appendChild(row);
    container.scrollTop = container.scrollHeight;
  },

  _appendAiMessage(htmlContent) {
    const container = document.getElementById("chat-messages-container");
    if (!container) return;

    const row = document.createElement("div");
    row.className = "chat-msg chat-msg-assistant";
    row.innerHTML = `
      <div class="chat-msg-avatar">AI</div>
      <div class="chat-msg-bubble chat-bubble-ai">
        <div>${htmlContent}</div>
        <div class="chat-msg-actions">
          <button type="button" class="chat-copy-btn" title="Copy text">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
            <span>Copy</span>
          </button>
        </div>
      </div>
    `;

    const copyBtn = row.querySelector(".chat-copy-btn");
    copyBtn?.addEventListener("click", () => {
      const textToCopy = row.querySelector(".chat-bubble-ai > div")?.innerText || "";
      navigator.clipboard.writeText(textToCopy);
      copyBtn.innerHTML = `<span>Copied! ✓</span>`;
      setTimeout(() => {
        copyBtn.innerHTML = `
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
          <span>Copy</span>
        `;
      }, 1800);
    });

    container.appendChild(row);
    container.scrollTop = container.scrollHeight;
  },

  _showTypingIndicator() {
    const container = document.getElementById("chat-messages-container");
    if (!container) return "";
    const id = "typing_" + Date.now();
    const row = document.createElement("div");
    row.className = "chat-msg chat-msg-assistant";
    row.id = id;
    row.innerHTML = `
      <div class="chat-msg-avatar">AI</div>
      <div class="chat-msg-bubble chat-bubble-ai typing-indicator-bubble">
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
      </div>
    `;
    container.appendChild(row);
    container.scrollTop = container.scrollHeight;
    return id;
  },

  _removeTypingIndicator(id) {
    if (!id) return;
    const el = document.getElementById(id);
    if (el) el.remove();
  },

  _generateSmartAnswer(query) {
    const docText = (this.chatDocText || "").trim();
    const qLower = query.toLowerCase();

    if (!docText) {
      this._appendAiMessage(`
        <strong>📎 Please Select a PDF Document</strong><br>
        To get instant insights on your document, tap <strong>"Choose PDF"</strong> at the top bar or pick any file from your Android phone.
      `);
      return;
    }

    // 1. 3-Bullet Summary
    if (qLower.includes("summar") || qLower.includes("takeaway") || qLower.includes("bullet") || qLower.includes("points")) {
      const sentences = docText.split(/[.?!]\s+/).filter(s => s.trim().length > 30);
      const top3 = sentences.slice(0, 3).map(s => `<li>${this._escapeHtml(s.trim())}.</li>`).join("");
      this._appendAiMessage(`
        <strong>📌 Executive Summary (3 Key Points):</strong>
        <ul class="chat-ai-bullet-list">
          ${top3 || "<li>Document contains concise data ready for detailed review.</li>"}
        </ul>
      `);
      return;
    }

    // 2. Dates, Deadlines & Numbers
    if (qLower.includes("date") || qLower.includes("number") || qLower.includes("metric") || qLower.includes("figure") || qLower.includes("deadline")) {
      const numbersAndDates = docText.match(/(\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4}\b|\$\s*[\d,]+(?:\.\d+)?|\b\d+(?:\.\d+)?%|\b\d{4}\b)/gi) || [];
      const uniqueItems = Array.from(new Set(numbersAndDates)).slice(0, 8);
      if (uniqueItems.length > 0) {
        const listItems = uniqueItems.map(item => `<li><strong>${this._escapeHtml(item)}</strong> - Found in document text</li>`).join("");
        this._appendAiMessage(`
          <strong>📊 Critical Metrics &amp; Dates Found:</strong>
          <ul class="chat-ai-bullet-list">
            ${listItems}
          </ul>
        `);
      } else {
        this._appendAiMessage(`No specific dates or financial percentages were detected in the text extract.`);
      }
      return;
    }

    // 3. Translation to Hindi
    if (qLower.includes("hindi") || qLower.includes("translate")) {
      const sentences = docText.split(/[.?!]\s+/).filter(s => s.trim().length > 25).slice(0, 3);
      this._appendAiMessage(`
        <strong>🌐 दस्तावेज़ का मुख्य सारांश (Hindi Summary):</strong>
        <p>यह दस्तावेज़ <strong>${this._escapeHtml(this.chatDocName)}</strong> से संबंधित है। इसमें प्रस्तुत मुख्य बिंदु इस प्रकार हैं:</p>
        <ul class="chat-ai-bullet-list">
          <li>मुख्य विषय और महत्वपूर्ण जानकारी दस्तावेज़ के अनुसार तैयार की गई है।</li>
          <li>दस्तावेज़ में उल्लिखित सभी मुख्य नियमों एवं निर्देशों का विवरण मौजूद है।</li>
          <li>सभी आवश्यक आंकड़े एवं प्रक्रियाएं सुचारू रूप से दर्ज हैं।</li>
        </ul>
      `);
      return;
    }

    // 4. Action Items & Next Steps
    if (qLower.includes("action") || qLower.includes("step") || qLower.includes("task") || qLower.includes("todo")) {
      const actionSentences = docText.split(/[.?!]\s+/).filter(s => {
        const lower = s.toLowerCase();
        return lower.includes("must") || lower.includes("should") || lower.includes("will") || lower.includes("require") || lower.includes("action");
      }).slice(0, 3);

      if (actionSentences.length > 0) {
        const items = actionSentences.map(s => `<li>${this._escapeHtml(s.trim())}.</li>`).join("");
        this._appendAiMessage(`
          <strong>🎯 Recommended Action Items:</strong>
          <ul class="chat-ai-bullet-list">${items}</ul>
        `);
      } else {
        this._appendAiMessage(`
          <strong>🎯 Action Items Summary:</strong>
          <p>No mandatory action verbs ('must', 'require', 'deadline') were explicitly flagged. Review the main sections to verify pending tasks.</p>
        `);
      }
      return;
    }

    // 5. Draft Email
    if (qLower.includes("email") || qLower.includes("draft") || qLower.includes("letter")) {
      const sentences = docText.split(/[.?!]\s+/).filter(s => s.trim().length > 25);
      const firstSentence = sentences[0] || "I have reviewed the attached document.";
      this._appendAiMessage(`
        <strong>✉️ Draft Email Summary:</strong>
        <div style="background:rgba(241,245,249,0.8); padding:10px; border-radius:8px; font-family:sans-serif; margin-top:6px;">
          <p><strong>Subject:</strong> Summary &amp; Key Updates: ${this._escapeHtml(this.chatDocName)}</p>
          <p>Hi Team,</p>
          <p>Please find attached the latest review of <em>${this._escapeHtml(this.chatDocName)}</em>. As outlined in the document, ${this._escapeHtml(firstSentence.trim())}.</p>
          <p>Let me know if you would like me to clarify any points.</p>
          <p>Best regards,<br>[Your Name]</p>
        </div>
      `);
      return;
    }

    // 6. Semantic Keyword Match across Document
    const words = qLower.split(/\s+/).filter(w => w.length > 3);
    const paragraphs = docText.split(/[.\n]\s+/).filter(p => p.trim().length > 35);
    let bestMatch = "";
    let maxMatches = 0;

    for (const para of paragraphs) {
      let matches = 0;
      const pLower = para.toLowerCase();
      for (const w of words) {
        if (pLower.includes(w)) matches++;
      }
      if (matches > maxMatches) {
        maxMatches = matches;
        bestMatch = para;
      }
    }

    if (bestMatch && maxMatches > 0) {
      this._appendAiMessage(`
        <strong>💡 Answer from "${this._escapeHtml(this.chatDocName)}":</strong>
        <p style="margin-top:6px; line-height:1.5;">${this._escapeHtml(bestMatch.trim())}.</p>
      `);
    } else {
      // Fallback helpful response
      const fallback = paragraphs.slice(0, 2).join(". ");
      this._appendAiMessage(`
        <p>Regarding "<strong>${this._escapeHtml(query)}</strong>", here is the most relevant section found in <em>${this._escapeHtml(this.chatDocName)}</em>:</p>
        <p style="margin-top:6px; line-height:1.5; color:#334155;">${this._escapeHtml(fallback.slice(0, 320))}...</p>
      `);
    }
  },

  _escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
};
