// Песните от хранилището в site.config.js → songs (обложки, текстове, връзки към Suno).
import config from "../../site.config.js";
import { loadSongs } from "../../lib/songs.js";

export default async function () {
  return loadSongs(config.songs, { outputDir: "_site" });
}
