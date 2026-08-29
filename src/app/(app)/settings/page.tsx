import Link from "next/link";
import { Users, CalendarCog, Tags, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const links = [
    { href: "/settings/couple", label: "Casal e convites", description: "Nome do espaço e membros", icon: Users },
    { href: "/settings/google-calendar", label: "Google Calendar", description: "Conectar e sincronizar sua agenda", icon: CalendarCog },
    { href: "/settings/categories", label: "Categorias", description: "Personalize as categorias financeiras", icon: Tags },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Configurações</h1>

      <Card>
        <CardContent className="flex items-center gap-3 pt-4 sm:pt-5">
          {user?.user_metadata?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.user_metadata.avatar_url} alt="" className="h-12 w-12 rounded-full" referrerPolicy="no-referrer" />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
              {(user?.user_metadata?.full_name ?? user?.email ?? "?").slice(0, 1).toUpperCase()}
            </div>
          )}
          <div>
            <p className="font-medium">{user?.user_metadata?.full_name ?? "Você"}</p>
            <p className="text-sm text-slate-400">{user?.email}</p>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {links.map(({ href, label, description, icon: Icon }) => (
          <Link key={href} href={href}>
            <Card className="transition-shadow hover:shadow-md">
              <CardContent className="flex items-center justify-between pt-4 sm:pt-5">
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-slate-400" />
                  <div>
                    <p className="font-medium">{label}</p>
                    <p className="text-xs text-slate-400">{description}</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
