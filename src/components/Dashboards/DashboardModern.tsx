// src/components/dashboards/DashboardModern.tsx
import ThemeToggle from "@/components/ThemeToggle";
import FinanceWidget from "@/components/widgets/FinanceWidget";
import BucketListWidget from "@/components/widgets/BucketListWidget";
import PetWidget from "@/components/widgets/PetWidget";
import StickyNotesWidget from "@/components/widgets/StickyNotesWidget";
import { Suspense } from "react";
import Link from "next/link";
import SubmitButton from "@/components/SubmitButton";
import { updateUiLayout } from "@/lib/actions";
import { Activity, Terminal, ShieldAlert, Cpu } from "lucide-react";

export default function DashboardModern({ currentUser, data }: any) {
  return (
    <div className="min-h-screen bg-black text-stone-300 font-mono selection:bg-emerald-500/30">
      
      {/* OS TOPBAR - Cyberpunk Style */}
      <header className="sticky top-0 z-50 bg-black/90 backdrop-blur-md border-b border-emerald-900/30 px-6 py-3 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Terminal size={18} className="text-emerald-500" />
          <h1 className="text-sm font-bold text-emerald-500 tracking-[0.2em] uppercase">
            Höhle_OS <span className="opacity-50 font-normal">v2.0</span>
          </h1>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-2 text-[10px] uppercase tracking-widest">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-emerald-500/70">System Online // {currentUser.name}</span>
          </div>
          
          <div className="flex items-center gap-2 border-l border-emerald-900/30 pl-6">
            <ThemeToggle />
            <form action={async () => { "use server"; await updateUiLayout("CLASSIC"); }}>
               <SubmitButton className="text-[10px] uppercase font-bold tracking-widest bg-emerald-950/30 text-emerald-500 border border-emerald-900/50 hover:bg-emerald-900/50 px-4 py-2 rounded-none transition-all">
                 Classic UI
               </SubmitButton>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto p-4 md:p-6 lg:p-8 space-y-6">
        
        {/* SYS STATS - HUD Style */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-stone-900/50 border border-stone-800 p-4 relative overflow-hidden group hover:border-emerald-500/30 transition-colors">
            <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity"><Activity size={40} /></div>
            <p className="text-[9px] uppercase tracking-widest text-stone-500 mb-1">Weekly Tasks</p>
            <p className="text-2xl text-stone-200">{data.choresDoneThisWeek} <span className="text-xs text-stone-600">done</span></p>
          </div>
          <div className="bg-stone-900/50 border border-stone-800 p-4 relative overflow-hidden group hover:border-emerald-500/30 transition-colors">
            <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity"><ShieldAlert size={40} /></div>
            <p className="text-[9px] uppercase tracking-widest text-stone-500 mb-1">Weekly Burn</p>
            <p className="text-2xl text-rose-500/80">€ {data.weeklyExpensesAgg._sum.amount?.toFixed(0) || 0}</p>
          </div>
          <div className="bg-stone-900/50 border border-stone-800 p-4 relative overflow-hidden group hover:border-emerald-500/30 transition-colors">
            <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity"><Cpu size={40} /></div>
            <p className="text-[9px] uppercase tracking-widest text-stone-500 mb-1">Next Trip in</p>
            <p className="text-2xl text-emerald-500/80">
               {data.nextTrip ? Math.ceil((data.nextTrip.date.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) + ' d' : 'N/A'}
            </p>
          </div>
          <div className="bg-stone-900/50 border border-stone-800 p-4 relative overflow-hidden group hover:border-emerald-500/30 transition-colors">
             <Link href="/shopping" className="block w-full h-full">
               <p className="text-[9px] uppercase tracking-widest text-stone-500 mb-1">Shopping Queue</p>
               <p className="text-2xl text-stone-200">{data.openShoppingItemsCount} <span className="text-xs text-stone-600">items</span></p>
             </Link>
          </div>
        </div>

        {/* MASONRY GRID LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT COLUMN (Wishes & Notes) - 7 Columns wide */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* WIDGET WRAPPER: Custom Styling für Modern Look */}
            <div className="border border-stone-800 bg-stone-950 p-1">
              <div className="bg-black border border-stone-900 p-2">
                 {/* Wir nutzen das bestehende Widget, aber zwingen es in unseren dunklen Container */}
                 <Suspense fallback={<div className="h-64 bg-stone-900/20 animate-pulse border border-stone-800"></div>}>
                   <BucketListWidget />
                 </Suspense>
              </div>
            </div>

            <div className="border border-stone-800 bg-stone-950 p-1">
              <div className="bg-black border border-stone-900 p-2">
                 <Suspense fallback={<div className="h-64 bg-stone-900/20 animate-pulse border border-stone-800"></div>}>
                   <StickyNotesWidget />
                 </Suspense>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN (Finance & Pets) - 5 Columns wide */}
          <div className="lg:col-span-5 space-y-6">
             
            <div className="border border-stone-800 bg-stone-950 p-1">
              <div className="bg-black border border-stone-900 p-2">
                 <Suspense fallback={<div className="h-[400px] bg-stone-900/20 animate-pulse border border-stone-800"></div>}>
                   <FinanceWidget />
                 </Suspense>
              </div>
            </div>

            <div className="border border-emerald-900/30 bg-black p-1 shadow-[0_0_30px_rgba(16,185,129,0.05)]">
               <Suspense fallback={<div className="h-64 bg-stone-900/20 animate-pulse border border-stone-800"></div>}>
                 <PetWidget />
               </Suspense>
            </div>

          </div>

        </div>
      </main>
    </div>
  );
}