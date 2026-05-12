/**
 * Always re-export the current ExtensionSettings type from here so
 * migration code refers to "the current shape" without importing
 * from outside the migrations/ tree. When a v2 shape is introduced,
 * add versions/v1.ts (frozen) and update this re-export to point at
 * the new current.
 */
export type { ExtensionSettings as ExtensionSettingsCurrent } from "../../types";
export { SETTINGS_VERSION } from "../../types";
