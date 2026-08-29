"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { GlobalSearch } from "@/components/shared/global-search";
import { createClient } from "@/lib/supabase/client";

interface TopbarProps {
  me: { fullName: string; avatarUrl: string | null };
}

export function Topbar({ me }: TopbarProps) {
  const [signingOut, setSigningOut] = useState(false);
  const router = useRouter();

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
      <GlobalSearch />

      <div className="flex items-center gap-2">
        <ThemeToggle />
        {me.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={me.avatarUrl} alt={me.fullName} className="h-8 w-8 rounded-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
            {me.fullName.slice(0, 1).toUpperCase()}
          </div>
        )}
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          aria-label="Sair"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
