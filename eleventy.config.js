// Конфигурация на Eleventy. Настройките на сайта са в site.config.js, текстовете – в src/_data/i18n.js.
import { HtmlBasePlugin, IdAttributePlugin } from "@11ty/eleventy";
import { feedPlugin } from "@11ty/eleventy-plugin-rss";
import syntaxHighlight from "@11ty/eleventy-plugin-syntaxhighlight";
import { eleventyImageTransformPlugin } from "@11ty/eleventy-img";
import site from "./site.config.js";
import { createMarkdown } from "./lib/markdown.js";
import { iconSvg } from "./lib/icons.js";
import { t, localeDate, localeNumber, isoDate, languages, defaultLang, byCode } from "./lib/i18n.js";
import { readingTime, excerpt, stripHtml, slugify, formatDuration, formatBytes, langColor, escapeHtml } from "./lib/format.js";
import * as sc from "./lib/shortcodes.js";
import { registerOg, generateOgImages } from "./lib/og.js";

export default function (eleventyConfig) {
  // --- Файлове, които се копират без промяна -------------------------------
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets", "src/favicon.svg": "favicon.svg", "src/robots.txt": "robots.txt" });
  eleventyConfig.addPassthroughCopy({
    // Шрифтове (Roboto и Roboto Mono, променливи, само woff2)
    "node_modules/@fontsource-variable/roboto/files/roboto-{latin,latin-ext,cyrillic,cyrillic-ext,greek}-wght-{normal,italic}.woff2": "assets/fonts",
    "node_modules/@fontsource-variable/roboto-mono/files/roboto-mono-{latin,latin-ext,cyrillic,cyrillic-ext,greek}-wght-normal.woff2": "assets/fonts",
    // Библиотеки, които се зареждат само на страниците, където трябват
    "node_modules/leaflet/dist/leaflet.js": "assets/vendor/leaflet/leaflet.js",
    "node_modules/leaflet/dist/leaflet.css": "assets/vendor/leaflet/leaflet.css",
    "node_modules/leaflet/dist/images": "assets/vendor/leaflet/images",
    "node_modules/katex/dist/katex.min.css": "assets/vendor/katex/katex.min.css",
    "node_modules/katex/dist/fonts/*.woff2": "assets/vendor/katex/fonts",
    "node_modules/mermaid/dist/mermaid.min.js": "assets/vendor/mermaid.min.js",
    "node_modules/chart.js/dist/chart.umd.js": "assets/vendor/chart.umd.js",
  });
  // Файлове за сваляне, видео и т.н. в папките на съдържанието се копират със същия път (/content/...).
  eleventyConfig.addPassthroughCopy("src/content/**/*.{gpx,kml,pdf,zip,csv,json,txt,mp4,webm,mp3,ogg,ipynb,py,svg}");
  eleventyConfig.addWatchTarget("./site.config.js");
  eleventyConfig.setServerOptions({ showAllHosts: true });

  // --- Плъгини ---------------------------------------------------------------
  eleventyConfig.addPlugin(HtmlBasePlugin);
  eleventyConfig.addPlugin(IdAttributePlugin);
  eleventyConfig.addPlugin(syntaxHighlight, { preAttributes: { tabindex: 0 } });
  eleventyConfig.addPlugin(eleventyImageTransformPlugin, {
    // Всяка <img> в HTML-а (и от Markdown) става WebP в няколко размера със srcset.
    extensions: "html",
    formats: ["webp"],
    widths: [480, 960, 1600],
    outputDir: "./_site/img/",
    urlPath: "/img/",
    sharpWebpOptions: { quality: 82 },
    htmlOptions: { imgAttributes: { loading: "lazy", decoding: "async", sizes: "(min-width: 48rem) 44rem, 100vw" } },
  });
  for (const l of languages) {
    eleventyConfig.addPlugin(feedPlugin, {
      type: "atom",
      outputPath: `/${l.code}/feed.xml`,
      inputPath: `feed-${l.code}.njk`,
      collection: { name: `posts_${l.code}`, limit: 20 },
      metadata: { language: l.hreflang, title: site.title, subtitle: t("siteTagline", l.code), base: `${site.url}/${l.code}/`, author: { name: site.author.name } },
    });
  }

  // --- Markdown ----------------------------------------------------------------
  const md = createMarkdown();
  eleventyConfig.setLibrary("md", md);
  // Езикът на страницата стига до рендера на Markdown (за заглавията на секциите).
  eleventyConfig.addFilter("markdown", (s, lang) => (s ? md.render(String(s), { lang }) : ""));
  eleventyConfig.addFilter("markdownInline", (s) => (s ? md.renderInline(String(s)) : ""));

  // --- Колекции ----------------------------------------------------------------
  const published = (p) => !p.data.draft || process.env.ELEVENTY_RUN_MODE === "serve";
  const byDateDesc = (a, b) => b.date - a.date;
  eleventyConfig.addCollection("posts", (api) => api.getFilteredByGlob("src/content/blog/**/*.md").filter(published).sort(byDateDesc));
  for (const l of languages) {
    eleventyConfig.addCollection(`posts_${l.code}`, (api) =>
      api.getFilteredByGlob("src/content/blog/**/*.md").filter(published).filter((p) => p.data.lang === l.code).sort(byDateDesc)
    );
  }
  eleventyConfig.addCollection("pages", (api) => api.getFilteredByGlob("src/content/pages/**/*.md"));
  eleventyConfig.addCollection("projectNotes", (api) => api.getFilteredByGlob("src/content/projects/**/*.md"));
  eleventyConfig.addCollection("drawings", (api) => api.getFilteredByGlob("src/content/drawings/**/*.md").filter(published).sort(byDateDesc));
  // Описания на генерираните страници (по една за всеки език): списък на блога по страници, етикети, поредици.
  const postsOf = (api, code) => api.getFilteredByGlob("src/content/blog/**/*.md").filter(published).filter((p) => p.data.lang === code).sort(byDateDesc);
  eleventyConfig.addCollection("blogPages", (api) => {
    const out = [];
    const size = site.blog.postsPerPage;
    for (const l of languages) {
      const posts = postsOf(api, l.code);
      const total = Math.max(1, Math.ceil(posts.length / size));
      for (let i = 0; i < total; i++) out.push({ lang: l.code, number: i + 1, total, posts: posts.slice(i * size, (i + 1) * size), url: i === 0 ? `/${l.code}/blog/` : `/${l.code}/blog/page/${i + 1}/`, prev: i > 0 ? (i === 1 ? `/${l.code}/blog/` : `/${l.code}/blog/page/${i}/`) : null, next: i + 1 < total ? `/${l.code}/blog/page/${i + 2}/` : null });
    }
    return out;
  });
  eleventyConfig.addCollection("tagPages", (api) => {
    const out = [];
    for (const l of languages) {
      const map = new Map();
      for (const p of postsOf(api, l.code)) for (const tg of p.data.tags ?? []) (map.get(tg) ?? map.set(tg, []).get(tg)).push(p);
      for (const [tag, posts] of map) out.push({ lang: l.code, tag, slug: slugify(tag), posts, url: `/${l.code}/tags/${slugify(tag)}/` });
    }
    return out;
  });
  eleventyConfig.addCollection("seriesPages", (api) => {
    const out = [];
    for (const l of languages) {
      const map = new Map();
      for (const p of postsOf(api, l.code)) if (p.data.series) (map.get(p.data.series) ?? map.set(p.data.series, []).get(p.data.series)).push(p);
      for (const [name, posts] of map) out.push({ lang: l.code, name, slug: slugify(name), posts: posts.sort((a, b) => a.date - b.date), description: posts.find((p) => p.data.seriesDescription)?.data.seriesDescription ?? "", url: `/${l.code}/series/${slugify(name)}/` });
    }
    return out;
  });
  // Всичко с translationKey – за превключвателя на езика.
  eleventyConfig.addCollection("translatable", (api) => api.getAll().filter((p) => p.data.translationKey));

  // --- Филтри ------------------------------------------------------------------
  eleventyConfig.addFilter("t", (key, lang, vars) => t(key, lang, vars));
  eleventyConfig.addFilter("localeDate", localeDate);
  eleventyConfig.addFilter("localeNumber", localeNumber);
  eleventyConfig.addFilter("isoDate", isoDate);
  eleventyConfig.addFilter("readingTime", readingTime);
  eleventyConfig.addFilter("excerpt", excerpt);
  eleventyConfig.addFilter("stripHtml", stripHtml);
  eleventyConfig.addFilter("slugify", slugify);
  eleventyConfig.addFilter("duration", formatDuration);
  eleventyConfig.addFilter("bytes", formatBytes);
  eleventyConfig.addFilter("escape", escapeHtml);
  eleventyConfig.addFilter("langColor", (l) => langColor[l] ?? "var(--c-muted)");
  eleventyConfig.addFilter("json", (v) => JSON.stringify(v ?? null));
  eleventyConfig.addFilter("jsonAttr", (v) => escapeHtml(JSON.stringify(v ?? null)));
  eleventyConfig.addFilter("includes", (html, needle) => String(html ?? "").includes(needle));
  eleventyConfig.addFilter("keys", (o) => Object.keys(o ?? {}));
  eleventyConfig.addFilter("values", (o) => Object.values(o ?? {}));
  eleventyConfig.addFilter("inLang", (items, lang) => (items ?? []).filter((p) => p.data.lang === lang));
  eleventyConfig.addFilter("withTag", (posts, tag) => (posts ?? []).filter((p) => (p.data.tags ?? []).includes(tag)));
  eleventyConfig.addFilter("withSeries", (posts, s) => (posts ?? []).filter((p) => p.data.series === s).sort((a, b) => a.date - b.date));
  eleventyConfig.addFilter("limit", (arr, n) => (arr ?? []).slice(0, n));
  eleventyConfig.addFilter("shuffle", (arr) => [...(arr ?? [])].sort(() => Math.random() - 0.5));
  eleventyConfig.addFilter("where", (arr, key, val) => (arr ?? []).filter((x) => (x?.data?.[key] ?? x?.[key]) === val));
  eleventyConfig.addFilter("sortBy", (arr, key, dir = "asc") =>
    [...(arr ?? [])].sort((a, b) => {
      const av = a?.data?.[key] ?? a?.[key]; const bv = b?.data?.[key] ?? b?.[key];
      return (av > bv ? 1 : av < bv ? -1 : 0) * (dir === "desc" ? -1 : 1);
    })
  );
  // Многоезични полета: title може да е "Текст" или { en: "...", bg: "...", jp: "..." }
  eleventyConfig.addFilter("ml", (v, lang) => (v && typeof v === "object" ? v[lang] ?? v[defaultLang] ?? Object.values(v)[0] ?? "" : v ?? ""));
  eleventyConfig.addFilter("toAbsolute", (u) => (u ? (/^https?:/.test(u) ? u : `${site.url}${u.startsWith("/") ? "" : "/"}${u}`) : ""));
  eleventyConfig.addFilter("langLabel", (code) => byCode[code]?.label ?? code);
  eleventyConfig.addFilter("hreflang", (code) => byCode[code]?.hreflang ?? code);

  // Етикети с брой за даден език
  eleventyConfig.addFilter("tagList", (posts) => {
    const counts = new Map();
    for (const p of posts ?? []) for (const tg of p.data.tags ?? []) counts.set(tg, (counts.get(tg) ?? 0) + 1);
    return [...counts].map(([name, count]) => ({ name, slug: slugify(name), count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  });
  // Поредици с брой части
  eleventyConfig.addFilter("seriesList", (posts) => {
    const map = new Map();
    for (const p of posts ?? []) if (p.data.series) {
      const s = map.get(p.data.series) ?? { name: p.data.series, slug: slugify(p.data.series), posts: [] };
      s.posts.push(p); map.set(p.data.series, s);
    }
    return [...map.values()].map((s) => ({ ...s, posts: s.posts.sort((a, b) => a.date - b.date), count: s.posts.length }));
  });
  // Свързани статии: общи етикети (и същата поредица), без текущата
  eleventyConfig.addFilter("related", (posts, url, tagList = [], series = "", n = site.blog.relatedCount) => {
    const tags = new Set(tagList ?? []);
    return (posts ?? [])
      .filter((p) => p.url !== url)
      .map((p) => ({ p, score: (p.data.tags ?? []).filter((x) => tags.has(x)).length + (series && p.data.series === series ? 2 : 0) }))
      .filter((x) => x.score > 0).sort((a, b) => b.score - a.score || b.p.date - a.p.date).slice(0, n).map((x) => x.p);
  });
  // Преводите на страница: { en: url, bg: url, jp: url }
  eleventyConfig.addFilter("translations", (all, page) => {
    const out = {};
    if (!page?.data?.translationKey) return out;
    for (const p of all ?? []) if (p.data.translationKey === page.data.translationKey && p.data.section === page.data.section) out[p.data.lang] = p.url;
    return out;
  });
  // Съдържание (TOC) от h2/h3
  eleventyConfig.addFilter("toc", (html) => {
    const items = [];
    const re = /<h([23])[^>]*id="([^"]+)"[^>]*>([\s\S]*?)<\/h\1>/g;
    let m;
    while ((m = re.exec(html ?? ""))) items.push({ level: Number(m[1]), id: m[2], text: stripHtml(m[3].replace(/<a[^>]*class="heading-anchor"[^>]*>[\s\S]*?<\/a>/, "")) });
    return items;
  });
  // README от GitHub: относителните връзки и снимки стават абсолютни към хранилището; първото H1 се маха (вече е заглавие).
  eleventyConfig.addFilter("readme", (text, pr) => {
    if (!text) return "";
    const base = `https://github.com/${pr.fullName}/blob/${pr.defaultBranch}/`;
    const rawBase = `https://raw.githubusercontent.com/${pr.fullName}/${pr.defaultBranch}/`;
    const fix = (u, isImg) => (/^(https?:|#|mailto:|data:)/.test(u) ? u : (isImg ? rawBase : base) + u.replace(/^\.?\//, ""));
    let html = md.render(String(text).replace(/^\s*#\s+[^\n]+\n/, ""), { lang: pr.lang });
    html = html.replace(/(<img[^>]+src=")([^"]+)/g, (_, a, u) => a + fix(u, true)).replace(/(<a[^>]+href=")([^"]+)/g, (_, a, u) => a + fix(u, false));
    // Снимките от README не минават през lightbox/Eleventy Image (външни са).
    return html.replace(/<a href="[^"]*" class="lightbox-link"[^>]*>(<img[^>]*>)<\/a>/g, "$1").replace(/<img /g, '<img eleventy:ignore ');
  });
  eleventyConfig.addFilter("ogImage", (page, data) => registerOg({ url: page.url, title: data.title, subtitle: data.subtitle, section: data.section, lang: data.lang }));

  // --- Shortcode-ове ----------------------------------------------------------
  eleventyConfig.addShortcode("icon", (name, size, cls, label) => iconSvg(name, { size, cls, label }));
  eleventyConfig.addShortcode("map", sc.mapShortcode);
  eleventyConfig.addAsyncShortcode("repo", sc.repoShortcode);
  eleventyConfig.addAsyncShortcode("gallery", sc.galleryShortcode);
  eleventyConfig.addAsyncShortcode("figure", sc.figureShortcode);
  eleventyConfig.addShortcode("youtube", sc.youtubeShortcode);
  eleventyConfig.addShortcode("iframe", sc.iframeShortcode);
  eleventyConfig.addPairedShortcode("embed", sc.embedPaired);
  eleventyConfig.addAsyncShortcode("download", sc.downloadShortcode);
  eleventyConfig.addShortcode("video", sc.videoShortcode);
  eleventyConfig.addAsyncShortcode("link", sc.linkShortcode);
  eleventyConfig.addShortcode("button", sc.buttonShortcode);
  eleventyConfig.addShortcode("year", () => String(new Date().getFullYear()));
  eleventyConfig.addAsyncShortcode("picture", sc.pictureShortcode);
  // Синхронен вариант за include/for (метаданните идват от eleventyComputed → imageMeta в *.11tydata.js)
  eleventyConfig.addFilter("picture", sc.pictureFromMeta);

  // --- След билда: картинки за споделяне ---------------------------------------
  eleventyConfig.on("eleventy.after", async ({ dir }) => {
    await generateOgImages(dir.output);
  });
}

export const config = {
  dir: { input: "src", output: "_site", includes: "_includes", data: "_data" },
  markdownTemplateEngine: "njk",
  htmlTemplateEngine: "njk",
  pathPrefix: process.env.PATH_PREFIX || "/",
};
