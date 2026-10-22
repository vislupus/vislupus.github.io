// Генерира примерни снимки (пейзажи) и рисунки (туш/дигитални) за демонстрация. Замени ги със свои.
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const scenes = [
  ["rila/lake-1.jpg", "#7fb3d5", "#2e86ab", "#1b4965", 1600, 1067],
  ["rila/lake-2.jpg", "#f4d58d", "#c97b63", "#4a2c2a", 1600, 1067],
  ["rila/lake-3.jpg", "#a8dadc", "#457b9d", "#1d3557", 1067, 1600],
  ["rila/lake-4.jpg", "#cde7b0", "#5a8f3c", "#243d1a", 1600, 1067],
  ["rila/lake-5.jpg", "#ffd6a5", "#ff8c42", "#5c2a1e", 1600, 900],
  ["rila/lake-6.jpg", "#d7c8f5", "#7b5ea7", "#2d1b4e", 1600, 1067],
  ["rila/cover.jpg", "#9ecae1", "#3182bd", "#08306b", 2000, 1125],
];
function landscape(w, h, a, b, c, seed) {
  const r = (n) => { seed = (seed * 9301 + 49297) % 233280; return (seed / 233280) * n; };
  const peaks = Array.from({ length: 6 }, (_, i) => `${(i / 5) * w},${h * 0.45 + r(h * 0.25)}`).join(" ");
  const hills = Array.from({ length: 8 }, (_, i) => `${(i / 7) * w},${h * 0.65 + r(h * 0.15)}`).join(" ");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="#ffffff"/></linearGradient></defs>
  <rect width="${w}" height="${h}" fill="url(#s)"/><circle cx="${w * 0.75}" cy="${h * 0.22}" r="${h * 0.07}" fill="#fff8e1" opacity=".9"/>
  <polygon points="0,${h} ${peaks} ${w},${h}" fill="${b}" opacity=".85"/><polygon points="0,${h} ${hills} ${w},${h}" fill="${c}"/>
  <rect y="${h * 0.8}" width="${w}" height="${h * 0.2}" fill="${a}" opacity=".6"/></svg>`;
}
function drawing(w, h, kind, seed) {
  const r = (n) => { seed = (seed * 9301 + 49297) % 233280; return (seed / 233280) * n; };
  if (kind === "sumi-e") {
    const strokes = Array.from({ length: 7 }, () => `<path d="M${r(w)},${r(h)} q${r(300) - 150},${r(300) - 150} ${r(400) - 200},${r(400) - 200}" stroke="#111" stroke-width="${8 + r(30)}" stroke-linecap="round" fill="none" opacity="${0.5 + r(0.5)}"/>`).join("");
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="#f6f1e4"/>${strokes}<circle cx="${w * 0.8}" cy="${h * 0.2}" r="${w * 0.04}" fill="#b3202a"/></svg>`;
  }
  const shapes = Array.from({ length: 12 }, () => `<circle cx="${r(w)}" cy="${r(h)}" r="${40 + r(180)}" fill="hsl(${r(360)},70%,60%)" opacity=".55"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="#1b1f3a"/>${shapes}<path d="M${w * 0.1},${h * 0.8} C${w * 0.3},${h * 0.2} ${w * 0.6},${h * 0.9} ${w * 0.9},${h * 0.3}" stroke="#fff" stroke-width="10" fill="none" stroke-linecap="round" opacity=".8"/></svg>`;
}
await mkdir("src/content/blog/images/rila", { recursive: true });
await mkdir("src/content/drawings/images", { recursive: true });
let i = 0;
for (const [f, a, b, c, w, h] of scenes) await sharp(Buffer.from(landscape(w, h, a, b, c, 17 + i++))).jpeg({ quality: 85 }).toFile(`src/content/blog/images/${f}`);
const drawings = [["fox-moon", "sumi-e"], ["bamboo", "sumi-e"], ["mountain-mist", "sumi-e"], ["neon-city", "digital"], ["dragon-sketch", "digital"], ["winter-crow", "sumi-e"], ["kitsune-portrait", "digital"], ["old-pine", "ink"], ["wave-study", "digital"], ["temple-gate", "ink"]];
for (const [name, kind] of drawings) await sharp(Buffer.from(drawing(1400, 1400, kind, 3 + i++))).jpeg({ quality: 86 }).toFile(`src/content/drawings/images/${name}.jpg`);
console.log("placeholders ok");
