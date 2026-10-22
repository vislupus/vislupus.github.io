// Четене от Neon по време на билда (само ако DATABASE_URL е зададен). Нищо тук не е задължително:
// без база сайтът се билдва с празни броячи, а реакциите и прегледите идват от браузъра.
import { neon } from "@neondatabase/serverless";

let sql;
function client() {
  if (!process.env.DATABASE_URL) return null;
  sql ??= neon(process.env.DATABASE_URL);
  return sql;
}

/** { "drawing:fox-moon": { likes, plays }, "song:across-the-screen": {…} } */
export async function getReactions() {
  const db = client();
  if (!db) return {};
  try {
    const rows = await db`select kind, slug, likes, plays from reactions`;
    return Object.fromEntries(rows.map((r) => [`${r.kind}:${r.slug}`, { likes: Number(r.likes), plays: Number(r.plays) }]));
  } catch (err) {
    console.warn(`[neon] reactions: ${err.message}`);
    return {};
  }
}

/** { path: views } – общо прегледи по път (синхронизирани от GoatCounter; виж scripts/sync-analytics.js). */
export async function getPageViews() {
  const db = client();
  if (!db) return {};
  try {
    const rows = await db`select path, sum(views)::int as views from page_views group by path`;
    return Object.fromEntries(rows.map((r) => [r.path, r.views]));
  } catch (err) {
    console.warn(`[neon] page_views: ${err.message}`);
    return {};
  }
}
