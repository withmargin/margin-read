import { describe, expect, it } from "vitest";
import { hashText } from "./hash";

describe("hashText", () => {
  it("returns a stable SHA-256 hash", async () => {
    await expect(hashText("hello")).resolves.toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"
    );
  });

  it("returns different hashes for different input", async () => {
    await expect(hashText("hello")).resolves.not.toBe(await hashText("world"));
  });
});
