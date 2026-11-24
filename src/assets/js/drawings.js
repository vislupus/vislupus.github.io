// Рисунки: превключване галерия/линия на времето, филтър по техника и змиевидна подредба на линията.
(() => {
  const root = document.querySelector("[data-drawings]");
  if (!root) return;
  const panels = [...root.querySelectorAll("[data-view-panel]")];
  const tabs = [...root.querySelectorAll("[data-view]")];
  const chips = [...root.querySelectorAll("[data-filter]")];
  const snake = root.querySelector("[data-snake]");
  const items = snake ? [...snake.querySelectorAll(".snake-item")] : [];
  let filter = "all";

  const applyFilter = () => {
    root.querySelectorAll(".drawing-card").forEach((c) => c.classList.toggle("is-hidden", filter !== "all" && c.dataset.medium !== filter));
    items.forEach((i) => i.classList.toggle("is-hidden", filter !== "all" && i.dataset.medium !== filter));
    layoutSnake();
  };
  tabs.forEach((t) => t.addEventListener("click", () => {
    tabs.forEach((x) => x.setAttribute("aria-selected", String(x === t)));
    panels.forEach((p) => { p.hidden = p.dataset.viewPanel !== t.dataset.view; });
    try { localStorage.setItem("drawings-view", t.dataset.view); } catch { /* ignore */ }
    layoutSnake();
  }));
  chips.forEach((c) => c.addEventListener("click", () => { filter = c.dataset.filter; chips.forEach((x) => x.setAttribute("aria-pressed", String(x === c))); applyFilter(); }));

  // Змиевидна линия на времето. Чете се отдолу нагоре: най-старата рисунка е долу вляво, редът се пълни надясно,
  // следващият ред е над него и върви наляво и т.н. – най-новите са най-горе. Нова рисунка заема следващото
  // свободно място, а линията стига точно до нея. Линията е една SVG крива през центровете на рисунките.
  const NS = "http://www.w3.org/2000/svg";
  let lastWidth = 0, line = null, chrono = [];
  function layoutSnake() {
    if (!snake || snake.closest("[hidden]")) return;
    const visible = items.filter((i) => !i.classList.contains("is-hidden"));
    chrono = [...visible].reverse(); // в HTML най-новите са първи
    snake.classList.add("is-ready");
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const available = snake.parentElement?.clientWidth || snake.clientWidth;
    const turn = parseFloat(getComputedStyle(snake).paddingLeft) || 2 * rem; // място за завоя от двете страни
    const gap = rem;
    let cell = 12 * rem;
    let perRow = Math.floor((available - 2 * turn + gap) / (cell + gap));
    if (perRow < 2) { cell = Math.max(6 * rem, Math.min(cell, (available - 2 * turn - gap) / 2)); perRow = Math.max(1, Math.floor((available - 2 * turn + gap) / (cell + gap))); }
    lastWidth = available;
    snake.style.setProperty("--cell", `${cell}px`);
    snake.style.setProperty("--cols", String(Math.min(perRow, Math.max(chrono.length, 1))));

    const rows = [];
    let year = null;
    chrono.forEach((it, i) => {
      it.classList.toggle("is-year-start", it.dataset.year !== year);
      year = it.dataset.year;
      const r = Math.floor(i / perRow);
      it.dataset.row = String(r);
      if (!rows[r]) { rows[r] = document.createElement("div"); rows[r].className = `snake-row${r % 2 ? " is-reverse" : ""}`; }
      rows[r].append(it); // четните редове вървят наляво → надясно, нечетните обратно (flex-direction: row-reverse)
    });
    line = document.createElementNS(NS, "svg");
    line.setAttribute("class", "snake-line");
    line.setAttribute("aria-hidden", "true");
    line.append(document.createElementNS(NS, "path"));
    const frag = document.createDocumentFragment();
    frag.append(line, ...rows.reverse()); // най-новият ред е най-отгоре
    items.filter((i) => i.classList.contains("is-hidden")).forEach((i) => frag.append(i));
    snake.replaceChildren(frag);
    drawLine();
  }
  function drawLine() {
    if (!line || !chrono.length || snake.closest("[hidden]")) return;
    const box = snake.getBoundingClientRect();
    const turn = parseFloat(getComputedStyle(snake).paddingLeft) || 32;
    const pts = chrono.map((it) => { const r = (it.querySelector("img") ?? it).getBoundingClientRect(); return { x: r.left - box.left + r.width / 2, y: r.top - box.top + r.height / 2, hw: r.width / 2, row: Number(it.dataset.row) }; });
    const f = (n) => n.toFixed(1);
    let d = `M${f(pts[0].x)} ${f(pts[0].y)}`;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      if (a.row !== b.row) {
        // Завой към горния ред: навън от рисунката, заоблено нагоре и обратно навътре.
        const dir = a.row % 2 ? -1 : 1;
        const out = Math.max(12, turn - 10);
        const X = a.x + dir * (a.hw + out);
        const r = Math.max(4, Math.min((a.y - b.y) / 2, out));
        const sweep = dir > 0 ? 0 : 1;
        d += ` L${f(X - dir * r)} ${f(a.y)} A${f(r)} ${f(r)} 0 0 ${sweep} ${f(X)} ${f(a.y - r)} L${f(X)} ${f(b.y + r)} A${f(r)} ${f(r)} 0 0 ${sweep} ${f(X - dir * r)} ${f(b.y)}`;
      }
      d += ` L${f(b.x)} ${f(b.y)}`;
    }
    line.setAttribute("viewBox", `0 0 ${f(box.width)} ${f(box.height)}`);
    line.firstChild.setAttribute("d", d);
  }
  addEventListener("resize", () => { if (snake && Math.abs((snake.parentElement?.clientWidth || snake.clientWidth) - lastWidth) > 24) layoutSnake(); else drawLine(); });
  if (snake && "ResizeObserver" in window) { let raf = 0; new ResizeObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(drawLine); }).observe(snake); }
  document.fonts?.ready?.then(drawLine);
  try { const v = localStorage.getItem("drawings-view"); if (v) tabs.find((t) => t.dataset.view === v)?.click(); } catch { /* ignore */ }
  layoutSnake();
})();
