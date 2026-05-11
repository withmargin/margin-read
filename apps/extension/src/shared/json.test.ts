import { describe, expect, it } from "vitest";
import { extractJsonObject } from "./json";

describe("extractJsonObject", () => {
  it("returns raw JSON unchanged", () => {
    expect(extractJsonObject('{"translations":[]}')).toBe('{"translations":[]}');
  });

  it("unwraps fenced JSON", () => {
    expect(extractJsonObject('```json\n{"translations":[]}\n```')).toBe('{"translations":[]}');
  });

  it("unwraps generic fenced content", () => {
    expect(extractJsonObject('```\n{"translations":[]}\n```')).toBe('{"translations":[]}');
  });

  it("extracts JSON from surrounding text", () => {
    expect(extractJsonObject('Here is the JSON:\n{"translations":[]}\nThanks.')).toBe('{"translations":[]}');
  });

  it("returns trimmed content when no object exists", () => {
    expect(extractJsonObject("  no json here  ")).toBe("no json here");
  });
});
