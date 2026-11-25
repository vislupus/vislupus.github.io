// Песните от хранилището ai-songs: списък от GitHub (git tree), .md бележки (връзка към Suno, стил, текст)
// и обложка + продължителност от ID3 тага на MP3 файла (тегли се само началото на файла с HTTP Range).
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { getTree, raw, rawRange } from "./github.js";
import sharp from "sharp";

const SNAPSHOT = "data/songs.json";

function synchsafe(b, i) { return (b[i] << 21) | (b[i + 1] << 14) | (b[i + 2] << 7) | b[i + 3]; }
function u32(b, i) { return (b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]; }

function decodeText(buf, enc) {
  if (enc === 1 || enc === 2) {
    const bom = enc === 1 && buf[0] === 0xff && buf[1] === 0xfe;
    const be = enc === 2 || (enc === 1 && buf[0] === 0xfe && buf[1] === 0xff);
    const body = enc === 1 && (bom || be) ? buf.subarray(2) : buf;
    if (be) { const sw = Buffer.alloc(body.length); for (let i = 0; i + 1 < body.length; i += 2) { sw[i] = body[i + 1]; sw[i + 1] = body[i]; } return sw.toString("utf16le"); }
    return body.toString("utf16le");
  }
  return buf.toString(enc === 3 ? "utf8" : "latin1");
}
function findNull(buf, start, enc) {
  if (enc === 1 || enc === 2) { for (let i = start; i + 1 < buf.length; i += 2) if (buf[i] === 0 && buf[i + 1] === 0) return [i, i + 2]; return [buf.length, buf.length]; }
  const i = buf.indexOf(0, start); return i < 0 ? [buf.length, buf.length] : [i, i + 1];
}

/** Чете ID3v2 тага: заглавие, изпълнител, жанр, обложка; връща и размера на тага. */
export function parseId3(buf) {
  const out = { tagSize: 0, title: "", artist: "", genre: "", cover: null, coverMime: "" };
  if (!buf || buf.length < 10 || buf.toString("latin1", 0, 3) !== "ID3") return out;
  const version = buf[3];
  const flags = buf[5];
  const size = synchsafe(buf, 6);
  out.tagSize = size + 10;
  let pos = 10;
  if (flags & 0x40) pos += version === 4 ? synchsafe(buf, 10) : u32(buf, 10) + 4; // extended header
  const end = Math.min(buf.length, size + 10);
  while (pos + 10 <= end) {
    const id = buf.toString("latin1", pos, pos + 4);
    if (!/^[A-Z0-9]{4}$/.test(id)) break;
    const fsize = version === 4 ? synchsafe(buf, pos + 4) : u32(buf, pos + 4);
    const fflags = (buf[pos + 8] << 8) | buf[pos + 9];
    const dataStart = pos + 10;
    const dataEnd = dataStart + fsize;
    if (fsize <= 0 || dataEnd > buf.length) break;
    const unsync = version === 4 && (fflags & 0x02);
    let data = buf.subarray(dataStart, dataEnd);
    if (unsync) { const o = []; for (let i = 0; i < data.length; i++) { o.push(data[i]); if (data[i] === 0xff && data[i + 1] === 0) i++; } data = Buffer.from(o); }
    if (id === "APIC" && !out.cover) {
      const enc = data[0];
      const [mimeEnd, afterMime] = findNull(data, 1, 0);
      const mime = data.toString("latin1", 1, mimeEnd);
      const [, afterDesc] = findNull(data, afterMime + 1, enc);
      out.cover = Buffer.from(data.subarray(afterDesc));
      out.coverMime = mime || "image/jpeg";
    } else if (id === "TIT2" || id === "TPE1" || id === "TCON") {
      const text = decodeText(data.subarray(1), data[0]).replace(/\0+$/, "");
      if (id === "TIT2") out.title = text; else if (id === "TPE1") out.artist = text; else out.genre = text;
    }
    pos = dataEnd;
  }
  return out;
}

