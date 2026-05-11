import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://marginread.com",
  server: {
    port: 4321,
  },
  build: {
    inlineStylesheets: "auto",
  },
  i18n: {
    // URL paths stay lowercase (`/zh-hant/`) but the BCP 47 codes used for
    // hreflang + Accept-Language matching keep their canonical casing.
    locales: ["en", { path: "zh-hant", codes: ["zh-Hant", "zh-TW"] }],
    defaultLocale: "en",
    routing: {
      prefixDefaultLocale: false,
    },
  },
});
