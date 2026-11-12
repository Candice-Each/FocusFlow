"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { BookItem } from "@/lib/focusflow/types";
import { readBooks, writeBooks } from "@/lib/focusflow/store";
import { HOME_TAGS, slugToLabel } from "@/lib/focusflow/homeTags";

export function LibraryShelfPage() {
  const router = useRouter();
  const [books, setBooks] = useState<BookItem[]>([]);
  const [selectedHomeTag, setSelectedHomeTag] = useState<string>("all");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setBooks(readBooks());
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tagSlug = params.get("tag");
      if (tagSlug && slugToLabel(tagSlug)) {
        setSelectedHomeTag(tagSlug);
      }
    }
  }, []);

  const filteredBooks = books.filter((b) => {
    const matchesHomeTag =
      selectedHomeTag === "all" || (b.homeTags ?? []).includes(selectedHomeTag);
    const matchesQuery =
      !searchQuery.trim() ||
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.author.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesHomeTag && matchesQuery;
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const buffer = await file.arrayBuffer();
    let decoded = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
    if (decoded.includes("\uFFFD")) decoded = new TextDecoder("gbk").decode(buffer);
    const cleanTitle = file.name.replace(/\.(txt|pdf|md)$/i, "");
    const existing = readBooks();
    
    // 封面颜色随机池
    const palette = [
      { cover: "#1b3b48", spine: "#122831", cat: "Gaze" as const },
      { cover: "#8c6d46", spine: "#6b5233", cat: "Flow" as const },
      { cover: "#222a27", spine: "#151b19", cat: "Gesture" as const },
      { cover: "#6e2625", spine: "#4f1a19", cat: "Voice" as const },
      { cover: "#1f2442", spine: "#14172b", cat: "Posture" as const },
    ][existing.length % 5];
    
    const newBook: BookItem = {
      id: `imported-${Date.now()}`,
      title: cleanTitle,
      author: "Imported Document",
      category: palette.cat,
      coverColor: palette.cover,
      spineColor: palette.spine,
      content: decoded,
      homeTags: ["new-release", "fiction"], // 导入的书默认打上这两个首页标签
    };
    const next = [newBook, ...existing];
    writeBooks(next);
    router.push(`/reading?book=${encodeURIComponent(newBook.id)}`);
  };

  return (
    <div className="max-w-6xl mx-auto px-10 py-8 select-none">
      {/* 顶部标题与工具栏 */}
      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-stone-400 mb-1">
            LIBRARY
          </div>
          <h1 className="font-serif text-4xl text-stone-900">Shelf</h1>
        </div>
        <div className="flex items-center gap-2.5">
          {searchOpen && (
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search title or author..."
              autoFocus
              className="px-3.5 py-1.5 rounded-full bg-white border border-stone-300 text-xs text-stone-800 focus:outline-none focus:border-stone-900 w-52 transition"
            />
          )}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-9 h-9 rounded-full bg-white border border-stone-200/90 hover:border-stone-400 flex items-center justify-center text-stone-700 shadow-sm transition"
            title="Import local TXT document"
          >
            <span className="text-base leading-none">+</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => setSearchOpen((v) => !v)}
            className={`w-9 h-9 rounded-full border flex items-center justify-center shadow-sm transition ${
              searchOpen
                ? "bg-stone-900 text-white border-stone-900"
                : "bg-white text-stone-700 border-stone-200/90 hover:border-stone-400"
            }`}
            title="Search shelf"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
        </div>
      </div>

      {/* 筛选行（与首页文字标签完全对应） */}
      <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setSelectedHomeTag("all")}
          className={`px-4 py-1.5 rounded-full text-xs border transition whitespace-nowrap ${
            selectedHomeTag === "all"
              ? "bg-stone-900 text-white border-stone-900 font-medium"
              : "bg-white/80 text-stone-600 border-stone-200/90 hover:border-stone-400"
          }`}
        >
          All books
        </button>
        {HOME_TAGS.map((tag) => {
          const active = selectedHomeTag === tag.slug;
          return (
            <button
              type="button"
              key={tag.slug}
              onClick={() => setSelectedHomeTag(tag.slug)}
              className={`px-4 py-1.5 rounded-full text-xs border transition whitespace-nowrap ${
                active
                  ? "bg-stone-900 text-white border-stone-900 font-medium"
                  : "bg-white/80 text-stone-600 border-stone-200/90 hover:border-stone-400"
              }`}
            >
              {tag.label}
            </button>
          );
        })}
      </div>

      {/* 书籍网格 */}
      {filteredBooks.length === 0 ? (
        <div className="text-center text-xs text-stone-400 py-16">
          No titles match your current filters.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6">
          {filteredBooks.map((book) => (
            <div
              key={book.id}
              onClick={() => router.push(`/reading?book=${encodeURIComponent(book.id)}`)}
              style={{ backgroundColor: book.coverColor }}
              className="group h-64 rounded-md relative cursor-pointer shadow-[0_10px_24px_rgba(0,0,0,0.16)] hover:-translate-y-1.5 transition-all duration-200 flex overflow-hidden"
            >
              {/* 书脊 */}
              <div
                style={{ backgroundColor: book.spineColor }}
                className="w-3 h-full border-r border-white/15 shrink-0"
              />
              {/* 卡片内容（去掉了彩色小标签） */}
              <div className="flex-1 p-4 flex flex-col justify-between text-[#f5f3ef]">
                <div className="h-4" /> {/* 占位，保持顶部对齐 */}
                <div>
                  <h3 className="font-serif text-base leading-snug mb-1.5 group-hover:underline underline-offset-4">
                    {book.title}
                  </h3>
                  <p className="text-[10px] opacity-65 truncate">{book.author}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}