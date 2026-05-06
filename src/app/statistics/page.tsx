// src/app/statistics/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import StatCharts from "@/components/StatCharts";
import AppShell from "@/components/ui/AppShell";
import Card from "@/components/ui/Card";
import { getStatsStartDate } from "@/lib/dateConfig";

export default async function StatisticsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const statsStartDate = getStatsStartDate();

  const [expenses, energyReadings, chores, bucketItems, users, obligations, incomes] = await Promise.all([
    prisma.expense.findMany({ where: { date: { gte: statsStartDate } }, orderBy: { date: 'asc' } }),
    prisma.energyReading.findMany({ where: { date: { gte: statsStartDate } }, orderBy: { date: 'asc' } }),
    prisma.chore.findMany({ where: { lastDoneAt: { gte: statsStartDate } } }),
    prisma.bucketItem.findMany(), // Sinking Funds behalten wir All-Time
    prisma.user.findMany(),
    prisma.financialObligation.findMany(),
    prisma.income.findMany({ where: { date: { gte: statsStartDate } }, orderBy: { date: 'asc' } })
  ]);

  const totalSaved = bucketItems.reduce((sum, item) => sum + item.savedAmount, 0);
  const totalWishes = bucketItems.reduce((sum, item) => sum + item.price, 0);
  
  const totalFixed = obligations.reduce((sum, ob) => sum + ob.amount, 0);

  return (
    <AppShell title="Statistik" subtitle="Euer Verlauf seit Mai 2026." backHref="/" maxWidthClassName="max-w-5xl">
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="bg-stone-900 text-white dark:bg-stone-900">
          <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Gesparte Sinking Funds</p>
          <p className="mt-2 text-2xl font-light text-[var(--accent)]">€ {totalSaved.toFixed(0)}</p>
          <p className="mt-1 text-[10px] text-stone-500">Von € {totalWishes.toFixed(0)} Wunsch-Summe</p>
        </Card>
        <Card className="bg-stone-900 text-white dark:bg-stone-900">
          <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Erledigte Aufgaben (Putzplan)</p>
          <p className="mt-2 text-2xl font-light">{chores.filter(c => c.lastDoneAt !== null).length}</p>
          <p className="mt-1 text-[10px] text-stone-500">Seit Mai 2026</p>
        </Card>
      </section>

      <StatCharts
        expenses={expenses}
        energy={energyReadings}
        incomes={incomes}
        totalFixed={totalFixed}
        statsStartDateISO={statsStartDate.toISOString()}
      />
    </AppShell>
  );
}