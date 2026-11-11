export type BgTheme = "Paper" | "White" | "Night";
export type TextColor = "Black" | "Gray" | "Soft";
export type FontFamily = "Georgia" | "Inter" | "Literata";

export interface ReadingSettingsState {
  fontFamily: FontFamily;
  bgTheme: BgTheme;
  textColor: TextColor;
  fontSize: number;
  readingWidthPct: number;
  lineSpacingRatio: number;
  showRowMeta: boolean;
  menuShowBookmark: boolean;
  menuShowHighlight: boolean;
  menuShowNotes: boolean;
  showBottomLeftBar: boolean;
}

export const DEFAULT_READING_SETTINGS: ReadingSettingsState = {
  fontFamily: "Georgia",
  bgTheme: "Paper",
  textColor: "Black",
  fontSize: 15,
  readingWidthPct: 60,
  lineSpacingRatio: 2.35,
  showRowMeta: false,
  menuShowBookmark: true,
  menuShowHighlight: true,
  menuShowNotes: true,
  showBottomLeftBar: true,
};

export interface ThemeClasses {
  surface: string;
  subtle: string;
  rowBadge: string;
  pageBg: string;
  textTone: string;
}

export function buildThemeClasses(
  isNight: boolean,
  bgTheme: BgTheme,
  textColor: TextColor
): ThemeClasses {
  const surface = isNight
    ? "bg-[#1c1e22]/95 border-stone-700/80 text-stone-100 shadow-2xl"
    : "bg-white/95 border-stone-300/85 text-stone-900 shadow-xl";

  const subtle = isNight
    ? "bg-stone-900/75 border-stone-700/70 text-stone-300"
    : "bg-[#f5f3ef]/90 border-stone-200/90 text-stone-700";

  const rowBadge = isNight
    ? "bg-stone-800/40 text-stone-500 border-stone-700/30"
    : bgTheme === "White"
    ? "bg-stone-200/55 text-stone-400 border-stone-300/40"
    : "bg-stone-400/15 text-stone-500/75 border-stone-400/20";

  const pageBg = { Paper: "bg-[#e3dfd7]", White: "bg-[#f8f9fa]", Night: "bg-[#141619]" }[bgTheme];

  const textTone = {
    Black: isNight ? "text-stone-100" : "text-stone-900",
    Gray: isNight ? "text-stone-400" : "text-stone-600",
    Soft: isNight ? "text-amber-200/80" : "text-[#5c3d38]",
  }[textColor];

  return { surface, subtle, rowBadge, pageBg, textTone };
}