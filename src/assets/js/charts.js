// Графики с Chart.js (```chart в Markdown с JSON конфигурация). Зарежда се само където има графика.
(() => {
  const canvases = [...document.querySelectorAll("canvas[data-chart]")];
  if (!canvases.length) return;
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const palette = () => [css("--c-accent"), css("--c-accent2"), css("--c-tip"), css("--c-warning"), css("--c-curious"), css("--c-danger"), css("--c-note")];
  const charts = [];

  const build = () => {
    const C = window.Chart;
    C.defaults.font.family = css("--font-body");
    C.defaults.color = css("--c-muted");
    C.defaults.borderColor = css("--c-border");
    charts.splice(0).forEach((c) => c.destroy());
    const colors = palette();
    for (const cv of canvases) {
      let cfg;
      try { cfg = JSON.parse(cv.dataset.chart); } catch { cv.replaceWith(Object.assign(document.createElement("p"), { className: "missing", textContent: "chart: невалиден JSON" })); continue; }
      (cfg.data?.datasets ?? []).forEach((d, i) => {
        const col = colors[i % colors.length];
        d.borderColor ??= col;
        d.backgroundColor ??= cfg.type === "line" ? col + "33" : (cfg.type === "pie" || cfg.type === "doughnut" || cfg.type === "polarArea" ? colors : col + "cc");
        if (cfg.type === "line") { d.tension ??= .3; d.fill ??= true; d.pointRadius ??= 3; }
      });
      cfg.options = { responsive: true, maintainAspectRatio: false, ...(cfg.options ?? {}) };
      charts.push(new C(cv, cfg));
    }
  };
  const load = () => new Promise((res, rej) => {
    if (window.Chart) return res();
    const s = document.createElement("script"); s.src = "/assets/vendor/chart.umd.js"; s.onload = res; s.onerror = rej; document.head.append(s);
  });
  load().then(build).catch(() => {});
  document.addEventListener("schemechange", build);
  document.addEventListener("themechange", build);
})();
