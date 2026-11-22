// Карти с Leaflet. Всяка карта е <div class="map" data-lat data-lng data-zoom data-markers='[...]' …>
// (виж {% map %} в lib/shortcodes.js). Маркер: { lat, lng, label, text, url, by, show, dir }.
//   by   – с какво се стига до точката (plane, train, bus, ship, car, walk, bike): линията и иконката по средата ѝ
//   show – балончето с името се вижда постоянно (или data-labels="true" за всички)
//   dir  – накъде да е балончето: top | bottom | left | right
(() => {
  const L = window.L;
  if (!L) { console.warn("[map] Leaflet не се зареди."); return; }
  const css = (v, fallback) => getComputedStyle(document.documentElement).getPropertyValue(v).trim() || fallback;

  const parseGpx = (text) => {
    const doc = new DOMParser().parseFromString(text, "application/xml");
    return [...doc.querySelectorAll("trkpt, rtept")].map((p) => [Number(p.getAttribute("lat")), Number(p.getAttribute("lon"))]).filter((p) => !Number.isNaN(p[0]));
  };
  // Дъга между две точки (за полетите): квадратична крива с контролна точка встрани от средата.
  const arc = (a, b, bend = 0.18, steps = 32) => {
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = b[0] - a[0], dy = b[1] - a[1];
    const cx = mx - dy * bend, cy = my + dx * bend, pts = [];
    for (let i = 0; i <= steps; i++) { const t = i / steps, u = 1 - t; pts.push([u * u * a[0] + 2 * u * t * cx + t * t * b[0], u * u * a[1] + 2 * u * t * cy + t * t * b[1]]); }
    return pts;
  };

  for (const el of document.querySelectorAll(".map[data-lat]:not([data-ready])")) {
    el.dataset.ready = "true";
    const center = [Number(el.dataset.lat), Number(el.dataset.lng)];
    const zoom = Number(el.dataset.zoom || 12);
    let markers = [], icons = {};
    try { markers = JSON.parse(el.dataset.markers || "[]"); } catch { /* ignore */ }
    try { icons = JSON.parse(el.dataset.icons || "{}"); } catch { /* ignore */ }
    const allLabels = el.dataset.labels === "true", defaultBy = el.dataset.by || "";

    const map = L.map(el, { scrollWheelZoom: false }).setView(center, zoom);
    L.tileLayer(el.dataset.tiles || "https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: el.dataset.attribution || "&copy; OpenStreetMap" }).addTo(map);

    const color = css("--c-accent", "#0d9488");
    const points = markers.map((m) => [Number(m.lat), Number(m.lng)]);
    const bounds = [...points];

    // Отсечките между точките – според транспорта
    if (el.dataset.route === "true" && points.length > 1) {
      for (let i = 1; i < points.length; i++) {
        const mode = markers[i].by ?? defaultBy;
        const line = mode === "plane" ? arc(points[i - 1], points[i]) : [points[i - 1], points[i]];
        L.polyline(line, { className: `map-leg${mode ? ` by-${mode}` : ""}`, color, weight: 3, dashArray: mode ? null : "6 7", interactive: false }).addTo(map);
        bounds.push(...line);
        if (mode && icons[mode]) {
          const mid = line[Math.floor(line.length / 2)];
          const at = line.length > 2 ? mid : [(points[i - 1][0] + points[i][0]) / 2, (points[i - 1][1] + points[i][1]) / 2];
          L.marker(at, { interactive: false, keyboard: false, icon: L.divIcon({ className: `map-leg-icon by-${mode}`, html: icons[mode], iconSize: [26, 26], iconAnchor: [13, 13] }) }).addTo(map);
        }
      }
    }
    // Точките с балончета
    markers.forEach((m, i) => {
      const mk = L.circleMarker(points[i], { radius: 7, color: "#fff", weight: 2, fillColor: color, fillOpacity: 1, className: "map-point" }).addTo(map);
      const label = m.url ? `<a href="${m.url}">${m.label ?? ""}</a>` : m.label;
      const permanent = Boolean(m.show ?? allLabels);
      if (label) mk.bindTooltip(label, { permanent, interactive: Boolean(m.url), direction: m.dir || (permanent ? "auto" : "top"), offset: m.dir === "bottom" ? [0, 8] : m.dir === "left" ? [-8, 0] : m.dir === "right" || (permanent && !m.dir) ? [8, 0] : [0, -8], className: "map-label" });
      if (m.text) mk.bindPopup(`<strong>${m.label ?? ""}</strong><br>${m.text}`);
    });
    if (el.dataset.fit === "true" && bounds.length > 1) map.fitBounds(bounds, { padding: [36, 36] });
    if (el.dataset.gpx) {
      fetch(el.dataset.gpx).then((r) => r.text()).then((t) => {
        const track = parseGpx(t);
        if (track.length > 1) { L.polyline(track, { color, weight: 4, opacity: .85, className: "map-track" }).addTo(map); map.fitBounds(track, { padding: [24, 24] }); }
      }).catch(() => {});
    }
    map.once("focus", () => map.scrollWheelZoom.enable());
    el.addEventListener("click", () => map.scrollWheelZoom.enable(), { once: true });
    // Ако картата е била скрита или с друга ширина при зареждането, размерът се преизчислява.
    if ("ResizeObserver" in window) new ResizeObserver(() => map.invalidateSize()).observe(el);
  }
})();
