import type { TranslationProviderId } from "./types";

export const LOCAL_TRANSLATION_PROVIDERS = [
  "openai-compatible",
  "anthropic-compatible"
] as const satisfies readonly TranslationProviderId[];

export type LocalTranslationProviderId = (typeof LOCAL_TRANSLATION_PROVIDERS)[number];

export function isLocalTranslationProvider(
  provider: TranslationProviderId
): provider is LocalTranslationProviderId {
  return (LOCAL_TRANSLATION_PROVIDERS as readonly string[]).includes(provider);
}
