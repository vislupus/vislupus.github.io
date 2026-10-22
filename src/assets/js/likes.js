// Реакции: харесвания (рисунки, песни) и прослушвания (песни) в Neon (виж neon.js и neon/schema.sql).
//   <button data-like="song:across-the-screen"><span class="like-count"></span></button>
//   <span data-plays="song:across-the-screen"><span data-plays-count></span></span>
(() => {
  const N = window.NeonData;
  const buttons = [...document.querySelectorAll("[data-like]")];
  const plays = [...document.querySelectorAll("[data-plays]")];
  if (!N || (!buttons.length && !plays.length)) return;
  const liked = new Set(N.store.get("liked") || []);
  const lang = document.documentElement.lang || "en";
  const fmt = (n) => new Intl.NumberFormat(lang).format(n);
  const setLikes = (key, n) => buttons.filter((b) => b.dataset.like === key).forEach((b) => { b.querySelector(".like-count").textContent = n > 0 ? fmt(n) : ""; });
  const setPlays = (key, n) => plays.filter((p) => p.dataset.plays === key).forEach((p) => { p.querySelector("[data-plays-count]").textContent = fmt(n); p.hidden = n <= 0; });
  buttons.forEach((b) => b.setAttribute("aria-pressed", String(liked.has(b.dataset.like))));
  const call = (fn, key) => { const [kind, slug] = key.split(":"); return N.rpc(fn, { p_kind: kind, p_slug: slug }); };

  if (N.enabled) {
    const keys = [...new Set([...buttons.map((b) => b.dataset.like), ...plays.map((p) => p.dataset.plays)])];
    const kinds = [...new Set(keys.map((k) => k.split(":")[0]))];
    N.select(`reactions?select=kind,slug,likes,plays&kind=in.(${kinds.join(",")})`)
      .then((rows) => rows.forEach((r) => { setLikes(`${r.kind}:${r.slug}`, Number(r.likes)); setPlays(`${r.kind}:${r.slug}`, Number(r.plays)); }))
      .catch(() => {});
  }

  buttons.forEach((b) => b.addEventListener("click", async () => {
    const key = b.dataset.like;
    const was = liked.has(key);
    if (was) liked.delete(key); else liked.add(key);
    N.store.set("liked", [...liked]);
    buttons.filter((x) => x.dataset.like === key).forEach((x) => x.setAttribute("aria-pressed", String(!was)));
    const local = Number(String(b.querySelector(".like-count").textContent).replace(/\D/g, "")) || 0;
    setLikes(key, Math.max(0, local + (was ? -1 : 1)));
    if (!N.enabled) return;
    try { const n = await call(was ? "remove_like" : "add_like", key); if (typeof n === "number") setLikes(key, n); } catch (err) { console.warn("[reactions] харесването не стигна до Neon:", err.message); }
  }));

  // Прослушване: плейърът праща събитие при първо пускане на песен (след 5 секунди).
  const counted = new Set();
  document.addEventListener("song:play", async (e) => {
    const key = `song:${e.detail}`;
    if (counted.has(key) || !N.enabled) return;
    counted.add(key);
    try { const n = await call("add_play", key); if (typeof n === "number") setPlays(key, n); } catch { /* ignore */ }
  });
})();
