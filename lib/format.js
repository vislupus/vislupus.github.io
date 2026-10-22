export const escapeHtml = (s = "") =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export const stripHtml = (html = "") => String(html).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

/** Време за четене: ~200 думи/мин за латиница/кирилица, ~500 знака/мин за японски. */
export function readingTime(html = "", lang = "en") {
  const text = stripHtml(html);
  if (lang === "jp") return Math.max(1, Math.round(text.replace(/\s/g, "").length / 500));
  return Math.max(1, Math.round(text.split(/\s+/).filter(Boolean).length / 200));
}

export function excerpt(html = "", max = 180) {
  const text = stripHtml(html);
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return cut.slice(0, Math.max(cut.lastIndexOf(" "), max - 30)).trim() + "…";
}

export const slugify = (s = "") =>
  String(s).toLowerCase().trim()
    .replace(/[\s_]+/g, "-")
    .replace(/[^\p{L}\p{N}-]+/gu, "")
    .replace(/-+/g, "-").replace(/^-|-$/g, "");

export const formatDuration = (sec = 0) => {
  const s = Math.round(Number(sec) || 0);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export const formatBytes = (n = 0) => {
  const units = ["B", "KB", "MB", "GB"];
  let i = 0; let v = Number(n) || 0;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v < 10 && i > 0 ? v.toFixed(1) : Math.round(v)} ${units[i]}`;
};

// Цветове на езиците (както в GitHub) за точката до езика.
export const langColor = {
  JavaScript: "#f1e05a", TypeScript: "#3178c6", Python: "#3572A5", Go: "#00ADD8", Rust: "#dea584",
  "C++": "#f34b7d", C: "#555555", "C#": "#178600", HTML: "#e34c26", CSS: "#663399", Astro: "#ff5a03", Java: "#b07219",
  Shell: "#89e051", Vue: "#41b883", Svelte: "#ff3e00", MDX: "#fcb32c", Nunjucks: "#3d8137", "Jupyter Notebook": "#DA5B0B",
  Kotlin: "#A97BFF", Swift: "#F05138", Dart: "#00B4AB", PHP: "#4F5D95", Ruby: "#701516", R: "#198CE7", Lua: "#000080",
  SCSS: "#c6538c", Dockerfile: "#384d54", PowerShell: "#012456", Batchfile: "#C1F12E", Markdown: "#083fa1", GDScript: "#355570",
};
