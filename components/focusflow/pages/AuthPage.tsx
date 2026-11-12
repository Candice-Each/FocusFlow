"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { FocusFlowBrandMark } from "../FocusFlowBrandMark";
import { writeUserName } from "@/lib/focusflow/store";

interface AuthPageProps {
  mode: "login" | "signup";
}

export function AuthPage({ mode }: AuthPageProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [privacyChecked, setPrivacyChecked] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim() || (mode === "signup" && !name.trim())) {
      setErrorMsg("Please fill in all required fields.");
      return;
    }
    if (!privacyChecked) {
      setErrorMsg("Please confirm the camera privacy note before continuing.");
      return;
    }
    setErrorMsg(null);
    const displayUser = mode === "signup" ? name.trim() : email.split("@")[0] || "Reader";
    writeUserName(displayUser);
    router.push("/shelf");
  };

  const goOtherMode = () => {
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

        <form onSubmit={handleSubmit} className="space-y-6">
          {mode === "signup" && (
            <div>
              <label className="block text-[11px] text-stone-500 mb-1.5">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-transparent border-b border-stone-300 focus:border-stone-900 py-2 text-sm text-stone-900 focus:outline-none transition"
              />
            </div>
          )}

          <div>
            <label className="block text-[11px] text-stone-500 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-transparent border-b border-stone-300 focus:border-stone-900 py-2 text-sm text-stone-900 focus:outline-none transition"
            />
          </div>

          <div>
            <label className="block text-[11px] text-stone-500 mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-transparent border-b border-stone-300 focus:border-stone-900 py-2 text-sm text-stone-900 focus:outline-none transition"
            />
          </div>

          <label className="flex items-start gap-2.5 pt-2 cursor-pointer text-[11px] text-stone-500 leading-relaxed">
            <input
              type="checkbox"
              checked={privacyChecked}
              onChange={(e) => setPrivacyChecked(e.target.checked)}
              className="mt-0.5 accent-stone-900 rounded"
            />
            <span>
              I understand the privacy note: The camera turns on only when I ask, and raw video is not stored.
            </span>
          </label>

          {errorMsg && (
            <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
              {errorMsg}
            </div>
          )}

          <div className="pt-1">
            <button
              type="submit"
              className="px-7 py-2.5 rounded-full bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium transition shadow-sm"
            >
              {mode === "login" ? "Log in" : "Create and enter"}
            </button>
          </div>
        </form>

        <div className="mt-8 pt-4 border-t border-stone-100 text-xs text-stone-500">
          {mode === "login" ? (
            <span>
              No profile yet?{" "}
              <button
                type="button"
                onClick={goOtherMode}
                className="text-stone-900 font-medium underline underline-offset-4"
              >
                Sign up
              </button>
            </span>
          ) : (
            <span>
              Already have a profile?{" "}
              <button
                type="button"
                onClick={goOtherMode}
                className="text-stone-900 font-medium underline underline-offset-4"
              >
                Log in
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}