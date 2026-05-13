import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "../shared/defaults";
import { fillForm } from "./settingsForm";

describe("settings form", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <select name="displayStyle">
        <option value="balanced">Balanced</option>
        <option value="quiet">Quiet</option>
        <option value="focus">Focus translation</option>
        <option value="card">Card</option>
      </select>
    `;
  });

  it("normalizes legacy integrated display settings to quiet", () => {
    fillForm({ ...DEFAULT_SETTINGS, displayStyle: "integrated" });

    expect(document.querySelector<HTMLSelectElement>('[name="displayStyle"]')?.value).toBe("quiet");
  });

  it("normalizes legacy highlighted display settings to card", () => {
    fillForm({ ...DEFAULT_SETTINGS, displayStyle: "highlighted" });

    expect(document.querySelector<HTMLSelectElement>('[name="displayStyle"]')?.value).toBe("card");
  });
});
