// Синхронизира статистиката от GoatCounter в Neon: прегледи по страница/ден и събития (кликове).
// Пуска се от GitHub Actions всеки ден (.github/workflows/sync-analytics.yml) или ръчно:
//   GOATCOUNTER_API_TOKEN=... DATABASE_URL=... npm run sync:analytics
// Токенът се прави в GoatCounter → Settings → API (права: Read statistics).
import { neon } from "@neondatabase/serverless";
import config from "../site.config.js";

const SITE = (process.env.GOATCOUNTER_URL || config.analytics.goatcounter).replace(/\/$/, "");
const TOKEN = process.env.GOATCOUNTER_API_TOKEN;
const DB = process.env.DATABASE_URL;
const DAYS_BACK = Number(process.env.SYNC_DAYS || 3); // презаписва последните N дни (GoatCounter доуточнява данните)

if (!TOKEN || !DB) {
  console.error("Нужни са GOATCOUNTER_API_TOKEN и DATABASE_URL.");
  process.exit(1);
}

const sql = neon(DB);
const iso = (d) => d.toISOString().slice(0, 10);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function gc(path, params = {}) {
  const url = new URL(`${SITE}/api/v0${path}`);
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" } });
    if (res.status === 429) { await sleep(1500); continue; }
    if (!res.ok) throw new Error(`GoatCounter ${path}: HTTP ${res.status} ${await res.text()}`);
    return res.json();
  }
  throw new Error(`GoatCounter ${path}: rate limit`);
}

/** Всички пътища/събития с дневна статистика за периода. Пагинира с exclude_paths. */
async function allHits(start, end) {
  const out = [];
  const exclude = [];
  for (let page = 0; page < 200; page++) {
    const data = await gc("/stats/hits", { start, end, daily: "true", limit: 100, exclude_paths: exclude.join(",") || undefined });
    const hits = data.hits ?? [];
    out.push(...hits);
    if (!data.more || !hits.length) break;
    exclude.push(...hits.map((h) => h.path_id));
    await sleep(300); // 4 заявки/сек е лимитът
  }
  return out;
}

async function main() {
  await sql`create table if not exists analytics_sync (id integer primary key default 1 check (id = 1), last_day date, updated_at timestamptz not null default now())`;
  const [state] = await sql`select last_day from analytics_sync where id = 1`;
  const today = new Date();
  const start = new Date(state?.last_day ? new Date(state.last_day).getTime() - DAYS_BACK * 86400000 : today.getTime() - 365 * 86400000);
  const startStr = iso(start), endStr = iso(today);
  console.log(`[sync] GoatCounter ${SITE} → Neon, ${startStr} .. ${endStr}`);

  const hits = await allHits(startStr, endStr);
  let views = 0, events = 0;
  for (const h of hits) {
    for (const s of h.stats ?? []) {
      if (!s.daily) continue;
      if (h.event) {
        await sql`insert into events (name, day, count, title, synced_at) values (${h.path}, ${s.day}, ${s.daily}, ${h.title || null}, now())
                  on conflict (name, day) do update set count = excluded.count, title = excluded.title, synced_at = now()`;
        events++;
      } else {
        await sql`insert into page_views (path, day, views, title, synced_at) values (${h.path}, ${s.day}, ${s.daily}, ${h.title || null}, now())
                  on conflict (path, day) do update set views = excluded.views, title = excluded.title, synced_at = now()`;
        views++;
      }
    }
  }
  await sql`insert into analytics_sync (id, last_day, updated_at) values (1, ${endStr}, now())
            on conflict (id) do update set last_day = excluded.last_day, updated_at = now()`;
  console.log(`[sync] ${hits.length} пътя, ${views} реда прегледи, ${events} реда събития.`);
}

main().catch((err) => { console.error(err); process.exit(1); });
