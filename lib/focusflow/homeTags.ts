export type HomeTagSlug =
  | "new-release"
  | "bestsellers"
  | "fiction"
  | "nonfiction"
  | "poetry"
  | "classics"
  | "page-turner"
  | "art-books";

export interface HomeTagDef {
  label: string;
  slug: HomeTagSlug;
}

export const HOME_TAGS: HomeTagDef[] = [
  { label: "New Release", slug: "new-release" },
  { label: "Bestsellers", slug: "bestsellers" },
  { label: "Fiction", slug: "fiction" },
  { label: "Nonfiction", slug: "nonfiction" },
  { label: "Poetry", slug: "poetry" },
  { label: "Classics", slug: "classics" },
  { label: "Page-turner Fiction", slug: "page-turner" },
  { label: "Art Books", slug: "art-books" },
];

export function slugToLabel(slug: string): string | null {
  return HOME_TAGS.find((t) => t.slug === slug)?.label ?? null;
}