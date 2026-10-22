-- ============================================================================
--  Neon (Postgres) за сайта. Изпълни този файл в SQL Editor в console.neon.tech.
--  1) drawing_likes – харесвания на рисунките (пишат се от браузъра през Data API, ролята anonymous)
--  2) page_views, events – аналитика, синхронизирана от GoatCounter (scripts/sync-analytics.js)
-- ============================================================================

-- --- 1. Харесвания на рисунките -------------------------------------------------
create table if not exists drawing_likes (
  slug        text primary key,            -- името на файла в src/content/drawings/ без .md (напр. fox-moon)
  likes       integer not null default 0 check (likes >= 0),
  updated_at  timestamptz not null default now()
);

-- Функции, които браузърът вика през Data API: POST /rest/v1/rpc/like_drawing  {"p_slug": "fox-moon"}
-- Връщат новия брой харесвания. SECURITY DEFINER = изпълняват се с правата на създателя, не на anonymous.
create or replace function like_drawing(p_slug text) returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if p_slug is null or length(p_slug) > 120 or p_slug !~ '^[a-z0-9][a-z0-9_-]*$' then
    raise exception 'invalid slug';
  end if;
  insert into drawing_likes (slug, likes) values (p_slug, 1)
    on conflict (slug) do update set likes = drawing_likes.likes + 1, updated_at = now()
    returning likes into n;
  return n;
end $$;

create or replace function unlike_drawing(p_slug text) returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  update drawing_likes set likes = greatest(likes - 1, 0), updated_at = now() where slug = p_slug returning likes into n;
  return coalesce(n, 0);
end $$;

-- Права за анонимните заявки от сайта (Data API без Authorization header → ролята anonymous).
-- Таблицата е само за четене; промените минават само през функциите.
grant usage on schema public to anonymous;
grant select on drawing_likes to anonymous;
grant execute on function like_drawing(text) to anonymous;
grant execute on function unlike_drawing(text) to anonymous;
alter table drawing_likes enable row level security;
drop policy if exists "public read likes" on drawing_likes;
create policy "public read likes" on drawing_likes for select to anonymous using (true);

-- --- 2. Аналитика от GoatCounter ----------------------------------------------------
-- Прегледи по страница и ден.
create table if not exists page_views (
  path        text not null,               -- напр. /en/blog/seven-rila-lakes/
  day         date not null,
  views       integer not null default 0,  -- посетители за деня (GoatCounter брои уникални посетители)
  title       text,
  synced_at   timestamptz not null default now(),
  primary key (path, day)
);
create index if not exists page_views_path_idx on page_views (path);

-- Събития: кликове по връзки, бутони, сваляния, смяна на език и т.н. (виж src/assets/js/analytics.js).
create table if not exists events (
  name        text not null,               -- напр. click:social:bluesky, outbound:github.com, download:track.gpx
  day         date not null,
  count       integer not null default 0,
  title       text,
  synced_at   timestamptz not null default now(),
  primary key (name, day)
);

-- Състояние на синхронизацията (до кой ден е изтеглено).
create table if not exists analytics_sync (
  id          integer primary key default 1 check (id = 1),
  last_day    date,
  updated_at  timestamptz not null default now()
);

-- Удобни изгледи
create or replace view page_views_total as
  select path, max(title) as title, sum(views)::integer as views, max(day) as last_day
  from page_views group by path order by views desc;
create or replace view events_total as
  select name, sum(count)::integer as count, max(day) as last_day
  from events group by name order by count desc;

-- Ролята за билда (DATABASE_URL в GitHub Secrets) може да е само за четене:
-- create role site_reader with login password '...';
-- grant usage on schema public to site_reader;
-- grant select on all tables in schema public to site_reader;
-- Скриптът за синхронизация обаче пише – за него ползвай connection string с права за запис.
