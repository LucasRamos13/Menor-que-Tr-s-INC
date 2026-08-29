import type { CoupleContext } from "@/services/couples/couples-service";
import { Sidebar } from "./sidebar";
import { MobileNav } from "./mobile-nav";
import { Topbar } from "./topbar";

interface AppShellProps {
  couple: CoupleContext;
  me: { id: string; fullName: string; avatarUrl: string | null; email: string };
  children: React.ReactNode;
}

export function AppShell({ couple, me, children }: AppShellProps) {
  return (
    <div className="flex min-h-screen">
      <Sidebar coupleName={couple.coupleName} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar me={me} />
        <main className="flex-1 px-4 pb-20 pt-4 sm:px-6 md:pb-6">{children}</main>
      </div>
      <MobileNav />
    </div>
  );
}
