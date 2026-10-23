// Брояч на прегледите на публикация/проект в Neon: при отваряне вика add_view (веднъж на сесия за страница)
// и показва новия брой. Елементът: <span data-views data-page="blog:slug"><span data-views-count></span></span>
(() => {
  const box = document.querySelector("[data-views]");
  const N = window.NeonData;
  if (!box || !N || !N.enabled) return;
  const page = box.dataset.page;
  const lang = document.documentElement.lang || "en";
  const show = (n) => { box.querySelector("[data-views-count]").textContent = new Intl.NumberFormat(lang).format(n); box.hidden = false; };
  let seen = [];
  try { seen = JSON.parse(sessionStorage.getItem("viewed") || "[]"); } catch { /* ignore */ }
  const call = seen.includes(page)
    ? N.select(`page_views?select=views&page=eq.${encodeURIComponent(page)}`).then((rows) => rows[0]?.views)
    : N.rpc("add_view", { p_page: page }).then((n) => { try { sessionStorage.setItem("viewed", JSON.stringify([...seen, page])); } catch { /* ignore */ } return n; });
  call.then((n) => { if (typeof n === "number") show(n); }).catch(() => {});
})();
