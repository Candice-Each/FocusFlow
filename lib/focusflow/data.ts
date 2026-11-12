import type { BookItem } from "./types";
import { BOOK_CHAPTERS } from "@/lib/chapters";

const SECRET_GARDEN_CONTENT = BOOK_CHAPTERS[1]?.content ?? "";

export const DEFAULT_BOOKS: BookItem[] = [
  {
    id: "clause-anchor",
    title: "The clause anchor",
    author: "E. Vance · Chapter 1",
    category: "Gaze",
    coverColor: "#1b3b48",
    spineColor: "#122831",
    homeTags: ["new-release", "fiction"],
  },
  {
    id: "distance-and-line",
    title: "Distance and line",
    author: "M. Sterling · Notes",
    category: "Flow",
    coverColor: "#8c6d46",
    spineColor: "#6b5233",
    homeTags: ["nonfiction"],
  },
  {
    id: "habit-empty-hand",
    title: "The habit of an empty hand",
    author: "K. Lindqvist · Draft",
    category: "Gesture",
    coverColor: "#222a27",
    spineColor: "#151b19",
    homeTags: ["art-books"],
  },
  {
    id: "quieter-voice",
    title: "A quieter voice",
    author: "R. Mercer · Essay",
    category: "Voice",
    coverColor: "#6e2625",
    spineColor: "#4f1a19",
    homeTags: ["poetry"],
  },
  {
    id: "figure-and-ground",
    title: "Figure and ground",
    author: "H. Wertheimer · Study",
    category: "Posture",
    coverColor: "#1f2442",
    spineColor: "#14172b",
    homeTags: ["classics"],
  },
  {
    id: "why-not-chase-word",
    title: "Why not chase each word",
    author: "FocusFlow Core · Guide",
    category: "Gaze",
    coverColor: "#1b3b48",
    spineColor: "#122831",
    homeTags: ["fiction", "page-turner"],
  },
  {
    id: "peripheral-rest",
    title: "Peripheral rest",
    author: "A. Newell · Monograph",
    category: "Flow",
    coverColor: "#8c6d46",
    spineColor: "#6b5233",
    homeTags: ["nonfiction", "bestsellers"],
  },
  {
    id: "spatial-indexing",
    title: "Spatial indexing in print",
    author: "J. Piaget · Archive",
    category: "Gesture",
    coverColor: "#222a27",
    spineColor: "#151b19",
    homeTags: ["art-books"],
  },
  {
    id: "spoken-margin",
    title: "The spoken margin",
    author: "L. Vygotsky · Review",
    category: "Voice",
    coverColor: "#6e2625",
    spineColor: "#4f1a19",
    homeTags: ["poetry", "classics"],
  },
  {
    id: "upright-attention",
    title: "Upright attention",
    author: "D. Broadbent · Paper",
    category: "Saved",
    coverColor: "#1f2442",
    spineColor: "#14172b",
    homeTags: ["classics"],
  },
  {
    id: "secret-garden",
    title: "The Secret Garden · Ch.1",
    author: "F. H. Burnett · Classic",
    category: "Gaze",
    coverColor: "#234152",
    spineColor: "#172b36",
    homeTags: ["fiction", "classics", "bestsellers", "new-release"],
    content: SECRET_GARDEN_CONTENT,
  },
];

export const HERO_3D_BOOKS = [
  { bg: "#1b3b48", spine: "#11262f", h: 210, tilt: -2 },
  { bg: "#8c6d46", spine: "#685032", h: 202, tilt: -1.5 },
  { bg: "#222a27", spine: "#141a18", h: 194, tilt: -1 },
  { bg: "#6e2625", spine: "#4d1918", h: 184, tilt: -0.5 },
  { bg: "#1f2442", spine: "#13172b", h: 178, tilt: 0.5 },
  { bg: "#e8e2d5", spine: "#cfc7b6", h: 172, tilt: 1 },
  { bg: "#234152", spine: "#172b36", h: 166, tilt: 1.5 },
  { bg: "#42212b", spine: "#2b141b", h: 160, tilt: 2 },
];

export const CATEGORY_COLORS: Record<
  string,
  { bg: string; text: string; border: string; dot: string }
> = {
  Gaze:    { bg: "bg-indigo-500/25",  text: "text-indigo-100",  border: "border-indigo-300/50",  dot: "bg-indigo-300" },
  Flow:    { bg: "bg-amber-500/25",   text: "text-amber-100",   border: "border-amber-300/50",   dot: "bg-amber-300" },
  Posture: { bg: "bg-rose-500/25",    text: "text-rose-100",    border: "border-rose-300/50",    dot: "bg-rose-300" },
  Gesture: { bg: "bg-emerald-500/25", text: "text-emerald-100", border: "border-emerald-300/50", dot: "bg-emerald-300" },
  Voice:   { bg: "bg-violet-500/25",  text: "text-violet-100",  border: "border-violet-300/50",  dot: "bg-violet-300" },
  Saved:   { bg: "bg-stone-500/30",   text: "text-stone-100",   border: "border-stone-300/40",   dot: "bg-stone-300" },
};

export function getCategoryColor(category: string) {
  return CATEGORY_COLORS[category] ?? CATEGORY_COLORS.Saved;
}