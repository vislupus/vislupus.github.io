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
  return { suno: links.find((u) => /suno\.com/.test(u)) ?? links[0] ?? "", links, style, lyrics: lyrics.join("\n\n") };
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

export async function loadSongs({ repo, branch = "main" }, { outputDir = "_site" } = {}) {
  const tree = await getTree(repo, branch);
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

  const songs = await Promise.all(
    mp3s.map(async (f) => {
      const base = f.path.replace(/\.mp3$/i, "");
      let slug = songSlug(path.basename(base));
      for (let n = 2; usedSlugs.has(slug); n++) slug = `${songSlug(path.basename(base))}-${n}`;
      usedSlugs.add(slug);
      const notesFile = notesByKey.get(nameKey(f.path));
      if (!notesFile) console.warn(`[songs] няма .md бележки за ${f.path}`);
      const notes = notesFile ? parseNotes((await raw(repo, branch, notesFile.path, { optional: true })) ?? "") : parseNotes("");
      const head = await rawRange(repo, branch, f.path, 0, 65535);
      const id3 = parseId3(head);
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
        duration: head ? estimateDuration(head, id3.tagSize, f.size) : null,
        cover: coverUrl,
        ogImage: ogUrl,
        src: `https://raw.githubusercontent.com/${repo}/${branch}/${enc}`,
        download: `https://raw.githubusercontent.com/${repo}/${branch}/${enc}`,
        github: `https://github.com/${repo}/blob/${branch}/${enc}`,
        file: f.path,
      };
    })
  );
  songs.sort((a, b) => a.title.localeCompare(b.title, "en"));
  try {
    await mkdir(path.dirname(SNAPSHOT), { recursive: true });
    await writeFile(SNAPSHOT, JSON.stringify(songs.map((s) => ({ ...s, cover: null, ogImage: null })), null, 2));
  } catch { /* ignore */ }
  console.log(`[songs] ${songs.length} песни от ${repo}.`);
  return songs;
}
