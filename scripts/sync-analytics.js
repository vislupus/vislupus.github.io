// Синхронизира статистиката от GoatCounter в Neon: прегледи по страница/ден и събития (кликове).
// Използва експорта на GoatCounter (CSV с всички посещения) с курсор last_hit_id, така че всяко пускане
// добавя само новите посещения. Пуска се от GitHub Actions всеки ден (.github/workflows/sync-analytics.yml)
// или ръчно:  GOATCOUNTER_API_TOKEN=... DATABASE_URL=... npm run sync:analytics
// Токенът се прави в GoatCounter → Settings → API (права: „Export data“ / Read statistics).
import { gunzipSync } from "node:zlib";
import { neon } from "@neondatabase/serverless";
import config from "../site.config.js";

const SITE = (process.env.GOATCOUNTER_URL || config.analytics.goatcounter).replace(/\/$/, "");
const TOKEN = process.env.GOATCOUNTER_API_TOKEN;
const DB = process.env.DATABASE_URL;

if (!TOKEN || !DB) {
  console.error("Нужни са GOATCOUNTER_API_TOKEN и DATABASE_URL.");
  process.exit(1);
}

const sql = neon(DB);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const headers = { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" };

async function gc(method, path, body) {
  const url = `${SITE}/api/v0${path}`;
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
    if (res.status === 429) { await sleep(1500); continue; }
    if (!res.ok) throw new Error(`GoatCounter ${method} ${url}: HTTP ${res.status} ${await res.text()}`);
    return res;
  }
  throw new Error(`GoatCounter ${path}: rate limit`);
}

/** Прост CSV парсер (полетата може да са в кавички и да съдържат запетаи/нови редове). */
function parseCsv(text) {
  const rows = []; let row = []; let field = ""; let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; }
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(field); rows.push(row); row = []; field = ""; }
    else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

async function main() {
  // Проверка на токена и адреса
  const me = await (await gc("GET", "/me")).json();
  console.log(`[sync] GoatCounter ${SITE} (потребител: ${me.user?.email ?? "?"}) → Neon`);

  await sql`create table if not exists analytics_sync (id integer primary key default 1 check (id = 1), last_day date, updated_at timestamptz not null default now())`;
  await sql`alter table analytics_sync add column if not exists last_hit_id bigint not null default 0`;
  const [state] = await sql`select last_hit_id from analytics_sync where id = 1`;
  const lastHitId = Number(state?.last_hit_id ?? 0);

  // 1. Поръчваме експорт от последното известно посещение нататък
  let exp = await (await gc("POST", "/export", { format: "csv", start_from_hit_id: lastHitId })).json();
  console.log(`[sync] експорт #${exp.id} от hit ${lastHitId}…`);
  for (let i = 0; i < 120 && !exp.finished_at; i++) {
    await sleep(2000);
    exp = await (await gc("GET", `/export/${exp.id}`)).json();
    if (exp.error) throw new Error(`GoatCounter export: ${exp.error}`);
  }
  if (!exp.finished_at) throw new Error("GoatCounter export: не завърши навреме");

  // 2. Теглим CSV-то (gzip)
  const buf = Buffer.from(await (await gc("GET", `/export/${exp.id}/download`)).arrayBuffer());
  const text = (buf[0] === 0x1f && buf[1] === 0x8b ? gunzipSync(buf) : buf).toString("utf8");
  const rows = parseCsv(text).filter((r) => r.length > 1);
  const header = rows.shift() ?? [];
  const col = (name) => header.findIndex((h) => h.replace(/^\d+/, "") === name);
  const iPath = col("Path"), iTitle = col("Title"), iEvent = col("Event"), iBot = col("Bot"), iFirst = col("FirstVisit"), iDate = col("Date");
  if (iPath < 0 || iDate < 0) throw new Error(`Неочакван формат на експорта: ${header.join(",")}`);

  // 3. Събираме по (път, ден): посещения = първи посещения (както „visits“ в GoatCounter)
  const views = new Map(), events = new Map();
  let rowsUsed = 0;
  for (const r of rows) {
    if (iBot >= 0 && r[iBot] && r[iBot] !== "0") continue; // ботове
    const day = r[iDate].slice(0, 10);
    const isEvent = iEvent >= 0 && /^(1|true)$/i.test(r[iEvent]);
    const first = iFirst < 0 || /^(1|true)$/i.test(r[iFirst]);
    if (!first) continue;
    const map = isEvent ? events : views;
    const key = `${r[iPath]}\u0000${day}`;
    const cur = map.get(key) ?? { path: r[iPath], day, n: 0, title: r[iTitle] ?? "" };
    cur.n++; map.set(key, cur); rowsUsed++;
  }

  // 4. Записваме (добавяме към вече наличните броячи за деня)
  for (const v of views.values())
    await sql`insert into page_views (path, day, views, title, synced_at) values (${v.path}, ${v.day}, ${v.n}, ${v.title || null}, now())
              on conflict (path, day) do update set views = page_views.views + excluded.views, title = coalesce(excluded.title, page_views.title), synced_at = now()`;
  for (const e of events.values())
    await sql`insert into events (name, day, count, title, synced_at) values (${e.path}, ${e.day}, ${e.n}, ${e.title || null}, now())
              on conflict (name, day) do update set count = events.count + excluded.count, title = coalesce(excluded.title, events.title), synced_at = now()`;
  const newLast = Number(exp.last_hit_id ?? lastHitId);
  await sql`insert into analytics_sync (id, last_day, last_hit_id, updated_at) values (1, current_date, ${newLast}, now())
            on conflict (id) do update set last_day = current_date, last_hit_id = excluded.last_hit_id, updated_at = now()`;
  console.log(`[sync] ${rows.length} реда в експорта, ${rowsUsed} посещения: ${views.size} реда прегледи, ${events.size} реда събития; последен hit ${newLast}.`);
}

main().catch((err) => { console.error(err); process.exit(1); });
