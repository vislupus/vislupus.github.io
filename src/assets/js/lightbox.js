// Lightbox за снимки: <a data-lightbox href="голяма снимка"> – стрелки, бутон за цял екран, свайп, клавиатура.
(() => {
  const dlg = document.querySelector("dialog.lightbox");
  const links = [...document.querySelectorAll("a[data-lightbox]")];
  if (!dlg || !links.length || typeof HTMLDialogElement !== "function") return;

  const img = dlg.querySelector("img"), cap = dlg.querySelector("figcaption"), counter = dlg.querySelector(".lb-counter");
  const groups = new Map();
  for (const a of links) {
    const g = a.closest("[data-gallery], .drawing-grid, .snake, .prose, .drawing-strip") ?? document.body;
    (groups.get(g) ?? groups.set(g, []).get(g)).push(a);
  }
  let list = links, index = 0;

  const show = (n) => {
    index = (n + list.length) % list.length;
    const a = list[index];
    img.classList.remove("is-ready");
    img.src = a.href;
    img.alt = a.querySelector("img")?.alt || "";
    cap.textContent = a.dataset.caption || img.alt;
    counter.textContent = `${index + 1} / ${list.length}`;
    dlg.classList.toggle("is-single", list.length < 2);
    const ready = () => img.classList.add("is-ready");
    if (img.complete) ready(); else img.addEventListener("load", ready, { once: true });
    // Предварително зареждане на съседите
    for (const k of [index + 1, index - 1]) { const p = new Image(); p.src = list[(k + list.length) % list.length].href; }
  };
  const open = (a) => {
    list = [...groups.entries()].find(([, arr]) => arr.includes(a))?.[1] ?? links;
    show(list.indexOf(a));
    dlg.showModal();
    document.body.style.overflow = "hidden";
  };
  const close = () => { if (document.fullscreenElement) document.exitFullscreen?.(); dlg.close(); };

  links.forEach((a) => a.addEventListener("click", (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    open(a);
  }));
  dlg.querySelector(".lb-prev").addEventListener("click", () => show(index - 1));
  dlg.querySelector(".lb-next").addEventListener("click", () => show(index + 1));
  dlg.querySelector(".lb-close").addEventListener("click", close);
  const full = dlg.querySelector(".lb-full");
  if (!document.fullscreenEnabled) full.hidden = true;
  full.addEventListener("click", () => { if (document.fullscreenElement) document.exitFullscreen(); else dlg.requestFullscreen?.(); });
  document.addEventListener("fullscreenchange", () => {
    const fs = Boolean(document.fullscreenElement);
    dlg.classList.toggle("is-fullscreen", fs);
    full.setAttribute("aria-label", fs ? dlg.dataset.i18nExit : dlg.dataset.i18nFullscreen);
  });
  dlg.addEventListener("click", (e) => { if (e.target === dlg || e.target.tagName === "FIGURE") close(); });
  dlg.addEventListener("close", () => { document.body.style.overflow = ""; });
  dlg.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") show(index - 1);
    else if (e.key === "ArrowRight") show(index + 1);
    else if (e.key === "f" || e.key === "F") full.click();
  });
  // Свайп на телефон
  let x0 = null;
  dlg.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  dlg.addEventListener("touchend", (e) => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 50) show(index + (dx < 0 ? 1 : -1)); x0 = null; });
  // Отваряне по #hash (напр. /drawings/#fox)
  if (location.hash) { const a = document.querySelector(`[data-slug="${CSS.escape(location.hash.slice(1))}"] a[data-lightbox]`); if (a) open(a); }
})();
