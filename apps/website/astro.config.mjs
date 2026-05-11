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
    locales: ["en", "zh-Hant"],
    defaultLocale: "en",
    routing: {
      prefixDefaultLocale: false,
    },
  },
});
