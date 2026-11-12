"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { FocusFlowBrandMark } from "./FocusFlowBrandMark";
import { readUserName } from "@/lib/focusflow/store";

const NAV_ITEMS: { href: string; label: string }[] = [
  { href: "/shelf", label: "Shelf" },
  { href: "/guide", label: "Guide" },
  { href: "/week", label: "Week" },
  { href: "/lab", label: "Lab" },
];

export function TopWorkspaceNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    setUserName(readUserName());
  }, [pathname]);

  return (
    <header className="h-16 px-10 flex items-center justify-between border-b border-stone-200/70 bg-[#f8f7f4]/90 backdrop-blur-sm sticky top-0 z-30">
      <div className="flex items-center gap-8">
        <FocusFlowBrandMark onClick={() => router.push("/")} />

        <nav className="flex items-center gap-1.5">
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <button
                type="button"
                key={item.href}
                onClick={() => router.push(item.href)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition ${
                  isActive
                    ? "bg-stone-900 text-white shadow-sm"
                    : "text-stone-600 hover:text-stone-900 hover:bg-stone-200/50"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>

      <div>
        {userName ? (
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="text-xs text-stone-600 hover:text-stone-900 font-medium px-3 py-1.5 rounded-full border border-stone-300/80 bg-white/80"
          >
            {userName}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="text-xs text-stone-600 hover:text-stone-950 font-medium transition"
          >
            Log in
          </button>
        )}
      </div>
    </header>
  );
}