"use client";

import { TopWorkspaceNav } from "@/components/focusflow/TopWorkspaceNav";
import { UserGuidePage } from "@/components/focusflow/pages/UserGuidePage";

export default function Page() {
  return (
    <div className="min-h-screen w-full bg-[#f8f7f4] text-stone-900 flex flex-col">
      <TopWorkspaceNav />
      <main className="flex-1">
        <UserGuidePage />
      </main>
    </div>
  );
}