// {% icon "map-pin" %} → вграден SVG от Lucide (node_modules/lucide-static/icons/<name>.svg)
// или от src/_includes/icons/<name>.svg за иконки, които Lucide няма (bluesky, huggingface, kaggle).
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const lucideDir = require.resolve("lucide-static/package.json").replace(/package\.json$/, "icons/");
const customDir = new URL("../src/_includes/icons/", import.meta.url).pathname;
const cache = new Map();

export function iconSvg(name, { size = 20, cls = "", label = "" } = {}) {
  if (!cache.has(name)) {
    const custom = `${customDir}${name}.svg`;
    const file = existsSync(custom) ? custom : `${lucideDir}${name}.svg`;
    if (!existsSync(file)) {
      console.warn(`[icon] няма иконка "${name}" (виж https://lucide.dev/icons/)`);
      cache.set(name, null);
    } else {
      // Махаме размерите и класовете на Lucide, за да ги задаваме сами.
      cache.set(
        name,
        readFileSync(file, "utf8")
          .replace(/<!--[\s\S]*?-->/g, "")
          .replace(/\s(width|height|class)="[^"]*"/g, "")
          .replace(/\s+/g, " ")
          .trim()
      );
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
