// Данни от Neon при билда (ако има DATABASE_URL): харесвания на рисунките и прегледи на страниците.
import { getDrawingLikes, getPageViews } from "../../lib/neon.js";

export default async function () {
  const [likes, views] = await Promise.all([getDrawingLikes(), getPageViews()]);
  return { likes, views, enabled: Boolean(process.env.DATABASE_URL) };
}
