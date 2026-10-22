// Общ достъп до Neon Data API от браузъра (харесвания, прослушвания, коментари).
// Data API иска JWT и за анонимни заявки; Neon Auth издава кратковременен анонимен токен
// (GET …/auth/token/anonymous → { token, expires_at }), който се кешира тук.
window.NeonData = (() => {
  const api = document.documentElement.dataset.neonApi || "";
  const authUrl = document.documentElement.dataset.neonAuth || api.replace(".apirest.", ".neonauth.").replace(/\/rest\/v1\/?$/, "/auth");
  const store = { get: (k) => { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } } };
  if (!api) console.info("[neon] Няма Data API адрес (NEON_DATA_API_URL / site.config.js → neon.dataApiUrl): реакциите и коментарите не стигат до Neon.");
  let tokenPromise = null;
  const getToken = () => {
    if (!api) return Promise.resolve(null);
    const cached = store.get("neon-anon-token");
    if (cached?.token && cached.expires_at * 1000 > Date.now() + 30_000) return Promise.resolve(cached.token);
    tokenPromise ??= fetch(`${authUrl}/token/anonymous`, { headers: { Accept: "application/json" } })
      .then(async (r) => {
        if (!r.ok) { console.warn(`[neon] анонимен токен → HTTP ${r.status} от ${authUrl}/token/anonymous. Включи Neon Auth (Better Auth) за проекта.`); return null; }
        const d = await r.json();
        if (d?.token) store.set("neon-anon-token", d);
        return d?.token ?? null;
      })
      .catch((err) => { console.warn("[neon] анонимен токен:", err.message); return null; })
      .finally(() => { tokenPromise = null; });
    return tokenPromise;
  };
  const headers = async (extra = {}) => { const t = await getToken(); return { Accept: "application/json", ...(t ? { Authorization: `Bearer ${t}` } : {}), ...extra }; };
  /** GET /<table>?<query> → редове */
  const select = async (path) => {
    if (!api) return [];
    const r = await fetch(`${api}/${path}`, { headers: await headers() });
    if (!r.ok) { console.warn(`[neon] ${path} → HTTP ${r.status}:`, await r.text()); return []; }
    return r.json();
  };
  /** POST /rpc/<fn> с JSON параметри → резултат; хвърля при грешка */
  const rpc = async (fn, params) => {
    if (!api) throw new Error("no api");
    const r = await fetch(`${api}/rpc/${fn}`, { method: "POST", headers: await headers({ "Content-Type": "application/json" }), body: JSON.stringify(params) });
    if (!r.ok) { const t = await r.text(); console.warn(`[neon] ${fn} → HTTP ${r.status}:`, t); let msg = t; try { msg = JSON.parse(t).message || t; } catch { /* ignore */ } throw new Error(msg); }
    return r.json();
  };
  return { enabled: Boolean(api), api, select, rpc, store };
})();
