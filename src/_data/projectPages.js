// Страница за всеки проект на всеки език: /<език>/projects/<име>/
import config from "../../site.config.js";
import projects from "./projects.js";

export default async function () {
  const items = await projects();
  const out = [];
  for (const l of config.languages) for (const p of items) out.push({ lang: l.code, project: p, url: `/${l.code}/projects/${p.slug}/` });
  return out;
}
