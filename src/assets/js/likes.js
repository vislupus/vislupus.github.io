// Харесвания на рисунките, записани в Neon през Data API (ролята anonymous; виж neon/schema.sql).
// Без зададен адрес на Data API харесванията се пазят само в браузъра.
(() => {
  const buttons = [...document.querySelectorAll("[data-like]")];
  if (!buttons.length) return;
  const api = document.documentElement.dataset.neonApi || "";
  const store = { get: (k) => { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } } };
  const liked = new Set(store.get("liked-drawings") || []);
  const lang = document.documentElement.lang || "en";
  const fmt = (n) => new Intl.NumberFormat(lang).format(n);
  const setCount = (slug, n) => buttons.filter((b) => b.dataset.like === slug).forEach((b) => { b.querySelector(".like-count").textContent = n > 0 ? fmt(n) : ""; });
  buttons.forEach((b) => b.setAttribute("aria-pressed", String(liked.has(b.dataset.like))));

  // Актуални броячи
  if (api) {
    const slugs = [...new Set(buttons.map((b) => b.dataset.like))];
    fetch(`${api}/drawing_likes?select=slug,likes&slug=in.(${slugs.map(encodeURIComponent).join(",")})`, { headers: { Accept: "application/json" } })
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) => rows.forEach((r) => setCount(r.slug, Number(r.likes))))
      .catch(() => {});
  }

  buttons.forEach((b) => b.addEventListener("click", async () => {
    const slug = b.dataset.like;
    const was = liked.has(slug);
    if (was) liked.delete(slug); else liked.add(slug);
    store.set("liked-drawings", [...liked]);
    buttons.filter((x) => x.dataset.like === slug).forEach((x) => x.setAttribute("aria-pressed", String(!was)));
    const countEl = b.querySelector(".like-count");
    const local = Number(String(countEl.textContent).replace(/\D/g, "")) || 0;
    setCount(slug, Math.max(0, local + (was ? -1 : 1)));
    if (!api) return;
    try {
      const r = await fetch(`${api}/rpc/${was ? "unlike_drawing" : "like_drawing"}`, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ p_slug: slug }) });
      if (r.ok) { const n = await r.json(); if (typeof n === "number") setCount(slug, n); }
    } catch { /* офлайн – остава локално */ }
  }));
})();
