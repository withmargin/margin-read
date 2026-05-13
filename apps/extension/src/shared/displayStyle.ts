import type { ModernDisplayStyle } from "./types";

export function normalizeDisplayStyle(style: string | undefined): ModernDisplayStyle {
  if (style === "quiet" || style === "focus" || style === "card") {
    return style;
  }
  if (style === "integrated") {
    return "quiet";
  }
  if (style === "highlighted") {
    return "card";
  }
  return "balanced";
}
