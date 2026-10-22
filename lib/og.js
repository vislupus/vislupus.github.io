// Картинки за споделяне (Open Graph, 1200×630) – генерират се при билда със sharp от SVG.
// Ако страницата има собствена снимка (image във front matter), тя се ползва вместо генерираната.
import { mkdir, writeFile, access } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import config from "../site.config.js";
import { escapeHtml } from "./format.js";

// Шрифтовете за картинките (Roboto + Noto Sans JP за японски) се теглят веднъж в .cache/fonts
// от хранилището google/fonts; без тях се ползва системен шрифт.
const FONT_DIR = path.resolve(".cache/fonts");
const FONTS = {
  "Roboto.ttf": "https://raw.githubusercontent.com/google/fonts/main/ofl/roboto/Roboto%5Bwdth%2Cwght%5D.ttf",
  "NotoSansJP.ttf": "https://raw.githubusercontent.com/google/fonts/main/ofl/notosansjp/NotoSansJP%5Bwght%5D.ttf",
};
async function ensureFonts() {
  await mkdir(FONT_DIR, { recursive: true });
  for (const [name, url] of Object.entries(FONTS)) {
    const file = path.join(FONT_DIR, name);
    if (existsSync(file)) continue;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await writeFile(file, Buffer.from(await res.arrayBuffer()));
    } catch (err) {
      console.warn(`[og] шрифтът ${name} не можа да се изтегли (${err.message}) – ползвам системен.`);
    }
  }
  const conf = path.join(FONT_DIR, "fonts.conf");
  await writeFile(conf, `<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig><dir>${FONT_DIR}</dir><include ignore_missing="yes">/etc/fonts/fonts.conf</include><cachedir>${path.join(FONT_DIR, "fc-cache")}</cachedir></fontconfig>
`);
  process.env.FONTCONFIG_FILE ||= conf;
}

const registry = new Map();

/** Регистрира страница за OG картинка и връща адреса ѝ. Вика се от base.njk. */
export function registerOg({ url, title, subtitle = "", section = "", lang = "en" }) {
  const slug = (url || "/").replace(/^\/|\/$/g, "").replace(/[^\wÀ-￿-]+/g, "-") || "home";
  const file = `${slug}.png`;
  registry.set(file, { title, subtitle, section, lang });
  return `/og/${file}`;
}

function wrap(text, max) {
  const words = String(text).split(/\s+/);
  const lines = []; let line = "";
  for (const w of words) {
    // Японски: без интервали – режем по знаци
    if (w.length > max) { for (let i = 0; i < w.length; i += max) { if (line) { lines.push(line); line = ""; } lines.push(w.slice(i, i + max)); } continue; }
    if ((line + " " + w).trim().length > max) { lines.push(line.trim()); line = w; } else line = `${line} ${w}`;
  }
  if (line.trim()) lines.push(line.trim());
  return lines.slice(0, 4);
}

function svg({ title, subtitle, section, lang }) {
  const c = config.colors[config.theme]?.dark ?? config.colors.modern.dark;
  const isJp = lang === "jp";
  const max = isJp ? 18 : 30;
  const lines = wrap(title, max);
  const fs = lines.length > 2 ? 56 : 68;
  const font = isJp ? "'Noto Sans JP', 'Noto Sans CJK JP', 'Roboto', 'DejaVu Sans', sans-serif" : "'Roboto', 'DejaVu Sans', 'Liberation Sans', sans-serif";
  const titleSvg = lines.map((l, i) => `<tspan x="80" dy="${i === 0 ? 0 : fs * 1.18}">${escapeHtml(l)}</tspan>`).join("");
  const sub = subtitle ? wrap(subtitle, isJp ? 36 : 70).slice(0, 2).map((l, i) => `<tspan x="80" dy="${i === 0 ? 0 : 34}">${escapeHtml(l)}</tspan>`).join("") : "";
  const titleY = 630 - 200 - (lines.length - 1) * fs * 1.18 - (sub ? 60 : 0);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c.bg}"/><stop offset="1" stop-color="${c.surface2}"/></linearGradient>
    <radialGradient id="a" cx="85%" cy="15%" r="60%"><stop offset="0" stop-color="${c.accent}" stop-opacity=".55"/><stop offset="1" stop-color="${c.accent}" stop-opacity="0"/></radialGradient>
    <radialGradient id="b" cx="10%" cy="100%" r="50%"><stop offset="0" stop-color="${c.accent2}" stop-opacity=".45"/><stop offset="1" stop-color="${c.accent2}" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#g)"/>
  <rect width="1200" height="630" fill="url(#a)"/>
  <rect width="1200" height="630" fill="url(#b)"/>
  <g font-family="${font}" fill="${c.text}">
    <text x="80" y="96" font-size="26" font-weight="500" fill="${c.muted}" letter-spacing="3">${escapeHtml((section || config.shortTitle).toUpperCase())}</text>
    <text x="80" y="${titleY}" font-size="${fs}" font-weight="700" letter-spacing="-1">${titleSvg}</text>
    ${sub ? `<text x="80" y="${titleY + (lines.length - 1) * fs * 1.18 + 70}" font-size="28" fill="${c.muted}">${sub}</text>` : ""}
    <text x="80" y="566" font-size="28" font-weight="600">${escapeHtml(config.title)}</text>
    <text x="1120" y="566" font-size="24" fill="${c.muted}" text-anchor="end">${escapeHtml(config.url.replace(/^https?:\/\//, ""))}</text>
  </g>
  <rect x="80" y="520" width="72" height="6" rx="3" fill="${c.accent}"/>
</svg>`;
}

export async function generateOgImages(outputDir = "_site") {
  if (!registry.size) return;
  await ensureFonts();
  const { default: sharp } = await import("sharp");
  const dir = path.join(outputDir, "og");
  await mkdir(dir, { recursive: true });
  let made = 0;
  const entries = [...registry.entries()];
  registry.clear();
  // Пропускаме картинки, които вече са направени в този билд (dev режим).
  for (const [file, data] of entries) {
    const out = path.join(dir, file);
    try { await access(out); if (process.env.ELEVENTY_RUN_MODE !== "build") continue; } catch { /* make it */ }
    try {
      const png = await sharp(Buffer.from(svg(data))).png({ compressionLevel: 9 }).toBuffer();
      await writeFile(out, png);
      made++;
    } catch (err) {
      console.warn(`[og] ${file}: ${err.message}`);
    }
  }
  if (made) console.log(`[og] ${made} картинки за споделяне.`);
}
