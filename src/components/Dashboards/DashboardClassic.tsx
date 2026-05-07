// src/components/dashboards/DashboardClassic.tsx
import { Suspense } from "react";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import SubmitButton from "@/components/SubmitButton";
import StickyNotesWidget from "@/components/widgets/StickyNotesWidget";
import PetWidget from "@/components/widgets/PetWidget";
import BucketListWidget from "@/components/widgets/BucketListWidget";
import FinanceWidget from "@/components/widgets/FinanceWidget";
import { updateUiLayout, addBucketItem, setPantryCount, addPantryItem, deletePantryItem, addEnergyReading, deleteEnergyReading, updateEnergySettings, addSharedContact, deleteSharedContact } from "@/lib/actions";
import type { DashboardProps } from "@/lib/dashboard";
import type { SharedContact, TimelineEvent, PantryItem } from "@prisma/client";
import { 
  LayoutDashboard, Wallet, ShoppingCart, Utensils, Map, Heart, Lock, 
  BookOpen, Calendar, CheckCircle2, TrendingUp, Plus, Trash2, 
  Settings, Clock, PieChart, Wifi, Zap, Phone, Timer, Star, MonitorSmartphone, CalendarClock, Plane
} from "lucide-react";

export default function DashboardClassic({ currentUser, data }: DashboardProps) {
  const weeklyExpenses = data.weeklyExpensesAgg?._sum?.amount || 0;
  const daysUntilTrip = data.nextTrip ? Math.ceil((data.nextTrip.date.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null;

  let energySettings = data.energySettingsResult || { kwhPrice: 0.35, monthlyPrepayment: 80 };

  let energyForecast = null;
  let energyDifference = 0;
  if (data.energyReadings?.length >= 2) {
    const firstReading = data.energyReadings[0];
    const lastReading = data.energyReadings[data.energyReadings.length - 1];
    const daysDiff = (lastReading.date.getTime() - firstReading.date.getTime()) / (1000 * 3600 * 24);
    if (daysDiff > 0) {
      const dailyKwh = (lastReading.value - firstReading.value) / daysDiff;
      const projectedYearlyCost = (dailyKwh * 365) * energySettings.kwhPrice;
      const yearlyPrepayments = energySettings.monthlyPrepayment * 12;
      energyDifference = yearlyPrepayments - projectedYearlyCost; 
      energyForecast = { projectedYearlyCost, yearlyPrepayments, difference: energyDifference };
    }
  }

  const apps = [
    { title: "Statistik", icon: <PieChart size={24} />, href: "/statistics", color: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/20 dark:text-fuchsia-500" },
    { title: "Gäste", icon: <Wifi size={24} />, href: "/guests", color: "bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-500" },
    { title: "Smart-Home", icon: <LayoutDashboard size={24} />, href: "/smarthome", color: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-500" },
    { title: "Abos", icon: <TrendingUp size={24} />, href: "/subscriptions", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-500" },
    { title: "Shopping", icon: <ShoppingCart size={24} />, href: "/shopping", badge: data.openShoppingItemsCount, color: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-500" },
    { title: "Putzplan", icon: <CheckCircle2 size={24} />, href: "/chores", color: "bg-stone-200 text-stone-700 dark:bg-stone-500/20 dark:text-stone-400" },
    { title: "Meal Prep", icon: <Utensils size={24} />, href: "/mealprep", color: "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-500" },
    { title: "Date-Ideen", icon: <Heart size={24} />, href: "/roulette", color: "bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-500" },
    { title: "Weltkarte", icon: <Map size={24} />, href: "/map", color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-500" },
    { title: "Kalender", icon: <Calendar size={24} />, href: "/timeline", color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-500" },
    { title: "Geschenke", icon: <Lock size={24} />, href: "/gifts", color: "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-500" },
    { title: "Wiki", icon: <BookOpen size={24} />, href: "/wiki", color: "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-500" },
  ];

  const quickActions = [
    { title: "Einkauf", href: "/shopping", icon: <ShoppingCart size={15} /> },
    { title: "Termin", href: "/timeline", icon: <CalendarClock size={15} /> },
    { title: "Meal", href: "/mealprep", icon: <Utensils size={15} /> },
    { title: "Reise", href: "/map", icon: <Plane size={15} /> },
  ];

  return (
    <div className="min-h-screen bg-[#FDFCFB] dark:bg-stone-950 text-stone-900 dark:text-stone-100 pb-40 font-sans selection:bg-[#C5A38E]/30 transition-colors duration-500">
      <header className="sticky top-0 z-40 bg-[#FDFCFB]/80 dark:bg-stone-950/80 backdrop-blur-xl border-b border-stone-200/50 dark:border-stone-800/50 px-4 md:px-8 py-4 flex justify-between items-center">
        <h1 className="text-xl md:text-2xl font-bold tracking-tight" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
          Die Höhle <span className="text-[#C5A38E] font-light">HQ</span>
        </h1>
        <div className="flex items-center gap-4">
          <p className="text-[10px] text-stone-500 uppercase tracking-widest hidden sm:block">Willkommen, {currentUser?.name}.</p>
          <ThemeToggle />
          <form action={async () => { "use server"; await updateUiLayout("MODERN"); }}>
             <SubmitButton isIconOnly className="w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-500 hover:text-[#C5A38E] hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors flex items-center justify-center">
               <MonitorSmartphone size={16} />
             </SubmitButton>
          </form>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 md:px-8 mt-6 space-y-8">
        <section className="rounded-[2rem] border border-stone-200/80 bg-white/80 p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900/70">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-stone-400">Heute schnell starten</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {quickActions.map((action) => (
              <Link
                key={action.title}
                href={action.href}
                className="flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3 py-3 text-sm font-semibold text-stone-600 transition hover:-translate-y-0.5 hover:bg-stone-100 hover:text-stone-900 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700 dark:hover:text-white"
              >
                {action.icon}
                {action.title}
              </Link>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 p-6 rounded-[2.5rem] flex flex-col justify-center transition-colors">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                <Star size={16} />
                <span className="text-[10px] font-bold uppercase tracking-widest">Wochenrückblick</span>
              </div>
              <TrendingUp size={20} className="text-emerald-500" />
            </div>
            <p className="text-sm font-medium">Gemeinsam {data.choresDoneThisWeek} Aufgaben erledigt & € {weeklyExpenses.toFixed(0)} investiert.</p>
          </div>

          <div className="bg-[#C5A38E] text-white p-6 rounded-[2.5rem] flex flex-col justify-center shadow-lg relative overflow-hidden transition-colors">
            <div className="relative z-10">
              <div className="flex items-center gap-2 opacity-80 mb-1">
                <Timer size={16} />
                <span className="text-[10px] font-bold uppercase tracking-widest">
                  Reise: {data.nextTrip?.destination || 'Nächster Halt...'}
                </span>
              </div>
              <p className="text-2xl font-light">{daysUntilTrip !== null ? `Noch ${daysUntilTrip} Tage!` : 'Plane eine Reise in der Karte'}</p>
            </div>
            <Map size={48} className="opacity-20 absolute -right-4 -bottom-4" />
          </div>

          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-5 rounded-[2.5rem] shadow-sm flex flex-col transition-colors">
            <div className="flex items-center gap-2 text-indigo-500 mb-3">
              <Clock size={16} />
              <span className="text-[10px] font-bold uppercase tracking-widest">Demnächst</span>
            </div>
            <div className="space-y-2 flex-1 scrollbar-thin overflow-y-auto pr-1">
              {data.upcomingEvents.length === 0 ? (
                <p className="text-xs text-stone-400 italic">Keine anstehenden Termine.</p>
              ) : (
                data.upcomingEvents.map((ev: TimelineEvent) => {
                  const isToday = ev.date.toDateString() === new Date().toDateString();
                  return (
                    <div key={ev.id} className="flex justify-between items-center text-sm border-b border-stone-100 dark:border-stone-800/50 pb-1">
                      <span className={`truncate max-w-[65%] ${isToday ? 'font-bold text-[#C5A38E]' : 'font-medium'}`}>{ev.title}</span>
                      <span className={`text-[10px] tabular-nums ${isToday ? 'text-[#C5A38E] font-bold' : 'text-stone-400'}`}>
                        {isToday ? 'Heute' : ev.date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
                      </span>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-y-6 gap-x-2">
          {apps.map((app) => (
            <Link key={app.title} href={app.href} className="group flex flex-col items-center gap-2 relative">
              <div className={`w-14 h-14 md:w-16 md:h-16 ${app.color} rounded-[1.25rem] flex items-center justify-center shadow-sm group-hover:scale-105 transition-all`}>
                {app.icon}
                {app.badge ? <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-[#FDFCFB] dark:border-stone-950">{app.badge}</div> : null}
              </div>
              <span className="text-[10px] font-medium text-stone-600 dark:text-stone-400 text-center leading-tight">{app.title}</span>
            </Link>
          ))}
        </section>

        <Suspense fallback={<div className="h-[280px] bg-stone-100 dark:bg-stone-900 rounded-[2.5rem] animate-pulse"></div>}>
          <FinanceWidget />
        </Suspense>

        <Suspense fallback={<div className="h-[200px] bg-stone-100 dark:bg-stone-900 rounded-[2.5rem] animate-pulse"></div>}>
          <BucketListWidget />
        </Suspense>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-[2.5rem] p-6 shadow-sm flex flex-col md:h-[450px] transition-colors">
            <div className="flex items-center gap-2 mb-4">
              <ShoppingCart size={18} className="text-[#C5A38E]" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-stone-400">Vorratsschrank</h3>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
              {data.pantryItems.map((item: PantryItem) => (
                <div key={item.id} className="flex justify-between items-center p-3 bg-stone-50 dark:bg-stone-800/50 rounded-2xl group transition-colors">
                  <div className="flex items-center gap-2">
                    <form action={async () => { "use server"; await deletePantryItem(item.id); }}>
                      <SubmitButton isIconOnly className="opacity-0 group-hover:opacity-100 text-stone-400 hover:text-rose-500 transition-all"><Trash2 size={12}/></SubmitButton>
                    </form>
                    <div className="flex flex-col">
                      <span className={`text-sm ${item.count < item.minCount ? 'text-rose-500 font-bold animate-pulse' : ''}`}>{item.name}</span>
                      <span className="text-[9px] text-stone-400 uppercase">Min: {item.minCount} {item.unit}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <form action={async (formData) => { "use server"; await setPantryCount(item.id, parseFloat(formData.get("val") as string)); }} className="flex items-center gap-2">
                      <input name="val" type="number" step="any" defaultValue={item.count} className="w-16 h-8 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg text-xs text-center outline-none focus:border-[#C5A38E] transition-colors" />
                      <span className="text-[10px] font-bold text-stone-500 w-10 truncate">{item.unit}</span>
                      <SubmitButton className="w-8 h-8 bg-stone-900 dark:bg-stone-700 text-white rounded-lg text-xs shadow-sm hover:bg-stone-700 transition">✓</SubmitButton>
                    </form>
                  </div>
                </div>
              ))}
            </div>
            <form action={async (formData) => { "use server"; await addPantryItem(formData.get("name") as string, formData.get("unit") as string, parseFloat(formData.get("min") as string)); }} className="mt-4 flex flex-col gap-2 bg-stone-50 dark:bg-stone-950 p-3 rounded-2xl border border-stone-100 dark:border-stone-800">
              <input name="name" placeholder="Hinzufügen (z.B. Mehl)..." className="w-full h-10 bg-white dark:bg-stone-900 px-4 rounded-xl text-xs outline-none focus:border-[#C5A38E] border border-stone-200 dark:border-stone-800 transition" required />
              <div className="flex gap-2">
                <select name="unit" className="w-1/3 h-10 bg-white dark:bg-stone-900 px-2 rounded-xl text-xs outline-none border border-stone-200 dark:border-stone-800 focus:border-[#C5A38E] transition">
                  <option value="Stück">Stück</option>
                  <option value="Gramm">Gramm</option>
                  <option value="Kg">Kg</option>
                  <option value="Liter">Liter</option>
                  <option value="ml">ml</option>
                  <option value="Packung">Pack.</option>
                </select>
                <input name="min" type="number" step="any" placeholder="Min. Bestand..." className="flex-1 h-10 bg-white dark:bg-stone-900 px-3 rounded-xl text-xs outline-none focus:border-[#C5A38E] border border-stone-200 dark:border-stone-800 transition" required />
                <SubmitButton className="w-10 h-10 bg-[#C5A38E] text-white rounded-xl shadow-sm hover:bg-[#A38572] transition-colors"><Plus size={16} className="mx-auto" /></SubmitButton>
              </div>
            </form>
          </div>

          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-[2.5rem] p-6 shadow-sm flex flex-col justify-between transition-colors">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-amber-500">
                  <Zap size={18} />
                  <h3 className="text-xs font-bold uppercase tracking-widest text-stone-400">Energy Radar</h3>
                </div>
              </div>
              {energyForecast ? (
                <div className={`p-3 rounded-2xl mb-4 border ${energyDifference >= 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/20' : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-900/20'}`}>
                  <p className="text-[10px] uppercase font-bold tracking-widest opacity-70">Jahresprognose</p>
                  <p className="text-xl font-light tabular-nums">
                    {energyDifference >= 0 ? '+' : '-'} € {Math.abs(energyDifference).toFixed(0)}
                  </p>
                  <p className="text-[9px] opacity-70 mt-1">Kosten: €{energyForecast.projectedYearlyCost.toFixed(0)} | Bezahlt: €{energyForecast.yearlyPrepayments.toFixed(0)}</p>
                </div>
              ) : (
                 <p className="text-xs text-stone-400 italic mb-4">Mindestens 2 Zählerstände für Prognose benötigt.</p>
              )}
            </div>
            <form action={async (formData) => { "use server"; await addEnergyReading("STROM", parseFloat(formData.get("val") as string)); }} className="mt-4 flex gap-2">
              <input name="val" type="number" step="0.1" placeholder="Neuer Zählerstand..." className="flex-1 h-10 bg-stone-50 dark:bg-stone-950 px-3 rounded-xl text-xs outline-none" required />
              <SubmitButton className="px-3 h-10 bg-amber-500 text-white rounded-xl text-xs font-bold">+</SubmitButton>
            </form>
          </div>

          <div className="bg-stone-900 text-white rounded-[2.5rem] p-6 shadow-xl flex flex-col md:h-[450px] transition-colors">
            <div className="flex items-center gap-2 mb-4 text-[#C5A38E]">
              <Phone size={18} />
              <h3 className="text-xs font-bold uppercase tracking-widest">Wichtige Kontakte</h3>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
              {data.contacts.length === 0 && <p className="text-xs text-stone-500 italic">Keine Kontakte gespeichert.</p>}
              {data.contacts.map((c: SharedContact) => (
                <div key={c.id} className="bg-stone-800 p-4 rounded-2xl border border-stone-700/50 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] font-bold text-[#C5A38E] uppercase tracking-wider">{c.role}</span>
                    <p className="text-sm font-bold">{c.name}</p>
                    <p className="text-[10px] text-stone-400">{c.phone || c.email}</p>
                  </div>
                  <form action={async () => { "use server"; await deleteSharedContact(c.id); }}>
                     <SubmitButton isIconOnly className="text-stone-500 hover:text-rose-500 transition-colors"><Trash2 size={16}/></SubmitButton>
                  </form>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Suspense fallback={<div className="h-[500px] bg-stone-100 dark:bg-stone-900 rounded-[2.5rem] animate-pulse"></div>}>
            <StickyNotesWidget />
          </Suspense>
          <Suspense fallback={<div className="h-[500px] bg-stone-800 rounded-[2.5rem] animate-pulse"></div>}>
            <PetWidget />
          </Suspense>
        </section>
      </main>
      
      <div className="fixed bottom-4 left-0 right-0 px-4 pointer-events-none z-50 flex justify-center md:bottom-6">
        <form action={async (formData) => { 
          "use server"; 
          await addBucketItem(formData.get("title") as string, parseFloat(formData.get("price") as string) || 0, formData.get("isSurprise") === "on"); 
        }} className="w-full max-w-md bg-white/95 dark:bg-stone-900/95 backdrop-blur-xl p-4 rounded-[2.5rem] shadow-2xl border border-stone-200/50 pointer-events-auto flex flex-col gap-3 transition-colors duration-500">
          <div className="flex gap-2">
            <input name="title" placeholder="Wunsch hinzufügen..." className="flex-1 h-12 bg-stone-100/50 dark:bg-black/20 px-5 rounded-2xl outline-none text-sm focus:border-[#C5A38E] border border-transparent transition" required />
            <input name="price" type="number" placeholder="€" className="w-16 h-12 bg-stone-100/50 dark:bg-black/20 rounded-2xl outline-none text-center text-sm focus:border-[#C5A38E] border border-transparent transition" />
            <label className="flex flex-col items-center justify-center w-12 h-12 bg-stone-100/50 dark:bg-black/20 rounded-2xl cursor-pointer hover:bg-black/30 transition-colors">
              <input type="checkbox" name="isSurprise" className="w-4 h-4 accent-[#C5A38E]" />
              <span className="text-[8px] uppercase mt-1 text-stone-500 font-bold">Geheim</span>
            </label>
            <SubmitButton className="w-12 h-12 bg-[#C5A38E] text-white rounded-2xl shadow-md flex items-center justify-center hover:bg-[#A38572] transition-colors"><Plus size={24}/></SubmitButton>
          </div>
        </form>
      </div>
    </div>
  );
}