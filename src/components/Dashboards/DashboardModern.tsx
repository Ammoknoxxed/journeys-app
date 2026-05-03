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
import { CheckCircle2, CreditCard, Plane, ShoppingBag, LayoutGrid } from "lucide-react";

export default function DashboardModern({ currentUser, data }: any) {
  return (
    // overflow-x-hidden verhindert zu 100%, dass etwas aus dem Bildschirm läuft
    <div className="min-h-screen bg-black text-zinc-100 font-sans overflow-x-hidden selection:bg-white/20 pb-32">
      
      {/* FLOATING TOP NAV */}
      <div className="pt-6 px-4 w-full max-w-7xl mx-auto flex justify-center">
        <nav className="w-full bg-zinc-950/80 backdrop-blur-2xl border border-zinc-800/80 rounded-full px-6 py-3 flex justify-between items-center shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.4)]">
              <LayoutGrid size={16} className="text-black" />
            </div>
            <span className="font-semibold tracking-wide text-sm hidden md:block text-white">Höhle OS</span>
          </div>
          
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <div className="h-4 w-px bg-zinc-800"></div>
            <form action={async () => { "use server"; await updateUiLayout("CLASSIC"); }}>
               <SubmitButton className="text-xs font-semibold bg-transparent hover:bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800 px-5 py-2 rounded-full transition-all">
                 Classic UI
               </SubmitButton>
            </form>
          </div>
        </nav>
      </div>

      <main className="w-full max-w-7xl mx-auto px-4 mt-12 space-y-12">
        
        {/* HERO SECTION */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
          <div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tighter text-white mb-2">
              Willkommen, <span className="text-zinc-600">{currentUser?.name}</span>.
            </h1>
            <p className="text-sm md:text-base text-zinc-400 font-medium">Dein System-Status für heute. Alles läuft reibungslos.</p>
          </div>
        </div>

        {/* HIGH-END STATS (Bento Grid) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          
          {/* Stat 1 */}
          <div className="bg-zinc-950 border border-zinc-800/80 rounded-[2rem] p-6 flex flex-col justify-between hover:border-zinc-600 transition-colors group">
            <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(255,255,255,0.1)] group-hover:scale-110 transition-transform">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <p className="text-3xl font-semibold tracking-tighter text-white">{data.choresDoneThisWeek}</p>
              <p className="text-xs md:text-sm font-medium text-zinc-500 mt-1">Erledigte Aufgaben</p>
            </div>
          </div>

          {/* Stat 2 */}
          <div className="bg-zinc-950 border border-zinc-800/80 rounded-[2rem] p-6 flex flex-col justify-between hover:border-zinc-600 transition-colors group">
            <div className="w-10 h-10 rounded-full bg-zinc-800 text-white flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <CreditCard size={20} />
            </div>
            <div>
              <p className="text-3xl font-semibold tracking-tighter text-white">€ {data.weeklyExpensesAgg?._sum?.amount?.toFixed(0) || 0}</p>
              <p className="text-xs md:text-sm font-medium text-zinc-500 mt-1">Ausgaben (7 Tage)</p>
            </div>
          </div>

          {/* Stat 3 */}
          <div className="bg-zinc-950 border border-zinc-800/80 rounded-[2rem] p-6 flex flex-col justify-between hover:border-zinc-600 transition-colors group">
            <div className="w-10 h-10 rounded-full bg-zinc-800 text-white flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Plane size={20} />
            </div>
            <div>
              <p className="text-3xl font-semibold tracking-tighter text-white">
                {data.nextTrip ? Math.ceil((data.nextTrip.date.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : '-'}
              </p>
              <p className="text-xs md:text-sm font-medium text-zinc-500 mt-1">Tage bis zum Trip</p>
            </div>
          </div>

          {/* Stat 4 (Clickable) */}
          <Link href="/shopping" className="block w-full h-full">
            <div className="bg-white text-black border border-white rounded-[2rem] p-6 flex flex-col justify-between hover:bg-zinc-200 transition-colors group h-full shadow-[0_0_30px_rgba(255,255,255,0.15)]">
              <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <ShoppingBag size={20} />
              </div>
              <div>
                <p className="text-3xl font-semibold tracking-tighter">{data.openShoppingItemsCount}</p>
                <p className="text-xs md:text-sm font-bold text-zinc-600 mt-1">Auf Einkaufsliste</p>
              </div>
            </div>
          </Link>
        </div>

        {/* MAIN WIDGETS GRID */}
        {/* Durch das 2-Spalten-Grid (lg:grid-cols-2) hat jedes Widget genug Platz und fließt nicht aus dem Bild */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Linke Spalte */}
          <div className="space-y-8 flex flex-col w-full">
             <div className="w-full overflow-hidden rounded-[2.5rem]">
               <Suspense fallback={<div className="h-64 bg-zinc-950 border border-zinc-800 rounded-[2.5rem] animate-pulse"></div>}>
                 <FinanceWidget />
               </Suspense>
             </div>

             <div className="w-full overflow-hidden rounded-[2.5rem]">
               <Suspense fallback={<div className="h-64 bg-zinc-950 border border-zinc-800 rounded-[2.5rem] animate-pulse"></div>}>
                 <PetWidget />
               </Suspense>
             </div>
          </div>

          {/* Rechte Spalte */}
          <div className="space-y-8 flex flex-col w-full">
             <div className="w-full overflow-hidden rounded-[2.5rem]">
               <Suspense fallback={<div className="h-64 bg-zinc-950 border border-zinc-800 rounded-[2.5rem] animate-pulse"></div>}>
                 <BucketListWidget />
               </Suspense>
             </div>

             <div className="w-full overflow-hidden rounded-[2.5rem]">
               <Suspense fallback={<div className="h-64 bg-zinc-950 border border-zinc-800 rounded-[2.5rem] animate-pulse"></div>}>
                 <StickyNotesWidget />
               </Suspense>
             </div>
          </div>

        </div>
      </main>
    </div>
  );
}