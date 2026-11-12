"use client";

import React from "react";
import { useRouter } from "next/navigation";

interface FocusFlowBrandMarkProps {
  onClick?: () => void;
}

export function FocusFlowBrandMark({ onClick }: FocusFlowBrandMarkProps) {
  const router = useRouter();
  const handle = onClick ?? (() => router.push("/"));
  return (
    <button
      type="button"
      onClick={handle}
      className="flex items-center gap-2.5 text-left group focus:outline-none"
    >
      <div className="w-7 h-7 rounded-md bg-stone-900 flex items-center justify-center shadow-sm group-hover:bg-stone-800 transition">
        <span className="w-2.5 h-4 rounded-[2px] bg-[#f8f7f4] block" />
      </div>
      <div className="leading-none">
        <div className="font-serif text-sm font-semibold tracking-tight text-stone-900">
          FocusFlow
        </div>
        <div className="text-[8px] font-mono tracking-[0.22em] text-stone-400 uppercase mt-0.5">
          READING
        </div>
      </div>
    </button>
  );
}