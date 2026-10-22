# vislupus.github.io

Личният ми сайт: блог, проекти, песни, рисунки и „за мен“ на три езика (английски, български, японски), с три дизайна за избор. Направен с [Eleventy](https://www.11ty.dev/) 3, Nunjucks шаблони, обикновен JavaScript и CSS – без React, TypeScript или тежки библиотеки. Иконките са от [Lucide](https://lucide.dev/icons/), шрифтът е Roboto.

## Бързо начало

```bash
npm install
npm run dev        # http://localhost:8080 – гледа за промени
npm run build      # готовият сайт е в _site/
npm run screenshots  # снимки на екрана на трите дизайна в .cache/screenshots/
```

При билда сайтът чете GitHub API (проекти, песни). Без `GITHUB_TOKEN` лимитът е 60 заявки на час – достатъчно за локална работа, защото отговорите се кешират в `.cache/` за един час. В GitHub Actions токенът се подава автоматично.

## Къде какво е

| Път | Какво има |
| --- | --- |
| `site.config.js` | **Всички настройки**: име, адрес, тема, цветове, шрифтове, езици, навигация, социални мрежи, проекти, песни, аналитика, коментари, Neon |
| `src/_data/i18n.js` | **Всички текстове на интерфейса** за трите езика |
| `src/content/blog/` | Публикации: `<slug>_en.md`, `<slug>_bg.md`, `<slug>_jp.md` (+ `images/`, `files/`) |
| `src/content/pages/` | Самостоятелни страници (`about_en.md` …) |
| `src/content/projects/` | Допълнителен текст към проект: `<име-на-хранилище>_<език>.md` (по желание) |
| `src/content/drawings/` | Рисунки: един `.md` файл на рисунка с многоезични полета + `images/` |
| `src/pages/` | Генерираните страници (начало, блог, етикети, поредици, търсене, проекти, песни, рисунки, 404, sitemap) |
| `src/_includes/` | Шаблони (`layouts/`), части (`partials/`), собствени иконки (`icons/`) |
| `src/assets/css/` | `base.css`, `components.css`, `prism.css` и трите теми в `themes/` |
| `src/assets/js/` | Скриптовете: меню/тема, lightbox, карти, диаграми, графики, търсене, плейър, рисунки, харесвания, аналитика |
| `lib/` | Логиката при билда: Markdown, shortcode-ове, GitHub, песни, OG картинки, Neon |
| `neon/schema.sql` | Таблиците и функциите в Neon |
| `scripts/` | `sync-analytics.js` (GoatCounter → Neon), `screenshots.js`, `placeholders.js` |
| `.github/workflows/` | `deploy.yml` (публикуване), `sync-analytics.yml` (аналитика всеки ден) |

## Трите дизайна

В `site.config.js`:

```js
theme: "iso",        // "modern" | "sketch" | "iso"
themePreview: true,  // превключвател в долния колонтитул, за да ги сравниш на живо
```

- **modern** – спокоен и чист: неутрален фон с фина мрежа, бели карти, един ярък акцент.
- **sketch** – като Excalidraw: неравни ръчно рисувани линии (SVG филтър), щриховки, подчертавания.
- **iso** – изометрична решетка и илюстрации, цветни „3D“ ръбове.

Докато `themePreview` е `true`, се зареждат и трите CSS файла и изборът се пази в браузъра. Когато решиш, сложи `theme` и `themePreview: false`. И трите имат светъл и тъмен вариант (бутонът със слънце/луна; по подразбиране следва системата).

**Цветовете** на всяка тема (светла и тъмна) са в `site.config.js → colors` и се превръщат в CSS променливи (`/assets/css/tokens.css`): `--c-bg`, `--c-surface`, `--c-text`, `--c-accent`, `--c-accent2`, цветовете на секциите и т.н. **Шрифтовете** са в `fonts` (Roboto е вграден; за японски се зарежда Noto Sans JP от Google Fonts).

## Езици и адреси

Езикът е първата част от адреса: `/en/…`, `/bg/…`, `/jp/…`. Коренът `/` пренасочва към езика на браузъра (или последно избрания). Бутонът с езици води към превода на същата страница, ако има такъв, иначе към началото на секцията.

Файловете на съдържанието имат суфикс за езика: `seven-rila-lakes_en.md`, `seven-rila-lakes_bg.md`, `seven-rila-lakes_jp.md`. Името преди суфикса свързва преводите (и е адресът: `/bg/blog/seven-rila-lakes/`). Не е нужно всяка публикация да има и трите превода.

Датите се показват според езика (`22 октомври 2026 г.`, `October 22, 2026`, `2026年10月22日`) чрез `Intl.DateTimeFormat`. Кодът на японски в адреса и файловете е `jp`, а в HTML (`lang`, `hreflang`) – `ja`.

## Писане на публикация

```markdown
---
title: "Седемте рилски езера за един ден"
description: Кратко описание (показва се в картата и при споделяне).
date: 2026-09-27
updated: 2026-10-02          # по желание
tags: [пътешествия, планина]
series: Български планини    # по желание – поредица
seriesDescription: …         # по желание, в първата част
image: images/rila/cover.jpg # снимка за началото и за споделяне (по желание)
imageAlt: …
imageCaption: …
draft: true                  # чернова – не се публикува (вижда се само с npm run dev)
comments: false              # без коментари на тази публикация
---
```

Пълният справочник с всички блокове е публикацията „Всичко, което една публикация може да съдържа“ (`src/content/blog/writing-guide_*.md`). Накратко:

| Какво | Как |
| --- | --- |
| Специални секции | `::: tip` … `:::` (също `note`, `curious`, `warning`, `danger`, `example`, `quote`); `::: tip Мое заглавие`; сгъваема: `::: details Заглавие` |
| Формули (KaTeX) | `$e^{i\pi}+1=0$` и `$$ … $$` |
| Диаграми (Mermaid) | <code>```mermaid</code> |
| Графики (Chart.js) | <code>```chart</code> с JSON конфигурация |
| Карта | `{% map { lat, lng, zoom, markers: [{ lat, lng, label }], route: true, fit: true, gpx: "files/track.gpx", caption } %}` |
| Снимка с надпис | `{% figure "images/x.jpg", "Надпис" %}` |
| Галерия | `{% gallery "images/папка" %}` или `{% gallery ["a.jpg", "b.jpg"], { columns: 4, captions: {…} } %}` |
| Обикновена снимка | `![alt](images/x.jpg)` – също се отваря на цял екран |
| YouTube | `{% youtube "ID", "Заглавие" %}` (зарежда се при клик) |
| Видео файл | `{% video "files/clip.mp4", { poster, caption } %}` |
| iframe | `{% iframe "https://…", { title, ratio: "16/9", height } %}` или `{% embed %}<iframe …>{% endembed %}` или направо HTML |
| Хранилище | `{% repo "vislupus/Diffly" %}` |
| Карта на връзка | `{% link "https://…" %}` (чете заглавие/описание/снимка от страницата при билда) |
| Файл за сваляне | `{% download "files/track.gpx", "Надпис" %}` |
| Бутон | `{% button "/bg/projects/", "Текст", { icon: "arrow-right", primary: true } %}` |
| Колони | `:::: columns` / `::: col` … `:::` / `::: col` … `:::` / `::::` |
| Иконка | `{% icon "map-pin", 18 %}` – всяко име от lucide.dev |

Снимките се преоразмеряват автоматично (WebP, няколко размера). Файловете в `files/` се копират както са. Всяка снимка в текста се отваря на цял екран с бутон за цял екран, стрелки и клавиатура.

Публикацията има автоматично: съдържание (при 3+ заглавия), време за четене, брояч на прегледите (GoatCounter), етикети, поредица (част X от Y), предишна/следваща, свързани статии (по общи етикети), споделяне (Bluesky, LinkedIn, имейл, копиране), коментари (giscus), картинка за споделяне (Open Graph – генерира се от заглавието, ако няма `image`).

## Проекти

Списъкът е в `site.config.js → projects.repos`. Всичко останало идва от GitHub при билда: описание, звезди, forks, език, езици (%), теми, лиценз, дати, README, последна версия (release) с файловете ѝ, GitHub Pages адрес, социалната картинка на хранилището. Бутонът „Свали“ води към файловете на последната версия, а ако няма – към ZIP на кода.

Допълнителен текст към проект (по желание): `src/content/projects/<име-на-хранилище>_<език>.md` с `title`, `description` и текст.

## Песни

Четат се от хранилището в `site.config.js → songs` (`vislupus/ai-songs`): всеки `.mp3` с `.md` до него (първи ред – връзка към Suno, после стил, после текст, разделени с `---`). Обложката и заглавието идват от ID3 тага на MP3 файла (тегли се само началото му). Плейърът е долу на страницата: пускане, следваща/предишна, разбъркване, повторение, сила на звука, клавиш интервал.

Всяка песен има бутони „Стил“ и „Текст“ (отделни панели), харесване, брояч на прослушванията (брои се след 5 секунди слушане, веднъж на сесия) и споделяне. Всяка песен има и собствена страница (`/en/songs/<slug>/`) с обложката като картинка за споделяне – бутонът за споделяне в списъка копира тази връзка (или отваря системния диалог на телефона).

## Рисунки

Един файл на рисунка в `src/content/drawings/`:

```markdown
---
title: { en: "Fox under the moon", bg: "Лисица под луната", jp: "月下の狐" }
date: 2026-09-14
medium: sumi-e        # техника за филтъра; списъкът е в site.config.js → drawings.media, надписите в i18n.js
image: images/fox-moon.jpg
description: { en: "…", bg: "…", jp: "…" }   # по желание
---
```

Страницата има галерия с филтър по техника и **линия на времето** (змиевидна, най-новите първи, годината се показва при смяна), а всяка рисунка може да се хареса. Харесванията (и прослушванията на песните) се пазят в таблицата `reactions` в Neon (виж по-долу); без Neon остават само в браузъра.

Примерните рисунки и снимки са генерирани (`scripts/placeholders.js`) – замени ги със свои.

## Neon

1. Направи проект в [console.neon.tech](https://console.neon.tech).
2. **Първо включи Data API**: Postgres database → **Data API** → Enable Data API **с отметката „Use Neon Auth“** (Better Auth). Data API изисква JWT дори за анонимните заявки, а Neon Auth издава анонимен токен (`GET …/auth/token/anonymous`), който сайтът взима сам и кешира. Ако Data API вече е включен без Neon Auth, включи Better Auth от менюто вляво (или от Settings на Data API). Това създава ролите `authenticated` и `anonymous`. Копирай **API URL** (`https://….apirest.….neon.tech/neondb/rest/v1`) в GitHub → Settings → Secrets and variables → Actions → като secret или variable `NEON_DATA_API_URL` (или директно в `site.config.js → neon.dataApiUrl`).
3. **После** изпълни `neon/schema.sql` в SQL Editor (ако го пуснеш преди Data API, ролята `anonymous` липсва и скриптът спира с „role "anonymous" does not exist“; новата версия на файла я създава сама, но Data API все пак трябва да е включен, за да работят заявките от браузъра). След това: Data API → **Refresh schema cache**.
4. Заявките с анонимния токен се изпълняват с ролята `anonymous`, която може само да чете таблицата `reactions` и да вика функциите `add_like`, `remove_like`, `add_play`. Адресът на Auth се извежда от адреса на Data API; ако е различен, задай `NEON_AUTH_URL` (или `site.config.js → neon.authUrl`). В конзолата на браузъра (F12) има диагностика `[reactions] …`.
5. **Четене при билда** (броячи на харесвания, прослушвания и прегледи в HTML-а): secret `DATABASE_URL` с connection string.
6. **Аналитика**: виж по-долу.

## Аналитика (GoatCounter → Neon)

Скриптът на GoatCounter е в `site.config.js → analytics`. Освен прегледите се записват и събития: клик по навигация, социални мрежи, смяна на език, външни връзки, сваляния, бутони на проекти и песни (всичко с `data-track="…"` в шаблоните плюс автоматично всички външни връзки). В GoatCounter се виждат с отметката „events“.

За да се показва броячът на прегледите на публикациите: GoatCounter → Settings → **Allow adding visitor counts on your website**.

Workflow-ът `sync-analytics.yml` всеки ден записва статистиката в Neon (таблици `page_views`, `events`; изгледи `page_views_total`, `events_total`). Ползва експорта на GoatCounter (CSV на всички посещения) с курсор, така че всяко пускане добавя само новите посещения. Нужни secrets: `GOATCOUNTER_API_TOKEN` (GoatCounter → Settings → API, с права „Export data“ и „Read statistics“) и `DATABASE_URL`.

## Коментари (giscus)

1. Включи Discussions в хранилището (Settings → General → Features → Discussions) и инсталирай приложението [giscus](https://github.com/apps/giscus) за хранилището.
2. На [giscus.app](https://giscus.app) в секцията „Configuration“ въведи `vislupus/vislupus.github.io`, избери категория (например „Announcements“ или нова „Comments“) и mapping „pathname“.
3. Най-долу, в секцията „Enable giscus“, се появява готов `<script>`. От него вземи `data-repo-id` (напр. `R_kgDO…`) → `repoId` и `data-category-id` (напр. `DIC_kwDO…`) → `categoryId` в `site.config.js → comments`. Категорията (`category`) трябва да е същата като избраната.

Езикът на коментарите следва езика на страницата.

## Публикуване

Settings → Pages → Build and deployment → Source: **GitHub Actions**. При всеки push в `master` (и веднъж на ден) `deploy.yml` билдва и публикува сайта. Картинките за споделяне се генерират при билда със шрифтове, изтеглени в `.cache/fonts/` (кешират се между билдовете).

## Споделяне в социалните мрежи

Всяка страница има Open Graph и Twitter мета данни, `hreflang` за трите езика, canonical адрес, Atom емисия за всеки език (`/en/feed.xml` …) и `sitemap.xml`. Картинката при споделяне е снимката на публикацията или генерирана картинка със заглавието.
