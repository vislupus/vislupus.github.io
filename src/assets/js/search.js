// Търсачка без библиотеки: зарежда /<език>/search-index.json и търси по заглавие, описание, етикети и текст.
(() => {
  const form = document.querySelector("[data-search]");
  if (!form) return;
  const input = form.querySelector("input"), status = form.querySelector(".search-status"), out = document.querySelector("[data-search-results]");
  let index = null, loading = null;
  const load = () => (loading ??= fetch(form.dataset.index).then((r) => r.json()).then((d) => (index = d)));
  const norm = (s) => String(s ?? "").toLowerCase().normalize("NFKC");
  const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const mark = (text, terms) => { let h = esc(text); for (const t of terms) h = h.replace(new RegExp(`(${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"), "<mark>$1</mark>"); return h; };
  const snippet = (text, terms) => { const low = norm(text); let i = -1; for (const t of terms) { i = low.indexOf(t); if (i >= 0) break; } const start = Math.max(0, i - 70); return (start > 0 ? "…" : "") + text.slice(start, start + 200) + (start + 200 < text.length ? "…" : ""); };

  const run = () => {
    const q = norm(input.value).trim();
    const terms = q.split(/\s+/).filter((t) => t.length >= (/[぀-ヿ一-鿿]/.test(t) ? 1 : 2));
    if (!terms.length) { out.innerHTML = ""; status.textContent = form.dataset.hint; return; }
    const hits = index.map((it) => {
      const title = norm(it.title), desc = norm(it.description), tags = norm((it.tags || []).join(" ")), text = norm(it.text), series = norm(it.series);
      let score = 0;
      for (const t of terms) {
        if (title.includes(t)) score += 10;
        if (tags.includes(t)) score += 6;
        if (series.includes(t)) score += 4;
        if (desc.includes(t)) score += 3;
        if (text.includes(t)) score += 1;
      }
      const all = terms.every((t) => title.includes(t) || tags.includes(t) || desc.includes(t) || text.includes(t) || series.includes(t));
      return { it, score: all ? score : 0 };
    }).filter((h) => h.score > 0).sort((a, b) => b.score - a.score || (b.it.date > a.it.date ? 1 : -1)).slice(0, 50);
    status.textContent = hits.length ? `${hits.length} ${form.dataset.results}` : form.dataset.none;
    out.innerHTML = hits.map(({ it }) => `<li><h3><span class="result-type">${esc(it.type)}</span><a href="${esc(it.url)}">${mark(it.title, terms)}</a></h3><p>${mark(it.description || snippet(it.text || "", terms), terms)}</p>${it.date ? `<p><small>${esc(it.date)}</small></p>` : ""}</li>`).join("");
  };
  let t;
  input.addEventListener("input", () => { clearTimeout(t); t = setTimeout(() => load().then(run), 120); });
  input.addEventListener("focus", load, { once: true });
  const q = new URLSearchParams(location.search).get("q");
  if (q) { input.value = q; load().then(run); }
})();
