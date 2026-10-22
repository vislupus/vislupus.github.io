// Помощни функции за езиците: суфикс във файла, преводи, дати по локал.
import config from "../site.config.js";
import strings from "../src/_data/i18n.js";

export const languages = config.languages;
export const langCodes = languages.map((l) => l.code);
export const defaultLang = config.defaultLanguage;
export const byCode = Object.fromEntries(languages.map((l) => [l.code, l]));

/** "rila-lakes_en" → { key: "rila-lakes", lang: "en" }; без суфикс → език по подразбиране. */
export function splitSlug(fileSlug = "") {
  const m = fileSlug.match(new RegExp(`^(.*)_(${langCodes.join("|")})$`));
  return m ? { key: m[1], lang: m[2] } : { key: fileSlug, lang: defaultLang };
}

function lookup(lang, path) {
  const parts = path.split(".");
  let node = strings[lang];
  for (const p of parts) {
    if (node == null) break;
    node = node[p];
  }
  return node;
}

/** Превод с резервен вариант на езика по подразбиране и заместване на {n}. */
export function t(path, lang = defaultLang, vars = {}) {
  let v = lookup(lang, path);
  if (v == null) v = lookup(defaultLang, path);
  if (v == null) return path;
  if (typeof v !== "string") return v;
  return v.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? `{${k}}`));
}

const fmtCache = new Map();
function formatter(locale, opts) {
  const k = locale + JSON.stringify(opts);
  if (!fmtCache.has(k)) fmtCache.set(k, new Intl.DateTimeFormat(locale, { timeZone: "UTC", ...opts }));
  return fmtCache.get(k);
}

/** Дата според езика: bg → 22 октомври 2026 г., en → October 22, 2026, jp → 2026年10月22日 */
export function localeDate(input, lang = defaultLang, style = "long") {
  if (!input) return "";
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return "";
  const locale = byCode[lang]?.locale ?? "en-US";
  const opts = style === "short" ? { day: "numeric", month: "short", year: "numeric" }
    : style === "month" ? { month: "long", year: "numeric" }
    : style === "year" ? { year: "numeric" }
    : style === "datetime" ? { dateStyle: "long", timeStyle: "short" }
    : { day: "numeric", month: "long", year: "numeric" };
  return formatter(locale, opts).format(d);
}

export function localeNumber(n, lang = defaultLang) {
  return new Intl.NumberFormat(byCode[lang]?.locale ?? "en-US").format(Number(n ?? 0));
}

export const isoDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");
