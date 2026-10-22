// Общи дребни неща: мобилно меню, меню за езика, светла/тъмна тема, преглед на дизайните,
// копиране на връзка, активна точка в съдържанието. Без библиотеки.
(() => {
  const html = document.documentElement;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const store = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } } };

  // Запомня езика на текущата страница – коренът на сайта (/) пренасочва към него.
  if (html.dataset.lang) store.set("lang", html.dataset.lang);

  // Мобилно меню
  const toggle = $(".nav-toggle"), nav = $("#site-nav");
  toggle?.addEventListener("click", () => {
    const open = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(open));
  });

  // Меню за езика
  const ls = $(".lang-switch");
  if (ls) {
    const btn = $("button", ls);
    btn.addEventListener("click", (e) => { e.stopPropagation(); const open = ls.classList.toggle("is-open"); btn.setAttribute("aria-expanded", String(open)); });
    document.addEventListener("click", () => { ls.classList.remove("is-open"); btn.setAttribute("aria-expanded", "false"); });
    ls.addEventListener("keydown", (e) => { if (e.key === "Escape") { ls.classList.remove("is-open"); btn.focus(); } });
  }

  // Светла/тъмна тема: auto → (противоположното на системната) → auto
  $(".scheme-toggle")?.addEventListener("click", () => {
    const systemDark = matchMedia("(prefers-color-scheme: dark)").matches;
    const current = html.dataset.scheme === "dark" || (html.dataset.scheme !== "light" && systemDark) ? "dark" : "light";
    const next = current === "dark" ? "light" : "dark";
    html.dataset.scheme = next;
    store.set("scheme", next);
    document.dispatchEvent(new CustomEvent("schemechange", { detail: next }));
  });

  // Преглед на трите дизайна (ако е включен в site.config.js → themePreview)
  const themeButtons = $$("[data-set-theme]");
  const syncTheme = () => themeButtons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.setTheme === html.dataset.theme)));
  themeButtons.forEach((b) => b.addEventListener("click", () => { html.dataset.theme = b.dataset.setTheme; store.set("theme", b.dataset.setTheme); syncTheme(); document.dispatchEvent(new CustomEvent("themechange", { detail: b.dataset.setTheme })); }));
  syncTheme();

  // Копиране на връзка (споделяне)
  $$("[data-copy]").forEach((b) => b.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(b.dataset.copy); } catch { /* ignore */ }
    const box = b.closest("[data-share]");
    box?.classList.add("is-copied");
    setTimeout(() => box?.classList.remove("is-copied"), 1800);
  }));

  // Активна точка в съдържанието при скрол
  const toc = $(".toc");
  if (toc && "IntersectionObserver" in window) {
    const links = new Map($$("a", toc).map((a) => [a.getAttribute("href").slice(1), a]));
    const io = new IntersectionObserver((entries) => {
      for (const en of entries) if (en.isIntersecting) { links.forEach((a) => a.classList.remove("is-active")); links.get(en.target.id)?.classList.add("is-active"); }
    }, { rootMargin: "-10% 0px -75% 0px" });
    links.forEach((_, id) => { const h = document.getElementById(id); if (h) io.observe(h); });
  }

  // Сгъваеми панели (стил и текст на песните): <button data-panel-toggle="id">
  $$("[data-panel-toggle]").forEach((b) => b.addEventListener("click", () => {
    const box = document.getElementById(b.dataset.panelToggle);
    if (!box) return;
    box.hidden = !box.hidden;
    b.setAttribute("aria-expanded", String(!box.hidden));
  }));
})();
