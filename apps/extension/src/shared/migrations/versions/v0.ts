/**
 * Frozen snapshot of the pre-v1 settings shape.
 *
 * Margin 0.1.x and 0.2.x stored a flat object with no `version` field.
 * X site-adapter flags were top-level keys (xOptimizedTranslation etc.).
 *
 * This type and its parser MUST NOT change once shipped: a user
 * restoring from a backup, or upgrading after skipping versions, may
 * still present this exact shape. Future code changes that touch
 * v0 belong in a NEW migration step (v0-to-vN+1 or a chain), not in
 * a rewrite of this file.
 */

import type { CacheMode, DisplayStyle } from "../../types";

type TranslationProviderIdV0 = "openai" | "anthropic" | "google" | "openai-compatible";

export interface ExtensionSettingsV0 {
  provider?: TranslationProviderIdV0;
  providerEndpoint?: string;
  apiKey?: string;
  model?: string;
  sourceLanguage?: string;
  targetLanguage?: string;
  displayStyle?: DisplayStyle;
  cacheMode?: CacheMode;
  debugMode?: boolean;
  xOptimizedTranslation?: boolean;
  xTranslateArticles?: boolean;
  xTranslateQuotedPosts?: boolean;
  xSkipNativeTranslatedPosts?: boolean;
  openAICompatibleJsonMode?: boolean;
  showFloatingButton?: boolean;
}

const PROVIDERS: readonly TranslationProviderIdV0[] = ["openai", "anthropic", "google", "openai-compatible"];
const DISPLAY_STYLES: readonly DisplayStyle[] = ["integrated", "highlighted"];
const CACHE_MODES: readonly CacheMode[] = ["session", "persistent", "disabled"];

export function parseV0(stored: unknown): ExtensionSettingsV0 {
  if (!isObjectRecord(stored)) {
    return {};
  }

  return {
    provider: stringEnum(stored.provider, PROVIDERS),
    providerEndpoint: stringField(stored.providerEndpoint),
    apiKey: stringField(stored.apiKey),
    model: stringField(stored.model),
    sourceLanguage: stringField(stored.sourceLanguage),
    targetLanguage: stringField(stored.targetLanguage),
    displayStyle: stringEnum(stored.displayStyle, DISPLAY_STYLES),
    cacheMode: stringEnum(stored.cacheMode, CACHE_MODES),
    debugMode: booleanField(stored.debugMode),
    xOptimizedTranslation: booleanField(stored.xOptimizedTranslation),
    xTranslateArticles: booleanField(stored.xTranslateArticles),
    xTranslateQuotedPosts: booleanField(stored.xTranslateQuotedPosts),
    xSkipNativeTranslatedPosts: booleanField(stored.xSkipNativeTranslatedPosts),
    openAICompatibleJsonMode: booleanField(stored.openAICompatibleJsonMode),
    showFloatingButton: booleanField(stored.showFloatingButton)
  };
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringField(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function booleanField(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function stringEnum<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  return (allowed as readonly string[]).includes(value) ? (value as T) : undefined;
}