const BITRATES = { 1: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320], 2: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160] };
const RATES = { 3: [44100, 48000, 32000], 2: [22050, 24000, 16000], 0: [11025, 12000, 8000] };
/** Продължителност: от Xing/Info заглавието (брой кадри) при VBR, иначе от битрейта на първия кадър (CBR). */
export function estimateDuration(buf, tagSize, fileSize) {
  for (let i = tagSize; i + 40 < buf.length; i++) {
    if (buf[i] !== 0xff || (buf[i + 1] & 0xe0) !== 0xe0) continue;
    const ver = (buf[i + 1] >> 3) & 3; // 3 = MPEG1, 2 = MPEG2, 0 = MPEG2.5
    const layer = (buf[i + 1] >> 1) & 3; // 1 = Layer III
    const br = (buf[i + 2] >> 4) & 15;
    const sr = (buf[i + 2] >> 2) & 3;
    if (layer !== 1 || br === 0 || br === 15 || ver === 1 || sr === 3) continue;
    const sampleRate = RATES[ver][sr];
    const kbps = BITRATES[ver === 3 ? 1 : 2][br];
    const mono = ((buf[i + 3] >> 6) & 3) === 3;
    const sideInfo = ver === 3 ? (mono ? 17 : 32) : (mono ? 9 : 17);
    const samplesPerFrame = ver === 3 ? 1152 : 576;
    const x = i + 4 + sideInfo;
    const tag = buf.toString("latin1", x, x + 4);
    if ((tag === "Xing" || tag === "Info") && x + 12 <= buf.length) {
      const flags = buf.readUInt32BE(x + 4);
      if (flags & 1) {
        const frames = buf.readUInt32BE(x + 8);
        if (frames > 0) return Math.round((frames * samplesPerFrame) / sampleRate);
      }
    }
    if (!kbps) continue;
    return Math.round(((fileSize - tagSize) * 8) / (kbps * 1000));
  }
  return null;
}

/**
 * Бележките: връзка към Suno, после "---", стил, "---", текст (може да следват още връзки и версии на текста).
 * Редът е водещ: първата текстова част е стилът, останалите са текст. Съдържанието не се гадае, защото
 * стилът често изброява „Intro / Verse 1 / Chorus“ като структура и прилича на текст.
 * Само ако има една-единствена текстова част, се решава по съдържанието (секции в скоби → текст).
 */
export function parseNotes(text = "") {
  // Ред „hidden: true“ в началото на файла скрива песента от сайта (виж и site.config.js → songs.hidden).
  const hidden = /^[ \t]*hidden[ \t]*:[ \t]*(true|yes|да)[ \t]*$/im.test(text.slice(0, 400));
  text = text.replace(/^[ \t]*hidden[ \t]*:[^\n]*\n?/im, "");
  const parts = text.replace(/\r/g, "").split(/\n[ \t]*-{3,}[ \t]*(?=\n|$)/).map((p) => p.trim()).filter(Boolean);
  const links = []; const texts = [];
  for (const part of parts) {
    const urls = part.match(/https?:\/\/\S+/g);
    if (urls && part.replace(/https?:\/\/\S+/g, "").trim().length < 40) links.push(...urls);
    else texts.push(part);
  }
  let style = ""; let lyrics = [];
  if (texts.length >= 2) { style = texts[0]; lyrics = texts.slice(1); }
  else if (texts.length === 1) {
    const sections = (texts[0].match(/^\s*\[[^\]\n]+\]\s*$/gm) ?? []).length;
    if (sections >= 2 || texts[0].length > 1200) lyrics = texts; else style = texts[0];
  }
  return { suno: links.find((u) => /suno\.com/.test(u)) ?? links[0] ?? "", links, style, lyrics: lyrics.join("\n\n"), hidden };
}

// Ключ за съпоставяне на .mp3 с .md: само букви и цифри, без главни букви. Така „Song_ Part.mp3“ намира „Song Part.md“
// (в имената на файлове „:“ става ту „_“, ту нищо).
const nameKey = (p) => p.replace(/\.[^.]+$/, "").normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");

