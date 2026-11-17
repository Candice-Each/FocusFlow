"use client";

import React, { useEffect, useState, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { FocusFlowBrandMark } from "./FocusFlowBrandMark";
import { readUserName, writeUserName } from "@/lib/focusflow/store";

const NAV_ITEMS = [
  { href: "/shelf", label: "Shelf" }, // 恢复 Shelf 栏目
  { href: "/guide", label: "Guide" },
  { href: "/week", label: "Week" },
  { href: "/lab", label: "Lab" },
];

export function TopWorkspaceNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [userName, setUserName] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setUserName(readUserName());
    setMenuOpen(false); // 路由变化时关闭菜单
  }, [pathname]);

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    writeUserName(null);
    setUserName(null);
    setMenuOpen(false);
    router.push("/login");
  };

  return (
    <header className="h-16 px-10 flex items-center justify-between border-b border-stone-200/70 bg-[#f8f7f4]/90 backdrop-blur-sm sticky top-0 z-30">
      <div className="flex items-center gap-8">
        {/* 点击 Logo 回到封面主页 */}
        <FocusFlowBrandMark onClick={() => router.push("/")} />

        <nav className="flex items-center gap-1.5">
          {/* 移除了之前多余添加的 Home 按钮，恢复原始导航 */}
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <button
                type="button"
                key={item.href}
                onClick={() => router.push(item.href)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition ${
                  isActive ? "bg-stone-900 text-white shadow-sm" : "text-stone-600 hover:text-stone-900 hover:bg-stone-200/50"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-3 relative" ref={menuRef}>
        {userName ? (
          <>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2 text-xs text-stone-700 hover:text-stone-950 font-medium px-3 py-1.5 rounded-full border border-stone-300/80 bg-white/80 transition shadow-sm"
            >
              <span>{userName}</span>
              <svg className={`w-3.5 h-3.5 opacity-60 transition-transform ${menuOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* 下拉菜单 */}
            {menuOpen && (
              <div className="absolute top-full right-0 mt-2 w-40 bg-white border border-stone-200/90 rounded-xl shadow-xl py-1.5 z-50">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 font-medium transition flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Log out
                </button>
              </div>
            )}
          </>
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