// src/components/Dashboards/DashboardModern.tsx
import ThemeToggle from "@/components/ThemeToggle";
import FinanceWidget from "@/components/widgets/FinanceWidget";
import BucketListWidget from "@/components/widgets/BucketListWidget";
import PetWidget from "@/components/widgets/PetWidget";
import StickyNotesWidget from "@/components/widgets/StickyNotesWidget";
import { Suspense } from "react";
import Link from "next/link";
import SubmitButton from "@/components/SubmitButton";
import { updateUiLayout } from "@/lib/actions";
import { CheckCircle2, CreditCard, Plane, ShoppingBag, Command } from "lucide-react";

export default function DashboardModern({ currentUser, data }: any) {
  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 font-sans relative overflow-hidden selection:bg-indigo-500/30">
      
      {/* --- BACKGROUND GLOW EFFECTS (Die Magie) --- */}
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-violet-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed top-[40%] left-[60%] w-[30%] h-[30%] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* --- HEADER --- */}
      <header className="sticky top-0 z-50 bg-[#09090b]/60 backdrop-blur-2xl border-b border-white/5 px-6 md:px-12 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Command size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white">Mein Cockpit</h1>
            <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-widest">{currentUser?.name} // Premium Access</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <form action={async () => { "use server"; await updateUiLayout("CLASSIC"); }}>
             <SubmitButton className="text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/10 px-5 py-2.5 rounded-full transition-all backdrop-blur-md">
               Zurück zu Classic
             </SubmitButton>
          </form>
        </div>
      </header>

      {/* --- MAIN CONTENT --- */}
      <main className="relative z-10 max-w-[1400px] mx-auto p-4 md:p-8 lg:p-12 space-y-8 pb-32">
        
        {/* TOP STATS - BENTO GRID */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          
          {/* Card 1 */}
          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] p-6 rounded-[2rem] hover:bg-white/[0.05] transition-colors flex flex-col justify-between h-40">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
              <CheckCircle2 size={18} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-3xl font-bold text-white tracking-tight">{data.choresDoneThisWeek}</p>
              <p className="text-xs font-medium text-zinc-400 mt-1">Aufgaben erledigt</p>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] p-6 rounded-[2rem] hover:bg-white/[0.05] transition-colors flex flex-col justify-between h-40">
            <div className="w-10 h-10 rounded-full bg-rose-500/20 flex items-center justify-center mb-4">
              <CreditCard size={18} className="text-rose-400" />
            </div>
            <div>
              <p className="text-3xl font-bold text-white tracking-tight">€ {data.weeklyExpensesAgg?._sum?.amount?.toFixed(0) || 0}</p>
              <p className="text-xs font-medium text-zinc-400 mt-1">Ausgaben (7 Tage)</p>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] p-6 rounded-[2rem] hover:bg-white/[0.05] transition-colors flex flex-col justify-between h-40">
            <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center mb-4">
              <Plane size={18} className="text-indigo-400" />
            </div>
            <div>
              <p className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 tracking-tight">
                {data.nextTrip ? Math.ceil((data.nextTrip.date.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : '-'}
              </p>
              <p className="text-xs font-medium text-zinc-400 mt-1">Tage bis zum Trip</p>
            </div>
          </div>

          {/* Card 4 (Link) */}
          <Link href="/shopping" className="block w-full h-full">
            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] p-6 rounded-[2rem] hover:bg-white/[0.08] hover:scale-[1.02] transition-all cursor-pointer flex flex-col justify-between h-40 shadow-xl shadow-black/50">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center mb-4">
                <ShoppingBag size={18} className="text-blue-400" />
              </div>
              <div>
                <p className="text-3xl font-bold text-white tracking-tight">{data.openShoppingItemsCount}</p>
                <p className="text-xs font-medium text-zinc-400 mt-1">Auf Einkaufsliste</p>
              </div>
            </div>
          </Link>
        </div>

        {/* --- MAIN WIDGETS --- */}
        {/* Hier lassen wir die bestehenden Widgets in Ruhe, betten sie aber extrem sauber ein */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 md:gap-8">
          
          <div className="xl:col-span-7 space-y-6 md:space-y-8">
             {/* Sinking Funds / Wünsche */}
             <div className="rounded-[3rem] p-2 bg-gradient-to-b from-white/10 to-transparent shadow-2xl">
               <Suspense fallback={<div className="h-64 bg-zinc-900/50 rounded-[2.5rem] animate-pulse"></div>}>
                 <BucketListWidget />
               </Suspense>
             </div>

             {/* Notizen */}
             <div className="rounded-[3rem] shadow-2xl shadow-black/50">
               <Suspense fallback={<div className="h-64 bg-zinc-900/50 rounded-[2.5rem] animate-pulse"></div>}>
                 <StickyNotesWidget />
               </Suspense>
             </div>
          </div>

          <div className="xl:col-span-5 space-y-6 md:space-y-8">
             {/* Finanzen */}
             <div className="rounded-[3rem] p-1.5 bg-gradient-to-tr from-indigo-500/30 to-purple-500/30 shadow-2xl shadow-indigo-500/10">
               <Suspense fallback={<div className="h-[400px] bg-zinc-900/50 rounded-[2.5rem] animate-pulse"></div>}>
                 <FinanceWidget />
               </Suspense>
             </div>

             {/* Haustiere */}
             <div className="rounded-[3rem] shadow-2xl shadow-black/50">
               <Suspense fallback={<div className="h-64 bg-zinc-900/50 rounded-[2.5rem] animate-pulse"></div>}>
                 <PetWidget />
               </Suspense>
             </div>
          </div>

        </div>
      </main>
    </div>
  );
}