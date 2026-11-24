import path from "node:path";
import { imageMeta } from "../../../lib/shortcodes.js";
// Рисунки: един файл за рисунка (без езиков суфикс), с многоезични полета:
//   title: { en: "Fox", bg: "Лисица", jp: "狐" }   (или просто title: "Fox")
//   date: 2025-03-10   medium: sumi-e   image: images/fox.jpg
//   imageAi: images/fox-ai.jpg   (по желание: същата рисунка, обработена с AI – показва се при посочване,
//                                 а на цял екран може да се избира оригинал / с AI / сравнение с плъзгач)
// Не се генерират отделни страници – показват се в галерията и линията на времето.
export default {
  section: "drawings",
  permalink: false,
  tags: [],
  eleventyComputed: {
    translationKey: () => undefined,
    lang: () => undefined,
    // Път към снимката спрямо корена на проекта (за Eleventy Image).
    imagePath: (data) => (data.image ? path.join(path.dirname(data.page.inputPath), data.image).replace(/^\.?\//, "") : null),
    // Готовите размери (WebP) – рендират се с филтъра picture в шаблоните.
    imageMeta: async (data) => imageMeta(data.imagePath, [480, 960, 2000]),
    imageAiMeta: async (data) => (data.imageAi ? imageMeta(path.join(path.dirname(data.page.inputPath), data.imageAi).replace(/^\.?\//, ""), [480, 960, 2000]) : null),
  },
};
