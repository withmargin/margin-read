import type {
  ExtensionSettings,
  ProviderModel,
  TextSegment,
  TranslationProviderId,
  TranslationResult
} from "../../shared/types";

export interface TranslationProvider {
  readonly id: TranslationProviderId;
  translate(segments: TextSegment[], settings: ExtensionSettings): Promise<TranslationResult[]>;
  listModels(settings: ExtensionSettings): Promise<ProviderModel[]>;
}
