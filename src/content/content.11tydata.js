// Общи данни за всичко в src/content/: езикът се взима от суфикса на файла (_en, _bg, _jp),
// translationKey е името без суфикса – така преводите на една страница се намират един друг.
import { splitSlug } from "../../lib/i18n.js";

export default {
  eleventyComputed: {
    lang: (data) => data.lang || splitSlug(data.page.fileSlug).lang,
    translationKey: (data) => data.translationKey || splitSlug(data.page.fileSlug).key,
  },
};
