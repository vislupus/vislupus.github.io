// Markdown: KaTeX ($...$ и $$...$$), секции (::: tip ... :::), котви на заглавията,
// атрибути {.class}, Mermaid диаграми (```mermaid), графики (```chart) и lightbox за снимките.
import markdownIt from "markdown-it";
import container from "markdown-it-container";
import anchor from "markdown-it-anchor";
import attrs from "markdown-it-attrs";
import { katex } from "@mdit/plugin-katex";
import config from "../site.config.js";
import { iconSvg } from "./icons.js";
import { escapeHtml, slugify } from "./format.js";
import { t } from "./i18n.js";

export function createMarkdown() {
  const md = markdownIt({ html: true, linkify: true, typographer: true, breaks: false });

  md.use(katex, { output: "htmlAndMathml", throwOnError: false });
  md.use(attrs, { leftDelimiter: "{", rightDelimiter: "}", allowedAttributes: ["id", "class", "width", "height", "target", "rel", "data-lightbox", "loading"] });
  md.use(anchor, {
    level: [2, 3, 4],
    slugify: (s) => slugify(s) || "section",
    permalink: anchor.permalink.linkInsideHeader({ symbol: "#", placement: "after", class: "heading-anchor", ariaHidden: true }),
  });

  // ::: tip Заглавие по желание
  // текст
  // :::
  for (const [name, def] of Object.entries(config.blog.callouts)) {
    md.use(container, name, {
      render(tokens, idx, _opts, env) {
        const tok = tokens[idx];
        if (tok.nesting === 1) {
          const lang = env?.lang ?? config.defaultLanguage;
          const custom = tok.info.trim().slice(name.length).trim();
          const title = custom || t(`callouts.${name}`, lang);
          return `<aside class="callout callout-${name}" role="note"><p class="callout-title">${iconSvg(def.icon, { size: 18 })}<span>${md.renderInline(title)}</span></p><div class="callout-body">\n`;
        }
        return "</div></aside>\n";
      },
    });
  }

  // ::: details Заглавие  → сгъваема секция
  md.use(container, "details", {
    render(tokens, idx) {
      const tok = tokens[idx];
      if (tok.nesting === 1) {
        const title = tok.info.trim().slice("details".length).trim() || "…";
        return `<details class="details"><summary>${md.renderInline(title)}</summary><div class="details-body">\n`;
      }
      return "</div></details>\n";
    },
  });

  // ::: columns  → колони; всяка колона е ::: col ... ::: (вложено)
  md.use(container, "columns", {
    render: (tokens, idx) => (tokens[idx].nesting === 1 ? '<div class="columns">\n' : "</div>\n"),
  });
  md.use(container, "col", {
    render: (tokens, idx) => (tokens[idx].nesting === 1 ? '<div class="col">\n' : "</div>\n"),
  });
  // Таблиците се обвиват, за да могат да се скролват хоризонтално на телефон.
  md.renderer.rules.table_open = () => '<div class="table-wrap"><table>';
  md.renderer.rules.table_close = () => "</table></div>";
  // ::: center
  md.use(container, "center", {
    render: (tokens, idx) => (tokens[idx].nesting === 1 ? '<div class="center">\n' : "</div>\n"),
  });

  // Кодови блокове: ```mermaid → диаграма; ```chart → графика (Chart.js конфигурация в JSON);
  // ```math → KaTeX блок (алтернатива на $$). Останалите минават през syntax highlight плъгина.
  const defaultFence = md.renderer.rules.fence;
  md.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const tok = tokens[idx];
    const info = (tok.info || "").trim().split(/\s+/)[0];
    if (info === "mermaid") {
      return `<figure class="diagram"><pre class="mermaid">${escapeHtml(tok.content)}</pre></figure>\n`;
    }
    if (info === "chart") {
      let cfg = tok.content.trim();
      try { cfg = JSON.stringify(JSON.parse(cfg)); } catch { /* може да е JS обект; оставяме го */ }
      return `<figure class="chart"><div class="chart-box"><canvas data-chart="${escapeHtml(cfg)}" role="img"></canvas></div></figure>\n`;
    }
    return defaultFence(tokens, idx, options, env, self);
  };

  // Всяка снимка в текста отваря lightbox и получава lazy loading.
  const defaultImage = md.renderer.rules.image;
  md.renderer.rules.image = (tokens, idx, options, env, self) => {
    const tok = tokens[idx];
    tok.attrSet("loading", "lazy");
    tok.attrSet("decoding", "async");
    const html = defaultImage(tokens, idx, options, env, self);
    const src = tok.attrGet("src") || "";
    const alt = tok.content || "";
    const title = tok.attrGet("title") || alt;
    return `<a href="${escapeHtml(src)}" class="lightbox-link" data-lightbox data-caption="${escapeHtml(title)}">${html}</a>`;
  };

  // Външни връзки: нов таб + rel + проследяване на клика.
  const defaultLinkOpen = md.renderer.rules.link_open || ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));
  md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
    const href = tokens[idx].attrGet("href") || "";
    if (/^https?:\/\//.test(href) && !href.startsWith(config.url)) {
      tokens[idx].attrSet("target", "_blank");
      tokens[idx].attrSet("rel", "noopener");
    }
    return defaultLinkOpen(tokens, idx, options, env, self);
  };

  return md;
}
