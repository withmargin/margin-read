// Translation dictionary for the marketing site.
// Keys are flat dotted paths — components import the typed `t()` helper
// from ./utils and look them up directly. Keep the two locales in lockstep.

// `Locale` is the URL-segment / path form used by Astro.currentLocale.
// The BCP 47 form (e.g. "zh-Hant") lives in the htmlLang map below and
// in the codes[] array inside astro.config.mjs for hreflang matching.
export const defaultLocale = "en" as const;
export const locales = ["en", "zh-hant"] as const;
export type Locale = (typeof locales)[number];

export const ui = {
  en: {
    "html.title": "Margin — Read in two languages",
    "html.description":
      "A privacy-first browser extension for bilingual webpage translation. The original stays, the translation grows beneath. Bring your own API key.",

    "nav.demo": "How it works",
    "nav.features": "Features",
    "nav.privacy": "Privacy",
    "nav.providers": "AI Providers",
    "nav.github": "GitHub",

    "topbar.kicker": "BILINGUAL NOTES",

    "hero.eyebrow": "No server · No account · No subscription · MIT",
    "hero.t1": "Read the web in two languages",
    "hero.t1b": ",",
    "hero.t2": "without losing",
    "hero.t3": " the original.",
    "hero.p1": "No account. Ready to use.",
    "hero.p2":
      " Translation goes from your browser directly to OpenAI, Anthropic, or Google — no Margin in between. Fully MIT open source. Your browsing and reading stay truly private.",
    "hero.cta1": "Install from source",
    "hero.cta1m": "unpacked · MV3",
    "hero.cta2": "Notify me on launch",
    "hero.cta2m": "No email — pick a channel",
    "hero.follow_lede": "No email list. Pick whichever you already use:",
    "hero.follow_gh_t": "Watch on GitHub",
    "hero.follow_gh_d": "Releases-only notifications from GitHub itself.",
    "hero.follow_rss_t": "RSS",
    "hero.follow_rss_d": "Drop the releases atom into your reader.",
    "hero.note":
      "We deliberately don't keep an email list. Less surface area, nothing to leak, nothing to guess what we'd do with.",
    "hero.hp_meta": "arXiv · cs.CL · 2024 · 12 min read",
    "hero.hp_title": "Mixture of Experts: A Survey for Long-Context Models",
    "hero.hp_byline": "— J. Smolinski · Y. Tanaka · M. Reyes",
    "hero.hp_p1":
      "Most translation extensions replace the page. Margin does the opposite — the original stays, and the translation grows beneath, paragraph by paragraph.",
    "hero.hp_p1z":
      "大多數翻譯外掛把整頁取代。Margin 反其道而行——原文留下，譯文一段一段在下方長出來。",
    "hero.hp_p2":
      "When the original is one glance away, you verify a translated phrase the moment it feels off.",
    "hero.hp_p2z":
      "當原文只在一瞥之間，你能在感覺翻譯不對勁的瞬間立刻驗證。",
    "hero.hp_cap1": "● TRANSLATED IN-PLACE",
    "hero.hp_cap2": "PARAGRAPH × PARAGRAPH",
    "hero.fig": "FIG. 01",
    "hero.fig_label": "READING / PARALLEL",

    "demo.eye": "See for yourself",
    "demo.t1": "The original stays.",
    "demo.t2": "The translation grows beneath.",
    "demo.lede":
      "Most translation extensions replace the page. You scroll, you read, and somewhere along the way you forget which language you started in. Margin does the opposite — the translation slides in beneath, paragraph by paragraph.",
    "demo.mode_int": "Integrated",
    "demo.mode_hl": "Highlighted",
    "demo.translate": "Translate this page",
    "demo.translated": "Translated ✓",
    "demo.meta": "arXiv · cs.CL · 2024",
    "demo.title":
      "Mixture of Experts: A Practical Survey for Long-Context Language Models",
    "demo.byline":
      "— Jan Smolinski, Yuki Tanaka, Marina Reyes · saved 12 min ago",
    "demo.p1":
      "Most translation extensions replace the page. You scroll, you read, and somewhere along the way you forget which language you started in. Margin does the opposite: the original text stays exactly where it was, and the translation slides in beneath, paragraph by paragraph.",
    "demo.p1_zh":
      "大多數翻譯外掛會把整頁取代。你滾動、閱讀，最後忘了自己原本是用哪種語言開始讀的。Margin 反其道而行：原文留在原地不動，譯文一段一段插入下方。",
    "demo.p2":
      "This matters more than it sounds. When the original is one glance away, you can verify a translated phrase the moment it feels off. The bilingual layout turns reading into a quiet collaboration between two languages instead of a one-way conversion.",
    "demo.p2_zh":
      "這比聽起來重要。當原文只在一瞥之間，你能在感覺翻譯不對勁的瞬間立刻驗證。雙語排版把閱讀變成兩種語言之間安靜的協作，而不是單向的轉換。",
    "demo.p3":
      "There is no Margin server. The extension talks directly to OpenAI, Anthropic, or Google with the API key you provide. Your reading is yours. Your bill is yours. Your choice of model is yours.",
    "demo.p3_zh":
      "這裡沒有 Margin 的伺服器。外掛使用你提供的 API Key 直接和 OpenAI、Anthropic 或 Google 對話。你讀什麼是你的事，帳單是你的，模型選擇也是你的。",
    "demo.p4":
      "Margin detects readable blocks—paragraphs, headings, list items, blockquotes—and skips the chrome: navigation, forms, code, hidden text. On X and longform articles, a dedicated detector targets the post body and ignores profile names and metric counts.",
    "demo.p4_zh":
      "Margin 會偵測可讀的區塊——段落、標題、列表項、引言——並跳過頁面的零件：導覽列、表單、程式碼、隱藏文字。在 X 和長文文章上，專用偵測器只鎖定貼文本體，忽略使用者名稱和互動數字。",

    "feat.eye": "Features",
    "feat.t1": "Every",
    "feat.t2": "detail",
    "feat.t3": " is shaped so you never lose the original.",
    "feat.lede":
      "Margin started from one question: when do you most need the original while reading? The answer is, always. So the original is always there.",
    "f1.t": "Bilingual stacked layout",
    "f1.b":
      "Translations don't replace originals — they appear right beneath them. Compare, verify, and learn without losing your place.",
    "f2.t": "Smart text detection",
    "f2.b":
      "Detects paragraphs, headings, lists, and blockquotes. Skips nav, forms, buttons, code, and hidden text. Even handles legacy table/font/br pages.",
    "f3.t": "Bring your own AI",
    "f3.b":
      "Supports OpenAI, Anthropic Claude, and Google Gemini. Endpoint is editable — works with compatible gateways and self-hosted routing.",
    "f4.t": "Privacy first",
    "f4.b":
      "No Margin server, no account, no default telemetry. Your API key lives in your browser. Provider requests come straight from the service worker.",
    "f5.t": "X / Twitter optimization",
    "f5.b":
      "A dedicated detector for timeline cards and longform articles. Translates the post body, skips profile names, counts, and media controls.",
    "f6.t": "Cache, your way",
    "f6.b":
      "Three modes: session by default, persistent by choice, or off. Reduce repeat calls without giving up control.",

    "prov.eye": "Supported AI providers",
    "prov.t1": "Three frontier models,",
    "prov.t2": "one",
    "prov.t3": " is yours.",
    "prov.lede":
      'Margin is not bound to a single provider. The endpoint field is editable for compatible gateways and self-hosted routing. "Fetch models" reads available models directly from the provider.',
    "prov.openai":
      "Stable, broad model selection, mature ecosystem. Margin streams via chat completions and can fetch your account's available models from the options page.",
    "prov.claude":
      "Strong on long passages and tone preservation. Often shines on research articles and reportage where nuance matters.",
    "prov.gemini":
      "Generous free tier, strong East Asian languages, low-latency Flash variants — ideal when translating large amounts of text continuously.",

    "priv.eye": "Why BYO key",
    "priv.t1": "What you read,",
    "priv.t2": "is yours",
    "priv.t3": ".",
    "priv.lede":
      "Most cloud translation tools quietly send every paragraph you read to a third-party server, where it may be stored, analyzed, or used for training. Margin sidesteps that whole class of risk by not having a server at all.",
    "priv.p1t": "No Margin server",
    "priv.p1b":
      "All provider requests come directly from the extension's service worker. There's no us in the middle, and no proxy layer.",
    "priv.p2t": "No login, no account",
    "priv.p2b":
      'No signup flow, no OAuth, no cloud sync. Your browser profile is your "account."',
    "priv.p3t": "No telemetry by default",
    "priv.p3b":
      "No analytics, no error reporting, no usage events. Debug info shows up only in the popup's debug mode, locally.",
    "priv.p4t": "Only selected text segments",
    "priv.p4b":
      "Margin never sends full page HTML to the provider — only detected readable blocks, batched to keep latency low.",
    "priv.p5t": "API key stays in your browser",
    "priv.p5b":
      "Stored in chrome.storage and never leaves your profile. Treat your browser profile as your trust boundary.",

    "flow.title": "DATA FLOW",
    "flow.you": "Your browser",
    "flow.you_sub": "Source page + API key",
    "flow.margin": "Margin extension",
    "flow.detect_sub": "Detect → queue → batch",
    "flow.prov": "Your chosen provider",
    "flow.prov_sub": "OpenAI / Claude / Gemini",
    "flow.foot": "No fourth party in the middle.",

    "dis.eye": "Two display styles",
    "dis.t1": "Blend into the page, or",
    "dis.t2": "stand right out",
    "dis.t3": ". You pick.",
    "dis.lede":
      "Two render modes for two reading modes. The default inherits the page's own typography so a carefully-designed article stays that way. The highlighter mode marks every translation in butter yellow — for language learning, side-by-side comparison, or finding translations fast in dense layouts.",
    "dis.a_label": "— STYLE A · INTEGRATED",
    "dis.a_t": "Blends into the flow",
    "dis.a_b":
      "Translation inherits the page's own typography, weight, and rhythm — only its opacity is dialed back, like a pencil note in the same hand as the original. Best for articles you'd read for the writing itself.",
    "dis.b_label": "— STYLE B · HIGHLIGHTED",
    "dis.b_t": "Highlighter strip",
    "dis.b_b":
      "Translation rides a strip of butter-yellow highlight, the way you'd mark a key sentence in a print book. Best for language learning, side-by-side comparison, or finding translations fast in dense layouts.",
    "dis.src":
      "Most translation extensions replace the page. Margin does the opposite.",
    "dis.tr": "大多數翻譯外掛會把整頁取代。Margin 反其道而行。",

    "x.eye": "X (Twitter) optimization",
    "x.t1": "In a flood of posts,",
    "x.t2": "translate only what's worth reading",
    "x.t3": ".",
    "x.lede":
      "Timelines aren't articles. Margin ships an X-specific detector that targets tweet bodies and longform articles only — skipping profile names, like and view counts, media controls, and posts X already marks as translated.",
    "x.name": "Mari Yamada",
    "x.handle": "@mariyamada",
    "x.time": "2:14 PM · May 8, 2026",
    "x.tweet":
      "After ten years of duct-taping a legacy browser extension in the lab, I've finally decided to rewrite it from scratch. The hard part isn't the code — it's the negotiation with the version of myself who shipped it.",
    "x.tweet_zh":
      "在研究室用了十年的老瀏覽器外掛，終於決定自己重寫一遍。難的不是寫程式，是跟過去的自己談判。",
    "x.skip": "Margin won't translate any of these",
    "x.l1": "Translates tweetText only — not display names",
    "x.l2": "Skips like, repost, and view counts",
    "x.l3": "Detects the body of long-form X articles",
    "x.l4": "Quoted posts disabled by default; opt-in from options",
    "x.l5": "Skips posts X already marks as translated",
    "x.l6": "Picks up newly-loaded cards as you scroll",

    "tech.eye": "Tech · Open source",
    "tech.t1": "Every line",
    "tech.t2": "in plain ink",
    "tech.t3": ".",
    "tech.lede":
      "Margin is built in TypeScript on Manifest V3 and bundled with Rolldown. MIT-licensed; the source is public.",
    "tech.s1": '"No license has been selected yet." Actually, it\'s MIT.',
    "tech.s1b":
      "Margin is an open-source MVP. Issues, PRs, forks, and self-hosting are welcome. We believe privacy you can verify is the only privacy worth claiming — so the source is public.",
    "tech.s2b":
      "Want to contribute? The docs are there: Product Requirements, Principles, Threat Model, Roadmap. Start in docs/.",
    "tech.repo": "github.com/withmargin/margin-read",
    "tech.stat_lang": "TypeScript",
    "tech.stat_mv3": "Manifest V3",
    "tech.stat_license": "License",
    "tech.stat_telemetry": "Telemetry calls",

    "hon.eye": "Honestly",
    "hon.t1": "Margin is still an",
    "hon.t2": "early MVP",
    "hon.t3": ".",
    "hon.lede":
      "It works well on article pages, legacy text-heavy pages, and a few high-value dynamic pages like X. But there are rough edges, and we're listing them here instead of hiding them.",
    "lim.1t": "Firefox isn't a primary target yet",
    "lim.1b": "Chrome / Chromium first. Firefox will follow.",
    "lim.2t": "Some highly dynamic apps",
    "lim.2b":
      "On SPAs that aggressively rewrite the DOM, translation blocks may get moved or removed. Working on it.",
    "lim.3t": "Large pages translate in batches",
    "lim.3b":
      "To stay friendly with provider rate limits, translations appear progressively rather than all at once.",

    "price.eye": "Bring your own cost",
    "price.t1": "Margin is free.",
    "price.t2": "Your API bill",
    "price.t3": " is yours.",
    "price.lede":
      "There is no Margin subscription. The only cost is the provider's per-token rate, paid directly to OpenAI, Anthropic, or Google. Most reading sessions are measured in cents.",
    "price.calc": "Cost estimator · monthly",
    "price.pages": "Pages translated / day",
    "price.words": "Avg. words / page",
    "price.model": "Model",
    "price.per_day": "per day",
    "price.per_month": "per month",
    "price.n1":
      "A typical research paper (≈10k words) translated end-to-end with GPT-4o mini comes in under one cent.",
    "price.n2":
      "Session cache avoids repeat calls while you read. Persistent cache is optional for pages you revisit later.",
    "price.n3":
      "Bring your own key. The endpoint is editable — plug in any compatible gateway, self-hosted router, or routed proxy.",
    "price.n4":
      "Gemini's free tier is generous enough for casual reading. Most users never see a bill at all.",

    "faq.eye": "Frequently asked",
    "faq.t1": "Questions, before you",
    "faq.t2": "install",
    "faq.t3": ".",
    "faq.lede":
      "A short list. Longer answers live in the docs/ directory of the repository.",
    "faq.q1": "Why bring your own API key?",
    "faq.a1":
      "Cloud translation services route every paragraph you read through their servers, where it can be logged, analyzed, or used for training. With BYO-key, your reading is sent only to the provider you already chose to trust. Margin itself sees nothing.",
    "faq.q2": "How is this different from Google Translate or DeepL?",
    "faq.a2":
      "Most extensions replace the page with a translated copy. Margin keeps the original and inserts the translation beneath. The bilingual layout is the point: it is a reading tool for people who do not want to leave the source language behind.",
    "faq.q3": "Which AI provider should I pick?",
    "faq.a3":
      "For long-form English-to-Chinese with tone preservation, Claude is usually a safe default. For the lowest cost and broad model selection, GPT-4o mini. For a generous free tier and East Asian languages, Gemini Flash. The endpoint field accepts any OpenAI-compatible gateway.",
    "faq.q4": "Will my API key leak?",
    "faq.a4":
      "The key lives in chrome.storage on your profile. Provider requests are issued from the extension service worker. There is no Margin server in the path. Treat your browser profile as your trust boundary — standard advice for any extension that holds credentials.",
    "faq.q5": "Does it work on PDFs?",
    "faq.a5":
      "Not yet. Margin targets HTML pages today. PDF support is on the roadmap; in the meantime, paste the text into a plain HTML reader, or use a browser PDF-to-HTML viewer.",
    "faq.q6": "Why is the codebase TypeScript?",
    "faq.a6":
      "A privacy-claiming extension should be auditable. TypeScript on Manifest V3 with Rolldown gives a small, readable surface area. The repository contains the PRD, principles, threat model, and roadmap so the design choices are checkable, not just the binaries.",
    "faq.q7": "When will it be on the Chrome Web Store?",
    "faq.a7":
      "Soon. The MVP is fully usable today as an unpacked install — clone the repo, load it in chrome://extensions. We don't keep an email list. To get notified when the Web Store version ships, either Watch the GitHub repo (releases only) or subscribe to the releases RSS feed — both are linked from the hero above. GitHub does the delivery; we never see who subscribed.",

    "ft.tag":
      "A privacy-first browser extension for bilingual webpage translation. The original stays, the translation grows beneath. Bring your own API key.",
    "ft.h1": "PRODUCT",
    "ft.h2": "DOCS",
    "ft.h3": "CONNECT",
    "ft.demo": "How it works",
    "ft.features": "Features",
    "ft.privacy": "Privacy",
    "ft.styles": "Display styles",
    "ft.priv": "Privacy-first · Open source · MIT",
    "ft.priv_policy": "Privacy Policy",
    "ft.tos": "Terms of Service",
  },
  "zh-hant": {
    "html.title": "Margin — 雙語對照閱讀網頁",
    "html.description":
      "隱私優先的雙語對照翻譯瀏覽器外掛。原文留下，譯文長在下方。自帶 API Key。",

    "nav.demo": "如何運作",
    "nav.features": "功能",
    "nav.privacy": "隱私",
    "nav.providers": "AI 引擎",
    "nav.github": "GitHub",

    "topbar.kicker": "雙語注譯",

    "hero.eyebrow": "無伺服器 · 無帳號 · 無訂閱 · MIT 開源",
    "hero.t1": "旁譯入頁",
    "hero.t1b": "，",
    "hero.t2": "原文如故",
    "hero.t3": "。",
    "hero.p1": "無需帳號、立即可用。",
    "hero.p2": "翻譯從你的瀏覽器直送 OpenAI、Anthropic、Google — 中間沒有我們。全程 MIT 開源。真正保有你的瀏覽與閱讀隱私。",
    "hero.cta1": "從 source 載入",
    "hero.cta1m": "unpacked · MV3",
    "hero.cta2": "上架時通知我",
    "hero.cta2m": "不收 email — 挑一個通知管道",
    "hero.follow_lede": "我們不留 email 名單。選一個你已經在用的：",
    "hero.follow_gh_t": "在 GitHub 追蹤",
    "hero.follow_gh_d": "每次發版會收到通知（由 GitHub 直接寄）。",
    "hero.follow_rss_t": "RSS",
    "hero.follow_rss_d": "把 releases feed 加進你的閱讀器。",
    "hero.note":
      "我們刻意不收 email — 少一份名單、沒東西外洩、也省去被猜「拿我們名單做什麼」的疑慮。",
    "hero.hp_meta": "arXiv · cs.CL · 2024 · 12 分鐘閱讀",
    "hero.hp_title": "Mixture of Experts: A Survey for Long-Context Models",
    "hero.hp_byline": "— J. Smolinski · Y. Tanaka · M. Reyes",
    "hero.hp_p1":
      "Most translation extensions replace the page. Margin does the opposite — the original stays, and the translation grows beneath, paragraph by paragraph.",
    "hero.hp_p1z":
      "大多數翻譯外掛把整頁取代。Margin 反其道而行——原文留下，譯文一段一段在下方長出來。",
    "hero.hp_p2":
      "When the original is one glance away, you verify a translated phrase the moment it feels off.",
    "hero.hp_p2z":
      "當原文只在一瞥之間，你能在感覺翻譯不對勁的瞬間立刻驗證。",
    "hero.hp_cap1": "● TRANSLATED IN-PLACE",
    "hero.hp_cap2": "段落 × 段落",
    "hero.fig": "FIG. 01",
    "hero.fig_label": "READING / PARALLEL",

    "demo.eye": "親眼看看",
    "demo.t1": "原文留下，",
    "demo.t2": "譯文長在下方。",
    "demo.lede":
      "大多數翻譯外掛把整頁取代，你滾動、閱讀，最後忘了自己原本在讀哪種語言。Margin 反其道而行——譯文一段一段插入下方，原文永遠只在一瞥之間。",
    "demo.mode_int": "整合式",
    "demo.mode_hl": "高亮式",
    "demo.translate": "翻譯這個頁面",
    "demo.translated": "已翻譯 ✓",
    "demo.meta": "arXiv · cs.CL · 2024",
    "demo.title":
      "Mixture of Experts: A Practical Survey for Long-Context Language Models",
    "demo.byline":
      "— Jan Smolinski, Yuki Tanaka, Marina Reyes · 12 分鐘前儲存",
    "demo.p1":
      "Most translation extensions replace the page. You scroll, you read, and somewhere along the way you forget which language you started in. Margin does the opposite: the original text stays exactly where it was, and the translation slides in beneath, paragraph by paragraph.",
    "demo.p1_zh":
      "大多數翻譯外掛會把整頁取代。你滾動、閱讀，最後忘了自己原本是用哪種語言開始讀的。Margin 反其道而行：原文留在原地不動，譯文一段一段插入下方。",
    "demo.p2":
      "This matters more than it sounds. When the original is one glance away, you can verify a translated phrase the moment it feels off. The bilingual layout turns reading into a quiet collaboration between two languages instead of a one-way conversion.",
    "demo.p2_zh":
      "這比聽起來重要。當原文只在一瞥之間，你能在感覺翻譯不對勁的瞬間立刻驗證。雙語排版把閱讀變成兩種語言之間安靜的協作，而不是單向的轉換。",
    "demo.p3":
      "There is no Margin server. The extension talks directly to OpenAI, Anthropic, or Google with the API key you provide. Your reading is yours. Your bill is yours. Your choice of model is yours.",
    "demo.p3_zh":
      "這裡沒有 Margin 的伺服器。外掛使用你提供的 API Key 直接和 OpenAI、Anthropic 或 Google 對話。你讀什麼是你的事，帳單是你的，模型選擇也是你的。",
    "demo.p4":
      "Margin detects readable blocks—paragraphs, headings, list items, blockquotes—and skips the chrome: navigation, forms, code, hidden text. On X and longform articles, a dedicated detector targets the post body and ignores profile names and metric counts.",
    "demo.p4_zh":
      "Margin 會偵測可讀的區塊——段落、標題、列表項、引言——並跳過頁面的零件：導覽列、表單、程式碼、隱藏文字。在 X 和長文文章上，專用偵測器只鎖定貼文本體，忽略使用者名稱和互動數字。",

    "feat.eye": "主要功能",
    "feat.t1": "每一個",
    "feat.t2": "細節",
    "feat.t3": "，都是為了不讓你失去原文。",
    "feat.lede":
      "Margin 的設計從一個問題開始：閱讀時，何時你最需要原文？答案是「隨時」。所以原文永遠在那裡。",
    "f1.t": "雙語對照插入",
    "f1.b":
      "譯文不取代原文，而是緊接著原段落出現。閱讀時可隨時對照、驗證、學習。",
    "f2.t": "智能文字偵測",
    "f2.b":
      "偵測段落、標題、列表、引言。跳過導覽、表單、按鈕、程式碼、隱藏文字。連 table、font、br 排版的傳統頁面都能應付。",
    "f3.t": "自帶 AI 引擎",
    "f3.b":
      "支援 OpenAI、Anthropic Claude、Google Gemini。Endpoint 可改，相容 gateway 與自架 routing。",
    "f4.t": "隱私優先",
    "f4.b":
      "沒有 Margin 伺服器、沒有帳號、沒有預設遙測。API Key 存在你的瀏覽器，請求由 service worker 直接送出。",
    "f5.t": "X / Twitter 優化",
    "f5.b":
      "時間軸卡片與長文章專用偵測器，只翻譯貼文本體，跳過個人名稱、互動數字、媒體控制項。",
    "f6.t": "快取彈性",
    "f6.b":
      "三段式快取：預設 session、可選 persistent，或完全關閉。減少重複請求，同時保留控制權。",

    "prov.eye": "支援的 AI 引擎",
    "prov.t1": "三個",
    "prov.t2": "主流",
    "prov.t3": "，一個你的。",
    "prov.lede":
      "Margin 不綁定任何單一 provider。Endpoint 欄位可編輯，支援相容 gateway 與自架 routing。「Fetch models」可直接從 provider 拉取你帳號可用的模型清單。",
    "prov.openai":
      "穩定、模型多、生態完整。Margin 透過 chat completions 走 streaming，可在 options 直接 fetch 你帳號可用的所有模型。",
    "prov.claude":
      "中英品質均衡、長段落穩定。對於需要保留語氣與細節的研究文章與報導翻譯，Claude 通常表現出色。",
    "prov.gemini":
      "免費額度友善、東亞語言處理出色、Flash 系列延遲低，適合大量翻譯時持續運行的場景。",

    "priv.eye": "為什麼 BYO Key",
    "priv.t1": "你的閱讀，",
    "priv.t2": "只屬於你",
    "priv.t3": "。",
    "priv.lede":
      "大多數雲端翻譯工具的代價是把你正在讀的每一段文字送到第三方伺服器，並可能被儲存、分析、用於訓練。Margin 從根本繞開這個問題：沒有自己的伺服器。",
    "priv.p1t": "沒有 Margin 伺服器",
    "priv.p1b":
      "所有 provider 請求由瀏覽器外掛的 service worker 直接送出。中間沒有我們，也沒有任何代理層。",
    "priv.p2t": "不需登入、不需帳號",
    "priv.p2b":
      "沒有註冊流程、沒有 OAuth、沒有 cloud sync。瀏覽器設定檔本身就是 Margin 的「帳號」。",
    "priv.p3t": "預設無遙測",
    "priv.p3b":
      "不送 analytics、不送 error reporting、不送 usage events。除錯資訊只在你打開 popup 的 debug mode 時於本地顯示。",
    "priv.p4t": "只送出選定的文字片段",
    "priv.p4b":
      "Margin 不會把整頁 HTML 丟給 provider，只送偵測到的可讀文字區塊，並批次送出以降低延遲。",
    "priv.p5t": "API Key 只在你的瀏覽器",
    "priv.p5b":
      "儲存在 chrome.storage 裡，從未離開你的設定檔。請把瀏覽器 profile 視為信任邊界。",

    "flow.title": "資料流向 / DATA FLOW",
    "flow.you": "你的瀏覽器",
    "flow.you_sub": "原始頁面 + API Key",
    "flow.margin": "Margin extension",
    "flow.detect_sub": "偵測 → 排隊 → 批次",
    "flow.prov": "你選的 AI provider",
    "flow.prov_sub": "OpenAI / Claude / Gemini",
    "flow.foot": "中間沒有第四方。",

    "dis.eye": "兩種顯示樣式",
    "dis.t1": "嵌入閱讀流，或",
    "dis.t2": "明顯標示",
    "dis.t3": "。你決定。",
    "dis.lede":
      "兩種呈現，對應兩種閱讀情境。預設沿用網頁原本的字型與留白，讓本來設計用心的文章保持原本的樣子。螢光模式為每段譯文加一條螢光黃，適合語言學習、雙語對照、或在密集排版中快速辨認譯文。",
    "dis.a_label": "— STYLE A · INTEGRATED",
    "dis.a_t": "融入閱讀流",
    "dis.a_b":
      "譯文沿用網頁本身的字型、字重、行距，只把色度調淡一點，像作者親筆寫在同一頁上的鉛筆註。適合排版用心、想原汁原味閱讀的長文章。",
    "dis.b_label": "— STYLE B · HIGHLIGHTED",
    "dis.b_t": "螢光劃記",
    "dis.b_b":
      "譯文鋪在一條螢光黃色塊上，像你在紙本書上用螢光筆劃過的那一行。適合語言學習、雙語對照、或在密集排版中快速辨認譯文。",
    "dis.src":
      "Most translation extensions replace the page. Margin does the opposite.",
    "dis.tr": "大多數翻譯外掛會把整頁取代。Margin 反其道而行。",

    "x.eye": "X (Twitter) 專用優化",
    "x.t1": "在資訊洪流裡，",
    "x.t2": "只翻你想讀的那行",
    "x.t3": "。",
    "x.lede":
      "時間軸不是文章。Margin 內建一套 X 專用偵測器：只鎖定 tweet 本體與長文 article，跳過個人名稱、互動數字、按讚計數、媒體控制項，並避開 X 已經標示為翻譯過的貼文，不重複翻譯。",
    "x.name": "山田 真理",
    "x.handle": "@mariyamada",
    "x.time": "2:14 PM · May 8, 2026",
    "x.tweet":
      "研究室で十年使ってきたレガシーなブラウザ拡張を、ついに自分で書き直すことにした。難しいのはコードじゃなくて、過去の自分との交渉だった。",
    "x.tweet_zh":
      "在研究室用了十年的老瀏覽器外掛，終於決定自己重寫一遍。難的不是寫程式，是跟過去的自己談判。",
    "x.skip": "這些 Margin 不會去翻",
    "x.l1": "只翻 tweetText 內容，不翻使用者名稱",
    "x.l2": "跳過按讚數、轉推數、瀏覽次數",
    "x.l3": "支援長文 X article 的內文偵測",
    "x.l4": "引用貼文預設關閉，可在 options 開啟",
    "x.l5": "X 已標示翻譯過的貼文自動跳過",
    "x.l6": "時間軸滾動時動態翻譯新出現的卡片",

    "tech.eye": "技術 · 開源",
    "tech.t1": "每一行，",
    "tech.t2": "都白紙黑字",
    "tech.t3": "。",
    "tech.lede":
      "Margin 是 TypeScript + Manifest V3，使用 Rolldown 打包。採 MIT 授權，所有原始碼公開。",
    "tech.s1": "「No license has been selected yet.」其實已經選了 — MIT。",
    "tech.s1b":
      "Margin 是開源 MVP。歡迎 issue、PR、fork、自架。我們相信能驗證的隱私才是隱私——所以原始碼是公開的。",
    "tech.s2b":
      "想要貢獻？文件齊全：產品需求、原則、威脅模型、路線圖。從 docs/ 進去就對了。",
    "tech.repo": "github.com/withmargin/margin-read",
    "tech.stat_lang": "TypeScript",
    "tech.stat_mv3": "Manifest V3",
    "tech.stat_license": "License",
    "tech.stat_telemetry": "Telemetry calls",

    "hon.eye": "老實說",
    "hon.t1": "Margin 還是",
    "hon.t2": "早期 MVP",
    "hon.t3": "。",
    "hon.lede":
      "在文章頁、傳統文字頁、和我們有特別處理的動態頁面（如 X）上運作良好。但有些地方還在打磨。誠實列在這裡，沒有藏。",
    "lim.1t": "Firefox 還不是首要目標",
    "lim.1b": "目前 Chrome / Chromium 為主。Firefox 支援會跟在後面。",
    "lim.2t": "部分高互動 Web App",
    "lim.2b": "會強烈改寫 DOM 的 SPA 上，譯文區塊可能被搬走或移除。我們在處理。",
    "lim.3t": "大頁面分批翻譯",
    "lim.3b": "為了不打爆 provider rate limit，譯文會分批漸進出現。",

    "price.eye": "Bring your own cost",
    "price.t1": "Margin 完全免費。",
    "price.t2": "API 帳單",
    "price.t3": "由你支付。",
    "price.lede":
      "Margin 沒有訂閱費。唯一的成本是 provider 的 per-token 費率，直接付給 OpenAI、Anthropic 或 Google。多數閱讀情境每次只是幾分錢。",
    "price.calc": "成本估算 · 月費",
    "price.pages": "每天翻譯頁數",
    "price.words": "每頁平均字數",
    "price.model": "模型",
    "price.per_day": "每日",
    "price.per_month": "每月",
    "price.n1":
      "一篇 ≈10k 字的研究論文用 GPT-4o mini 整篇翻完，成本不到 1 美分。",
    "price.n2":
      "Session cache 會避免同一次閱讀中的重複請求；若常重讀同頁，也可以自行開啟 persistent cache。",
    "price.n3":
      "自帶金鑰。Endpoint 可編輯——支援相容 gateway、自架 router、proxy 路由。",
    "price.n4":
      "Gemini 免費額度對日常閱讀夠用。多數使用者根本看不到帳單。",

    "faq.eye": "常見問題",
    "faq.t1": "在你安裝之前的",
    "faq.t2": "幾個問題",
    "faq.t3": "。",
    "faq.lede": "簡短列幾題。詳細解答在 repo 的 docs/ 目錄。",
    "faq.q1": "為什麼要自帶 API Key？",
    "faq.a1":
      "雲端翻譯服務會把你讀的每段文字送到他們伺服器，可能被記錄、分析、用於訓練。BYO key 讓你的閱讀只送到你已經選擇信任的 provider。Margin 自己什麼都看不到。",
    "faq.q2": "和 Google Translate / DeepL 有什麼不同？",
    "faq.a2":
      "大多數擴充把整頁取代為翻譯版本。Margin 保留原文，把譯文插入下方。雙語排版才是重點：給「不想離開原始語言」的閱讀者用的工具。",
    "faq.q3": "我該選哪一個 AI provider？",
    "faq.a3":
      "需要保留語氣的長文英譯中：Claude 通常是安全選擇。要最低成本與最廣模型選擇：GPT-4o mini。要慷慨免費額度與東亞語言：Gemini Flash。Endpoint 欄位接受任何 OpenAI 相容 gateway。",
    "faq.q4": "我的 API Key 會外洩嗎？",
    "faq.a4":
      "Key 存在你 profile 的 chrome.storage 裡。Provider 請求由擴充的 service worker 發出，路徑中沒有 Margin 伺服器。請把瀏覽器 profile 視為信任邊界——這對任何持有憑證的擴充都適用。",
    "faq.q5": "支援 PDF 嗎？",
    "faq.a5":
      "目前還不支援。Margin 鎖定 HTML 頁面。PDF 在 roadmap 上；過渡方案是貼到純 HTML reader，或用瀏覽器的 PDF-to-HTML viewer。",
    "faq.q6": "為什麼用 TypeScript？",
    "faq.a6":
      "宣稱隱私的擴充應該可審計。TypeScript + MV3 + Rolldown 給出小而易讀的 surface area。Repo 內含 PRD、principles、threat model、roadmap，設計選擇都可被檢驗，不只是 binary。",
    "faq.q7": "什麼時候上 Chrome Web Store？",
    "faq.a7":
      "快了。MVP 今天就能以 unpacked 載入使用 — clone repo, 進 chrome://extensions 載入即可。我們不留 email 名單。想在 Web Store 上架當天收到通知，請從 hero 區的兩個管道擇一：在 GitHub 上 Watch 這個 repo (releases only)，或訂閱 releases RSS feed。GitHub 負責寄送，我們從頭到尾不知道誰訂了。",

    "ft.tag":
      "隱私優先的雙語對照翻譯瀏覽器外掛。原文留下，譯文長在下方。自帶 API Key。",
    "ft.h1": "產品",
    "ft.h2": "文件",
    "ft.h3": "連結",
    "ft.demo": "如何運作",
    "ft.features": "功能",
    "ft.privacy": "隱私",
    "ft.styles": "顯示樣式",
    "ft.priv": "隱私優先 · 開源 MIT",
    "ft.priv_policy": "隱私政策",
    "ft.tos": "服務條款",
  },
} as const satisfies Record<string, Record<string, string>>;

export type TranslationKey = keyof (typeof ui)["en"];

export const localeLabel: Record<Locale, string> = {
  en: "EN",
  "zh-hant": "中",
};

// BCP 47 lang attribute per locale — used by <html lang>, hreflang, and as
// the argument to Astro's getRelativeLocaleUrl / getAbsoluteLocaleUrl
// helpers (which match against the `codes` declared in astro.config.mjs).
export const htmlLang: Record<Locale, string> = {
  en: "en",
  "zh-hant": "zh-Hant",
};
