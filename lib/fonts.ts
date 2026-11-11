import type { FontFamily } from "./theme";

export function getFontCssString(family: FontFamily, sizePx: number): string {
  const familyMap: Record<FontFamily, string> = {
    Georgia: `Georgia, Cambria, "Times New Roman", Times, serif`,
    Inter: `Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`,
    Literata: `"Literata", "Bookerly", Georgia, serif`,
  };
  return `${sizePx}px ${familyMap[family]}`;
}

export function getHeadingFontFamily(family: FontFamily): string {
  return family === "Inter" ? "Inter, sans-serif" : "Georgia, serif";
}