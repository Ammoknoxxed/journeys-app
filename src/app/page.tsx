// src/app/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { 
  addBucketItem, approveBucketItem, deleteBucketItem, 
  addExpense, deleteExpense, addFundsToItem, markItemCompleted,
  addStickyNote, deleteStickyNote, consumePetFood, addPetFood,
  cleanLitterBox, addHealthEvent, deleteHealthEvent,
  updatePantryCount, addPantryItem, deletePantryItem,
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
  Trash2, ThumbsUp, ChevronDown, Settings, Maximize2
} from "lucide-react";

// --- HILFSFUNKTIONEN ---
function getHygieneStatus(lastCleanAt?: Date | null) {
  if (!lastCleanAt) return { text: "Nie", color: "text-rose-500", bg: "bg-rose-500/10 border-rose-500/20" };
  const hours = (new Date().getTime() - lastCleanAt.getTime()) / (1000 * 60 * 60);
  if (hours < 12) return { text: "Frisch", color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/20" };
  if (hours < 24) return { text: "Okay", color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/20" };
  return { text: "Kritisch", color: "text-rose-500", bg: "bg-rose-500/10 border-rose-500/20 animate-pulse" };
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  // --- DATEN ABRUFEN ---
  const allUsers = await prisma.user.findMany();
  const currentUser = allUsers.find(u => u.email === session.user?.email);
  const partner = allUsers.find(u => u.email !== session.user?.email);
  const obligations = await prisma.financialObligation.findMany();
  const openShoppingItemsCount = await prisma.shoppingItem.count({ where: { checked: false } });
  
  let petFood = await prisma.petFood.findFirst();
  if (!petFood) petFood = await prisma.petFood.create({ data: { cans: 10 } });
  const stickyNotes = await prisma.stickyNote.findMany({ orderBy: { createdAt: 'desc' }, take: 10 });
  const lastCleanBox1 = await prisma.litterBoxLog.findFirst({ where: { boxId: 1 }, orderBy: { createdAt: 'desc' } });
  const lastCleanBox2 = await prisma.litterBoxLog.findFirst({ where: { boxId: 2 }, orderBy: { createdAt: 'desc' } });
  
  const pantryItems = await prisma.pantryItem.findMany({ orderBy: { name: 'asc' } });
  const energyReadings = await prisma.energyReading.findMany({ orderBy: { date: 'asc' } }); // Aufsteigend für Berechnung
  let energySettings = await prisma.energySettings.findFirst();
  if (!energySettings) energySettings = await prisma.energySettings.create({ data: { kwhPrice: 0.35, monthlyPrepayment: 80 } });

  const contacts = await prisma.sharedContact.findMany({ orderBy: { role: 'asc' } });
  const nextTrip = await prisma.trip.findFirst({ where: { date: { gte: new Date() } }, orderBy: { date: 'asc' } });

  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const expenses = await prisma.expense.findMany({
    where: { date: { gte: startOfMonth } },
    include: { user: true },
    orderBy: { date: 'desc' }
  });

  const allItems = await prisma.bucketItem.findMany({
    include: { creator: true, approver: true },
    orderBy: { createdAt: 'desc' }
  });

  // --- ENERGY MATH ---
  let energyForecast = null;
  let energyDifference = 0;
  if (energyReadings.length >= 2) {
    const firstReading = energyReadings[0];
    const lastReading = energyReadings[energyReadings.length - 1];
    
    const daysDiff = (lastReading.date.getTime() - firstReading.date.getTime()) / (1000 * 3600 * 24);
    if (daysDiff > 0) {
      const kwhConsumed = lastReading.value - firstReading.value;
      const dailyKwh = kwhConsumed / daysDiff;
      const projectedYearlyKwh = dailyKwh * 365;
      
      const projectedYearlyCost = projectedYearlyKwh * energySettings.kwhPrice;
      const yearlyPrepayments = energySettings.monthlyPrepayment * 12;
      
      energyDifference = yearlyPrepayments - projectedYearlyCost; // Positiv = Gutschrift, Negativ = Nachzahlung
      energyForecast = { projectedYearlyCost, yearlyPrepayments, difference: energyDifference };
    }
  }
  const displayReadings = [...energyReadings].reverse().slice(0, 5); // Für Anzeige nur die letzten 5

  // --- MATHEMATIK & LOGIK ---
  const myIncome = currentUser?.netIncome || 0;
  const partnerIncome = partner?.netIncome || 0;
  const totalIncome = myIncome + partnerIncome;
  const totalFixed = obligations.reduce((sum, ob) => sum + ob.amount, 0);
  const totalVariable = expenses.reduce((sum, ex) => sum + ex.amount, 0);
  const freeCashflow = totalIncome - totalFixed - totalVariable;

  const mySharePct = totalIncome > 0 ? (myIncome / totalIncome) : 0.5;
  const partnerSharePct = 1 - mySharePct;
  const myFairCost = totalFixed * mySharePct;
  const partnerFairCost = totalFixed * partnerSharePct;

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const weeklyExpenses = expenses.filter(e => e.date >= sevenDaysAgo).reduce((sum, e) => sum + e.amount, 0);
  const choresDoneThisWeek = await prisma.chore.count({ where: { lastDoneAt: { gte: sevenDaysAgo } } });
  const daysUntilTrip = nextTrip ? Math.ceil((nextTrip.date.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null;

  const activeItems = allItems.filter(i => !i.isCompleted);
  const jointItems = activeItems.filter(i => i.approverId !== null);
  const myIndividualItems = activeItems.filter(i => i.creatorId === currentUser?.id && i.approverId === null);
  const partnerIndividualItems = activeItems.filter(i => i.creatorId === partner?.id && i.approverId === null);

  const apps = [
    { title: "Smart Home", icon: <LayoutDashboard size={24} />, href: "/smarthome", color: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-500" },
    { title: "Abos", icon: <TrendingUp size={24} />, href: "/subscriptions", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-500" },
    { title: "Shopping", icon: <ShoppingCart size={24} />, href: "/shopping", badge: openShoppingItemsCount, color: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-500" },
    { title: "Putzplan", icon: <CheckCircle2 size={24} />, href: "/chores", color: "bg-stone-200 text-stone-700 dark:bg-stone-500/20 dark:text-stone-400" },
    { title: "Meal Prep", icon: <Utensils size={24} />, href: "/mealprep", color: "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-500" },
    { title: "Date Night", icon: <Heart size={24} />, href: "/roulette", color: "bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-500" },
    { title: "Weltkarte", icon: <Map size={24} />, href: "/map", color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-500" },
    { title: "Home Wiki", icon: <BookOpen size={24} />, href: "/wiki", color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-500" },
    { title: "Gifts", icon: <Lock size={24} />, href: "/gifts", color: "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-500" },
    { title: "Timeline", icon: <Calendar size={24} />, href: "/timeline", color: "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-500" },
    { title: "Check-In", icon: <ClipboardList size={24} />, href: "/checkin", color: "bg-lime-100 text-lime-700 dark:bg-lime-500/20 dark:text-lime-500" },
    { title: "Tresor", icon: <Wallet size={24} />, href: "/vault", color: "bg-stone-300 text-stone-800 dark:bg-stone-700/50 dark:text-stone-300" },
  ];

  return (
    <div className="min-h-screen bg-[#FDFCFB] dark:bg-stone-950 text-stone-900 dark:text-stone-100 pb-40 font-sans selection:bg-[#C5A38E]/30">
      
      {/* HEADER */}
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
        
        {/* RECAP & COUNTDOWN ROW */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 p-6 rounded-[2.5rem] flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 mb-1">
                <Star size={16} />
                <span className="text-[10px] font-bold uppercase tracking-widest">Weekly Recap</span>
              </div>
              <p className="text-sm font-medium">Gemeinsam {choresDoneThisWeek} Aufgaben erledigt & € {weeklyExpenses.toFixed(0)} investiert.</p>
            </div>
            <TrendingUp size={24} className="text-emerald-500" />
          </div>

          <div className="bg-[#C5A38E] text-white p-6 rounded-[2.5rem] flex items-center justify-between shadow-lg relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center gap-2 opacity-80 mb-1">
                <Timer size={16} />
                <span className="text-[10px] font-bold uppercase tracking-widest">
                  Trip: {nextTrip?.destination || 'Nächster Halt...'}
                </span>
              </div>
              <p className="text-2xl font-light">{daysUntilTrip !== null ? `Noch ${daysUntilTrip} Tage!` : 'Plane einen Trip in der Weltkarte'}</p>
            </div>
            <Map size={48} className="opacity-20 absolute -right-4 -bottom-4" />
          </div>
        </section>

        {/* APP DRAWER */}
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

        {/* FINANCE BENTO */}
        <section className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-7 lg:col-span-8 bg-stone-900 text-white p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[220px]">
            <div className="relative z-10">
              <p className="text-xs uppercase tracking-widest font-bold text-stone-500 mb-2">Haushalts-Cashflow</p>
              <h2 className="text-5xl md:text-6xl font-light tracking-tighter tabular-nums text-[#C5A38E]">€ {freeCashflow.toLocaleString('de-DE', { maximumFractionDigits: 0 })}</h2>
            </div>
            <div className="relative z-10 mt-6 pt-6 border-t border-stone-800 flex flex-col sm:flex-row justify-between gap-6">
              <div>
                <p className="text-[10px] uppercase font-bold text-stone-500">Dein Netto-Einkommen</p>
                <form action={async (formData) => { "use server"; await updateNetIncome(parseFloat(formData.get("income") as string)); }} className="flex items-center gap-2 mt-2">
                  <input name="income" type="number" placeholder={`€ ${currentUser?.netIncome}`} className="w-24 px-3 py-2 bg-stone-800 rounded-xl outline-none text-sm font-medium border border-transparent focus:border-[#C5A38E]" required />
                  <button className="bg-[#C5A38E] text-stone-900 px-3 py-2 rounded-xl text-xs font-bold hover:bg-[#A38572] transition-colors">Save</button>
                </form>
              </div>
              <div className="flex flex-col justify-end text-right">
                <span className="text-[10px] uppercase font-bold text-stone-500">Fixkosten Gesamt</span>
                <span className="text-xl font-bold tracking-tight">€ {totalFixed}</span>
              </div>
            </div>
          </div>

          <div className="md:col-span-5 lg:col-span-4 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-8 rounded-[2.5rem] shadow-sm flex flex-col justify-center gap-6">
            <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest">Fair Share Split</h3>
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

        {/* SINKING FUNDS / WÜNSCHE */}
        <section className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-[2.5rem] p-6 md:p-8 shadow-sm">
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

        {/* OPERATION MODULES GRID */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          
          {/* VORRATSSCHRANK */}
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-[2.5rem] p-6 shadow-sm flex flex-col h-[400px]">
            <div className="flex items-center gap-2 mb-4">
              <ShoppingCart size={18} className="text-[#C5A38E]" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-stone-400">Vorratsschrank</h3>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
              {pantryItems.map(item => (
                <div key={item.id} className="flex justify-between items-center p-3 bg-stone-50 dark:bg-stone-800/50 rounded-2xl group">
                  <div className="flex items-center gap-2">
                    <form action={async () => { "use server"; await deletePantryItem(item.id); }}>
                      <button className="opacity-0 group-hover:opacity-100 text-stone-400 hover:text-rose-500 transition-opacity"><Trash2 size={12}/></button>
                    </form>
                    <span className={`text-sm ${item.count <= item.minCount ? 'text-rose-500 font-bold' : ''}`}>{item.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold tabular-nums">{item.count}</span>
                    <div className="flex gap-1">
                      <form action={async () => { "use server"; await updatePantryCount(item.id, -1); }}><button className="w-8 h-8 bg-white dark:bg-stone-800 rounded-lg text-xs shadow-sm">-</button></form>
                      <form action={async () => { "use server"; await updatePantryCount(item.id, 1); }}><button className="w-8 h-8 bg-stone-900 dark:bg-stone-700 text-white rounded-lg text-xs shadow-sm">+</button></form>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <form action={async (formData) => { "use server"; await addPantryItem(formData.get("name") as string); }} className="mt-4 flex gap-2">
              <input name="name" placeholder="Hinzufügen..." className="flex-1 h-10 bg-stone-50 dark:bg-stone-950 px-4 rounded-xl text-xs outline-none" required />
              <button className="w-10 h-10 bg-[#C5A38E] text-white rounded-xl shadow-sm"><Plus size={16} className="mx-auto" /></button>
            </form>
          </div>

          {/* ENERGY RADAR WITH MATH */}
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-[2.5rem] p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-amber-500">
                  <Zap size={18} />
                  <h3 className="text-xs font-bold uppercase tracking-widest text-stone-400">Energy Radar</h3>
                </div>
                {/* SETTINGS BUTTON */}
                <details className="relative group/settings">
                  <summary className="list-none cursor-pointer text-stone-400 hover:text-stone-600"><Settings size={14} /></summary>
                  <div className="absolute right-0 top-6 w-48 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl p-3 shadow-xl z-20">
                    <p className="text-[10px] uppercase font-bold mb-2">Strom Vertrag</p>
                    <form action={async (formData) => { "use server"; await updateEnergySettings(parseFloat(formData.get("kwh") as string), parseFloat(formData.get("pre") as string)); }} className="space-y-2">
                      <div>
                        <label className="text-[9px] text-stone-500">Preis pro kWh (€)</label>
                        <input name="kwh" type="number" step="0.01" defaultValue={energySettings.kwhPrice} className="w-full bg-stone-100 dark:bg-stone-900 p-1.5 rounded text-xs" />
                      </div>
                      <div>
                        <label className="text-[9px] text-stone-500">Mtl. Abschlag (€)</label>
                        <input name="pre" type="number" defaultValue={energySettings.monthlyPrepayment} className="w-full bg-stone-100 dark:bg-stone-900 p-1.5 rounded text-xs" />
                      </div>
                      <button className="w-full bg-amber-500 text-white text-[10px] font-bold py-1.5 rounded">Update</button>
                    </form>
                  </div>
                </details>
              </div>

              {/* NACHZAHLUNG ODER RÜCKZAHLUNG ANZEIGE */}
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

          {/* SHARED CONTACTS (ACCORDION) */}
          <div className="bg-stone-900 text-white rounded-[2.5rem] p-6 shadow-xl flex flex-col h-[400px]">
            <div className="flex items-center gap-2 mb-4 text-[#C5A38E]">
              <Phone size={18} />
              <h3 className="text-xs font-bold uppercase tracking-widest">Shared Contacts</h3>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
              {contacts.length === 0 && <p className="text-xs text-stone-500 italic">Keine Kontakte gespeichert.</p>}
              {contacts.map(c => (
                <details key={c.id} className="group bg-stone-800 rounded-2xl border border-stone-700/50 overflow-hidden">
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
              <input name="n" placeholder="Name" className="bg-stone-800 px-3 h-10 rounded-xl text-[10px] outline-none" required />
              <input name="r" placeholder="Rolle (z.B. Vermieter)" className="bg-stone-800 px-3 h-10 rounded-xl text-[10px] outline-none" required />
              <input name="p" placeholder="Telefon (optional)" className="bg-stone-800 px-3 h-10 rounded-xl text-[10px] outline-none" />
              <input name="e" placeholder="E-Mail (optional)" className="bg-stone-800 px-3 h-10 rounded-xl text-[10px] outline-none" />
              <button className="col-span-2 h-10 bg-[#C5A38E] text-white rounded-xl text-[10px] font-bold">Kontakt hinzufügen</button>
            </form>
          </div>

        </section>

        {/* SOCIAL & CARE ROW */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          
          {/* SCHWARZES BRETT MIT BILDER-MODAL */}
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-[2.5rem] p-6 shadow-sm flex flex-col h-[500px]">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare size={18} className="text-[#C5A38E]" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-stone-400">Schwarzes Brett</h3>
            </div>
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
              {stickyNotes.length === 0 && <p className="text-xs text-stone-400 italic">Keine Notizen.</p>}
              {stickyNotes.map(note => (
                <div key={note.id} className="bg-stone-50 dark:bg-stone-800/40 p-4 rounded-3xl border border-stone-100 dark:border-stone-800 relative group">
                  <div className="flex justify-between mb-2">
                    <span className="text-[10px] font-bold text-[#C5A38E]">{note.author}</span>
                    <form action={async () => { "use server"; await deleteStickyNote(note.id); }}><button className="opacity-0 group-hover:opacity-100 text-stone-300 hover:text-rose-500 transition-all"><X size={14}/></button></form>
                  </div>
                  {note.text && <p className="text-sm">{note.text}</p>}
                  
                  {/* Der geniale HTML-Hack für Vollbild-Bilder */}
                  {note.imageUrl && (
                    <div className="mt-3 relative group/img">
                      <a href={`#img-${note.id}`} className="block rounded-2xl overflow-hidden border border-stone-200 dark:border-stone-700 shadow-sm relative">
                        <img src={note.imageUrl} alt="Note" className="w-full h-auto max-h-48 object-cover" />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity">
                           <Maximize2 className="text-white" size={24} />
                        </div>
                      </a>
                      {/* CSS Modal Target */}
                      <div id={`img-${note.id}`} className="fixed inset-0 z-50 bg-black/90 hidden target:flex items-center justify-center p-4">
                        <a href="#!" className="absolute top-6 right-6 text-white bg-white/20 p-2 rounded-full hover:bg-rose-500 transition-colors"><X size={24}/></a>
                        <img src={note.imageUrl} className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <form action={addStickyNote} className="mt-4 flex gap-2">
              <input name="text" placeholder="Notiz hinterlassen..." className="flex-1 h-12 bg-stone-50 dark:bg-stone-950 px-5 rounded-2xl outline-none text-sm" />
              <label className="w-12 h-12 bg-stone-100 dark:bg-stone-800 rounded-2xl flex items-center justify-center cursor-pointer hover:bg-[#C5A38E] hover:text-white transition-all">
                <Camera size={20} /><input type="file" name="file" className="hidden" />
              </label>
              <button className="px-6 h-12 bg-[#C5A38E] text-white rounded-2xl font-bold shadow-md">Senden</button>
            </form>
          </div>

          {/* PÜPPI CARE CENTER */}
          <div className="bg-stone-900 text-white rounded-[2.5rem] p-8 shadow-2xl flex flex-col justify-between overflow-hidden relative">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-3 text-[#C5A38E]">
                <Cat size={28} />
                <h3 className="text-sm font-bold uppercase tracking-[0.2em]">Püppi Care</h3>
              </div>
              <div className="text-right">
                <p className="text-4xl font-light text-white">{petFood.cans}</p>
                <p className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Dosen</p>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <p className="text-[10px] uppercase font-bold text-stone-600 tracking-widest">Hygiene Monitoring</p>
              <div className={`flex justify-between items-center p-4 rounded-2xl border ${getHygieneStatus(lastCleanBox1?.createdAt).bg}`}>
                <span className="text-sm font-bold">Haupt-Klo</span>
                <form action={async () => { "use server"; await cleanLitterBox(1); }}><button className="h-10 w-10 bg-white/10 rounded-xl hover:bg-white/20 flex items-center justify-center">✓</button></form>
              </div>
              <div className={`flex justify-between items-center p-4 rounded-2xl border ${getHygieneStatus(lastCleanBox2?.createdAt).bg}`}>
                <span className="text-sm font-bold">Zweit-Klo</span>
                <form action={async () => { "use server"; await cleanLitterBox(2); }}><button className="h-10 w-10 bg-white/10 rounded-xl hover:bg-white/20 flex items-center justify-center">✓</button></form>
              </div>
            </div>

            <div className="flex gap-2">
              <form action={consumePetFood} className="flex-1"><button className="w-full h-12 bg-stone-800 rounded-2xl text-xs font-bold hover:bg-rose-500/20">-1 Dose</button></form>
              <form action={async () => { "use server"; await addPetFood(6); }} className="flex-1"><button className="w-full h-12 bg-[#C5A38E] text-stone-900 rounded-2xl text-xs font-bold hover:bg-[#A38572]">+6 Dosen</button></form>
            </div>
            <Cat size={120} className="absolute -right-12 -bottom-12 opacity-5 pointer-events-none rotate-12" />
          </div>

        </section>

      </main>
      
      {/* IOS DYNAMIC BAR */}
      <div className="fixed bottom-6 left-0 right-0 px-4 pointer-events-none z-50 flex justify-center">
        <form action={async (formData) => { 
          "use server"; 
          await addBucketItem(formData.get("title") as string, parseFloat(formData.get("price") as string) || 0, formData.get("isSurprise") === "on"); 
        }} className="w-full max-w-md bg-white/95 dark:bg-stone-900/95 backdrop-blur-xl p-4 rounded-[2.5rem] shadow-2xl border border-stone-200/50 pointer-events-auto flex flex-col gap-3">
          <div className="flex gap-2">
            <input name="title" placeholder="Wunsch hinzufügen..." className="flex-1 h-12 bg-stone-100/50 dark:bg-black/20 px-5 rounded-2xl outline-none text-sm" required />
            <input name="price" type="number" placeholder="€" className="w-20 h-12 bg-stone-100/50 dark:bg-black/20 rounded-2xl outline-none text-center text-sm" />
            <button className="w-12 h-12 bg-[#C5A38E] text-white rounded-2xl shadow-md flex items-center justify-center hover:bg-[#A38572]"><Plus size={24}/></button>
          </div>
        </form>
      </div>

    </div>
  );
}