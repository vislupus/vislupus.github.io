// Shortcode-ове за Markdown файловете. Всички връщат HTML на един ред (празен ред би прекъснал HTML блока).
import { readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import Image from "@11ty/eleventy-img";
import EleventyFetch from "@11ty/eleventy-fetch";
import config from "../site.config.js";
import { getRepo } from "./github.js";
import { iconSvg } from "./icons.js";
import { escapeHtml, langColor, formatBytes } from "./format.js";
import { t, localeDate, localeNumber } from "./i18n.js";

const IMAGE_EXT = /\.(jpe?g|png|webp|avif|gif|tiff?)$/i;

/** Път към файл спрямо Markdown файла (или абсолютен спрямо src/). */
function resolveInput(ctx, file) {
  if (file.startsWith("/")) return path.join("src", file);
  const dir = path.dirname(ctx?.page?.inputPath ?? "src/index.njk");
  return path.join(dir, file);
}
/** Адрес в готовия сайт за файл, който се копира без промяна (виж addPassthroughCopy в eleventy.config.js). */
function resolveUrl(ctx, file) {
  if (/^https?:\/\//.test(file) || file.startsWith("/")) return file;
  const dir = path.dirname(ctx?.page?.inputPath ?? "src/index.njk").replace(/^\.?\/?src/, "");
  return path.posix.join("/", dir, file);
}

const lang = (ctx) => ctx?.ctx?.lang ?? ctx?.page?.lang ?? config.defaultLanguage;

export async function makeImage(src, { widths = [480, 960, 1600], formats = ["webp"] } = {}) {
  return Image(src, { widths, formats, outputDir: "./_site/img/", urlPath: "/img/", sharpWebpOptions: { quality: 82 } });
}

/** Метаданни за снимка (за изчислени данни – eleventyComputed), които после се рендират синхронно с pictureFromMeta. */
export async function imageMeta(file, widths = [480, 960, 1600]) {
  if (!file) return null;
  if (/^https?:\/\//.test(file)) return { remote: file };
  const input = file.startsWith("src/") ? file : path.join("src", file);
  if (!existsSync(input)) { console.warn(`[image] липсва ${file}`); return null; }
  const meta = await makeImage(input, { widths });
  const set = meta.webp;
  return { set: set.map((s) => ({ url: s.url, width: s.width, height: s.height, srcset: s.srcset })), full: set.at(-1).url, small: set[0] };
}

/** Снимка от метаданни (синхронно – може да се ползва в include/for без проблеми с async в Nunjucks). */
export function pictureFromMeta(meta, opts = {}) {
  if (!meta) return "";
  if (meta.remote) return `<img src="${escapeHtml(meta.remote)}" alt="${escapeHtml(opts.alt ?? "")}" loading="lazy" decoding="async"${opts.class ? ` class="${opts.class}"` : ""} eleventy:ignore>`;
  const img = `<img src="${meta.small.url}" srcset="${meta.set.map((s) => s.srcset).join(", ")}" sizes="${escapeHtml(opts.sizes ?? "(min-width: 48rem) 44rem, 100vw")}" width="${meta.small.width}" height="${meta.small.height}" alt="${escapeHtml(opts.alt ?? "")}" loading="${opts.eager ? "eager" : "lazy"}" decoding="async"${opts.class ? ` class="${opts.class}"` : ""} eleventy:ignore>`;
  if (opts.lightbox === undefined || opts.lightbox === null) return img;
  return `<a href="${meta.full}" data-lightbox data-caption="${escapeHtml(opts.lightbox ?? "")}" class="lightbox-link">${img}</a>`;
}

/** Картинка за споделяне (JPEG, точно 1200×630 – Facebook иска размерите да съвпадат) от локална снимка – адрес или "". */
export async function ogImageFrom(file, name = "") {
  if (!file) return "";
  if (/^https?:\/\//.test(file)) return file;
  const input = file.startsWith("src/") ? file : path.join("src", file);
  if (!existsSync(input)) return "";
  const { default: sharp } = await import("sharp");
  const { mkdir } = await import("node:fs/promises");
  const base = (name || path.basename(file, path.extname(file))).replace(/[^\w-]+/g, "-");
  const out = `cover-${base}.jpg`;
  await mkdir("./_site/og", { recursive: true });
  await sharp(input).resize(1200, 630, { fit: "cover", position: "attention" }).jpeg({ quality: 82 }).toFile(path.join("./_site/og", out));
  return `/og/${out}`;
}

function pictureHtml(meta, { alt = "", sizes = "(min-width: 48rem) 44rem, 100vw", cls = "" } = {}) {
  const set = meta.webp ?? Object.values(meta)[0];
  const small = set[0];
  return `<img src="${small.url}" srcset="${set.map((s) => s.srcset).join(", ")}" sizes="${sizes}" width="${small.width}" height="${small.height}" alt="${escapeHtml(alt)}" loading="lazy" decoding="async"${cls ? ` class="${cls}"` : ""} eleventy:ignore>`;
}

// ---------------------------------------------------------------------------
// {% figure "images/photo.jpg", "Надпис", { alt: "...", wide: true } %}
export async function figureShortcode(file, caption = "", opts = {}) {
  const input = resolveInput(this, file);
  if (!existsSync(input)) return `<p class="missing">[figure] липсва ${escapeHtml(file)}</p>`;
  const meta = await makeImage(input, { widths: [640, 1200, 2000] });
  const full = (meta.webp ?? Object.values(meta)[0]).at(-1);
  const alt = opts.alt ?? caption;
  return (
    `<figure class="figure${opts.wide ? " figure-wide" : ""}"><a href="${full.url}" data-lightbox data-caption="${escapeHtml(caption)}" class="lightbox-link">` +
    pictureHtml(meta, { alt, sizes: opts.wide ? "(min-width: 64rem) 60rem, 100vw" : undefined }) +
    `</a>${caption ? `<figcaption>${caption}</figcaption>` : ""}</figure>`
  );
}

// ---------------------------------------------------------------------------
// {% gallery "images/japan" %}            – всички снимки от папката (по азбучен ред)
// {% gallery ["images/a.jpg", "images/b.jpg"] %}
// {% gallery "images/japan", { captions: { "a.jpg": "Киото" }, columns: 3 } %}
export async function galleryShortcode(source, opts = {}) {
  let files = [];
  if (Array.isArray(source)) {
    files = source.map((f) => (typeof f === "string" ? { file: f } : f));
  } else {
    const dir = resolveInput(this, source);
    if (!existsSync(dir)) return `<p class="missing">[gallery] липсва папка ${escapeHtml(source)}</p>`;
    const names = (await readdir(dir)).filter((n) => IMAGE_EXT.test(n)).sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
    files = names.map((n) => ({ file: path.posix.join(source, n), caption: opts.captions?.[n] }));
  }
  const items = await Promise.all(
    files.map(async ({ file, caption = "" }) => {
      const input = resolveInput(this, file);
      if (!existsSync(input)) return `<li class="missing">[gallery] липсва ${escapeHtml(file)}</li>`;
      const meta = await makeImage(input, { widths: [480, 960, 2000] });
      const set = meta.webp;
      const full = set.at(-1);
      const thumbs = set.filter((s) => s.width <= 960);
      const small = thumbs[0];
      const ratio = small.width / small.height;
      return (
        `<li style="--ratio:${ratio.toFixed(3)}"><a href="${full.url}" data-lightbox data-caption="${escapeHtml(caption)}" class="lightbox-link">` +
        `<img src="${small.url}" srcset="${thumbs.map((s) => s.srcset).join(", ")}" sizes="(min-width: 64rem) 20rem, (min-width: 40rem) 45vw, 100vw" width="${small.width}" height="${small.height}" alt="${escapeHtml(caption || path.basename(file))}" loading="lazy" decoding="async" eleventy:ignore>` +
        `</a>${caption ? `<span class="gallery-caption">${escapeHtml(caption)}</span>` : ""}</li>`
      );
    })
  );
  const cols = opts.columns ? ` style="--cols:${Number(opts.columns)}"` : "";
  const cls = opts.layout === "masonry" ? "gallery gallery-masonry" : "gallery";
  return `<ul class="${cls}"${cols} data-gallery>${items.join("")}</ul>`;
}

// ---------------------------------------------------------------------------
// {% map { lat: 42.2, lng: 23.3, zoom: 13, markers: [{ lat, lng, label, url }], route: true, fit: true, caption: "..", gpx: "files/track.gpx" } %}
export function mapShortcode({ lat, lng, zoom = 12, markers = [], route = false, fit = false, caption = "", height, gpx } = {}) {
  const L = lang(this);
  const first = markers[0] ?? {};
  lat ??= first.lat; lng ??= first.lng;
  const osm = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=${zoom}/${lat}/${lng}`;
  const label = caption ? `${t("ui.map", L)}: ${caption}` : t("ui.map", L);
  const gpxUrl = gpx ? resolveUrl(this, gpx) : "";
  return (
    `<figure class="map-figure"><div class="map" role="region" aria-label="${escapeHtml(label)}"` +
    ` data-lat="${lat}" data-lng="${lng}" data-zoom="${zoom}" data-markers="${escapeHtml(JSON.stringify(markers))}"` +
    ` data-route="${Boolean(route)}" data-fit="${Boolean(fit)}"${gpxUrl ? ` data-gpx="${escapeHtml(gpxUrl)}"` : ""}${height ? ` style="height:${escapeHtml(height)}"` : ""}></div>` +
    `<figcaption>${caption ? `<span>${escapeHtml(caption)}</span>` : ""}<a href="${osm}" target="_blank" rel="noopener">${iconSvg("map-pin", { size: 14 })} ${t("ui.openOnMap", L)}</a>` +
    (gpxUrl ? ` <a href="${gpxUrl}" download>${iconSvg("download", { size: 14 })} GPX</a>` : "") +
    `</figcaption></figure>`
  );
}

// ---------------------------------------------------------------------------
export function repoMetaHtml(repo, L = config.defaultLanguage) {
  const items = [];
  if (repo.language)
    items.push(`<li><span class="lang-dot" style="--lang:${langColor[repo.language] ?? "var(--c-muted)"}"></span>${escapeHtml(repo.language)}</li>`);
  items.push(`<li title="${t("projects.stars", L)}">${iconSvg("star", { size: 14 })} ${localeNumber(repo.stars, L)}</li>`);
  if (repo.forks > 0) items.push(`<li title="${t("projects.forks", L)}">${iconSvg("git-fork", { size: 14 })} ${localeNumber(repo.forks, L)}</li>`);
  if (repo.pushedAt) items.push(`<li>${iconSvg("clock", { size: 14 })} ${localeDate(repo.pushedAt, L, "short")}</li>`);
  return `<ul class="repo-meta">${items.join("")}</ul>`;
}

// {% repo "owner/name" %} – карта на хранилище с данни от GitHub API (при билда).
export async function repoShortcode(fullName) {
  const L = lang(this);
  const repo = await getRepo(fullName);
  if (!repo)
    return `<aside class="repo-card is-offline">${iconSvg("github", { size: 20 })}<a class="repo-name" href="https://github.com/${escapeHtml(fullName)}" target="_blank" rel="noopener">${escapeHtml(fullName)}</a></aside>`;
  return (
    `<aside class="repo-card"><div class="repo-head">${iconSvg("github", { size: 20 })}<a class="repo-name" href="${repo.url}" target="_blank" rel="noopener" data-track="repo:${escapeHtml(repo.fullName)}">${escapeHtml(repo.fullName)}</a></div>` +
    (repo.description ? `<p class="repo-desc">${escapeHtml(repo.description)}</p>` : "") +
    repoMetaHtml(repo, L) +
    `</aside>`
  );
}

// ---------------------------------------------------------------------------
// {% youtube "dQw4w9WgXcQ", "Заглавие" %} – леко вграждане: снимка + бутон, iframe се зарежда при клик.
export function youtubeShortcode(id, title = "YouTube", opts = {}) {
  const L = lang(this);
  const vid = String(id).replace(/^.*(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{11}).*$/, "$1");
  const start = opts.start ? `&start=${Number(opts.start)}` : "";
  return (
    `<figure class="video-embed"><div class="yt" data-yt="${escapeHtml(vid)}" data-start="${escapeHtml(start)}">` +
    `<img src="https://i.ytimg.com/vi/${escapeHtml(vid)}/hqdefault.jpg" alt="${escapeHtml(title)}" loading="lazy" decoding="async" eleventy:ignore>` +
    `<button type="button" class="yt-play" aria-label="${escapeHtml(t("songs.play", L))}: ${escapeHtml(title)}">${iconSvg("play", { size: 28 })}</button></div>` +
    `<figcaption>${iconSvg("youtube", { size: 14 })} <a href="https://www.youtube.com/watch?v=${escapeHtml(vid)}" target="_blank" rel="noopener">${escapeHtml(title)}</a></figcaption></figure>`
  );
}

// {% iframe "https://example.com/embed", { title: "...", ratio: "16/9", height: "480px" } %}
export function iframeShortcode(src, opts = {}) {
  const style = opts.height ? ` style="--h:${escapeHtml(opts.height)}"` : "";
  const ratio = opts.ratio ? ` style="aspect-ratio:${escapeHtml(opts.ratio)}"` : "";
  return (
    `<figure class="iframe-embed${opts.height ? " has-height" : ""}"${style}><div class="iframe-box"${ratio}>` +
    `<iframe src="${escapeHtml(src)}" title="${escapeHtml(opts.title ?? "Embedded content")}" loading="lazy" allowfullscreen referrerpolicy="strict-origin-when-cross-origin" sandbox="${escapeHtml(opts.sandbox ?? "allow-scripts allow-same-origin allow-popups allow-forms")}"></iframe></div>` +
    (opts.caption ? `<figcaption>${escapeHtml(opts.caption)}</figcaption>` : "") +
    `</figure>`
  );
}

// {% embed %}<iframe ...></iframe>{% endembed %} – произволен HTML в адаптивна рамка
export function embedPaired(content, opts = {}) {
  return `<figure class="iframe-embed"><div class="iframe-box"${opts.ratio ? ` style="aspect-ratio:${escapeHtml(opts.ratio)}"` : ""}>${content.trim()}</div>${opts.caption ? `<figcaption>${escapeHtml(opts.caption)}</figcaption>` : ""}</figure>`;
}

// ---------------------------------------------------------------------------
// {% download "files/route.gpx", "GPX маршрут" %} – бутон за сваляне (файлът се копира както е).
export async function downloadShortcode(file, label = "", opts = {}) {
  const L = lang(this);
  const url = resolveUrl(this, file);
  let size = "";
  const input = resolveInput(this, file);
  if (!/^https?:/.test(file) && existsSync(input)) {
    try { size = formatBytes((await stat(input)).size); } catch { /* ignore */ }
  }
  const name = label || path.basename(file);
  const ext = path.extname(file).slice(1).toUpperCase();
  return (
    `<a class="download-card" href="${escapeHtml(url)}" download data-track="download:${escapeHtml(path.basename(file))}">` +
    `<span class="download-icon">${iconSvg(opts.icon ?? "file-down", { size: 26 })}</span>` +
    `<span class="download-text"><strong>${escapeHtml(name)}</strong><small>${t("ui.download", L)}${ext ? ` · ${ext}` : ""}${size ? ` · ${size}` : ""}</small></span>` +
    `<span class="download-arrow">${iconSvg("download", { size: 20 })}</span></a>`
  );
}

// {% video "files/clip.mp4", { poster: "images/poster.jpg", caption: "...", loop: true } %}
export function videoShortcode(file, opts = {}) {
  const url = resolveUrl(this, file);
  const poster = opts.poster ? ` poster="${escapeHtml(resolveUrl(this, opts.poster))}"` : "";
  const attrs = `${opts.autoplay ? " autoplay muted playsinline" : ""}${opts.loop ? " loop" : ""}`;
  return (
    `<figure class="video-figure"><video controls preload="metadata"${poster}${attrs} src="${escapeHtml(url)}"></video>` +
    (opts.caption ? `<figcaption>${escapeHtml(opts.caption)}</figcaption>` : "") + `</figure>`
  );
}

// ---------------------------------------------------------------------------
// {% link "https://example.com" %} или {% link "https://...", { title, description, image } %}
// Карта на връзка: при билда чете <title>, og:description и og:image от страницата (кеш 7 дни).
async function fetchMeta(url) {
  try {
    const html = await EleventyFetch(url, { duration: "7d", type: "text", fetchOptions: { headers: { "User-Agent": "Mozilla/5.0 (compatible; vislupus-site)" }, signal: AbortSignal.timeout(10_000) } });
    const pick = (re) => { const m = html.match(re); return m ? m[1].trim() : ""; };
    const meta = (p) => pick(new RegExp(`<meta[^>]+(?:property|name)=["']${p}["'][^>]+content=["']([^"']+)["']`, "i")) || pick(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${p}["']`, "i"));
    return {
      title: meta("og:title") || pick(/<title[^>]*>([^<]+)<\/title>/i),
      description: meta("og:description") || meta("description"),
      image: meta("og:image"),
    };
  } catch {
    return {};
  }
}
export async function linkShortcode(url, opts = {}) {
  const meta = { ...(await fetchMeta(url)), ...opts };
  let host = url;
  try { host = new URL(url).hostname.replace(/^www\./, ""); } catch { /* ignore */ }
  const decode = (s = "") => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
  const img = meta.image ? `<span class="link-card-image"><img src="${escapeHtml(decode(meta.image))}" alt="" loading="lazy" decoding="async" eleventy:ignore></span>` : "";
  return (
    `<a class="link-card" href="${escapeHtml(url)}" target="_blank" rel="noopener" data-track="link:${escapeHtml(host)}">` +
    `<span class="link-card-body"><strong>${escapeHtml(decode(meta.title || url))}</strong>` +
    (meta.description ? `<span class="link-card-desc">${escapeHtml(decode(meta.description))}</span>` : "") +
    `<span class="link-card-host">${iconSvg("link", { size: 14 })} ${escapeHtml(host)}</span></span>${img}</a>`
  );
}

// {% button "/en/projects/", "Текст", { icon: "arrow-right", primary: true } %}
export function buttonShortcode(href, label, opts = {}) {
  const ext = /^https?:\/\//.test(href);
  return `<a class="btn${opts.primary ? " btn-primary" : ""}" href="${escapeHtml(href)}"${ext ? ' target="_blank" rel="noopener"' : ""}>${opts.icon ? iconSvg(opts.icon, { size: 18 }) : ""}<span>${escapeHtml(label)}</span></a>`;
}

// {% picture "src/content/drawings/images/fox.jpg", { alt: "...", sizes: "...", lightbox: "надпис", widths: [480, 960], class: "x" } %}
// Снимка в няколко размера (WebP) с връзка към голямата версия за lightbox-а. Пътят е спрямо корена на проекта
// (src/...) или спрямо текущия файл (images/...).
export async function pictureShortcode(file, opts = {}) {
  if (!file) return "";
  if (/^https?:\/\//.test(file)) {
    return `<img src="${escapeHtml(file)}" alt="${escapeHtml(opts.alt ?? "")}" loading="lazy" decoding="async"${opts.class ? ` class="${opts.class}"` : ""} eleventy:ignore>`;
  }
  const input = file.startsWith("src/") ? file : resolveInput(this, file);
  if (!existsSync(input)) return `<p class="missing">[picture] липсва ${escapeHtml(file)}</p>`;
  const meta = await makeImage(input, { widths: opts.widths ?? [480, 960, 1600] });
  const set = meta.webp;
  const full = set.at(-1);
  const small = set[0];
  const img = `<img src="${small.url}" srcset="${set.map((s) => s.srcset).join(", ")}" sizes="${escapeHtml(opts.sizes ?? "(min-width: 48rem) 44rem, 100vw")}" width="${small.width}" height="${small.height}" alt="${escapeHtml(opts.alt ?? "")}" loading="${opts.eager ? "eager" : "lazy"}" decoding="async"${opts.class ? ` class="${opts.class}"` : ""} eleventy:ignore>`;
  if (opts.lightbox === undefined) return img;
  return `<a href="${full.url}" data-lightbox data-caption="${escapeHtml(opts.lightbox ?? "")}" class="lightbox-link">${img}</a>`;
}

// Картинка за споделяне от снимката на страницата (1200 px, JPEG – за социалните мрежи). Връща адрес или "".
export async function ogFromImageShortcode(file) {
  if (!file) return "";
  if (/^https?:\/\//.test(file)) return file;
  const input = file.startsWith("src/") ? file : resolveInput(this, file);
  if (!existsSync(input)) return "";
  const meta = await Image(input, { widths: [1200], formats: ["jpeg"], outputDir: "./_site/img/", urlPath: "/img/", sharpJpegOptions: { quality: 80 } });
  return meta.jpeg[0].url;
}
