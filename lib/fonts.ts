import type { FontFamily } from "./theme";

export function getFontCssString(family: FontFamily, sizePx: number): string {
  const familyMap: Record<FontFamily, string> = {
    Georgia: `Georgia, Cambria, "Times New Roman", Times, serif`,
    Inter: `Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`,
    Literata: `"Literata", "Bookerly", Georgia, serif`,
    "Times New Roman": `"Times New Roman", Times, serif`,
    Arial: `Arial, Helvetica, sans-serif`,
    Verdana: `Verdana, Geneva, sans-serif`,
    "Courier New": `"Courier New", Courier, monospace`,
    System: `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`,
  };
  return `${sizePx}px ${familyMap[family] || familyMap.Georgia}`;
}

export function getHeadingFontFamily(family: FontFamily): string {
  return family === "Inter" || family === "System" || family === "Arial" || family === "Verdana"
    ? getFontCssString(family, 16).split("px ")[1]
    : "Georgia, serif";
}