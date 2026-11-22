// Графики с Chart.js ({% chart %} … {% endchart %} в Markdown). Chart.js се зарежда само на страници с графики
// (виж base.njk). Всяка графика се рисува, когато наближи екрана; при грешка под нея се показва съобщение.
//   <canvas data-chart='{конфигурация}' data-chart-options='{"colors":[…],"border":"#fff","borderWidth":2}'>
(() => {
  const canvases = [...document.querySelectorAll("canvas[data-chart]")];
  if (!canvases.length) return;
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const palette = () => [css("--c-accent"), css("--c-accent2"), css("--c-tip"), css("--c-warning"), css("--c-curious"), css("--c-danger"), css("--c-note"), css("--c-muted")];
  const alpha = (c, a) => (/^#[0-9a-f]{6}$/i.test(c) ? c + a : c);
  const charts = new Map();
  const fail = (cv, msg) => { const box = cv.closest(".chart-box"); if (box && !box.querySelector(".missing")) box.insertAdjacentHTML("beforeend", `<p class="missing">${msg}</p>`); console.warn("[chart]", msg); };

  const draw = (cv) => {
    const C = window.Chart;
    charts.get(cv)?.destroy();
    let cfg, o = {};
    try { cfg = JSON.parse(cv.dataset.chart); o = JSON.parse(cv.dataset.chartOptions || "{}") || {}; } catch (err) { return fail(cv, `невалидна конфигурация: ${err.message}`); }
    const colors = Array.isArray(o.colors) && o.colors.length ? o.colors : palette();
    const round = ["pie", "doughnut", "polarArea"].includes(cfg.type);
    const sets = cfg.data?.datasets ?? [];
    sets.forEach((d, i) => {
      const col = colors[i % colors.length];
      if (round) {
        d.backgroundColor ??= colors;
        d.borderColor ??= o.border ?? css("--c-bg");
        d.borderWidth ??= o.borderWidth ?? 2;
        d.hoverOffset ??= 6;
      } else if (cfg.type === "line" || cfg.type === "radar") {
        d.borderColor ??= col;
        d.backgroundColor ??= alpha(col, "26");
        d.borderWidth ??= o.borderWidth ?? 2.5;
        d.pointBackgroundColor ??= col;
        d.pointBorderColor ??= o.border ?? css("--c-bg");
        if (cfg.type === "line") { d.tension ??= .3; d.fill ??= true; d.pointRadius ??= 3; }
      } else {
        // стълбове и др.: при една серия и няколко зададени цвята – отделен цвят за всеки стълб
        const perBar = sets.length === 1 && Array.isArray(o.colors) && o.colors.length > 1;
        d.backgroundColor ??= perBar ? colors : alpha(col, "d9");
        d.borderColor ??= o.border ?? (perBar ? colors : col);
        d.borderWidth ??= o.borderWidth ?? 0;
        d.borderRadius ??= 4;
      }
    });
    cfg.options = { responsive: true, maintainAspectRatio: false, ...(cfg.options ?? {}) };
    cfg.options.plugins = { ...(cfg.options.plugins ?? {}) };
    cfg.options.plugins.legend = { position: "bottom", labels: { usePointStyle: true, boxWidth: 10, padding: 16 }, ...(o.legend === false ? { display: false } : {}), ...(cfg.options.plugins.legend ?? {}) };
    C.defaults.font.family = css("--font-body");
    C.defaults.font.size = 13;
    C.defaults.color = css("--c-muted");
    C.defaults.borderColor = css("--c-border");
    try { charts.set(cv, new C(cv, cfg)); cv.dataset.drawn = "true"; } catch (err) { fail(cv, `графиката не може да се нарисува: ${err.message}`); }
  };

  // Chart.js идва от <script defer> преди този файл; ако липсва (блокиран или бавна мрежа), пробваме още веднъж.
  const ensure = () => new Promise((res, rej) => {
    if (window.Chart) return res();
    const s = document.createElement("script"); s.src = "/assets/vendor/chart.umd.js"; s.onload = () => (window.Chart ? res() : rej(new Error("Chart.js не е наличен"))); s.onerror = () => rej(new Error("Chart.js не се зареди")); document.head.append(s);
  });
  const start = () => {
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver((entries) => { for (const en of entries) if (en.isIntersecting) { io.unobserve(en.target); draw(en.target); } }, { rootMargin: "400px 0px" });
      canvases.forEach((cv) => io.observe(cv));
    } else canvases.forEach(draw);
  };
  ensure().then(start).catch((err) => canvases.forEach((cv) => fail(cv, err.message)));
  const redraw = () => { if (window.Chart) canvases.filter((cv) => cv.dataset.drawn).forEach(draw); };
  document.addEventListener("schemechange", redraw);
  document.addEventListener("themechange", redraw);
})();
