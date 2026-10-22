// Mermaid диаграми (```mermaid в Markdown). Библиотеката се зарежда само на страници с диаграми
// и се пререндира при смяна на светла/тъмна тема.
(() => {
  const blocks = [...document.querySelectorAll("pre.mermaid")];
  if (!blocks.length) return;
  blocks.forEach((b) => { b.dataset.source = b.textContent; });
  const isDark = () => document.documentElement.dataset.scheme === "dark" || (document.documentElement.dataset.scheme !== "light" && matchMedia("(prefers-color-scheme: dark)").matches);
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

  const render = async () => {
    const m = window.mermaid;
    m.initialize({
      startOnLoad: false,
      theme: isDark() ? "dark" : "neutral",
      securityLevel: "strict",
      fontFamily: css("--font-body"),
      look: document.documentElement.dataset.theme === "sketch" ? "handDrawn" : "classic",
      themeVariables: { primaryColor: css("--c-surface2"), primaryTextColor: css("--c-text"), primaryBorderColor: css("--c-accent"), lineColor: css("--c-muted"), fontFamily: css("--font-body") },
    });
    for (const b of blocks) {
      try {
        const { svg } = await m.render(`mmd-${Math.random().toString(36).slice(2)}`, b.dataset.source);
        b.innerHTML = svg;
      } catch (err) { b.textContent = `Mermaid: ${err.message}`; }
    }
  };
  const load = () => new Promise((res, rej) => {
    if (window.mermaid) return res();
    const s = document.createElement("script"); s.src = "/assets/vendor/mermaid.min.js"; s.onload = res; s.onerror = rej; document.head.append(s);
  });
  load().then(render).catch(() => {});
  document.addEventListener("schemechange", render);
  document.addEventListener("themechange", render);
})();
