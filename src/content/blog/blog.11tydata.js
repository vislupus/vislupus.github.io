// Публикации: src/content/blog/<slug>_<език>.md → /<език>/blog/<slug>/
import path from "node:path";
import { splitSlug } from "../../../lib/i18n.js";
import { imageMeta, ogImageFrom } from "../../../lib/shortcodes.js";

export default {
  layout: "layouts/post.njk",
  section: "blog",
  eleventyComputed: {
    // Снимката на публикацията (image: images/cover.jpg) като път от корена на проекта – за картите и OG.
    imagePath: (data) => (data.image && !/^https?:/.test(data.image) ? path.join(path.dirname(data.page.inputPath), data.image).replace(/^\.?\//, "") : data.image ?? null),
    coverMeta: async (data) => imageMeta(data.imagePath, [480, 960, 1600]),
    ogImageUrl: async (data) => ogImageFrom(data.imagePath),
    permalink: (data) => {
      if (data.draft && process.env.ELEVENTY_RUN_MODE !== "serve") return false;
      const { key, lang } = splitSlug(data.page.fileSlug);
      return data.permalink || `/${lang}/blog/${data.slug || key}/`;
    },
  },
};
