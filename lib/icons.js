// {% icon "map-pin" %} → вграден SVG от Lucide (node_modules/lucide-static/icons/<name>.svg)
// или от src/_includes/icons/<name>.svg за иконки, които Lucide няма (bluesky, huggingface, kaggle).
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const lucideDir = require.resolve("lucide-static/package.json").replace(/package\.json$/, "icons/");
const customDir = new URL("../src/_includes/icons/", import.meta.url).pathname;
const simpleDir = new URL("../node_modules/simple-icons/icons/", import.meta.url).pathname;
// Официалните лога (запълнени) идват от Simple Icons; всичко останало е от Lucide (контурни).
const BRANDS = new Set(["github", "bluesky", "huggingface", "kaggle", "facebook", "youtube", "suno", "reddit", "instagram", "mastodon", "discord", "telegram", "threads", "tiktok", "spotify", "soundcloud", "gmail", "whatsapp", "x-logo"]);
// "x" остава кръстчето от Lucide (затваряне); логото на X (Twitter) е "x-logo".
const BRAND_FILES = { "x-logo": "x" };
const cache = new Map();

export function iconSvg(name, { size = 20, cls = "", label = "" } = {}) {
  if (!cache.has(name)) {
    const custom = `${customDir}${name}.svg`;
    const brand = `${simpleDir}${BRAND_FILES[name] ?? name}.svg`;
    const file = existsSync(custom) ? custom : BRANDS.has(name) && existsSync(brand) ? brand : `${lucideDir}${name}.svg`;
    if (!existsSync(file)) {
      console.warn(`[icon] няма иконка "${name}" (виж https://lucide.dev/icons/)`);
      cache.set(name, null);
    } else {
      // Махаме размерите и класовете на Lucide, за да ги задаваме сами.
      let svg = readFileSync(file, "utf8")
        .replace(/<!--[\s\S]*?-->/g, "")
        .replace(/<title>[\s\S]*?<\/title>/g, "")
        .replace(/\s+/g, " ")
        .trim();
      // Размерите и класовете се махат само от коренния <svg> (вътрешните <rect width=…> трябва да останат!).
      svg = svg.replace(/^<svg[^>]*>/, (tag) => tag.replace(/\s(width|height|class|role)="[^"]*"/g, ""));
      if (file === brand) svg = svg.replace(/^<svg/, '<svg fill="currentColor"');
      cache.set(name, svg);
    }
  }
  const svg = cache.get(name);
  if (!svg) return "";
  const a11y = label ? ` role="img" aria-label="${label}"` : ' aria-hidden="true" focusable="false"';
  return svg.replace(
    /^<svg/,
    `<svg class="icon icon-${name}${cls ? " " + cls : ""}" width="${size}" height="${size}"${a11y} data-icon="${name}"`
  );
}
