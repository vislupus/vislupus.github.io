// Снимки на екрана на готовия сайт (_site) за трите теми: npm run build && npm run screenshots
// Резултатът е в .cache/screenshots/. Нужен е Chromium (Playwright).
import { chromium } from "playwright-core";
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { existsSync, statSync } from "node:fs";
import path from "node:path";

const root = "_site", port = 8765;
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".woff2": "font/woff2", ".xml": "application/xml", ".gpx": "application/gpx+xml" };
const server = createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let file = path.join(root, p);
  if (existsSync(file) && statSync(file).isDirectory()) file = path.join(file, "index.html");
  if (!existsSync(file)) file = path.join(root, "404.html");
  res.writeHead(existsSync(file) ? 200 : 404, { "Content-Type": types[path.extname(file)] ?? "application/octet-stream" });
  res.end(existsSync(file) ? await readFile(file) : "not found");
}).listen(port);

const pages = process.argv[2] ? process.argv.slice(2) : ["/en/", "/en/blog/", "/en/blog/seven-rila-lakes/", "/en/blog/writing-guide/", "/en/projects/", "/en/projects/ai-songs/", "/en/songs/", "/en/drawings/", "/en/about/", "/bg/", "/jp/", "/en/search/?q=lorenz"];
const themes = (process.env.THEMES || "modern,sketch,iso").split(",");
const schemes = (process.env.SCHEMES || "light,dark").split(",");
const width = Number(process.env.WIDTH || 1280);
await mkdir(".cache/screenshots", { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium" });
const ctx = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
for (const theme of themes) for (const scheme of schemes) {
  await page.addInitScript(([t, s]) => { localStorage.setItem("theme", t); localStorage.setItem("scheme", s); }, [theme, scheme]);
  for (const u of pages) {
    await page.goto(`http://localhost:${port}${u}`, { waitUntil: "networkidle" }).catch(() => {});
    await page.evaluate(([t, s]) => { document.documentElement.dataset.theme = t; document.documentElement.dataset.scheme = s; }, [theme, scheme]);
    await page.waitForTimeout(400);
    const name = `${theme}-${scheme}-${width}${u.replace(/[^\w]+/g, "-").replace(/-$/, "") || "-root"}.png`;
    await page.screenshot({ path: `.cache/screenshots/${name}`, fullPage: process.env.FULL !== "0" });
    console.log(name);
  }
}
await browser.close();
server.close();
