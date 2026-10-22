// Брояч на прегледите от GoatCounter (JSON брояч). В GoatCounter → Settings трябва да е включено
// „Allow adding visitor counts on your website“. Ако няма данни, броячът остава скрит.
(() => {
  const box = document.querySelector("[data-views]");
  const script = document.querySelector("script[data-goatcounter]");
  if (!box || !script) return;
  const site = script.dataset.goatcounter.replace(/\/count$/, "");
  const path = location.pathname;
  fetch(`${site}/counter/${encodeURIComponent(path)}.json`, { credentials: "omit" })
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => {
      if (!d || !d.count) return;
      const n = String(d.count).replace(/\s/g, "");
      const lang = document.documentElement.lang || "en";
      box.querySelector("[data-views-count]").textContent = Number.isNaN(Number(n)) ? d.count : new Intl.NumberFormat(lang).format(Number(n));
      box.hidden = false;
    })
    .catch(() => {});
})();
