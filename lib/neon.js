// Четене от Neon по време на билда (само ако DATABASE_URL е зададен). Нищо тук не е задължително:
// без база сайтът се билдва с празни броячи, а харесванията и прегледите идват от браузъра.
import { neon } from "@neondatabase/serverless";

let sql;
function client() {
  if (!process.env.DATABASE_URL) return null;
  sql ??= neon(process.env.DATABASE_URL);
  return sql;
}

/** { slug: likes } за рисунките. */
export async function getDrawingLikes() {
  const db = client();
  if (!db) return {};
  try {
    const rows = await db`select slug, likes from drawing_likes`;
    return Object.fromEntries(rows.map((r) => [r.slug, Number(r.likes)]));
  } catch (err) {
    console.warn(`[neon] drawing_likes: ${err.message}`);
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
