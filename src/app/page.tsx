// src/app/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { 
  addBucketItem, approveBucketItem, deleteBucketItem, 
  addExpense, deleteExpense, addIncome, deleteIncome,
  addFundsToItem, markItemCompleted, addStickyNote, deleteStickyNote, 
  consumePetFood, addPetFood, cleanLitterBox, addHealthEvent, deleteHealthEvent,
  setPantryCount, addPantryItem, deletePantryItem,
  addEnergyReading, deleteEnergyReading, updateEnergySettings,
  addSharedContact, deleteSharedContact,
  updateNetIncome, addObligation, deleteObligation
} from "@/lib/actions";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import { 
  LayoutDashboard, Wallet, ShoppingCart, Utensils, 
  Map, Heart, Lock, BookOpen, Calendar,
  Cat, CheckCircle2, TrendingUp, PiggyBank, ClipboardList,
  Plus, X, Check, Camera, MessageSquare, Zap, Phone, Timer, Star,
  Trash2, ThumbsUp, ChevronDown, Settings, Maximize2, Clock, AlertTriangle, PieChart, Wifi 
} from "lucide-react";

function getHygieneStatus(lastCleanAt?: Date | null) {
  if (!lastCleanAt) return { text: "Nie", color: "text-rose-500", bg: "bg-rose-500/10 border-rose-500/20", level: 3 };
  const hours = (new Date().getTime() - lastCleanAt.getTime()) / (1000 * 60 * 60);
  if (hours < 12) return { text: "Frisch", color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/20", level: 1 };
  if (hours < 24) return { text: "Okay", color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/20", level: 2 };
  return { text: "Kritisch", color: "text-rose-500", bg: "bg-rose-500/10 border-rose-500/20 animate-pulse", level: 3 };
}

function PueppiIcon({ statusLevel }: { statusLevel: number }) {
  const baseClasses = "w-16 h-16 transition-all duration-500";
  if (statusLevel === 3) {
    return (
      <div className="relative group">
        <div className="absolute inset-0 bg-rose-500/30 rounded-full blur-xl animate-pulse"></div>
        <Cat className={`${baseClasses} text-rose-500 animate-bounce relative z-10`} strokeWidth={1.5} />
        <AlertTriangle className="absolute -top-1 -right-1 text-rose-500 w-5 h-5 animate-pulse" />
      </div>
    );
  }
  if (statusLevel === 2) {
    return (
      <div className="relative">
        <div className="absolute inset-0 bg-amber-500/10 rounded-full blur-lg animate-pulse"></div>
        <Cat className={`${baseClasses} text-amber-500 animate-pulse relative z-10`} strokeWidth={1.5} />
      </div>
    );
  }
  return (
    <div className="relative">
      <Cat className={`${baseClasses} text-[#C5A38E] hover:scale-110 transition-transform`} strokeWidth={1} />
    </div>
  );
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const todayZero = new Date(new Date().setHours(0,0,0,0));
  
  // HARTER SYSTEM-START: 01. Mai 2026
  const systemStartDate = new Date("2026-05-01T00:00:00.000Z");

  const [
    allUsers, obligations, openShoppingItemsCount, petFoodResult,
    stickyNotes, lastCleanBox1, lastCleanBox2, pantryItems,
    energyReadings, energySettingsResult, contacts, nextTrip,
    upcomingEvents, currentMonthExpenses, allItems, healthEvents,
    expenseAgg, incomeAgg, tripAgg, currentMonthIncomes
  ] = await Promise.all([
    prisma.user.findMany(),
    prisma.financialObligation.findMany(),
    prisma.shoppingItem.count({ where: { checked: false } }),
    prisma.petFood.findFirst(),
    prisma.stickyNote.findMany({ orderBy: { createdAt: 'desc' }, take: 10 }),
    prisma.litterBoxLog.findFirst({ where: { boxId: 1 }, orderBy: { createdAt: 'desc' } }),
    prisma.litterBoxLog.findFirst({ where: { boxId: 2 }, orderBy: { createdAt: 'desc' } }),
    prisma.pantryItem.findMany({ orderBy: { name: 'asc' } }),
    prisma.energyReading.findMany({ orderBy: { date: 'asc' } }),
    prisma.energySettings.findFirst(),
    prisma.sharedContact.findMany({ orderBy: { role: 'asc' } }),
    prisma.trip.findFirst({ where: { date: { gte: todayZero } }, orderBy: { date: 'asc' } }),
    prisma.timelineEvent.findMany({ where: { date: { gte: todayZero } }, orderBy: { date: 'asc' }, take: 3 }),
    prisma.expense.findMany({ where: { date: { gte: startOfMonth } }, include: { user: true }, orderBy: { date: 'desc' } }),
    prisma.bucketItem.findMany({ include: { creator: true, approver: true }, orderBy: { createdAt: 'desc' } }),
    prisma.petHealthEvent.findMany({ orderBy: { dueDate: 'asc' } }),
    
    // Für den All-Time Kontostand ignorieren wir alles vor Mai 2026!
    prisma.expense.aggregate({ where: { date: { gte: systemStartDate } }, _sum: { amount: true } }),
    prisma.income.aggregate({ where: { date: { gte: systemStartDate } }, _sum: { amount: true } }),
    prisma.trip.aggregate({ _sum: { savedAmount: true } }),
    prisma.income.findMany({ where: { date: { gte: startOfMonth } }, include: { user: true }, orderBy: { date: 'desc' } })
  ]);

  const currentUser = allUsers.find(u => u.email === session.user?.email);
  const partner = allUsers.find(u => u.email !== session.user?.email);

  let petFood = petFoodResult || await prisma.petFood.create({ data: { cans: 10 } });
  let energySettings = energySettingsResult || await prisma.energySettings.create({ data: { kwhPrice: 0.35, monthlyPrepayment: 80 } });

  // --- DIE ECHTE KONTOSTAND-MATHE (Ab Mai 2026) ---
  const startYear = 2026;
  const startMonth = 4; // Mai (0-indexed = 4)
  const now = new Date();
  
  let monthsActive = (now.getFullYear() - startYear) * 12 + (now.getMonth() - startMonth) + 1;
  // Wenn wir aktuell noch vor Mai sind (z.B. April), werden noch 0 Monate Fixkosten berechnet
  if (monthsActive < 0) monthsActive = 0; 

  const totalFixedMonthly = obligations.reduce((sum, ob) => sum + ob.amount, 0);
  const totalFixedAllTime = totalFixedMonthly * monthsActive;
  
  const totalVariableAllTime = expenseAgg._sum.amount || 0;
  const totalIncomeAllTime = incomeAgg._sum.amount || 0;
  const totalBucketSavings = allItems.reduce((sum, i) => sum + i.savedAmount, 0);
  const totalTripSavings = tripAgg._sum.savedAmount || 0;

  const realBalance = totalIncomeAllTime - totalVariableAllTime - totalFixedAllTime - totalBucketSavings - totalTripSavings;

  const currentMonthIncomeVal = currentMonthIncomes.reduce((sum, inc) => sum + inc.amount, 0);
  const currentMonthVariableVal = currentMonthExpenses.reduce((sum, ex) => sum + ex.amount, 0);

  const expectedTotalIncome = (currentUser?.netIncome || 0) + (partner?.netIncome || 0);
  const mySharePct = expectedTotalIncome > 0 ? ((currentUser?.netIncome || 0) / expectedTotalIncome) : 0.5;
  const partnerSharePct = 1 - mySharePct;
  const myFairCost = totalFixedMonthly * mySharePct;
  const partnerFairCost = totalFixedMonthly * partnerSharePct;

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const weeklyExpenses = currentMonthExpenses.filter(e => e.date >= sevenDaysAgo).reduce((sum, e) => sum + e.amount, 0);
  const choresDoneThisWeek = await prisma.chore.count({ where: { lastDoneAt: { gte: sevenDaysAgo } } });
  
  const daysUntilTrip = nextTrip ? Math.ceil((nextTrip.date.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null;

  const activeItems = allItems.filter(i => !i.isCompleted);
  const jointItems = activeItems.filter(i => i.approverId !== null);
  const myIndividualItems = activeItems.filter(i => i.creatorId === currentUser?.id && i.approverId === null);
  const partnerIndividualItems = activeItems.filter(i => i.creatorId === partner?.id && i.approverId === null);

  const foodStatusLevel = petFood.cans > 5 ? 1 : petFood.cans > 2 ? 2 : 3;
  const litter1Status = getHygieneStatus(lastCleanBox1?.createdAt);
  const litter2Status = getHygieneStatus(lastCleanBox2?.createdAt);
  const overallPueppiStatus = Math.max(foodStatusLevel, litter1Status.level, litter2Status.level);

  let energyForecast = null;
  let energyDifference = 0;
  if (energyReadings.length >= 2) {
    const firstReading = energyReadings[0];
    const lastReading = energyReadings[energyReadings.length - 1];
    const daysDiff = (lastReading.date.getTime() - firstReading.date.getTime()) / (1000 * 3600 * 24);
    if (daysDiff > 0) {
      const kwhConsumed = lastReading.value - firstReading.value;
      const dailyKwh = kwhConsumed / daysDiff;
      const projectedYearlyCost = (dailyKwh * 365) * energySettings.kwhPrice;
      const yearlyPrepayments = energySettings.monthlyPrepayment * 12;
      energyDifference = yearlyPrepayments - projectedYearlyCost; 
      energyForecast = { projectedYearlyCost, yearlyPrepayments, difference: energyDifference };
    }
  }
  const displayReadings = [...energyReadings].reverse().slice(0, 5);

  const apps = [
    { title: "Statistik", icon: <PieChart size={24} />, href: "/statistics", color: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/20 dark:text-fuchsia-500" },
    { title: "Gäste", icon: <Wifi size={24} />, href: "/guests", color: "bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-500" },
    { title: "Smart Home", icon: <LayoutDashboard size={24} />, href: "/smarthome", color: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-500" },
    { title: "Abos", icon: <TrendingUp size={24} />, href: "/subscriptions", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-500" },
    { title: "Shopping", icon: <ShoppingCart size={24} />, href: "/shopping", badge: openShoppingItemsCount, color: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-500" },
    { title: "Putzplan", icon: <CheckCircle2 size={24} />, href: "/chores", color: "bg-stone-200 text-stone-700 dark:bg-stone-500/20 dark:text-stone-400" },
    { title: "Meal Prep", icon: <Utensils size={24} />, href: "/mealprep", color: "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-500" },
    { title: "Date Night", icon: <Heart size={24} />, href: "/roulette", color: "bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-500" },
    { title: "Weltkarte", icon: <Map size={24} />, href: "/map", color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-500" },
    { title: "Kalender", icon: <Calendar size={24} />, href: "/timeline", color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-500" },
    { title: "Gifts", icon: <Lock size={24} />, href: "/gifts", color: "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-500" },
    { title: "Wiki", icon: <BookOpen size={24} />, href: "/wiki", color: "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-500" },
    { title: "Check-In", icon: <ClipboardList size={24} />, href: "/checkin", color: "bg-lime-100 text-lime-700 dark:bg-lime-500/20 dark:text-lime-500" },
    { title: "Tresor", icon: <Wallet size={24} />, href: "/vault", color: "bg-stone-300 text-stone-800 dark:bg-stone-700/50 dark:text-stone-300" },
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
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 md:px-8 mt-6 space-y-8">
        
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 p-6 rounded-[2.5rem] flex flex-col justify-center transition-colors">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                <Star size={16} />
                <span className="text-[10px] font-bold uppercase tracking-widest">Weekly Recap</span>
              </div>
              <TrendingUp size={20} className="text-emerald-500" />
            </div>
            <p className="text-sm font-medium">Gemeinsam {choresDoneThisWeek} Aufgaben erledigt & € {weeklyExpenses.toFixed(0)} investiert.</p>
          </div>

          <div className="bg-[#C5A38E] text-white p-6 rounded-[2.5rem] flex flex-col justify-center shadow-lg relative overflow-hidden transition-colors">
            <div className="relative z-10">
              <div className="flex items-center gap-2 opacity-80 mb-1">
                <Timer size={16} />
                <span className="text-[10px] font-bold uppercase tracking-widest">
                  Trip: {nextTrip?.destination || 'Nächster Halt...'}
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
              {upcomingEvents.length === 0 ? (
                <p className="text-xs text-stone-400 italic">Keine anstehenden Termine.</p>
              ) : (
                upcomingEvents.map(ev => {
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

        <section className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-y-6 gap-x-2">
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

        <section className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-7 lg:col-span-8 bg-stone-900 text-white p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden flex flex-col justify-center min-h-[220px] transition-colors">
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                <p className="text-xs uppercase tracking-widest font-bold text-stone-500 mb-2 flex items-center gap-2">
                  <Wallet size={14} /> Echter Kontostand
                </p>
                <h2 className={`text-5xl md:text-6xl font-light tracking-tighter tabular-nums ${realBalance >= 0 ? 'text-[#C5A38E]' : 'text-rose-500'}`}>
                  € {realBalance.toLocaleString('de-DE', { maximumFractionDigits: 0 })}
                </h2>
                <p className="text-[10px] text-stone-500 mt-2 italic">Saldo ab Mai 2026 (Systemstart)</p>
              </div>
              
              <div className="bg-stone-800/50 p-5 rounded-3xl border border-stone-700/50 text-right w-full md:w-auto shadow-inner">
                 <p className="text-[10px] uppercase font-bold text-stone-400 mb-2">Diesen Monat ({new Date().toLocaleDateString('de-DE', { month: 'long' })})</p>
                 <p className="text-sm font-medium text-emerald-400 mb-1">+ € {currentMonthIncomeVal.toLocaleString('de-DE', { maximumFractionDigits: 0 })} Einnahmen</p>
                 <p className="text-sm font-medium text-rose-400">- € {(totalFixedMonthly + currentMonthVariableVal).toLocaleString('de-DE', { maximumFractionDigits: 0 })} Ausgaben</p>
                 <div className="h-[1px] w-full bg-stone-700 my-2"></div>
                 <p className={`text-sm font-bold ${currentMonthIncomeVal - (totalFixedMonthly + currentMonthVariableVal) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                   = € {(currentMonthIncomeVal - (totalFixedMonthly + currentMonthVariableVal)).toLocaleString('de-DE', { maximumFractionDigits: 0 })}
                 </p>
              </div>
            </div>
          </div>

          <div className="md:col-span-5 lg:col-span-4 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-8 rounded-[2.5rem] shadow-sm flex flex-col justify-center gap-6 transition-colors">
            <div className="flex items-center justify-between mb-4 border-b border-stone-100 dark:border-stone-800 pb-4">
              <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest">Fair Share Split</h3>
              
              <details className="relative group">
                <summary className="text-[10px] text-stone-500 font-bold uppercase cursor-pointer list-none hover:text-[#C5A38E] transition-colors">Gehälter (Basis)</summary>
                <div className="absolute right-0 top-6 bg-stone-800 p-4 rounded-2xl z-20 shadow-2xl border border-stone-700 w-48">
                   <form action={async (formData) => { "use server"; await updateNetIncome(parseFloat(formData.get("income") as string)); }} className="flex flex-col gap-2">
                     <label className="text-[10px] text-stone-400">Dein Basis-Gehalt (für Split)</label>
                     <input name="income" type="number" defaultValue={currentUser?.netIncome} className="bg-stone-900 p-2 rounded-xl text-xs outline-none text-white focus:ring-1 focus:ring-[#C5A38E]" required />
                     <button className="bg-[#C5A38E] text-white py-2 rounded-xl text-[10px] font-bold hover:bg-[#A38572] mt-1">Speichern</button>
                   </form>
                </div>
              </details>
            </div>
            
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-bold text-stone-700 dark:text-stone-200">{currentUser?.name}</span>
                  <span className="text-stone-500">€ {myFairCost.toFixed(0)}</span>
                </div>
                <div className="h-2 w-full bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                  <div className="bg-stone-800 dark:bg-stone-400 h-full rounded-full" style={{ width: `${mySharePct * 100}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-bold text-[#C5A38E]">{partner?.name || 'Partner'}</span>
                  <span className="text-stone-500">€ {partnerFairCost.toFixed(0)}</span>
                </div>
                <div className="h-2 w-full bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                  <div className="bg-[#C5A38E] h-full rounded-full" style={{ width: `${partnerSharePct * 100}%` }} />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <div className="bg-stone-900 text-white p-6 md:p-8 rounded-[2.5rem] shadow-xl flex flex-col transition-colors min-h-[280px]">
              <p className="text-[10px] uppercase font-bold text-emerald-500/70 border-b border-stone-800 pb-3 mb-4">Geldeingang</p>
              <div className="flex-1 space-y-2 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-stone-800 mb-4">
                  {currentMonthIncomes.length === 0 && <p className="text-[10px] text-stone-600 italic">Noch nichts eingegangen.</p>}
                  {currentMonthIncomes.map(inc => (
                    <div key={inc.id} className="flex justify-between items-center text-[11px] text-stone-400 group">
                      <span className="truncate max-w-[120px]">{inc.title}</span>
                      <div className="flex items-center gap-2">
                          <span className="tabular-nums text-emerald-400">+€{inc.amount.toFixed(0)}</span>
                          <form action={async () => { "use server"; await deleteIncome(inc.id); }}><button className="opacity-0 group-hover:opacity-100 text-rose-500 transition-all"><X size={12}/></button></form>
                      </div>
                    </div>
                  ))}
              </div>
              <form action={async (formData) => { "use server"; await addIncome(formData.get("title") as string, parseFloat(formData.get("amount") as string)); }} className="mt-auto pt-4 border-t border-stone-800/50 flex flex-col gap-2">
                  <input name="title" placeholder="Gehalt..." className="w-full bg-stone-800 border-none text-[10px] px-3 py-2.5 rounded-xl outline-none focus:ring-1 focus:ring-emerald-500" required />
                  <div className="flex gap-2">
                    <input name="amount" type="number" step="0.01" placeholder="€ Betrag" className="flex-1 bg-stone-800 border-none text-[10px] px-3 py-2.5 rounded-xl outline-none focus:ring-1 focus:ring-emerald-500" required />
                    <button className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-[10px] font-bold hover:bg-emerald-500 transition-colors">Hinzufügen</button>
                  </div>
              </form>
            </div>

            <div className="bg-stone-900 text-white p-6 md:p-8 rounded-[2.5rem] shadow-xl flex flex-col transition-colors min-h-[280px]">
              <p className="text-[10px] uppercase font-bold text-stone-500 border-b border-stone-800 pb-3 mb-4">Fixkosten Liste</p>
              <div className="flex-1 space-y-2 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-stone-800 mb-4">
                  {obligations.map(ob => (
                    <div key={ob.id} className="flex justify-between items-center text-[11px] text-stone-400 group">
                      <span className="truncate max-w-[120px]">{ob.title}</span>
                      <div className="flex items-center gap-2">
                          <span className="tabular-nums">€ {ob.amount.toFixed(0)}</span>
                          <form action={async () => { "use server"; await deleteObligation(ob.id); }}><button className="opacity-0 group-hover:opacity-100 text-stone-600 hover:text-rose-500 transition-all"><X size={12}/></button></form>
                      </div>
                    </div>
                  ))}
              </div>
              <form action={async (formData) => { "use server"; await addObligation(formData.get("title") as string, parseFloat(formData.get("amount") as string)); }} className="mt-auto pt-4 border-t border-stone-800/50 flex flex-col gap-2">
                  <input name="title" placeholder="Miete, Strom..." className="w-full bg-stone-800 border-none text-[10px] px-3 py-2.5 rounded-xl outline-none focus:ring-1 focus:ring-[#C5A38E]" required />
                  <div className="flex gap-2">
                    <input name="amount" type="number" step="0.01" placeholder="€ Betrag" className="flex-1 bg-stone-800 border-none text-[10px] px-3 py-2.5 rounded-xl outline-none focus:ring-1 focus:ring-[#C5A38E]" required />
                    <button className="bg-[#C5A38E] text-stone-900 px-4 py-2.5 rounded-xl text-[10px] font-bold hover:bg-[#A38572] transition-colors">Hinzufügen</button>
                  </div>
              </form>
            </div>

            <div className="bg-stone-900 text-white p-6 md:p-8 rounded-[2.5rem] shadow-xl flex flex-col transition-colors min-h-[280px]">
              <p className="text-[10px] uppercase font-bold text-[#C5A38E]/70 border-b border-stone-800 pb-3 mb-4">Alltag Ausgaben</p>
              <div className="flex-1 space-y-2 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-stone-800 mb-4">
                  {currentMonthExpenses.map(ex => (
                    <div key={ex.id} className="flex justify-between items-center text-[11px] text-stone-400 group">
                      <span className="truncate max-w-[120px]">{ex.title}</span>
                      <div className="flex items-center gap-2">
                          <span className="tabular-nums">€ {ex.amount.toFixed(0)}</span>
                          <form action={async () => { "use server"; await deleteExpense(ex.id); }}><button className="opacity-0 group-hover:opacity-100 text-stone-600 hover:text-rose-500 transition-all"><X size={12}/></button></form>
                      </div>
                    </div>
                  ))}
              </div>
              <form action={async (formData) => { "use server"; await addExpense(formData.get("title") as string, parseFloat(formData.get("amount") as string), formData.get("category") as string); }} className="mt-auto pt-4 border-t border-stone-800/50 flex flex-col gap-2">
                  <input name="title" placeholder="Tanken, Rewe..." className="w-full bg-stone-800 border-none text-[10px] px-3 py-2.5 rounded-xl outline-none focus:ring-1 focus:ring-[#C5A38E]" required />
                  <div className="flex gap-2">
                    <select name="category" className="w-[85px] bg-stone-800 border-none text-[10px] px-2 py-2.5 rounded-xl outline-none focus:ring-1 focus:ring-[#C5A38E]" required>
                      <option value="Lebensmittel">Essen</option>
                      <option value="Auto">Auto</option>
                      <option value="Haushalt">Haus</option>
                      <option value="Freizeit">Freizeit</option>
                      <option value="Allgemein">Allg.</option>
                    </select>
                    <input name="amount" type="number" step="0.01" placeholder="€" className="flex-1 bg-stone-800 border-none text-[10px] px-3 py-2.5 rounded-xl outline-none focus:ring-1 focus:ring-[#C5A38E]" required />
                    <button className="bg-[#C5A38E] text-stone-900 px-3 py-2.5 rounded-xl text-[10px] font-bold hover:bg-[#A38572] transition-colors">+</button>
                  </div>
              </form>
            </div>

        </section>

        <section className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-[2.5rem] p-6 md:p-8 shadow-sm transition-colors">
          <div className="flex items-center gap-2 mb-6">
            <PiggyBank size={20} className="text-[#C5A38E]" />
            <h2 className="text-xs font-bold uppercase tracking-widest text-stone-400">Sinking Funds & Wünsche</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-4">
              <h3 className="text-[10px] font-bold text-stone-500 uppercase tracking-widest border-b border-stone-100 dark:border-stone-800 pb-2">Gemeinsame Ziele</h3>
              {jointItems.length === 0 && <p className="text-xs text-stone-400 italic">Keine gemeinsamen Ziele aktiv.</p>}
              {jointItems.map(item => (
                <div key={item.id} className="bg-stone-50 dark:bg-stone-950 p-4 rounded-2xl border border-stone-100 dark:border-stone-800">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-sm leading-tight">{item.title}</span>
                    <form action={async () => { "use server"; await deleteBucketItem(item.id); }}>
                      <button className="text-stone-400 hover:text-rose-500 transition-colors"><Trash2 size={14} /></button>
                    </form>
                  </div>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-xs font-medium text-stone-500">€ {item.savedAmount} / {item.price}</span>
                    <span className="text-xs font-bold text-[#C5A38E]">{Math.round((item.savedAmount / item.price) * 100)}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-stone-200 dark:bg-stone-800 rounded-full overflow-hidden mb-4">
                    <div className="bg-[#C5A38E] h-full rounded-full transition-all duration-500" style={{ width: `${Math.min((item.savedAmount / item.price) * 100, 100)}%` }} />
                  </div>
                  <div className="flex gap-2">
                    <form action={async (formData) => { "use server"; await addFundsToItem(item.id, parseFloat(formData.get("amount") as string)); }} className="flex-1 flex gap-1">
                      <input name="amount" type="number" placeholder="+ €" className="w-16 h-8 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg text-xs text-center outline-none" required />
                      <button className="flex-1 bg-stone-900 dark:bg-stone-800 text-white rounded-lg text-xs font-bold shadow-sm">Save</button>
                    </form>
                    {item.savedAmount >= item.price && (
                      <form action={async () => { "use server"; await markItemCompleted(item.id); }}>
                        <button className="h-8 px-3 bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-sm flex items-center"><Check size={14} /></button>
                      </form>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <h3 className="text-[10px] font-bold text-stone-500 uppercase tracking-widest border-b border-stone-100 dark:border-stone-800 pb-2">Meine Wünsche</h3>
              {myIndividualItems.length === 0 && <p className="text-xs text-stone-400 italic">Keine eigenen Wünsche.</p>}
              {myIndividualItems.map(item => (
                <div key={item.id} className="bg-stone-50 dark:bg-stone-950 p-4 rounded-2xl border border-stone-100 dark:border-stone-800">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-sm leading-tight">{item.title}</span>
                    <form action={async () => { "use server"; await deleteBucketItem(item.id); }}>
                      <button className="text-stone-400 hover:text-rose-500 transition-colors"><Trash2 size={14} /></button>
                    </form>
                  </div>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-xs font-medium text-stone-500">Wartet auf Freigabe</span>
                    <span className="text-xs font-bold text-stone-400">€ {item.price}</span>
                  </div>
                  <div className="text-[10px] text-amber-600 dark:text-amber-500 flex items-center gap-1 mt-2">
                    <Timer size={12} /> Partner muss noch zustimmen
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <h3 className="text-[10px] font-bold text-stone-500 uppercase tracking-widest border-b border-stone-100 dark:border-stone-800 pb-2">Wünsche von Partner</h3>
              {partnerIndividualItems.length === 0 && <p className="text-xs text-stone-400 italic">Keine Wünsche ausstehend.</p>}
              {partnerIndividualItems.map(item => (
                <div key={item.id} className="bg-[#C5A38E]/10 border border-[#C5A38E]/20 p-4 rounded-2xl">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-sm leading-tight text-stone-800 dark:text-stone-200">{item.title}</span>
                    <span className="text-xs font-bold text-[#C5A38E]">€ {item.price}</span>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <form action={async () => { "use server"; await approveBucketItem(item.id); }} className="flex-1">
                      <button className="w-full h-8 bg-[#C5A38E] text-white rounded-lg text-xs font-bold shadow-sm flex items-center justify-center gap-1">
                        <ThumbsUp size={12} /> Zustimmen
                      </button>
                    </form>
                    <form action={async () => { "use server"; await deleteBucketItem(item.id); }}>
                      <button className="w-8 h-8 bg-white dark:bg-stone-900 border text-stone-400 hover:text-rose-500 rounded-lg flex items-center justify-center">
                        <X size={14} />
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-[2.5rem] p-6 shadow-sm flex flex-col h-[450px] transition-colors">
            <div className="flex items-center gap-2 mb-4">
              <ShoppingCart size={18} className="text-[#C5A38E]" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-stone-400">Vorratsschrank</h3>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
              {pantryItems.map(item => (
                <div key={item.id} className="flex justify-between items-center p-3 bg-stone-50 dark:bg-stone-800/50 rounded-2xl group transition-colors">
                  <div className="flex items-center gap-2">
                    <form action={async () => { "use server"; await deletePantryItem(item.id); }}>
                      <button className="opacity-0 group-hover:opacity-100 text-stone-400 hover:text-rose-500 transition-all"><Trash2 size={12}/></button>
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
                      <button className="w-8 h-8 bg-stone-900 dark:bg-stone-700 text-white rounded-lg text-xs shadow-sm hover:bg-stone-700 dark:hover:bg-stone-600 transition">✓</button>
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
                <button className="w-10 h-10 bg-[#C5A38E] text-white rounded-xl shadow-sm hover:bg-[#A38572] transition-colors"><Plus size={16} className="mx-auto" /></button>
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
                <details className="relative group/settings">
                  <summary className="list-none cursor-pointer text-stone-400 hover:text-stone-600"><Settings size={14} /></summary>
                  <div className="absolute right-0 top-6 w-48 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl p-3 shadow-xl z-20 transition-colors">
                    <p className="text-[10px] uppercase font-bold mb-2">Strom Vertrag</p>
                    <form action={async (formData) => { "use server"; await updateEnergySettings(parseFloat(formData.get("kwh") as string), parseFloat(formData.get("pre") as string)); }} className="space-y-2">
                      <div>
                        <label className="text-[9px] text-stone-500">Preis pro kWh (€)</label>
                        <input name="kwh" type="number" step="0.01" defaultValue={energySettings.kwhPrice} className="w-full bg-stone-100 dark:bg-stone-900 p-1.5 rounded text-xs outline-none" />
                      </div>
                      <div>
                        <label className="text-[9px] text-stone-500">Mtl. Abschlag (€)</label>
                        <input name="pre" type="number" defaultValue={energySettings.monthlyPrepayment} className="w-full bg-stone-100 dark:bg-stone-900 p-1.5 rounded text-xs outline-none" />
                      </div>
                      <button className="w-full bg-amber-500 text-white text-[10px] font-bold py-1.5 rounded hover:bg-amber-600 transition">Update</button>
                    </form>
                  </div>
                </details>
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

              <div className="space-y-2">
                {displayReadings.map(r => (
                  <div key={r.id} className="flex justify-between items-center text-sm border-b border-stone-100 dark:border-stone-800 pb-1 group">
                    <span className="text-stone-500 text-[10px]">{new Date(r.date).toLocaleDateString('de-DE', { month: 'short', day: '2-digit' })}</span>
                    <span className="font-bold tabular-nums text-xs">{r.value} kWh</span>
                    <form action={async () => { "use server"; await deleteEnergyReading(r.id); }}>
                      <button className="opacity-0 group-hover:opacity-100 text-stone-400 hover:text-rose-500 transition-opacity"><Trash2 size={10}/></button>
                    </form>
                  </div>
                ))}
              </div>
            </div>
            <form action={async (formData) => { "use server"; await addEnergyReading("STROM", parseFloat(formData.get("val") as string)); }} className="mt-4 flex gap-2">
              <input name="val" type="number" step="0.1" placeholder="Neuer Zählerstand..." className="flex-1 h-10 bg-stone-50 dark:bg-stone-950 px-3 rounded-xl text-xs outline-none" required />
              <button className="px-3 h-10 bg-amber-500 text-white rounded-xl text-xs font-bold">+</button>
            </form>
          </div>

          <div className="bg-stone-900 text-white rounded-[2.5rem] p-6 shadow-xl flex flex-col h-[400px] transition-colors">
            <div className="flex items-center gap-2 mb-4 text-[#C5A38E]">
              <Phone size={18} />
              <h3 className="text-xs font-bold uppercase tracking-widest">Shared Contacts</h3>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
              {contacts.length === 0 && <p className="text-xs text-stone-500 italic">Keine Kontakte gespeichert.</p>}
              {contacts.map(c => (
                <details key={c.id} className="group bg-stone-800 rounded-2xl border border-stone-700/50 overflow-hidden transition-colors">
                  <summary className="p-4 flex justify-between items-center cursor-pointer list-none hover:bg-stone-700/30 transition-colors">
                    <div>
                      <span className="text-[10px] font-bold text-[#C5A38E] uppercase tracking-wider">{c.role}</span>
                      <p className="text-sm font-bold">{c.name}</p>
                    </div>
                    <ChevronDown size={16} className="text-stone-500 group-open:rotate-180 transition-transform" />
                  </summary>
                  <div className="px-4 pb-4 pt-1 text-[11px] text-stone-300 space-y-2">
                    <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1">
                      <span className="font-bold text-stone-500">Tel:</span> <span>{c.phone || '-'}</span>
                      <span className="font-bold text-stone-500">Mail:</span> <span>{c.email || '-'}</span>
                    </div>
                    <form action={async () => { "use server"; await deleteSharedContact(c.id); }} className="pt-3 mt-2 border-t border-stone-700/50 flex justify-end">
                      <button className="text-rose-400 hover:text-rose-500 font-bold flex items-center gap-1 transition-colors"><Trash2 size={12}/> Löschen</button>
                    </form>
                  </div>
                </details>
              ))}
            </div>
            <form action={async (formData) => { "use server"; await addSharedContact(formData.get("n") as string, formData.get("r") as string, formData.get("p") as string, formData.get("e") as string); }} className="mt-4 grid grid-cols-2 gap-2">
              <input name="n" placeholder="Name" className="bg-stone-800 px-3 h-10 rounded-xl text-[10px] outline-none placeholder:text-stone-500" required />
              <input name="r" placeholder="Rolle (z.B. Vermieter)" className="bg-stone-800 px-3 h-10 rounded-xl text-[10px] outline-none placeholder:text-stone-500" required />
              <input name="p" placeholder="Telefon (optional)" className="bg-stone-800 px-3 h-10 rounded-xl text-[10px] outline-none placeholder:text-stone-500" />
              <input name="e" placeholder="E-Mail (optional)" className="bg-stone-800 px-3 h-10 rounded-xl text-[10px] outline-none placeholder:text-stone-500" />
              <button className="col-span-2 h-10 bg-[#C5A38E] hover:bg-[#A38572] text-white rounded-xl text-[10px] font-bold transition-colors">Kontakt hinzufügen</button>
            </form>
          </div>

        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-[2.5rem] p-6 shadow-sm flex flex-col h-[500px] transition-colors">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare size={18} className="text-[#C5A38E]" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-stone-400">Schwarzes Brett</h3>
            </div>
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
              {stickyNotes.length === 0 && <p className="text-xs text-stone-400 italic">Keine Notizen.</p>}
              {stickyNotes.map(note => (
                <div key={note.id} className="bg-stone-50 dark:bg-stone-800/40 p-4 rounded-3xl border border-stone-100 dark:border-stone-800 relative group transition-colors">
                  <div className="flex justify-between mb-2">
                    <span className="text-[10px] font-bold text-[#C5A38E]">{note.author}</span>
                    <form action={async () => { "use server"; await deleteStickyNote(note.id); }}><button className="opacity-0 group-hover:opacity-100 text-stone-300 hover:text-rose-500 transition-all"><X size={14}/></button></form>
                  </div>
                  {note.text && <p className="text-sm leading-relaxed">{note.text}</p>}
                  
                  {note.imageUrl && (
                    <div className="mt-3 relative group/img">
                      <a href={`#img-${note.id}`} className="block rounded-2xl overflow-hidden border border-stone-200 dark:border-stone-700 shadow-sm relative transition-all">
                        <img src={note.imageUrl} alt="Note" className="w-full h-auto max-h-48 object-cover" />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity">
                           <Maximize2 className="text-white" size={24} />
                        </div>
                      </a>
                      <div id={`img-${note.id}`} className="fixed inset-0 z-50 bg-black/90 hidden target:flex items-center justify-center p-4 transition-all duration-500">
                        <a href="#!" className="absolute top-6 right-6 text-white bg-white/20 p-2 rounded-full hover:bg-rose-500 transition-colors"><X size={24}/></a>
                        <img src={note.imageUrl} className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <form action={addStickyNote} className="mt-4 flex gap-2">
              <input name="text" placeholder="Notiz hinterlassen..." className="flex-1 h-12 bg-stone-50 dark:bg-stone-950 px-5 rounded-2xl outline-none text-sm focus:border-[#C5A38E] border border-transparent transition" />
              <label className="w-12 h-12 bg-stone-100 dark:bg-stone-800 rounded-2xl flex items-center justify-center cursor-pointer hover:bg-[#C5A38E] hover:text-white transition-all duration-300">
                <Camera size={20} /><input type="file" name="file" className="hidden" accept="image/*" />
              </label>
              <button className="px-6 h-12 bg-[#C5A38E] text-white rounded-2xl font-bold shadow-md hover:bg-[#A38572] transition-colors">Senden</button>
            </form>
          </div>

          <div className="bg-stone-900 text-white rounded-[2.5rem] p-8 shadow-2xl flex flex-col justify-between overflow-hidden relative transition-colors duration-500" 
               style={{ boxShadow: overallPueppiStatus === 3 ? '0 0 40px -5px rgba(239, 68, 68, 0.3)' : overallPueppiStatus === 2 ? '0 0 30px -5px rgba(245, 158, 11, 0.2)' : '0 10px 30px -10px rgba(0,0,0,0.5)' }}>
            
            <div className="flex justify-between items-start mb-6 relative z-10">
              <div className="flex items-center gap-4 text-[#C5A38E]">
                <PueppiIcon statusLevel={overallPueppiStatus} />
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-[0.3em]">Püppi Cares</h3>
                  <p className="text-[10px] text-stone-500 uppercase mt-1">Hygienestatus: <span className={getHygieneStatus(lastCleanBox1?.createdAt).color}>{getHygieneStatus(lastCleanBox1?.createdAt).text}</span></p>
                </div>
              </div>
              <div className="text-right flex flex-col items-end">
                <div className={`flex items-center gap-2 tabular-nums text-4xl font-light ${foodStatusLevel === 3 ? 'text-rose-500' : foodStatusLevel === 2 ? 'text-amber-500' : 'text-white'}`}>
                    {foodStatusLevel === 3 && <AlertTriangle className="w-6 h-6 animate-pulse" />}
                    {petFood.cans}
                </div>
                <p className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mt-1">Dosen im Vorrat</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6 relative z-10">
              <div className={`p-4 rounded-2xl border transition-colors ${getHygieneStatus(lastCleanBox1?.createdAt).bg}`}>
                <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">Haupt-Klo</span>
                    <form action={async () => { "use server"; await cleanLitterBox(1); }}>
                        <button className="h-9 w-9 bg-black/20 hover:bg-black/40 rounded-full flex items-center justify-center transition-colors text-white font-bold">✓</button>
                    </form>
                </div>
                <p className="text-[10px] text-stone-600 dark:text-stone-400 uppercase tracking-widest">Zuletzt: {lastCleanBox1 ? lastCleanBox1.createdAt.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : 'Unbekannt'}</p>
              </div>
              <div className={`p-4 rounded-2xl border transition-colors ${getHygieneStatus(lastCleanBox2?.createdAt).bg}`}>
                <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">Zweit-Klo</span>
                    <form action={async () => { "use server"; await cleanLitterBox(2); }}>
                        <button className="h-9 w-9 bg-black/20 hover:bg-black/40 rounded-full flex items-center justify-center transition-colors text-white font-bold">✓</button>
                    </form>
                </div>
                <p className="text-[10px] text-stone-600 dark:text-stone-400 uppercase tracking-widest">Zuletzt: {lastCleanBox2 ? lastCleanBox2.createdAt.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : 'Unbekannt'}</p>
              </div>
            </div>

            <div className="bg-stone-800/50 rounded-2xl p-4 mb-6 relative z-10 border border-stone-700/50">
              <p className="text-[10px] uppercase font-bold text-stone-500 mb-2">Gesundheit & Termine</p>
              <div className="space-y-2 mb-3">
                {healthEvents.length === 0 && <p className="text-[10px] text-stone-500 italic">Keine anstehenden Termine.</p>}
                {healthEvents.map(he => (
                  <div key={he.id} className="flex justify-between items-center text-xs group">
                    <span className="font-bold text-stone-300">{he.title}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-[#C5A38E]">{he.dueDate.toLocaleDateString('de-DE')}</span>
                      <form action={async () => { "use server"; await deleteHealthEvent(he.id); }}><button className="opacity-0 group-hover:opacity-100 text-rose-500"><Trash2 size={10}/></button></form>
                    </div>
                  </div>
                ))}
              </div>
              <form action={async (formData) => { "use server"; await addHealthEvent(formData.get("title") as string, formData.get("date") as string); }} className="flex gap-2">
                <input name="title" placeholder="Impfung, Tierarzt..." className="flex-1 bg-stone-900 px-3 py-2 rounded-xl text-[10px] outline-none border border-transparent focus:border-[#C5A38E]" required />
                <input name="date" type="date" className="w-24 bg-stone-900 px-3 py-2 rounded-xl text-[10px] outline-none border border-transparent focus:border-[#C5A38E]" required />
                <button className="bg-white/10 hover:bg-white/20 text-white px-3 rounded-xl text-[10px] transition-colors">+</button>
              </form>
            </div>

            <div className="flex gap-2 relative z-10">
              <form action={consumePetFood} className="flex-1"><button className="w-full h-12 bg-stone-800/80 rounded-2xl text-xs font-bold hover:bg-rose-500/20 hover:text-rose-500 transition-colors duration-300">-1 Dose</button></form>
              <form action={async () => { "use server"; await addPetFood(6); }} className="flex-1"><button className="w-full h-12 bg-[#C5A38E] text-stone-900 rounded-2xl text-xs font-bold hover:bg-[#A38572] transition-colors duration-300">+6 Dosen</button></form>
            </div>
          </div>

        </section>

      </main>
      
      <div className="fixed bottom-6 left-0 right-0 px-4 pointer-events-none z-50 flex justify-center">
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

            <button className="w-12 h-12 bg-[#C5A38E] text-white rounded-2xl shadow-md flex items-center justify-center hover:bg-[#A38572] transition-colors"><Plus size={24}/></button>
          </div>
        </form>
      </div>

    </div>
  );
}