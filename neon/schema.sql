-- ============================================================================
--  Neon (Postgres) за сайта. Изпълни този файл в SQL Editor в console.neon.tech.
--
--  ВАЖНО: първо включи Data API (Postgres database → Data API → Enable Data API) С отметката
--  „Use Neon Auth“ (Better Auth). Data API иска JWT и за анонимните заявки; Neon Auth издава анонимен
--  токен (GET …/auth/token/anonymous), който сайтът взима сам. Това създава и ролите authenticated и anonymous. Ако все пак ролята anonymous липсва,
--  блокът по-долу я създава, за да не спира скриптът с „role "anonymous" does not exist“.
--
--  1) reactions – харесвания и прослушвания (рисунки, песни); пишат се от браузъра през Data API
--  2) page_views, events – аналитика, синхронизирана от GoatCounter (scripts/sync-analytics.js)
-- ============================================================================

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anonymous') then
    create role anonymous nologin;
  end if;
end $$;

-- --- 1. Реакции: харесвания и прослушвания -----------------------------------
create table if not exists reactions (
  kind        text not null check (kind in ('drawing', 'song', 'post')),
  slug        text not null,                 -- рисунка: името на .md файла; песен: slug от заглавието
  likes       integer not null default 0 check (likes >= 0),
  plays       integer not null default 0 check (plays >= 0),
  updated_at  timestamptz not null default now(),
  primary key (kind, slug)
);

-- Функции, които браузърът вика през Data API:
--   POST /rest/v1/rpc/add_like     {"p_kind": "song", "p_slug": "across-the-screen"}
--   POST /rest/v1/rpc/remove_like  {...}
--   POST /rest/v1/rpc/add_play     {...}
-- Връщат новата стойност. SECURITY DEFINER = изпълняват се с правата на създателя, не на anonymous.
create or replace function reactions_check(p_kind text, p_slug text) returns void
language plpgsql as $$
begin
  if p_kind is null or p_kind not in ('drawing', 'song', 'post') then raise exception 'invalid kind'; end if;
  if p_slug is null or length(p_slug) > 160 or p_slug !~ '^[a-z0-9][a-z0-9_-]*$' then raise exception 'invalid slug'; end if;
end $$;

create or replace function add_like(p_kind text, p_slug text) returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  perform reactions_check(p_kind, p_slug);
  insert into reactions (kind, slug, likes) values (p_kind, p_slug, 1)
    on conflict (kind, slug) do update set likes = reactions.likes + 1, updated_at = now()
    returning likes into n;
  return n;
end $$;

create or replace function remove_like(p_kind text, p_slug text) returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  perform reactions_check(p_kind, p_slug);
  update reactions set likes = greatest(likes - 1, 0), updated_at = now() where kind = p_kind and slug = p_slug returning likes into n;
  return coalesce(n, 0);
end $$;

create or replace function add_play(p_kind text, p_slug text) returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  perform reactions_check(p_kind, p_slug);
  insert into reactions (kind, slug, plays) values (p_kind, p_slug, 1)
    on conflict (kind, slug) do update set plays = reactions.plays + 1, updated_at = now()
    returning plays into n;
  return n;
end $$;

-- Права за анонимните заявки от сайта (анонимен JWT от Neon Auth → ролята anonymous).
-- Таблицата е само за четене; промените минават само през функциите.
grant usage on schema public to anonymous;
grant select on reactions to anonymous;
grant execute on function add_like(text, text) to anonymous;
grant execute on function remove_like(text, text) to anonymous;
grant execute on function add_play(text, text) to anonymous;
revoke execute on function reactions_check(text, text) from public;
alter table reactions enable row level security;
drop policy if exists "public read reactions" on reactions;
create policy "public read reactions" on reactions for select to anonymous using (true);

-- --- 2. Аналитика от GoatCounter ----------------------------------------------------
create table if not exists page_views (
  path        text not null,               -- напр. /en/blog/seven-rila-lakes/
  day         date not null,
  views       integer not null default 0,  -- посетители за деня
  title       text,
  synced_at   timestamptz not null default now(),
  primary key (path, day)
);
create index if not exists page_views_path_idx on page_views (path);

create table if not exists events (
  name        text not null,               -- напр. click:social:bluesky, outbound:github.com, download:track.gpx
  day         date not null,
  count       integer not null default 0,
  title       text,
  synced_at   timestamptz not null default now(),
  primary key (name, day)
);

create table if not exists analytics_sync (
  id          integer primary key default 1 check (id = 1),
  last_day    date,
  last_hit_id bigint not null default 0,        -- курсор на експорта от GoatCounter
  updated_at  timestamptz not null default now()
);
alter table analytics_sync add column if not exists last_hit_id bigint not null default 0;

create or replace view page_views_total as
  select path, max(title) as title, sum(views)::integer as views, max(day) as last_day
  from page_views group by path order by views desc;
create or replace view events_total as
  select name, sum(count)::integer as count, max(day) as last_day
  from events group by name order by count desc;

-- След промяна на схемата: Data API → „Refresh schema cache“.
