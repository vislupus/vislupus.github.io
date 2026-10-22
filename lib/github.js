// Данни от GitHub по време на билда, с кеш на диска (@11ty/eleventy-fetch → папка .cache).
// В GitHub Actions подай GITHUB_TOKEN, за да не удариш лимита от 60 заявки на час.
import EleventyFetch from "@11ty/eleventy-fetch";

const API = (process.env.GITHUB_API_URL || "https://api.github.com").replace(/\/$/, "");
const RAW = "https://raw.githubusercontent.com";
const CACHE = process.env.GITHUB_CACHE_DURATION || "1h";

function headers(extra = {}) {
  const h = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "vislupus-site-build",
    ...extra,
  };
  if (process.env.GITHUB_TOKEN) h.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return h;
}

async function api(path, { optional = false } = {}) {
  try {
    return await EleventyFetch(`${API}${path}`, {
      duration: CACHE,
      type: "json",
      fetchOptions: { headers: headers(), signal: AbortSignal.timeout(15_000) },
    });
  } catch (err) {
    if (!optional) console.warn(`[github] ${path}: ${String(err.message).split("\n")[0]}`);
    return null;
  }
}

export async function raw(repo, branch, path, { type = "text", optional = false } = {}) {
  const url = `${RAW}/${repo}/${branch}/${path.split("/").map(encodeURIComponent).join("/")}`;
  try {
    return await EleventyFetch(url, {
      duration: CACHE,
      type,
      fetchOptions: { headers: { "User-Agent": "vislupus-site-build" }, signal: AbortSignal.timeout(20_000) },
    });
  } catch (err) {
    if (!optional) console.warn(`[github] raw ${repo}/${path}: ${String(err.message).split("\n")[0]}`);
    return null;
  }
}

/** Част от файл (HTTP Range) – за ID3 обложките на песните, без да се тегли целият MP3. */
export async function rawRange(repo, branch, path, from, to) {
  // Заявката (query) е само за различен ключ в кеша; raw.githubusercontent я игнорира.
  const url = `${RAW}/${repo}/${branch}/${path.split("/").map(encodeURIComponent).join("/")}?range=${from}-${to}`;
  try {
    return await EleventyFetch(url, {
      duration: "7d",
      type: "buffer",
      fetchOptions: {
        headers: { "User-Agent": "vislupus-site-build", Range: `bytes=${from}-${to}` },
        signal: AbortSignal.timeout(30_000),
      },
    });
  } catch (err) {
    console.warn(`[github] range ${repo}/${path}: ${String(err.message).split("\n")[0]}`);
    return null;
  }
}

export function pagesUrl(r) {
  if (!r?.has_pages) return null;
  const [owner, name] = r.full_name.split("/");
  return name.toLowerCase() === `${owner.toLowerCase()}.github.io`
    ? `https://${owner.toLowerCase()}.github.io/`
    : `https://${owner.toLowerCase()}.github.io/${name}/`;
}

export const toRepo = (r) => ({
  fullName: r.full_name,
  owner: r.owner?.login ?? r.full_name.split("/")[0],
  name: r.name,
  url: r.html_url,
  description: r.description,
  stars: r.stargazers_count ?? 0,
  forks: r.forks_count ?? 0,
  watchers: r.subscribers_count ?? null,
  openIssues: r.open_issues_count ?? 0,
  language: r.language,
  topics: r.topics ?? [],
  license: r.license?.spdx_id && r.license.spdx_id !== "NOASSERTION" ? r.license.spdx_id : r.license?.name ?? null,
  createdAt: r.created_at,
  pushedAt: r.pushed_at,
  updatedAt: r.updated_at,
  defaultBranch: r.default_branch ?? "main",
  homepage: r.homepage || null,
  pagesUrl: pagesUrl(r),
  archived: Boolean(r.archived),
  fork: Boolean(r.fork),
  size: r.size ?? 0,
  zipUrl: `https://github.com/${r.full_name}/archive/refs/heads/${r.default_branch ?? "main"}.zip`,
  // Социалната картинка на хранилището (GitHub я генерира автоматично).
  image: `https://opengraph.githubassets.com/1/${r.full_name}`,
});

/** Едно хранилище, напр. "vislupus/Diffly". Връща null, ако API-то не отговори. */
export async function getRepo(fullName) {
  const data = await api(`/repos/${fullName}`);
  return data ? toRepo(data) : null;
}

export async function getLanguages(fullName) {
  const data = await api(`/repos/${fullName}/languages`, { optional: true });
  if (!data) return [];
  const total = Object.values(data).reduce((a, b) => a + b, 0) || 1;
  return Object.entries(data)
    .map(([name, bytes]) => ({ name, bytes, percent: Math.round((bytes / total) * 1000) / 10 }))
    .sort((a, b) => b.bytes - a.bytes);
}

export async function getLatestRelease(fullName) {
  const r = await api(`/repos/${fullName}/releases/latest`, { optional: true });
  if (!r || !r.tag_name) return null;
  return {
    tag: r.tag_name,
    name: r.name || r.tag_name,
    url: r.html_url,
    publishedAt: r.published_at,
    body: r.body || "",
    assets: (r.assets ?? []).map((a) => ({ name: a.name, url: a.browser_download_url, size: a.size, downloads: a.download_count })),
    zipUrl: r.zipball_url,
  };
}

/** README като Markdown текст (от raw.githubusercontent, за да не харчи API заявки). */
export async function getReadme(fullName, branch = "main") {
  for (const name of ["README.md", "readme.md", "Readme.md", "README.MD", "README"]) {
    const text = await raw(fullName, branch, name, { optional: true });
    if (text) return { text, name };
  }
  return null;
}

/** Последните публични хранилища на потребител (без forks и архивирани). */
export async function getUserRepos(username, limit = 50) {
  const data = await api(`/users/${username}/repos?sort=pushed&per_page=100&type=owner`);
  if (!Array.isArray(data)) return null;
  return data.filter((r) => !r.fork && !r.archived).slice(0, limit).map(toRepo);
}

/** Списък с всички файлове в хранилище (git tree, рекурсивно). */
export async function getTree(fullName, branch = "main") {
  const data = await api(`/repos/${fullName}/git/trees/${encodeURIComponent(branch)}?recursive=1`);
  return Array.isArray(data?.tree) ? data.tree : null;
}
