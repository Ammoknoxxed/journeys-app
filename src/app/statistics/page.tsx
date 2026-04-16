// src/app/statistics/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import StatCharts from "@/components/StatCharts";

export default async function StatisticsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  // Alle Daten parallel laden (inkl. User für Einkommen und Obligations für Fixkosten)
  const [expenses, energyReadings, chores, bucketItems, users, obligations] = await Promise.all([
    prisma.expense.findMany({ orderBy: { date: 'asc' } }),
    prisma.energyReading.findMany({ orderBy: { date: 'asc' } }),
    prisma.chore.findMany(),
    prisma.bucketItem.findMany(),
    prisma.user.findMany(),
    prisma.financialObligation.findMany()
  ]);

  const totalSaved = bucketItems.reduce((sum, item) => sum + item.savedAmount, 0);
  const totalWishes = bucketItems.reduce((sum, item) => sum + item.price, 0);
  
  // Gemeinsames Einkommen und gemeinsame Fixkosten berechnen
  const totalIncome = users.reduce((sum, u) => sum + u.netIncome, 0);
  const totalFixed = obligations.reduce((sum, ob) => sum + ob.amount, 0);

  return (
    <div className="min-h-screen bg-[#F9F7F5] dark:bg-stone-950 text-stone-900 dark:text-stone-100 p-4 md:p-8 transition-colors duration-300">
      <div className="max-w-5xl mx-auto space-y-8 pb-32">
        
        <header className="flex items-center justify-between pb-6 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-4">
            <Link href="/" className="w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 hover:bg-stone-50 transition">←</Link>
            <h1 className="text-3xl font-bold text-[#C5A38E]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Insight Analytics</h1>
          </div>
          <ThemeToggle />
        </header>

        {/* Kurze Übersichtzahlen */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
           <div className="bg-stone-900 text-white p-6 rounded-3xl">
             <p className="text-[10px] text-stone-400 uppercase tracking-widest font-bold">Gesparte Sinking Funds</p>
             <p className="text-2xl font-light mt-2 text-[#C5A38E]">€ {totalSaved.toFixed(0)}</p>
             <p className="text-[9px] text-stone-500 mt-1">Von € {totalWishes.toFixed(0)} Wunsch-Summe</p>
           </div>
           <div className="bg-stone-900 text-white p-6 rounded-3xl">
             <p className="text-[10px] text-stone-400 uppercase tracking-widest font-bold">Erledigte Aufgaben (Putzplan)</p>
             <p className="text-2xl font-light mt-2">{chores.filter(c => c.lastDoneAt !== null).length}</p>
             <p className="text-[9px] text-stone-500 mt-1">All-Time Historie</p>
           </div>
        </section>

        {/* Interaktive Diagramme (Client Component) */}
        <StatCharts 
          expenses={expenses} 
          energy={energyReadings} 
          totalIncome={totalIncome} 
          totalFixed={totalFixed} 
        />

      </div>
    </div>
  );
}