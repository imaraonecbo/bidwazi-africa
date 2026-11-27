(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const state = {
    page: 1,
    lastPage: 1,
    notices: [],
    saved: new Set(readSaved())
  };
  const storageKey = "bidwazi.saved.v1";

  function readSaved() {
    try {
      const value = JSON.parse(localStorage.getItem("bidwazi.saved.v1") || "[]");
      return Array.isArray(value) ? value.map(String) : [];
    } catch {
      return [];
    }
  }

  function saveSaved() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(Array.from(state.saved)));
    } catch {
      setStatus("Browser storage is unavailable. Saved tenders may not persist.");
    }
  }

  function setStatus(message) {
    const status = $("#status");
    if (status) status.textContent = message;
  }

  function dateValue(value) {
    if (!value) return null;
    const normalized = String(value).replace(" ", "T");
    const date = new Date(normalized);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function formatDate(value) {
    const date = dateValue(value);
    if (!date) return value ? "Check official notice" : "No closing date listed";
    return new Intl.DateTimeFormat("en-KE", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Africa/Nairobi"
    }).format(date);
  }

  function classify(notice) {
    const text = [notice.title, notice.category, notice.entity].join(" ").toLowerCase();
    const rules = [
      ["ICT and Technology", /software|computer|ict|internet|network|cyber|server|digital|laptop|printer/],
      ["Construction and Works", /construct|building|road|bridge|civil works|renovat|cabro|classroom/],
      ["Health and Medical", /medical|hospital|health|pharmaceutical|drug|laboratory/],
      ["Agriculture", /agricultur|farm|fertili[sz]er|seed|livestock|irrigation/],
      ["Consulting and Professional", /consult|audit|engineering|architecture|survey|legal services/],
      ["Training and Education", /training|capacity building|education|school/]
    ];
    for (const [label, pattern] of rules) {
      if (pattern.test(text)) return label;
    }
    if (/goods|supply|delivery/.test(text)) return "Goods and Supplies";
    if (/services/.test(text)) return "Services";
    return "Other opportunities";
  }

  function filteredNotices() {
    const query = ($("#query")?.value || "").trim().toLowerCase();
    const sector = $("#sector")?.value || "";
    const deadline = $("#deadline")?.value || "";
    const agpoOnly = Boolean($("#agpo")?.checked);
    const now = Date.now();

    return state.notices.filter((notice) => {
      const searchable = [
        notice.title,
        notice.entity,
        notice.reference,
        notice.category,
        notice.method
      ].join(" ").toLowerCase();

      if (query && !searchable.includes(query)) return false;
      if (sector && classify(notice) !== sector) return false;
      if (agpoOnly && notice.agpo !== true) return false;

      const closing = dateValue(notice.closing);
      if (deadline === "missing" && closing) return false;
      if (deadline === "past" && (!closing || closing.getTime() >= now)) return false;

      if (deadline === "7" || deadline === "30") {
        if (!closing) return false;
        const difference = closing.getTime() - now;
        if (difference < 0 || difference > Number(deadline) * 86400000) return false;
      }
      return true;
    });
  }

  function makeElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined && text !== null) element.textContent = String(text);
    return element;
  }

  function createNoticeCard(notice) {
    const card = makeElement("article", "notice-card");
    const pills = makeElement("div", "pills");
    pills.append(makeElement("span", "pill", classify(notice)));
    if (notice.agpo === true) pills.append(makeElement("span", "pill agpo-pill", "AGPO flagged by source"));
    if (notice.method) pills.append(makeElement("span", "pill muted-pill", notice.method));

    const title = makeElement("h3", "notice-title", notice.title || "Untitled public notice");
    const buyer = makeElement("p", "notice-buyer",
      [notice.entity || "Buyer not listed", notice.reference || "Reference unavailable"].join(" · "));
    const closing = makeElement("span", "notice-closing", "Closes: " + formatDate(notice.closing));
    const actions = makeElement("div", "notice-actions");

    const id = String(notice.id);
    const save = makeElement("button", "save-button", state.saved.has(id) ? "★ Saved" : "☆ Save");
    save.type = "button";
    save.setAttribute("aria-pressed", state.saved.has(id) ? "true" : "false");
    save.addEventListener("click", () => {
      if (state.saved.has(id)) state.saved.delete(id);
      else state.saved.add(id);
      saveSaved();
      render();
    });

    const link = makeElement("a", "official-link", "Official notice ↗");
    link.href = notice.sourceUrl || "https://tenders.go.ke/";
    link.target = "_blank";
    link.rel = "noopener noreferrer";

    actions.append(save, link);
    const footer = makeElement("div", "notice-footer");
    footer.append(closing, actions);
    card.append(pills, title, buyer, footer);
    return card;
  }

  function render() {
    const container = $("#cards");
    if (!container) return;
    const notices = filteredNotices();
    container.replaceChildren();

    if (notices.length === 0) {
      container.append(makeElement("div", "empty-state",
        "No matching notices on this page. Try a different search or move to another page."));
    } else {
      for (const notice of notices) container.append(createNoticeCard(notice));
    }

    $("#page").textContent = "Page " + state.page + " of " + state.lastPage;
    $("#previous").disabled = state.page <= 1;
    $("#next").disabled = state.page >= state.lastPage;
    $("#shown").textContent = notices.length + " notices shown on this page";
  }

  async function load(page = 1) {
    state.page = Math.max(1, Math.min(100, Number(page) || 1));
    setStatus("Refreshing Kenya PPIP feed…");
    $("#cards").replaceChildren(makeElement("div", "loading", "Loading procurement notices…"));

    try {
      const response = await fetch("/api/tenders?page=" + encodeURIComponent(state.page), {
        headers: { "Accept": "application/json" },
        cache: "no-store"
      });
      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.error || "The official feed is temporarily unavailable.");
      }
      if (!Array.isArray(body.notices)) {
        throw new Error("The feed response did not contain a notice list.");
      }

      state.notices = body.notices;
      state.lastPage = Math.max(1, Math.min(100, Number(body.last_page) || 1));
      $("#total").textContent = Number(body.total || 0).toLocaleString("en-KE");
      setStatus("Source: Kenya PPIP · Updated " +
        new Intl.DateTimeFormat("en-KE", { timeStyle: "short", timeZone: "Africa/Nairobi" }).format(new Date()));
      render();
    } catch (error) {
      setStatus("Feed unavailable");
      const message = makeElement("div", "empty-state", error.message);
      const link = makeElement("a", "official-link", "Open official PPIP ↗");
      link.href = "https://tenders.go.ke/";
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      message.append(document.createElement("br"), link);
      $("#cards").replaceChildren(message);
    }
  }

  function exportCsv() {
    const rows = filteredNotices();
    const columns = ["id", "reference", "title", "entity", "category", "method", "published", "closing", "agpo", "sourceUrl"];
    const quote = (value) => '"' + String(value ?? "").replace(/"/g, '""') + '"';
    const content = [columns.join(","), ...rows.map(row => columns.map(key => quote(row[key])).join(","))].join("\r\n");
    const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "bidwazi-tenders-page-" + state.page + ".csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function initialize() {
    $("#year").textContent = String(new Date().getFullYear());
    ["query", "sector", "deadline", "agpo"].forEach((id) => {
      const element = $("#" + id);
      element.addEventListener("input", render);
      element.addEventListener("change", render);
    });
    $("#refresh").addEventListener("click", () => load(state.page));
    $("#previous").addEventListener("click", () => load(state.page - 1));
    $("#next").addEventListener("click", () => load(state.page + 1));
    $("#csv").addEventListener("click", exportCsv);
    load(1);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();
