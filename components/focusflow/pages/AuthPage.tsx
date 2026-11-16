"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FocusFlowBrandMark } from "../FocusFlowBrandMark";
import { writeUserName } from "@/lib/focusflow/store";

interface AuthPageProps {
  mode: "login" | "signup";
}

export function AuthPage({ mode }: AuthPageProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [privacyChecked, setPrivacyChecked] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || isPending) return;

    if (!email.trim() || !password.trim() || (mode === "signup" && !name.trim())) {
      setErrorMsg("Please fill in all required fields.");
      return;
    }
    if (!privacyChecked) {
      setErrorMsg("Please confirm the camera privacy note before continuing.");
      return;
    }
    setErrorMsg(null);
    setIsSubmitting(true);

    setTimeout(() => {
      const displayUser = mode === "signup" ? name.trim() : email.split("@")[0] || "Reader";
      writeUserName(displayUser);

      startTransition(() => {
        router.push("/shelf");
      });
      setIsSubmitting(false);
    }, 300);
  };

  const goOtherMode = () => {
    if (isSubmitting || isPending) return;
    setErrorMsg(null);
    router.push(mode === "login" ? "/signup" : "/login");
  };

  return (
    <div className="min-h-screen w-full bg-[#f8f7f4] text-stone-900 flex flex-col justify-between p-8 md:p-14 select-none">
      <div className="max-w-md w-full mx-auto my-auto bg-white/95 border border-stone-200/90 rounded-3xl p-8 md:p-10 shadow-sm">
        <div className="mb-7">
          <FocusFlowBrandMark onClick={() => router.push("/")} />
        </div>

        <h1 className="font-serif text-3xl text-stone-900 mb-2">
          {mode === "login" ? "Back to the shelf" : "Create a reading profile"}
        </h1>
        <p className="text-xs text-stone-500 mb-8 leading-relaxed">
          {mode === "login"
            ? "Log in to continue the last book."
            : "Signing up opens the shelf. The camera stays off."}
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {mode === "signup" && (
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-2">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isSubmitting || isPending}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900/20 focus:border-stone-900 transition disabled:opacity-50"
                placeholder="Your display name"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-stone-600 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting || isPending}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900/20 focus:border-stone-900 transition disabled:opacity-50"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-600 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting || isPending}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900/20 focus:border-stone-900 transition disabled:opacity-50"
              placeholder="••••••••"
            />
          </div>

          {/* 复选框区域：整个框（包括内边距）均可点击 */}
          <label className="flex items-start gap-3 p-3 -mx-3 bg-stone-50/50 hover:bg-stone-100/80 rounded-xl cursor-pointer transition-colors border border-transparent hover:border-stone-200">
            <input
              type="checkbox"
              checked={privacyChecked}
              onChange={(e) => setPrivacyChecked(e.target.checked)}
              disabled={isSubmitting || isPending}
              className="mt-0.5 w-5 h-5 accent-stone-900 rounded cursor-pointer disabled:opacity-50 shrink-0 pointer-events-none"
            />
            <span className="text-xs text-stone-500 leading-relaxed select-none pointer-events-none">
              I understand the privacy note: The camera turns on only when I ask, and raw video is not stored.
            </span>
          </label>

          {errorMsg && (
            <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
              {errorMsg}
            </div>
          )}

          <div className="pt-2">
            {/* 主提交按钮：整行 w-full，并确保内部所有区域响应点击 */}
            <button
              type="submit"
              disabled={isSubmitting || isPending}
              className="w-full py-3.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-sm font-semibold transition shadow-md disabled:opacity-50 flex items-center justify-center cursor-pointer"
            >
              <span className="pointer-events-none">
                {isSubmitting || isPending ? "Processing..." : (mode === "login" ? "Log in" : "Create and enter")}
              </span>
            </button>
          </div>
        </form>

        <div className="mt-6">
          <button
            type="button"
            onClick={goOtherMode}
            disabled={isSubmitting || isPending}
            className="w-full py-3.5 rounded-xl border border-stone-200 text-stone-600 text-sm font-medium hover:bg-stone-50 hover:text-stone-900 transition-colors disabled:opacity-50 flex items-center justify-center cursor-pointer"
          >
            <span className="pointer-events-none">
              {mode === "login" ? "No profile yet? Sign up" : "Already have a profile? Log in"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}