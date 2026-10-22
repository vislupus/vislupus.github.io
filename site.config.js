// ============================================================================
//  НАСТРОЙКИ НА САЙТА
//  Всичко, което обикновено се променя, е тук: име, адрес, дизайн (тема),
//  цветове, шрифтове, езици, навигация, социални мрежи, проекти, песни,
//  аналитика, коментари и Neon.
//  Текстовете на интерфейса за трите езика са в src/_data/i18n.js.
// ============================================================================

export default {
  // --- Основни -------------------------------------------------------------
  title: "Nikola Bozhinov",
  shortTitle: "vislupus",
  // Пълен адрес на сайта (без наклонена черта накрая). В GitHub Actions идва от configure-pages.
  url: (process.env.SITE_URL || "https://vislupus.github.io").replace(/\/$/, ""),
  author: {
    name: "Nikola Bozhinov",
    github: "vislupus",
    email: "nikolaobozhinov@gmail.com",
    // Снимка/аватар за страницата "За мен" и за structured data. Може да е и локален файл в src/assets/img/.
    avatar: "https://avatars.githubusercontent.com/u/19327937?v=4",
  },

  // --- Дизайн --------------------------------------------------------------
  // Избери една от трите теми: "modern" | "sketch" | "iso"
  //   modern – модерен, чист, с меки градиенти и стъклени повърхности
  //   sketch – като Excalidraw: ръчно рисувани, неравни линии
  //   iso    – изометрични SVG илюстрации и много графика
  theme: "iso",
  // true = в долния колонтитул има превключвател за преглед на трите теми
  // (и трите CSS файла се зареждат). Сложи false, когато вече си избрал тема.
  themePreview: true,
  // "auto" следва системната настройка, "light"/"dark" я налагат като начална. Посетителят винаги може да смени.
  colorScheme: "auto",

  fonts: {
    body: "'Roboto Variable', Roboto, system-ui, -apple-system, 'Segoe UI', sans-serif",
    heading: "'Roboto Variable', Roboto, system-ui, -apple-system, 'Segoe UI', sans-serif",
    mono: "'Roboto Mono Variable', 'Roboto Mono', ui-monospace, Menlo, Consolas, monospace",
    // Roboto няма японски знаци – за японските страници се добавя Noto Sans JP (от Google Fonts).
    japanese: "'Noto Sans JP', 'Hiragino Sans', 'Yu Gothic', Meiryo, sans-serif",
    japaneseStylesheet: "https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300..700&display=swap",
  },

  // Цветове за всяка тема, в светъл и тъмен вариант. Генерират се в /assets/css/tokens.css.
  colors: {
    modern: {
      light: {
        bg: "#f8f8f6", bg2: "#f1f1ed", surface: "#ffffff", surface2: "#f2f2ee",
        text: "#1a1b1e", muted: "#5f6368", border: "#e1e2dc",
        accent: "#2563eb", accent2: "#f97316", accentText: "#ffffff", link: "#1d4ed8",
        codeBg: "#1b1f2e", codeText: "#e6e9f2",
        note: "#3b82f6", tip: "#10b981", curious: "#a855f7", warning: "#f59e0b", danger: "#ef4444",
      },
      dark: {
        bg: "#111214", bg2: "#17181b", surface: "#1c1d21", surface2: "#25262b",
        text: "#eceeee", muted: "#9a9ea6", border: "#2e3036",
        accent: "#60a5fa", accent2: "#fb923c", accentText: "#111214", link: "#93c5fd",
        codeBg: "#0a0d14", codeText: "#e6e9f2",
        note: "#60a5fa", tip: "#34d399", curious: "#c084fc", warning: "#fbbf24", danger: "#f87171",
      },
    },
    sketch: {
      light: {
        bg: "#fffdf7", bg2: "#f8f4e8", surface: "#fffdf7", surface2: "#f6efdc",
        text: "#1e1e1e", muted: "#5c5c5c", border: "#1e1e1e",
        accent: "#e03131", accent2: "#1971c2", accentText: "#ffffff", link: "#1971c2",
        codeBg: "#1e1e1e", codeText: "#f5f1e6",
        note: "#1971c2", tip: "#2f9e44", curious: "#9c36b5", warning: "#f08c00", danger: "#e03131",
      },
      dark: {
        bg: "#121212", bg2: "#191919", surface: "#1c1c1c", surface2: "#262626",
        text: "#f1efe8", muted: "#b5b2a8", border: "#e8e6df",
        accent: "#ff6b6b", accent2: "#74c0fc", accentText: "#121212", link: "#74c0fc",
        codeBg: "#0b0b0b", codeText: "#f5f1e6",
        note: "#74c0fc", tip: "#69db7c", curious: "#da77f2", warning: "#ffa94d", danger: "#ff6b6b",
      },
    },
    iso: {
      light: {
        bg: "#f3f7f4", bg2: "#e7efe9", surface: "#ffffff", surface2: "#eef4ef",
        text: "#13211a", muted: "#4f6358", border: "#cfdcd3",
        accent: "#0d9488", accent2: "#f97316", accentText: "#ffffff", link: "#0f766e",
        codeBg: "#132520", codeText: "#e3f1ea",
        note: "#0ea5e9", tip: "#16a34a", curious: "#8b5cf6", warning: "#f59e0b", danger: "#dc2626",
      },
      dark: {
        bg: "#0b1512", bg2: "#0f1b17", surface: "#13221d", surface2: "#1a2c26",
        text: "#e6f1ea", muted: "#99b3a6", border: "#243b33",
        accent: "#2dd4bf", accent2: "#fb923c", accentText: "#0b1512", link: "#5eead4",
        codeBg: "#081210", codeText: "#e3f1ea",
        note: "#38bdf8", tip: "#4ade80", curious: "#a78bfa", warning: "#fbbf24", danger: "#f87171",
      },
    },
  },

  // --- Езици ---------------------------------------------------------------
  // Кодът (code) е суфиксът на файловете (_en, _bg, _jp) и първата част на адреса (/en/, /bg/, /jp/).
  defaultLanguage: "en",
  languages: [
    { code: "en", locale: "en-US", hreflang: "en", label: "English", short: "EN" },
    { code: "bg", locale: "bg-BG", hreflang: "bg", label: "Български", short: "БГ" },
    { code: "jp", locale: "ja-JP", hreflang: "ja", label: "日本語", short: "日本語" },
  ],

  // --- Навигация -----------------------------------------------------------
  // Ключовете са секции; надписите им са в i18n.js → nav.
  nav: ["blog", "projects", "songs", "drawings", "about"],

  // --- Социални мрежи и контакти ------------------------------------------
  // icon = име на иконка от https://lucide.dev/icons/ или официално лого от Simple Icons (github, bluesky, huggingface, kaggle, facebook, x, youtube, suno …).
  social: [
    { id: "github", label: "GitHub", url: "https://github.com/vislupus", icon: "github" },
    { id: "bluesky", label: "Bluesky", url: "https://bsky.app/profile/vislupus.bsky.social", icon: "bluesky" },
    { id: "huggingface", label: "Hugging Face", url: "https://huggingface.co/vislupus", icon: "huggingface" },
    { id: "kaggle", label: "Kaggle", url: "https://www.kaggle.com/vislupus", icon: "kaggle" },
    { id: "linkedin", label: "LinkedIn", url: "https://www.linkedin.com/in/nikolabozhinov", icon: "linkedin" },
    { id: "email", label: "Email", url: "mailto:nikolaobozhinov@gmail.com", icon: "mail" },
  ],

  // --- Блог ----------------------------------------------------------------
  blog: {
    postsPerPage: 12,
    relatedCount: 3,
    // Видове специални секции (::: tip ... :::). Цветът идва от colors по-горе, иконката е от Lucide.
    callouts: {
      note: { icon: "info" },
      tip: { icon: "lightbulb" },
      curious: { icon: "sparkles" },
      warning: { icon: "triangle-alert" },
      danger: { icon: "octagon-alert" },
      example: { icon: "flask-conical" },
      quote: { icon: "quote" },
    },
  },

  // --- Проекти -------------------------------------------------------------
  // Картите се пълнят автоматично от GitHub API (описание, звезди, език, теми, README, последна версия).
  // Допълнителен текст/снимки за проект: src/content/projects/<име-на-хранилище>_<език>.md
  projects: {
    repos: [
      "vislupus/ai-songs",
      "vislupus/Diffly",
      "vislupus/gps-adventure",
      "vislupus/happiness-tracker",
      "vislupus/japanese-trainer",
      "vislupus/uta-reader",
      "vislupus/llm-coding-benchmarks",
      "vislupus/ai-generated-web-tools",
      "vislupus/Bulgarian-TTS-dataset",
    ],
    // true = добавя и всички други публични хранилища на автора (без forks и архивирани)
    autoDiscover: false,
  },

  // --- Песни ---------------------------------------------------------------
  // Четат се от хранилището: всеки .mp3 с .md до него (връзка към Suno, стил, текст). Обложката е от ID3 тага.
  songs: { repo: "vislupus/ai-songs", branch: "main" },

  // --- Рисунки -------------------------------------------------------------
  // Техники за филтъра. Надписите са в i18n.js → drawings.media. Добави нова техника тук и там.
  drawings: { media: ["digital", "sumi-e", "ink", "pencil", "watercolor"] },

  // --- Аналитика (GoatCounter) ---------------------------------------------
  analytics: {
    goatcounter: "https://vislupus.goatcounter.com",
    // Записва кликове по връзки и бутони като събития (виж src/assets/js/analytics.js).
    trackClicks: true,
    // Показва брояч на прегледите на всяка публикация. В GoatCounter → Settings → трябва да е включено
    // „Allow adding visitor counts on your website“.
    showViews: true,
  },

  // --- Коментари (giscus) --------------------------------------------------
  // Включи Discussions в хранилището, инсталирай https://github.com/apps/giscus и вземи repoId/categoryId от https://giscus.app
  comments: {
    enabled: true,
    repo: "vislupus/vislupus.github.io",
    repoId: "",
    category: "Comments",
    categoryId: "",
    mapping: "pathname",
    reactions: true,
  },

  // --- Neon ----------------------------------------------------------------
  // dataApiUrl: адресът на Neon Data API (Console → Data API → API URL), напр. https://ep-....apirest.eu-central-1.aws.neon.tech/neondb/rest/v1
  // Използва се от браузъра за харесванията и прослушванията (ролята anonymous, виж neon/schema.sql).
  // DATABASE_URL (secret в GitHub Actions) се ползва само при билда и за синхронизацията на аналитиката.
  neon: {
    dataApiUrl: process.env.NEON_DATA_API_URL || "",
  },
};
