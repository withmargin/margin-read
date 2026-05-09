export type OptionsLocale = "en" | "zh-TW";

type MessageKey =
  | "apiKey"
  | "apiKeyHint"
  | "cacheBehavior"
  | "cacheDisabled"
  | "cachePersistent"
  | "cacheSession"
  | "clearCache"
  | "debugHint"
  | "debugMode"
  | "displayHighlighted"
  | "displayIntegrated"
  | "displayStyle"
  | "endpointPreset"
  | "endpointPresetHint"
  | "fetchModels"
  | "localJsonHint"
  | "localJsonMode"
  | "localPresetDefault"
  | "localPresets"
  | "model"
  | "modelDefault"
  | "modelHint"
  | "optimizeXHint"
  | "optimizeXTimelines"
  | "provider"
  | "providerEndpoint"
  | "saveSettings"
  | "sourceLanguage"
  | "sourceLanguageHint"
  | "statusCacheCleared"
  | "statusFetchingModels"
  | "statusLoadedModels"
  | "statusModelsFailed"
  | "statusSettingsSaved"
  | "targetLanguage"
  | "targetLanguageHint"
  | "title"
  | "translateQuotedPosts"
  | "translateQuotedPostsHint"
  | "translateXArticles"
  | "translateXArticlesHint"
  | "xOptimization"
  | "xSkipNative"
  | "xSkipNativeHint";

const MESSAGES: Record<OptionsLocale, Record<MessageKey, string>> = {
  en: {
    apiKey: "API key",
    apiKeyHint: "Paste the raw provider API key. Local OpenAI-compatible endpoints can leave this empty.",
    cacheBehavior: "Cache behavior",
    cacheDisabled: "Disabled",
    cachePersistent: "Persistent",
    cacheSession: "Session only",
    clearCache: "Clear cache",
    debugHint: "Show page detection, queue, and provider error details in the popup.",
    debugMode: "Debug mode",
    displayHighlighted: "Highlighted",
    displayIntegrated: "Integrated",
    displayStyle: "Display style",
    endpointPreset: "Endpoint preset",
    endpointPresetHint: "Presets switch the provider to OpenAI Compatible and fill the endpoint.",
    fetchModels: "Fetch models",
    localJsonHint: "Disable this if a local runtime rejects the OpenAI response_format field.",
    localJsonMode: "Request JSON mode",
    localPresetDefault: "Select a local runtime",
    localPresets: "Local LLM presets",
    model: "Model",
    modelDefault: "Fetch models or use custom model below",
    modelHint: "Select a fetched model or enter a custom model name.",
    optimizeXHint: "Translate only tweet text from X timeline cards by default.",
    optimizeXTimelines: "Optimize X timelines",
    provider: "Provider",
    providerEndpoint: "Provider endpoint",
    saveSettings: "Save settings",
    sourceLanguage: "Source language",
    sourceLanguageHint: "Use auto to let the model detect the source language.",
    statusCacheCleared: "Translation cache cleared.",
    statusFetchingModels: "Fetching models...",
    statusLoadedModels: "Loaded {count} models.",
    statusModelsFailed: "Could not fetch models.",
    statusSettingsSaved: "Settings saved.",
    targetLanguage: "Target language",
    targetLanguageHint: "Search by English name, native name, language code, or alias.",
    title: "Toast Options",
    translateQuotedPosts: "Translate quoted posts",
    translateQuotedPostsHint: "Also translate nested quoted post text inside X cards.",
    translateXArticles: "Translate X articles",
    translateXArticlesHint: "Translate X longform article titles and readable rich text blocks.",
    xOptimization: "X optimization",
    xSkipNative: "Skip X translated posts",
    xSkipNativeHint: "Avoid retranslating posts that X already marks as translated."
  },
  "zh-TW": {
    apiKey: "API 金鑰",
    apiKeyHint: "貼上原始 provider API key。Local OpenAI-compatible endpoint 可以留空。",
    cacheBehavior: "快取行為",
    cacheDisabled: "停用",
    cachePersistent: "持久保存",
    cacheSession: "僅本次瀏覽階段",
    clearCache: "清除快取",
    debugHint: "在 popup 顯示頁面偵測、佇列與 provider 錯誤細節。",
    debugMode: "Debug 模式",
    displayHighlighted: "醒目區塊",
    displayIntegrated: "融入原文",
    displayStyle: "顯示樣式",
    endpointPreset: "Endpoint preset",
    endpointPresetHint: "選擇 preset 會切換到 OpenAI Compatible 並填入 endpoint。",
    fetchModels: "取得模型列表",
    localJsonHint: "如果 local runtime 拒絕 OpenAI response_format 欄位，請關閉此選項。",
    localJsonMode: "要求 JSON mode",
    localPresetDefault: "選擇 local runtime",
    localPresets: "Local LLM presets",
    model: "模型",
    modelDefault: "取得模型列表，或在下方輸入自訂模型",
    modelHint: "選擇取得的模型，或輸入自訂模型名稱。",
    optimizeXHint: "預設只翻譯 X timeline card 裡的 tweet text。",
    optimizeXTimelines: "最佳化 X timeline",
    provider: "翻譯服務",
    providerEndpoint: "Provider endpoint",
    saveSettings: "儲存設定",
    sourceLanguage: "來源語言",
    sourceLanguageHint: "使用 auto 讓模型自行判斷來源語言。",
    statusCacheCleared: "翻譯快取已清除。",
    statusFetchingModels: "正在取得模型列表...",
    statusLoadedModels: "已載入 {count} 個模型。",
    statusModelsFailed: "無法取得模型列表。",
    statusSettingsSaved: "設定已儲存。",
    targetLanguage: "目標語言",
    targetLanguageHint: "可用英文名稱、原生名稱、語言代碼或別名搜尋。",
    title: "Toast 設定",
    translateQuotedPosts: "翻譯 quoted posts",
    translateQuotedPostsHint: "同時翻譯 X card 裡巢狀引用貼文的文字。",
    translateXArticles: "翻譯 X articles",
    translateXArticlesHint: "翻譯 X longform article 標題與可閱讀文字區塊。",
    xOptimization: "X 最佳化",
    xSkipNative: "略過 X 已翻譯貼文",
    xSkipNativeHint: "避免重複翻譯 X 已標示翻譯過的貼文。"
  }
};

export function detectOptionsLocale(languages: readonly string[]): OptionsLocale {
  return languages.some((language) => language.toLowerCase().startsWith("zh")) ? "zh-TW" : "en";
}

export function t(locale: OptionsLocale, key: MessageKey, values: Record<string, string | number> = {}): string {
  return Object.entries(values).reduce(
    (message, [name, value]) => message.replaceAll(`{${name}}`, String(value)),
    MESSAGES[locale][key]
  );
}

export function applyOptionsI18n(locale: OptionsLocale, root: ParentNode = document): void {
  document.documentElement.lang = locale;
  document.title = t(locale, "title");

  root.querySelectorAll<HTMLElement>("[data-i18n]").forEach((element) => {
    const key = element.dataset.i18n as MessageKey | undefined;
    if (key) {
      element.textContent = t(locale, key);
    }
  });
}
