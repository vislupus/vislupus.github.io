// Настройките от site.config.js + малко изчислени стойности. Не редактирай тук – редактирай site.config.js.
import config from "../../site.config.js";

export default {
  ...config,
  builtAt: new Date(),
  languageCodes: config.languages.map((l) => l.code),
  isDev: process.env.ELEVENTY_RUN_MODE === "serve",
};
