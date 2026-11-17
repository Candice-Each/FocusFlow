"use client";

import React from "react";
import { useRouter } from "next/navigation";

export function FocusFlowBrandMark({
  onClick,
}: {
  onClick?: () => void;
}) {
  const router = useRouter();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      router.push("/");
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex items-center gap-2.5 text-left group focus:outline-none cursor-pointer"
      title="Back to Home Cover"
    >
      <div className="w-7 h-7 rounded-md bg-stone-900 border border-stone-600/40 flex items-center justify-center shadow-sm group-hover:bg-stone-800 transition">
        <span className="w-2.5 h-4 rounded-[2px] bg-[#f8f7f4] block" />
      </div>
      <div className="leading-none">
        <div className="font-serif text-sm font-semibold tracking-tight text-current">
          FocusFlow
        </div>
        <div className="text-[8px] font-mono tracking-[0.22em] text-stone-400 uppercase mt-0.5">
          READING
        </div>
      </div>
    </button>
  );
}