const CYR = { а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sht", ъ: "a", ь: "y", ю: "yu", я: "ya", ы: "y", э: "e", ё: "yo" };
/** Адресът на песента е само от латиница и цифри (кирилицата се транслитерира), за да работи и като ключ в Neon. */
export function songSlug(name) {
  // Апострофите се махат („You’d“ → „youd“), както в досегашните адреси, за да се запазят харесванията.
  const latin = name.normalize("NFC").toLowerCase().replace(/['’ʼ`]/g, "").replace(/[а-яё]/g, (c) => CYR[c] ?? "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  const slug = latin.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (slug) return slug;
  let h = 0; for (const ch of name) h = (h * 31 + ch.codePointAt(0)) >>> 0;
  return `song-${h.toString(36)}`;
}

// Кеш по съдържание: за всеки MP3 и .md файл резултатът се пази в .cache/songs/ под SHA-то на файла от git.
// Докато файлът не се промени, билдът не прави мрежова заявка за него – обложките и текстовете не зависят от това
// дали GitHub отговаря точно в този момент. (В GitHub Actions папката .cache се пази между билдовете.)
const CACHE_DIR = ".cache/songs";
async function cachedJson(file, produce) {
  try { return JSON.parse(await readFile(file, "utf8")); } catch { /* няма кеш */ }
  const value = await produce();
  if (value) { await mkdir(path.dirname(file), { recursive: true }); await writeFile(file, JSON.stringify(value)); }
  return value;
}
/** Етикетите на MP3 файла: { title, artist, genre, duration, cover (base64), coverMime } или null, ако не може да се изтегли. */
async function songTags(repo, branch, f) {
  return cachedJson(path.join(CACHE_DIR, `${f.sha}.tags.json`), async () => {
    let head = await rawRange(repo, branch, f.path, 0, 65535);
    if (!head) return null;
    let id3 = parseId3(head);
    // Ако етикетът (с обложката) е по-голям от изтегленото, тегли се целият етикет.
    if (id3.tagSize > head.length) {
      const more = await rawRange(repo, branch, f.path, 0, id3.tagSize + 8191);
      if (!more) return null;
      head = more; id3 = parseId3(head);
    }
    return { title: id3.title, artist: id3.artist, genre: id3.genre, duration: estimateDuration(head, id3.tagSize, f.size), cover: id3.cover?.length ? id3.cover.toString("base64") : null, coverMime: id3.coverMime };
  });
}
async function songNotes(repo, branch, f) {
  const hit = await cachedJson(path.join(CACHE_DIR, `${f.sha}.notes.json`), async () => {
    const text = await raw(repo, branch, f.path, { optional: true });
    return text == null ? null : { text };
  });
  return hit?.text ?? null;
}

// Един билд зарежда песните веднъж, дори да ги искат няколко файла с данни.
const loads = new Map();
export function loadSongs(source, opts = {}) {
  const key = JSON.stringify([source, opts]);
  if (!loads.has(key)) loads.set(key, loadSongsOnce(source, opts));
  return loads.get(key);
}

async function loadSongsOnce({ repo, branch = "main", hidden = [] }, { outputDir = "_site" } = {}) {
  const hiddenKeys = new Set((hidden ?? []).map((h) => nameKey(`${h}.x`)));
  const isHidden = (...names) => names.some((n) => n && hiddenKeys.has(nameKey(`${n}.x`)));
  // Списъкът с файлове: от GitHub, а ако не отговори – последният успешно изтеглен (заедно с кеша по SHA
  // това дава пълния списък с обложки и текстове и без мрежа).
  const treeFile = path.join(CACHE_DIR, `tree-${repo.replace(/[^\w.-]+/g, "_")}-${branch}.json`);
  let tree = await getTree(repo, branch);
  if (tree) { try { await mkdir(CACHE_DIR, { recursive: true }); await writeFile(treeFile, JSON.stringify(tree)); } catch { /* ignore */ } }
  else { try { tree = JSON.parse(await readFile(treeFile, "utf8")); console.warn("[songs] GitHub не отговори – ползвам последния запазен списък с файлове."); } catch { /* няма запазен */ } }
  if (!tree) {
    if (existsSync(SNAPSHOT)) {
      console.warn(`[songs] GitHub не отговори – ползвам ${SNAPSHOT}.`);
      return JSON.parse(await readFile(SNAPSHOT, "utf8"));
    }
    console.warn("[songs] GitHub не отговори и няма snapshot – списъкът с песни е празен.");
    return [];
  }
  const notesByKey = new Map(tree.filter((f) => f.type === "blob" && /\.md$/i.test(f.path)).map((f) => [nameKey(f.path), f]));
  const usedSlugs = new Set();
  const mp3s = tree.filter((f) => f.type === "blob" && /\.mp3$/i.test(f.path));
  const coverDir = path.join(outputDir, "assets", "songs");
  await mkdir(coverDir, { recursive: true });

  const problems = [];
  const loaded = await Promise.all(
    mp3s.map(async (f) => {
      if (isHidden(path.basename(f.path, path.extname(f.path)))) return null;
      const base = f.path.replace(/\.mp3$/i, "");
      let slug = songSlug(path.basename(base));
      for (let n = 2; usedSlugs.has(slug); n++) slug = `${songSlug(path.basename(base))}-${n}`;
      usedSlugs.add(slug);
      const notesFile = notesByKey.get(nameKey(f.path));
      if (!notesFile) console.warn(`[songs] няма .md бележки за ${f.path}`);
      const notesText = notesFile ? await songNotes(repo, branch, notesFile) : "";
      if (notesFile && notesText == null) problems.push(`текст и стил на „${f.path}“`);
      const notes = parseNotes(notesText ?? "");
      const tags = await songTags(repo, branch, f);
      if (!tags) problems.push(`обложка на „${f.path}“`);
      const id3 = { title: tags?.title ?? "", artist: tags?.artist ?? "", genre: tags?.genre ?? "", coverMime: tags?.coverMime ?? "", cover: tags?.cover ? Buffer.from(tags.cover, "base64") : null };
      let coverUrl = null, ogUrl = null;
      if (id3.cover?.length) {
        const ext = /png/i.test(id3.coverMime) ? "png" : "jpg";
        await writeFile(path.join(coverDir, `${slug}.${ext}`), id3.cover);
        coverUrl = `/assets/songs/${slug}.${ext}`;
        // Картинка за споделяне (1200×630): размазана обложка отзад, обложката в средата.
        try {
          const ogDir = path.join(outputDir, "og");
          await mkdir(ogDir, { recursive: true });
          const bg = await sharp(id3.cover).resize(1200, 630, { fit: "cover" }).blur(30).modulate({ brightness: 0.6 }).toBuffer();
          const fg = await sharp(id3.cover).resize(560, 560, { fit: "cover" }).toBuffer();
          await sharp(bg).composite([{ input: fg, left: 320, top: 35 }]).jpeg({ quality: 82 }).toFile(path.join(ogDir, `song-${slug}.jpg`));
          ogUrl = `/og/song-${slug}.jpg`;
        } catch (err) { console.warn(`[songs] og ${slug}: ${err.message}`); }
      }
      if (notes.hidden || isHidden(id3.title, slug)) return null;
      const enc = f.path.split("/").map(encodeURIComponent).join("/");
      return {
        slug,
        title: id3.title || path.basename(base),
        artist: id3.artist || repo.split("/")[0],
        genre: id3.genre || "",
        style: notes.style,
        lyrics: notes.lyrics,
        suno: notes.suno,
        links: notes.links,
        size: f.size,
        duration: tags?.duration ?? null,
        cover: coverUrl,
        ogImage: ogUrl,
        src: `https://raw.githubusercontent.com/${repo}/${branch}/${enc}`,
        download: `https://raw.githubusercontent.com/${repo}/${branch}/${enc}`,
        github: `https://github.com/${repo}/blob/${branch}/${enc}`,
        file: f.path,
      };
    })
  );
  const songs = loaded.filter(Boolean);
  if (songs.length < loaded.length) console.log(`[songs] ${loaded.length - songs.length} скрити песни.`);
  songs.sort((a, b) => a.title.localeCompare(b.title, "en"));
  try {
    await mkdir(path.dirname(SNAPSHOT), { recursive: true });
    await writeFile(SNAPSHOT, JSON.stringify(songs.map((s) => ({ ...s, cover: null, ogImage: null })), null, 2));
  } catch { /* ignore */ }
  console.log(`[songs] ${songs.length} песни от ${repo}.`);
  if (problems.length) {
    const msg = `[songs] ${problems.length} неща не можаха да се изтеглят от GitHub и липсват в този билд: ${problems.join(", ")}. Следващият билд ще опита пак.`;
    console.warn(process.env.GITHUB_ACTIONS ? `::warning::${msg}` : msg);
  }
  return songs;
}
