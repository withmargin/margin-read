import { describe, expect, it } from "vitest";
import type { TranslationProviderId } from "../../shared/types";
import { getProvider } from "./index";

describe("getProvider", () => {
  it.each<TranslationProviderId>(["openai", "openai-compatible", "anthropic", "google"])(
    "returns a provider whose id matches the requested id (%s)",
    (id) => {
      const provider = getProvider(id);
      expect(provider.id).toBe(id);
      expect(typeof provider.translate).toBe("function");
      expect(typeof provider.listModels).toBe("function");
    }
  );

  it("throws on an unknown provider id", () => {
    expect(() => getProvider("unknown" as TranslationProviderId)).toThrow(/Unsupported translation provider/);
  });
});
