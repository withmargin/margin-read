import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "../shared/defaults";
import { fillForm, readForm } from "./settingsForm";

describe("settings form", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <select name="displayStyle">
        <option value="balanced">Balanced</option>
        <option value="quiet">Quiet</option>
        <option value="focus">Focus translation</option>
        <option value="card">Card</option>
      </select>
      <input name="showTranslationLabel" type="checkbox" />
      <select name="cacheMode">
        <option value="session">Session only</option>
        <option value="persistent">Persistent</option>
        <option value="disabled">Disabled</option>
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

  it("fills and reads the independent translation marker setting", () => {
    fillForm({ ...DEFAULT_SETTINGS, showTranslationLabel: true });

    expect(document.querySelector<HTMLInputElement>('[name="showTranslationLabel"]')?.checked).toBe(true);
    expect(readForm().showTranslationLabel).toBe(true);
  });

  it("fills and reads the cache mode setting", () => {
    fillForm({ ...DEFAULT_SETTINGS, cacheMode: "disabled" });

    expect(document.querySelector<HTMLSelectElement>('[name="cacheMode"]')?.value).toBe("disabled");
    expect(readForm().cacheMode).toBe("disabled");
  });
});
