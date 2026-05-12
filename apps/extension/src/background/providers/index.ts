import type { TranslationProviderId } from "../../shared/types";
import { anthropicProvider } from "./anthropic";
import { googleProvider } from "./google";
import { openaiCompatibleProvider, openaiProvider } from "./openai";
import type { TranslationProvider } from "./types";

export type { TranslationProvider } from "./types";

const REGISTRY: Record<TranslationProviderId, TranslationProvider> = {
  openai: openaiProvider,
  "openai-compatible": openaiCompatibleProvider,
  anthropic: anthropicProvider,
  google: googleProvider
};

export function getProvider(id: TranslationProviderId): TranslationProvider {
  const provider = REGISTRY[id];
  if (!provider) {
    throw new Error(`Unsupported translation provider: ${String(id)}`);
  }
  return provider;
}
