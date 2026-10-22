// Карти с Leaflet. Всяка карта е <div class="map" data-lat data-lng data-zoom data-markers='[...]' data-route data-fit data-gpx>.
(() => {
  const L = window.L;
  if (!L) return;
  const dark = () => document.documentElement.dataset.scheme === "dark" || (document.documentElement.dataset.scheme !== "light" && matchMedia("(prefers-color-scheme: dark)").matches);
  const accent = () => getComputedStyle(document.documentElement).getPropertyValue("--c-accent").trim() || "#4f46e5";

  const parseGpx = (text) => {
    const doc = new DOMParser().parseFromString(text, "application/xml");
    return [...doc.querySelectorAll("trkpt, rtept")].map((p) => [Number(p.getAttribute("lat")), Number(p.getAttribute("lon"))]).filter((p) => !Number.isNaN(p[0]));
  };

  for (const el of document.querySelectorAll(".map[data-lat]:not([data-ready])")) {
    el.dataset.ready = "true";
    const center = [Number(el.dataset.lat), Number(el.dataset.lng)];
    const zoom = Number(el.dataset.zoom || 12);
    let markers = [];
    try { markers = JSON.parse(el.dataset.markers || "[]"); } catch { /* ignore */ }

    const map = L.map(el, { scrollWheelZoom: false }).setView(center, zoom);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(map);
    L.control.fullscreenBtn = null;

    const color = accent();
    const points = markers.map((m) => {
      const p = [Number(m.lat), Number(m.lng)];
      const mk = L.circleMarker(p, { radius: 7, color: "#fff", weight: 2, fillColor: color, fillOpacity: 1 }).addTo(map);
      const label = m.url ? `<a href="${m.url}">${m.label ?? ""}</a>` : m.label;
      if (label) mk.bindTooltip(label, { direction: "top", offset: [0, -6] });
      if (m.text) mk.bindPopup(`<strong>${m.label ?? ""}</strong><br>${m.text}`);
      return p;
    });
    if (el.dataset.route === "true" && points.length > 1) L.polyline(points, { color, weight: 3, dashArray: "6 7" }).addTo(map);
    if (el.dataset.fit === "true" && points.length > 1) map.fitBounds(points, { padding: [32, 32] });
    if (el.dataset.gpx) {
      fetch(el.dataset.gpx).then((r) => r.text()).then((t) => {
        const track = parseGpx(t);
        if (track.length > 1) { L.polyline(track, { color, weight: 4, opacity: .85 }).addTo(map); map.fitBounds(track, { padding: [24, 24] }); }
      }).catch(() => {});
    }
    map.once("focus", () => map.scrollWheelZoom.enable());
    el.addEventListener("click", () => map.scrollWheelZoom.enable(), { once: true });
    if (dark()) el.classList.add("is-dark");
  }
})();
