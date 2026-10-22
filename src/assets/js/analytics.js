// GoatCounter: брои прегледа на страницата и записва кликове по връзки и бутони като събития.
// Събитията се виждат в GoatCounter (отметка „events“) и се синхронизират в Neon от scripts/sync-analytics.js.
(() => {
  const ready = (fn) => { if (window.goatcounter?.count) fn(); else { let n = 0; const t = setInterval(() => { if (window.goatcounter?.count || ++n > 50) { clearInterval(t); if (window.goatcounter?.count) fn(); } }, 100); } };
  const base = document.documentElement.dataset.lang ? location.pathname : location.pathname;

  ready(() => {
    const gc = window.goatcounter;
    gc.count({ path: base, title: document.title, referrer: document.referrer });

    const send = (name, title) => gc.count({ path: name.slice(0, 200), title: (title || "").slice(0, 200), event: true });
    document.addEventListener("click", (e) => {
      const el = e.target.closest("a, button");
      if (!el) return;
      const explicit = el.dataset.track;
      if (explicit) return send(`click:${explicit}`, document.title);
      if (el.tagName === "A") {
        const href = el.getAttribute("href") || "";
        if (el.hasAttribute("download")) return send(`download:${href.split("/").pop()}`, document.title);
        if (/^https?:\/\//.test(href) && !href.startsWith(location.origin)) {
          let host = href; try { host = new URL(href).hostname.replace(/^www\./, ""); } catch { /* ignore */ }
          return send(`outbound:${host}`, href);
        }
      }
      if (el.tagName === "BUTTON" && (el.id || el.getAttribute("aria-label"))) send(`button:${el.id || el.getAttribute("aria-label")}`, document.title);
    }, { capture: true, passive: true });
  });
})();
