// Проектите: списъкът е в site.config.js → projects.repos. Всичко останало идва от GitHub API при билда:
// описание, звезди, език, теми, README, последна версия (release), файлове за сваляне, GitHub Pages.
import config from "../../site.config.js";
import { getRepo, getLanguages, getLatestRelease, getReadme, getUserRepos } from "../../lib/github.js";

let cached;
export default async function () {
  cached ??= load();
  return cached;
}

async function load() {
  let names = [...config.projects.repos];
  if (config.projects.autoDiscover) {
    const extra = (await getUserRepos(config.author.github)) ?? [];
    for (const r of extra) if (!names.some((n) => n.toLowerCase() === r.fullName.toLowerCase())) names.push(r.fullName);
  }
  const items = await Promise.all(
    names.map(async (fullName) => {
      const repo = await getRepo(fullName);
      const [owner, name] = fullName.split("/");
      if (!repo) {
        // Без интернет/лимит на API-то: минимална карта, за да не се чупи билдът.
        return { fullName, owner, name, slug: name.toLowerCase(), url: `https://github.com/${fullName}`, description: "", stars: 0, forks: 0, topics: [], languages: [], release: null, readme: null, offline: true, image: `https://opengraph.githubassets.com/1/${fullName}`, zipUrl: `https://github.com/${fullName}/archive/refs/heads/main.zip`, defaultBranch: "main" };
      }
      const [languagesList, release, readme] = await Promise.all([getLanguages(fullName), getLatestRelease(fullName), getReadme(fullName, repo.defaultBranch)]);
      return { ...repo, slug: repo.name.toLowerCase(), languages: languagesList, release, readme, offline: false };
    })
  );
  // Подредба: както в конфигурацията (първите са най-важни).
  console.log(`[projects] ${items.filter((p) => !p.offline).length}/${items.length} проекта от GitHub.`);
  return items;
}
