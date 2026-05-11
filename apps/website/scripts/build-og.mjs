// Renders apps/website/public/og.png from a satori JSX-style template.
// Wired into `pnpm build` as a prebuild step so the OG image stays in
// sync with hero copy automatically — change a headline in src/i18n/ui.ts,
// re-run build, the social-preview card regenerates.
//
// Stack:
//   • satori — JSX/HTML tree → SVG (Yoga flexbox under the hood)
//   • @resvg/resvg-js — SVG → PNG (rust + WASM, no native build needed)
//   • @fontsource/* — Playfair Display, Noto Serif TC, JetBrains Mono
//     loaded from node_modules so every machine + CI renders identically.
//
// To change copy: edit OG_STRINGS below. To change layout: edit the
// template object in renderCard(). Keep OG_STRINGS in lockstep with the
// matching hero strings in src/i18n/ui.ts — they're authored independently
// because OG copy can diverge from on-page copy as the brand evolves.

import { Resvg } from "@resvg/resvg-js";
import { html } from "satori-html";
import satori from "satori";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const FONT_ROOT = path.join(root, "node_modules/@fontsource");
const FONTS = {
  playfair: path.join(FONT_ROOT, "playfair-display/files/playfair-display-latin-400-normal.woff"),
  playfairItalic: path.join(FONT_ROOT, "playfair-display/files/playfair-display-latin-400-italic.woff"),
  // chinese-traditional umbrella covers CJK ideographs (旁譯入頁原文如故…)
  notoSerifTC: path.join(FONT_ROOT, "noto-serif-tc/files/noto-serif-tc-chinese-traditional-400-normal.woff"),
  notoSerifTCBold: path.join(FONT_ROOT, "noto-serif-tc/files/noto-serif-tc-chinese-traditional-700-normal.woff"),
  // Subset 123 contains fullwidth punctuation U+FF0C 「，」 which the
  // chinese-traditional umbrella doesn't carry. Satori falls through
  // multiple font entries with the same family name to find glyphs.
  notoSerifTCPunct: path.join(FONT_ROOT, "noto-serif-tc/files/noto-serif-tc-123-400-normal.woff"),
  notoSerifTCPunctBold: path.join(FONT_ROOT, "noto-serif-tc/files/noto-serif-tc-123-700-normal.woff"),
  jetBrainsMono: path.join(FONT_ROOT, "jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff"),
};

const OG_STRINGS = {
  wordmark: "Margin",
  enLine1: "Read the web in two languages,",
  enEm: "without losing",
  enTail: " the original.",
  zhLine1: "旁譯入頁，",
  zhEm: "原文如故",
  zhTail: "。",
  axisStrip: "NO SERVER · NO ACCOUNT · NO SUBSCRIPTION · MIT",
  url: "marginread.com",
};

const COLORS = {
  paper: "#f7f5ef",
  ink: "#1a1a1a",
  inkSoft: "#3a3a3a",
  mute: "#8e8a82",
  jam: "#b8331f",
  line: "rgba(26,26,26,0.12)",
};

function loadFont(filePath) {
  return fs.readFileSync(filePath);
}

function markDataUrl() {
  const svg = fs.readFileSync(path.join(root, "public/favicon.svg"), "utf-8");
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function template(strings, markSrc) {
  return html`
    <div style="
      width: 1200px;
      height: 630px;
      background: ${COLORS.paper};
      display: flex;
      flex-direction: column;
      padding: 60px 80px 56px;
      font-family: 'Playfair Display';
    ">
      <!-- Top: M.12 mark + Margin wordmark -->
      <div style="display: flex; align-items: center; gap: 26px; margin-bottom: 92px;">
        <img src="${markSrc}" style="display: block; width: 80px; height: 80px;" />
        <span style="font-family: 'Playfair Display'; font-size: 46px; color: ${COLORS.ink}; line-height: 1;">${strings.wordmark}</span>
      </div>

      <!-- EN headline -->
      <div style="display: flex; flex-direction: column; gap: 14px; margin-bottom: 36px;">
        <div style="display: flex; font-family: 'Playfair Display'; font-size: 58px; color: ${COLORS.ink}; letter-spacing: -0.5px; line-height: 1.05;">${strings.enLine1}</div>
        <div style="display: flex; font-family: 'Playfair Display'; font-size: 58px; color: ${COLORS.ink}; letter-spacing: -0.5px; line-height: 1.05;">
          <span style="font-style: italic; color: ${COLORS.jam}; margin-right: 18px;">${strings.enEm} </span>
          <span>${strings.enTail.trimStart()}</span>
        </div>
      </div>

      <!-- zh-Hant headline. Family chain: TC ideographs → TC punctuation
           (separate family name because the chinese-traditional subset
           doesn't include U+FF0C 「，」 — satori falls through on
           font-family chain, not on duplicate-name fonts). -->
      <div style="display: flex; font-family: 'Noto Serif TC', 'Noto Serif TC Punct'; font-size: 42px; color: ${COLORS.inkSoft}; line-height: 1.2;">
        <span>${strings.zhLine1}</span>
        <span style="font-weight: 700; color: ${COLORS.jam};">${strings.zhEm}</span>
        <span>${strings.zhTail}</span>
      </div>

      <!-- Bottom-aligned strip -->
      <div style="display: flex; flex: 1;"></div>
      <div style="display: flex; border-top: 1px solid ${COLORS.line}; padding-top: 24px; justify-content: space-between; align-items: center;">
        <span style="font-family: 'JetBrains Mono'; font-size: 14px; color: ${COLORS.jam}; letter-spacing: 2.6px;">${strings.axisStrip}</span>
        <span style="font-family: 'JetBrains Mono'; font-size: 14px; color: ${COLORS.ink}; letter-spacing: 2px;">${strings.url}</span>
      </div>
    </div>
  `;
}

async function renderCard() {
  const tree = template(OG_STRINGS, markDataUrl());

  const svg = await satori(tree, {
    width: 1200,
    height: 630,
    fonts: [
      { name: "Playfair Display", data: loadFont(FONTS.playfair), weight: 400, style: "normal" },
      { name: "Playfair Display", data: loadFont(FONTS.playfairItalic), weight: 400, style: "italic" },
      { name: "Noto Serif TC", data: loadFont(FONTS.notoSerifTC), weight: 400, style: "normal" },
      { name: "Noto Serif TC", data: loadFont(FONTS.notoSerifTCBold), weight: 700, style: "normal" },
      { name: "Noto Serif TC Punct", data: loadFont(FONTS.notoSerifTCPunct), weight: 400, style: "normal" },
      { name: "Noto Serif TC Punct", data: loadFont(FONTS.notoSerifTCPunctBold), weight: 700, style: "normal" },
      { name: "JetBrains Mono", data: loadFont(FONTS.jetBrainsMono), weight: 400, style: "normal" },
    ],
  });

  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: 1200 },
  });
  return resvg.render().asPng();
}

const png = await renderCard();
const outPath = path.join(root, "public/og.png");
fs.writeFileSync(outPath, png);

const kb = (png.length / 1024).toFixed(1);
console.log(`✓ OG image rendered (${kb} KB) → ${path.relative(root, outPath)}`);
