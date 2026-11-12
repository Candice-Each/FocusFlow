"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { FocusFlowBrandMark } from "../FocusFlowBrandMark";
import { HERO_3D_BOOKS } from "@/lib/focusflow/data";
import { HOME_TAGS } from "@/lib/focusflow/homeTags";

export function HomePage() {
  const router = useRouter();
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // 波浪：hover 某本书时，它自己抬升最多，相邻书依次递减
  const getWaveOffset = (i: number): number => {
    if (hoveredIdx === null) return 0;
    const dist = Math.abs(i - hoveredIdx);
    const wave = [14, 9, 5, 2, 0];
    return -wave[Math.min(dist, wave.length - 1)];
  };

  return (
    <div className="min-h-screen w-full bg-[#fcfbf9] text-stone-900 flex flex-col justify-between relative overflow-hidden select-none">
      <header className="h-20 px-12 flex items-center justify-between z-20">
        <FocusFlowBrandMark onClick={() => router.push("/")} />
        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={() => router.push("/signup")}
            className="text-xs font-medium text-stone-700 hover:text-stone-950 transition"
          >
            Sign Up
          </button>
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="px-5 py-2 rounded-full bg-stone-900 text-white text-xs font-medium hover:bg-stone-800 transition shadow-sm"
          >
            Log in
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 -mt-10 z-20">
        <h1
          className="font-serif text-7xl md:text-8xl tracking-tight text-stone-900 mb-5 font-normal"
          style={{ fontFamily: `Georgia, "Times New Roman", serif` }}
        >
          FocusFlow
        </h1>

        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] text-stone-500 mb-10">
          {HOME_TAGS.map((tag) => (
            <button
              type="button"
              key={tag.slug}
              onClick={() => router.push(`/shelf?tag=${tag.slug}`)}
              className="hover:text-stone-900 transition"
              title={`Filter shelf by ${tag.label}`}
            >
              {tag.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.push("/reading")}
            className="px-7 py-3 rounded-full bg-[#3a3835] hover:bg-stone-900 text-white text-xs font-medium tracking-wide transition shadow-md cursor-pointer"
          >
            Start reading
          </button>
          <button
            type="button"
            onClick={() => router.push("/shelf")}
            className="px-7 py-3 rounded-full bg-white hover:bg-stone-100 text-stone-900 border border-stone-800 text-xs font-medium tracking-wide transition shadow-sm cursor-pointer"
          >
            See the shelf
          </button>
        </div>
      </main>

      <div
        className="w-full px-6 pt-8 flex items-end justify-center z-10"
        onMouseLeave={() => setHoveredIdx(null)}
      >
        {HERO_3D_BOOKS.map((b, idx) => {
          const wave = getWaveOffset(idx);
          const isHovered = hoveredIdx === idx;
          return (
            <div
              key={idx}
              onMouseEnter={() => setHoveredIdx(idx)}
              onClick={() => router.push("/shelf")}
              style={{
                height: b.h,
                transform: `rotate(${b.tilt}deg) translateY(${14 + wave}px)`,
                marginLeft: idx === 0 ? 0 : -28,
                zIndex: isHovered ? 20 : 10 - Math.abs(idx - (hoveredIdx ?? idx)),
              }}
              className={`w-28 sm:w-36 md:w-40 shrink-0 rounded-t-md relative cursor-pointer transition-all duration-300 ease-out flex ${
                isHovered
                  ? "shadow-[0_28px_50px_rgba(0,0,0,0.42)]"
                  : "shadow-[0_18px_35px_rgba(0,0,0,0.28)]"
              }`}
            >
              <div
                style={{ backgroundColor: b.spine }}
                className="w-3.5 h-full rounded-tl-md border-r border-white/15 shrink-0 relative"
              >
                <div className="absolute inset-y-0 left-1 w-[1px] bg-white/20" />
              </div>
              <div
                style={{
                  backgroundColor: b.bg,
                  backgroundImage:
                    "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(0,0,0,0.18) 100%)",
                }}
                className="flex-1 h-full rounded-tr-md border-t border-white/20"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}