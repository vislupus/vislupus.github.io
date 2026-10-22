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

-- --- 3. Коментари -----------------------------------------------------------------
-- Пишат се от браузъра (анонимен токен → ролята anonymous → функцията add_comment), четат се от изгледа comments_public.
create table if not exists comments (
  id          bigint generated always as identity primary key,
  page        text not null,                 -- ключ на страницата, общ за преводите ѝ: напр. blog:seven-rila-lakes
  url         text,                          -- адресът, от който е написан коментарът
  lang        text,
  parent_id   bigint references comments(id) on delete cascade,
  name        text not null,
  body        text not null,
  approved    boolean not null default true, -- за одобрение преди показване: alter table comments alter column approved set default false;
  created_at  timestamptz not null default now()
);
create index if not exists comments_page_idx on comments (page, created_at);

create or replace view comments_public as
  select id, page, lang, parent_id, name, body, created_at from comments where approved;

-- POST /rest/v1/rpc/add_comment  {"p_page": "blog:seven-rila-lakes", "p_name": "Иван", "p_body": "…", "p_parent": null, "p_lang": "bg", "p_url": "/bg/blog/…/"}
-- Връща новия коментар (id, approved, created_at). Проверки: дължина, не повече от 20 коментара на час за цялата таблица
-- от анонимни, и родителят да е от същата страница.
create or replace function add_comment(p_page text, p_name text, p_body text, p_parent bigint default null, p_lang text default null, p_url text default null)
returns json language plpgsql security definer set search_path = public as $$
declare r record;
begin
  if p_page is null or length(p_page) > 200 or p_page !~ '^[a-z0-9:_-]+$' then raise exception 'invalid page'; end if;
  if p_name is null or length(btrim(p_name)) < 1 or length(p_name) > 60 then raise exception 'invalid name'; end if;
  if p_body is null or length(btrim(p_body)) < 2 or length(p_body) > 4000 then raise exception 'invalid body'; end if;
  if p_body ~* 'https?://' and (length(p_body) - length(replace(lower(p_body), 'http', ''))) / 4 > 2 then raise exception 'too many links'; end if;
  if (select count(*) from comments where created_at > now() - interval '1 hour') >= 20 then raise exception 'too many comments, try later'; end if;
  if p_parent is not null and not exists (select 1 from comments where id = p_parent and page = p_page) then raise exception 'invalid parent'; end if;
  insert into comments (page, url, lang, parent_id, name, body)
    values (p_page, left(p_url, 300), left(p_lang, 5), p_parent, btrim(p_name), btrim(p_body))
    returning id, approved, created_at into r;
  return json_build_object('id', r.id, 'approved', r.approved, 'created_at', r.created_at);
end $$;

grant select on comments_public to anonymous;
grant execute on function add_comment(text, text, text, bigint, text, text) to anonymous;
alter table comments enable row level security;
drop policy if exists "public read approved comments" on comments;
create policy "public read approved comments" on comments for select to anonymous using (approved);

-- Модерация: в конзолата на Neon (Tables → comments) изтрий ред или сложи approved = false.
-- За одобрение преди показване: alter table comments alter column approved set default false;
