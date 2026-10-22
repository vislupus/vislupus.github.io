// Данни от Neon при билда (ако има DATABASE_URL): реакции (харесвания, прослушвания) и прегледи на страниците.
import { getReactions, getPageViews } from "../../lib/neon.js";

export default async function () {
  const [reactions, views] = await Promise.all([getReactions(), getPageViews()]);
  return { reactions, views, enabled: Boolean(process.env.DATABASE_URL) };
}
