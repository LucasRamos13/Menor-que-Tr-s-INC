import Link from "next/link";
import { Wallet, CalendarDays, CheckSquare, Target, Heart, ArrowRight, TrendingUp, TrendingDown } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getMyCoupleContext } from "@/services/couples/couples-service";
import { listAccounts } from "@/services/finance/accounts-service";
import { listTransactions } from "@/services/finance/transactions-service";
import { totalBalance, summarizeMonth } from "@/services/finance/dashboard";
import { getTaskDashboard } from "@/services/tasks/tasks-service";
import { getUpcomingEvents } from "@/services/calendar/events-service";
import { listGoals } from "@/services/finance/goals-service";
import { listImportantDates } from "@/services/calendar/important-dates-service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { centsToBRL } from "@/lib/money";
import { formatDate, formatDateTime, todayISODate } from "@/lib/dates";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const couple = await getMyCoupleContext(supabase, user!.id);
  if (!couple) return null;

  const monthStart = `${todayISODate().slice(0, 7)}-01`;

  const [accounts, monthTxPage, taskDashboard, upcomingEvents, goals, importantDates] = await Promise.all([
    listAccounts(supabase, couple.coupleId),
    listTransactions(supabase, couple.coupleId, { fromDate: monthStart, pageSize: 500 }),
    getTaskDashboard(supabase, couple.coupleId),
    getUpcomingEvents(supabase, couple.coupleId, 4),
    listGoals(supabase, couple.coupleId),
    listImportantDates(supabase, couple.coupleId),
  ]);

  const allTxForBalance = await listTransactions(supabase, couple.coupleId, { pageSize: 1000 });
  const balance = totalBalance(accounts, allTxForBalance.transactions);
  const monthSummary = summarizeMonth(monthTxPage.transactions);
  const activeGoals = goals.filter((g) => !g.is_completed).slice(0, 2);
  const nextDates = importantDates.slice(0, 2);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Olá! 👋</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Aqui está o resumo de hoje, {formatDate(new Date())}.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryTile label="Saldo total" value={centsToBRL(balance)} icon={Wallet} />
        <SummaryTile label="Receitas do mês" value={centsToBRL(monthSummary.incomeCents)} icon={TrendingUp} accent="text-emerald-600" />
        <SummaryTile label="Despesas do mês" value={centsToBRL(monthSummary.expenseCents)} icon={TrendingDown} accent="text-red-600" />
        <SummaryTile label="Saldo do mês" value={centsToBRL(monthSummary.netCents)} icon={Wallet} accent={monthSummary.netCents >= 0 ? "text-emerald-600" : "text-red-600"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4" /> Tarefas
            </CardTitle>
            <Link href="/tasks" className="flex items-center gap-1 text-xs text-emerald-700 hover:underline dark:text-emerald-400">
              Ver tudo <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {taskDashboard.overdue.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-medium uppercase text-red-500">Atrasadas</p>
                {taskDashboard.overdue.slice(0, 3).map((t) => (
                  <p key={t.id} className="truncate text-sm text-slate-700 dark:text-slate-300">
                    ☐ {t.title}
                  </p>
                ))}
              </div>
            )}
            <div>
              <p className="mb-1 text-xs font-medium uppercase text-slate-400">Hoje</p>
              {taskDashboard.dueToday.length === 0 ? (
                <p className="text-sm text-slate-400">Nada para hoje 🎉</p>
              ) : (
                taskDashboard.dueToday.slice(0, 4).map((t) => (
                  <p key={t.id} className="truncate text-sm text-slate-700 dark:text-slate-300">
                    ☐ {t.title}
                  </p>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" /> Próximos compromissos
            </CardTitle>
            <Link href="/calendar" className="flex items-center gap-1 text-xs text-emerald-700 hover:underline dark:text-emerald-400">
              Ver agenda <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcomingEvents.length === 0 ? (
              <p className="text-sm text-slate-400">Nenhum compromisso agendado.</p>
            ) : (
              upcomingEvents.map((e) => (
                <div key={e.id} className="flex items-center justify-between text-sm">
                  <span className="truncate text-slate-700 dark:text-slate-300">{e.title}</span>
                  <span className="shrink-0 text-xs text-slate-400">{e.all_day ? formatDate(e.start_at) : formatDateTime(e.start_at)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Target className="h-4 w-4" /> Objetivos
            </CardTitle>
            <Link href="/goals" className="flex items-center gap-1 text-xs text-emerald-700 hover:underline dark:text-emerald-400">
              Ver tudo <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeGoals.length === 0 ? (
              <p className="text-sm text-slate-400">Nenhum objetivo cadastrado ainda.</p>
            ) : (
              activeGoals.map((g) => {
                const pct = g.target_amount_cents > 0 ? Math.min(100, Math.round((g.current_amount_cents / g.target_amount_cents) * 1000) / 10) : 0;
                return (
                  <div key={g.id}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span>
                        {g.icon} {g.name}
                      </span>
                      <span className="text-xs text-slate-400">{pct}%</span>
                    </div>
                    <Progress value={pct} />
                    <p className="mt-1 text-xs text-slate-400">
                      {centsToBRL(g.current_amount_cents)} / {centsToBRL(g.target_amount_cents)}
                    </p>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-4 w-4" /> Datas importantes
            </CardTitle>
            <Link href="/important-dates" className="flex items-center gap-1 text-xs text-emerald-700 hover:underline dark:text-emerald-400">
              Ver tudo <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {nextDates.length === 0 ? (
              <p className="text-sm text-slate-400">Nenhuma data cadastrada.</p>
            ) : (
              nextDates.map((d) => (
                <div key={d.id} className="flex items-center justify-between text-sm">
                  <span>
                    {d.emoji} {d.title}
                  </span>
                  <Badge variant={d.daysRemaining <= 7 ? "warning" : "secondary"}>
                    {d.daysRemaining === 0 ? "Hoje!" : `Faltam ${d.daysRemaining} dias`}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SummaryTile({ label, value, icon: Icon, accent }: { label: string; value: string; icon: React.ComponentType<{ className?: string }>; accent?: string }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between pt-5">
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
          <p className={`mt-1 text-lg font-semibold ${accent ?? "text-slate-900 dark:text-slate-100"}`}>{value}</p>
        </div>
        <Icon className={`h-8 w-8 ${accent ?? "text-slate-300 dark:text-slate-600"}`} />
      </CardContent>
    </Card>
  );
}
