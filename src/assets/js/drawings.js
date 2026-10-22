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

  // Змиевидна линия: редове според ширината; четните редове са обърнати; годината се показва при смяна.
  let lastWidth = 0;
  function layoutSnake() {
    if (!snake || snake.closest("[hidden]")) return;
    const visible = items.filter((i) => !i.classList.contains("is-hidden"));
    const cellRem = 12, gapRem = 1, rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const available = (snake.parentElement?.clientWidth || snake.clientWidth);
    const perRow = Math.max(1, Math.floor((available - 2 * rem) / ((cellRem + gapRem) * rem)));
    lastWidth = available;
    snake.classList.add("is-ready");
    const frag = document.createDocumentFragment();
    let year = null;
    const cols = Math.min(perRow, visible.length);
    snake.style.width = `${cols * (cellRem + gapRem) - gapRem + 2}rem`;
    for (let r = 0; r * perRow < visible.length; r++) {
      const row = document.createElement("div");
      row.className = `snake-row${r % 2 ? " is-reverse" : ""}${(r + 1) * perRow >= visible.length ? " is-last" : ""}`;
      for (const it of visible.slice(r * perRow, (r + 1) * perRow)) {
        it.classList.toggle("is-year-start", it.dataset.year !== year);
        year = it.dataset.year;
        row.append(it);
      }
      frag.append(row);
    }
    items.filter((i) => i.classList.contains("is-hidden")).forEach((i) => frag.append(i));
    snake.replaceChildren(frag);
  }
  addEventListener("resize", () => { if (snake && Math.abs((snake.parentElement?.clientWidth || snake.clientWidth) - lastWidth) > 40) layoutSnake(); });
  try { const v = localStorage.getItem("drawings-view"); if (v) tabs.find((t) => t.dataset.view === v)?.click(); } catch { /* ignore */ }
  layoutSnake();
})();
