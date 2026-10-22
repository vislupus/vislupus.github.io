// Страница за всяка песен на всеки език: /<език>/songs/<slug>/ (за споделяне с обложка).
import config from "../../site.config.js";
import songs from "./songs.js";

let cached;
export default async function () {
  cached ??= songs();
  const items = await cached;
  const out = [];
  for (const l of config.languages) for (const s of items) out.push({ lang: l.code, song: s, url: `/${l.code}/songs/${s.slug}/` });
  return out;
}
