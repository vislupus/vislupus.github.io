// Самостоятелни страници: src/content/pages/<slug>_<език>.md → /<език>/<slug>/
import { splitSlug } from "../../../lib/i18n.js";

export default {
  layout: "layouts/page.njk",
  section: "pages",
  eleventyComputed: {
    permalink: (data) => {
      const { key, lang } = splitSlug(data.page.fileSlug);
      return data.permalink || `/${lang}/${data.slug || key}/`;
    },
  },
};
