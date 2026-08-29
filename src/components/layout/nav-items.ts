import { Home, Wallet, CalendarDays, CheckSquare, Target, Heart, Settings } from "lucide-react";

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Início", icon: Home },
  { href: "/finance", label: "Finanças", icon: Wallet },
  { href: "/calendar", label: "Calendário", icon: CalendarDays },
  { href: "/tasks", label: "Tarefas", icon: CheckSquare },
  { href: "/goals", label: "Objetivos", icon: Target },
  { href: "/important-dates", label: "Datas", icon: Heart },
  { href: "/settings", label: "Ajustes", icon: Settings },
] as const;
