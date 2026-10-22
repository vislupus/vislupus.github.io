// Коментари в Neon: списък от изгледа comments_public и форма, която вика add_comment (виж neon/schema.sql).
(() => {
  const root = document.querySelector("[data-comments]");
  const N = window.NeonData;
  if (!root || !N) return;
  const t = JSON.parse(root.dataset.i18n || "{}");
  const page = root.dataset.page, lang = document.documentElement.dataset.lang || "en";
  const list = root.querySelector("[data-comments-list]"), form = root.querySelector("form"), status = root.querySelector("[data-comments-status]");
  const countEl = root.querySelector("[data-comments-count]");
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const fmtDate = (d) => new Intl.DateTimeFormat(document.documentElement.lang || "en", { dateStyle: "long", timeStyle: "short" }).format(new Date(d));
  const initial = (name) => esc(String(name).trim().slice(0, 1).toUpperCase() || "?");
  const paragraphs = (body) => esc(body).split(/\n{2,}/).map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`).join("");
  let replyTo = null;

  if (!N.enabled) { status.textContent = t.unavailable; form.hidden = true; return; }

  const render = (rows) => {
    const byParent = new Map();
    for (const r of rows) (byParent.get(r.parent_id ?? 0) ?? byParent.set(r.parent_id ?? 0, []).get(r.parent_id ?? 0)).push(r);
    const item = (r, depth) => `<li class="comment${depth ? " is-reply" : ""}" id="comment-${r.id}">
      <div class="comment-avatar" aria-hidden="true">${initial(r.name)}</div>
      <div class="comment-main">
        <p class="comment-meta"><strong>${esc(r.name)}</strong> <time datetime="${esc(r.created_at)}">${fmtDate(r.created_at)}</time></p>
        <div class="comment-body">${paragraphs(r.body)}</div>
        ${depth ? "" : `<button type="button" class="comment-reply" data-reply="${r.id}" data-name="${esc(r.name)}">${t.reply}</button>`}
        ${(byParent.get(r.id) ?? []).length ? `<ul class="comment-replies">${(byParent.get(r.id) ?? []).map((c) => item(c, depth + 1)).join("")}</ul>` : ""}
      </div></li>`;
    const top = byParent.get(0) ?? [];
    list.innerHTML = top.map((r) => item(r, 0)).join("");
    if (countEl) countEl.textContent = rows.length ? `(${rows.length})` : "";
    status.textContent = rows.length ? "" : t.none;
    list.querySelectorAll("[data-reply]").forEach((b) => b.addEventListener("click", () => {
      replyTo = Number(b.dataset.reply);
      form.querySelector("[data-reply-note]").hidden = false;
      form.querySelector("[data-reply-name]").textContent = b.dataset.name;
      form.querySelector("textarea").focus();
      form.scrollIntoView({ behavior: "smooth", block: "center" });
    }));
  };
  const load = () => N.select(`comments_public?select=id,parent_id,name,body,created_at&page=eq.${encodeURIComponent(page)}&order=created_at.asc`).then(render).catch(() => { status.textContent = t.unavailable; });
  load();

  const nameInput = form.querySelector('[name="name"]');
  nameInput.value = N.store.get("comment-name") || "";
  form.querySelector("[data-reply-cancel]").addEventListener("click", () => { replyTo = null; form.querySelector("[data-reply-note]").hidden = true; });
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (form.querySelector('[name="website"]').value) return; // капан за ботове
    const name = nameInput.value.trim(), body = form.querySelector("textarea").value.trim();
    if (!name || body.length < 2) return;
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true; status.textContent = t.sending;
    try {
      const r = await N.rpc("add_comment", { p_page: page, p_name: name, p_body: body, p_parent: replyTo, p_lang: lang, p_url: location.pathname });
      N.store.set("comment-name", name);
      form.querySelector("textarea").value = ""; replyTo = null; form.querySelector("[data-reply-note]").hidden = true;
      status.textContent = r?.approved === false ? t.moderated : t.posted;
      if (r?.approved !== false) await load();
      if (window.goatcounter?.count) window.goatcounter.count({ path: "comment:" + page, title: document.title, event: true });
    } catch (err) {
      status.textContent = `${t.error} (${err.message})`;
    } finally { btn.disabled = false; }
  });
})();
