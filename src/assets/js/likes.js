// Реакции: харесвания (рисунки, песни) и прослушвания (песни), записани в Neon през Data API
// (ролята anonymous; виж neon/schema.sql). Без зададен адрес на Data API харесванията остават само в браузъра.
//   <button data-like="song:across-the-screen"><span class="like-count"></span></button>
//   <span data-plays="song:across-the-screen"></span>
(() => {
  const api = document.documentElement.dataset.neonApi || "";
  const buttons = [...document.querySelectorAll("[data-like]")];
  const plays = [...document.querySelectorAll("[data-plays]")];
  if (!buttons.length && !plays.length) return;
  // Диагностика в конзолата (F12): какво липсва, ако харесванията не стигат до Neon.
  if (!api) console.info("[reactions] Няма Neon Data API адрес (NEON_DATA_API_URL / site.config.js → neon.dataApiUrl): харесванията остават само в браузъра.");
  else console.info(`[reactions] Neon Data API: ${api}`);

  // Data API иска JWT дори за анонимни заявки. Neon Auth издава кратковременен анонимен токен:
  //   GET https://<endpoint>.neonauth.<region>.neon.tech/<db>/auth/token/anonymous → { token, expires_at }
  // Адресът на Auth се извежда от адреса на Data API (.apirest. → .neonauth., /rest/v1 → /auth).
  const authUrl = document.documentElement.dataset.neonAuth || api.replace(".apirest.", ".neonauth.").replace(/\/rest\/v1\/?$/, "/auth");
  let tokenPromise = null;
  const getToken = () => {
    if (!api) return Promise.resolve(null);
    const cached = store.get("neon-anon-token");
    if (cached?.token && cached.expires_at * 1000 > Date.now() + 30_000) return Promise.resolve(cached.token);
    tokenPromise ??= fetch(`${authUrl}/token/anonymous`, { headers: { Accept: "application/json" } })
      .then(async (r) => {
        if (!r.ok) { console.warn(`[reactions] анонимен токен → HTTP ${r.status} от ${authUrl}/token/anonymous. Включи Neon Auth (Better Auth) за проекта.`); return null; }
        const d = await r.json();
        if (d?.token) store.set("neon-anon-token", d);
        return d?.token ?? null;
      })
      .catch((err) => { console.warn("[reactions] анонимен токен:", err.message); return null; })
      .finally(() => { tokenPromise = null; });
    return tokenPromise;
  };
  const headers = async (extra = {}) => { const t = await getToken(); return { Accept: "application/json", ...(t ? { Authorization: `Bearer ${t}` } : {}), ...extra }; };
  const store = { get: (k) => { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } } };
  const liked = new Set(store.get("liked") || []);
  const lang = document.documentElement.lang || "en";
  const fmt = (n) => new Intl.NumberFormat(lang).format(n);
  const split = (key) => key.split(":");
  const setLikes = (key, n) => buttons.filter((b) => b.dataset.like === key).forEach((b) => { b.querySelector(".like-count").textContent = n > 0 ? fmt(n) : ""; });
  const setPlays = (key, n) => plays.filter((p) => p.dataset.plays === key).forEach((p) => { p.querySelector("[data-plays-count]").textContent = fmt(n); p.hidden = n <= 0; });
  buttons.forEach((b) => b.setAttribute("aria-pressed", String(liked.has(b.dataset.like))));

  const rpc = async (fn, key) => {
    if (!api) return null;
    const [kind, slug] = split(key);
    const r = await fetch(`${api}/rpc/${fn}`, { method: "POST", headers: await headers({ "Content-Type": "application/json" }), body: JSON.stringify({ p_kind: kind, p_slug: slug }) });
    if (!r.ok) { console.warn(`[reactions] ${fn} → HTTP ${r.status}:`, await r.text()); throw new Error(`HTTP ${r.status}`); }
    return r.json();
  };

  // Актуални броячи
  if (api) {
    const keys = [...new Set([...buttons.map((b) => b.dataset.like), ...plays.map((p) => p.dataset.plays)])];
    const kinds = [...new Set(keys.map((k) => split(k)[0]))];
    headers().then((h) => fetch(`${api}/reactions?select=kind,slug,likes,plays&kind=in.(${kinds.join(",")})`, { headers: h }))
      .then(async (r) => { if (!r.ok) { console.warn(`[reactions] четене → HTTP ${r.status}:`, await r.text()); return []; } return r.json(); })
      .then((rows) => rows.forEach((r) => { setLikes(`${r.kind}:${r.slug}`, Number(r.likes)); setPlays(`${r.kind}:${r.slug}`, Number(r.plays)); }))
      .catch(() => {});
  }

  buttons.forEach((b) => b.addEventListener("click", async () => {
    const key = b.dataset.like;
    const was = liked.has(key);
    if (was) liked.delete(key); else liked.add(key);
    store.set("liked", [...liked]);
    buttons.filter((x) => x.dataset.like === key).forEach((x) => x.setAttribute("aria-pressed", String(!was)));
    const local = Number(String(b.querySelector(".like-count").textContent).replace(/\D/g, "")) || 0;
    setLikes(key, Math.max(0, local + (was ? -1 : 1)));
    try { const n = await rpc(was ? "remove_like" : "add_like", key); if (typeof n === "number") setLikes(key, n); } catch (err) { console.warn("[reactions] харесването не стигна до Neon:", err.message); }
  }));

  // Прослушване: плейърът праща събитие при първо пускане на песен в тази сесия.
  const counted = new Set();
  document.addEventListener("song:play", async (e) => {
    const key = `song:${e.detail}`;
    if (counted.has(key)) return;
    counted.add(key);
    try { const n = await rpc("add_play", key); if (typeof n === "number") setPlays(key, n); } catch { /* ignore */ }
  });
})();
