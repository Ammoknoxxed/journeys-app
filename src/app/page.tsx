// src/app/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { 
  addBucketItem, approveBucketItem, deleteBucketItem, 
  addExpense, deleteExpense, addFundsToItem, markItemCompleted,
  addStickyNote, deleteStickyNote, consumePetFood, addPetFood,
  cleanLitterBox, addHealthEvent, deleteHealthEvent
} from "@/lib/actions";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import Image from "next/image";
import { 
  LayoutDashboard, Wallet, ShoppingCart, Utensils, 
  Map, Heart, Lock, BookOpen, Calendar,
  Cat, CheckCircle2, TrendingUp, PiggyBank, ClipboardList,
  Plus, X, Check, Camera, MessageSquare
} from "lucide-react";

// --- DYNAMISCHE GIMMICKS ---
function getRandomGreeting() {
  const hour = new Date().getHours();
  const morningGreetings = ["Guten Morgen", "Zeit für den ersten Kaffee", "Rise and shine", "System online"];
  const dayGreetings = ["Guten Tag", "Willkommen im HQ", "Management-Konsole aktiv", "Läuft alles nach Plan?"];
  const eveningGreetings = ["Guten Abend", "Zeit zum Abschalten", "Feierabend-Modus aktiviert", "Tagesziele erreicht?"];
  let selection = dayGreetings;
  if (hour < 12) selection = morningGreetings;
  else if (hour > 18) selection = eveningGreetings;
  return selection[Math.floor(Math.random() * selection.length)];
}

function getRandomCatStatus() {
  const names = ["Mäusschen", "Püppi", "Puppi", "Mietze", "Fratzratz"];
  const statuses = [
    { text: "Zufrieden", color: "text-emerald-500" },
    { text: "Schläft tief", color: "text-emerald-500" },
    { text: "Hungrig", color: "text-amber-500" },
    { text: "Plant Unfug", color: "text-rose-500" },
    { text: "Auf Patrouille", color: "text-blue-500" },
    { text: "Schnurrt", color: "text-emerald-500" }
  ];
  return { 
    name: names[Math.floor(Math.random() * names.length)], 
    status: statuses[Math.floor(Math.random() * statuses.length)] 
  };
}

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
  
  // Püppi & Schwarzes Brett Daten
  let petFood = await prisma.petFood.findFirst();
  if (!petFood) petFood = await prisma.petFood.create({ data: { cans: 10 } });
  const stickyNotes = await prisma.stickyNote.findMany({ orderBy: { createdAt: 'desc' }, take: 10 });
  const lastCleanBox1 = await prisma.litterBoxLog.findFirst({ where: { boxId: 1 }, orderBy: { createdAt: 'desc' } });
  const lastCleanBox2 = await prisma.litterBoxLog.findFirst({ where: { boxId: 2 }, orderBy: { createdAt: 'desc' } });
  const healthEvents = await prisma.petHealthEvent.findMany({ orderBy: { dueDate: 'asc' } });

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

  // --- MATHEMATIK & FAIR SHARE ---
  const myIncome = currentUser?.netIncome || 0;
  const partnerIncome = partner?.netIncome || 0;
  const totalIncome = myIncome + partnerIncome;
  const totalExpenses = obligations.reduce((sum, ob) => sum + ob.amount, 0);
  const totalVariable = expenses.reduce((sum, ex) => sum + ex.amount, 0);
  const freeCashflow = totalIncome - totalExpenses - totalVariable;

  const mySharePct = totalIncome > 0 ? (myIncome / totalIncome) : 0.5;
  const partnerSharePct = 1 - mySharePct;
  const myFairCost = totalExpenses * mySharePct;
  const partnerFairCost = totalExpenses * partnerSharePct;

  // --- BUCKETLIST FILTER ---
  const activeItems = allItems.filter(i => !i.isCompleted);
  const jointItems = activeItems.filter(i => i.approverId !== null);
  const myIndividualItems = activeItems.filter(i => i.creatorId === currentUser?.id && i.approverId === null);
  const partnerIndividualItems = activeItems.filter(i => i.creatorId === partner?.id && i.approverId === null);

  const greeting = getRandomGreeting();
  const catGimmick = getRandomCatStatus();

  // App Drawer
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
    <div className="min-h-screen bg-[#FDFCFB] dark:bg-stone-950 text-stone-900 dark:text-stone-100 pb-40 selection:bg-[#C5A38E]/30 font-sans">
      
      {/* 1. COMPACT HEADER */}
      <header className="sticky top-0 z-40 bg-[#FDFCFB]/80 dark:bg-stone-950/80 backdrop-blur-xl border-b border-stone-200/50 dark:border-stone-800/50 px-4 md:px-8 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            Die Höhle <span className="text-[#C5A38E] font-light">HQ</span>
          </h1>
          <p className="text-[10px] md:text-xs text-stone-500 uppercase tracking-widest">{greeting}, {currentUser?.name}.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-stone-100 dark:bg-stone-900 rounded-full border border-stone-200 dark:border-stone-800">
            <Cat size={14} className="text-[#C5A38E]" />
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">
              {catGimmick.name}: <span className={catGimmick.status.color}>{catGimmick.status.text}</span>
            </span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 md:px-8 mt-6 md:mt-10 space-y-8 md:space-y-12">
        
        {/* 2. THE APP DRAWER */}
        <section>
          <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-y-6 gap-x-2">
            {apps.map((app) => (
              <Link key={app.title} href={app.href} className="group flex flex-col items-center gap-2 relative">
                <div className={`w-14 h-14 md:w-16 md:h-16 ${app.color} rounded-[1.25rem] flex items-center justify-center shadow-sm group-hover:scale-105 group-active:scale-95 transition-all duration-200`}>
                  {app.icon}
                  {app.badge ? (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-[#FDFCFB] dark:border-stone-950 shadow-sm">
                      {app.badge}
                    </div>
                  ) : null}
                </div>
                <span className="text-[10px] font-medium text-stone-600 dark:text-stone-400 text-center leading-tight px-1">
                  {app.title}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* 3. FINANCE BENTO BOX */}
        <section className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-7 lg:col-span-8 bg-[#C5A38E] text-white p-6 md:p-8 rounded-3xl shadow-lg relative overflow-hidden flex flex-col justify-between min-h-[200px]">
            <div className="relative z-10">
              <p className="text-xs uppercase tracking-widest font-bold opacity-80 mb-2">Haushalts-Cashflow</p>
              <h2 className="text-5xl md:text-6xl font-light tracking-tighter tabular-nums">€ {freeCashflow.toLocaleString('de-DE', { maximumFractionDigits: 0 })}</h2>
            </div>
            
            <div className="relative z-10 mt-6 pt-4 border-t border-white/20 flex flex-col sm:flex-row justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase font-bold opacity-80">Dein Netto-Einkommen</p>
                <form action={async (formData) => { 
                  "use server"; 
                  const raw = formData.get("income") as string;
                  if (!raw) return;
                  const parsed = Math.abs(parseFloat(raw.replace(/\./g, '').replace(',', '.')));
                  if (!isNaN(parsed) && currentUser) {
                    await prisma.user.update({ where: { id: currentUser.id }, data: { netIncome: parsed } });
                    revalidatePath("/");
                  }
                }} className="flex items-center gap-2 mt-1">
                  <input name="income" type="text" inputMode="decimal" placeholder={`€ ${currentUser?.netIncome}`} className="w-24 px-2 py-1.5 bg-black/10 rounded-lg outline-none placeholder:text-white/60 text-sm font-medium border border-transparent focus:border-white/30 transition-colors" required />
                  <button className="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">Save</button>
                </form>
              </div>
              <div className="flex flex-col justify-end">
                <span className="text-[10px] uppercase font-bold opacity-80 text-right">Fixkosten Gesamt</span>
                <span className="text-lg font-bold text-right tracking-tight">€ {totalExpenses}</span>
              </div>
            </div>
            <div className="absolute -right-10 -top-10 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl pointer-events-none"></div>
          </div>

          <div className="md:col-span-5 lg:col-span-4 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-6 md:p-8 rounded-3xl flex flex-col justify-center gap-6 shadow-sm">
            <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest">Fair Share Verteilung</h3>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="font-bold text-stone-700 dark:text-stone-200">{currentUser?.name}</span>
                <span className="text-stone-500 font-medium">Soll: € {myFairCost.toFixed(0)}</span>
              </div>
              <div className="h-2 w-full bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                <div className="bg-stone-800 dark:bg-stone-500 h-full rounded-full" style={{ width: `${mySharePct * 100}%` }}></div>
              </div>
              <p className="text-[10px] text-stone-400 mt-1 text-right">{(mySharePct * 100).toFixed(0)}% Anteil</p>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="font-bold text-[#C5A38E]">{partner?.name || 'Partner'}</span>
                <span className="text-stone-500 font-medium">Soll: € {partnerFairCost.toFixed(0)}</span>
              </div>
              <div className="h-2 w-full bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                <div className="bg-[#C5A38E] h-full rounded-full" style={{ width: `${partnerSharePct * 100}%` }}></div>
              </div>
              <p className="text-[10px] text-stone-400 mt-1 text-right">{(partnerSharePct * 100).toFixed(0)}% Anteil</p>
            </div>
          </div>
        </section>

        {/* 4. DAILY OPERATIONS & NEW MODULES */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          
          {/* Püppis Care Center (Science Edition) */}
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between text-stone-100 h-auto">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2 text-[#C5A38E]">
                <Cat size={20} />
                <h3 className="text-xs font-bold uppercase tracking-widest">Püppi's Care Center</h3>
              </div>
              <div className="text-right">
                <p className="text-2xl font-light">{petFood.cans}</p>
                <p className="text-[8px] uppercase tracking-widest text-stone-500 font-bold">Dosen</p>
              </div>
            </div>

            {/* Hygiene Tracking (Die 2 Katzenklos) */}
            <div className="space-y-2 mb-6">
              <p className="text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-2">Hygiene-Status (N+1)</p>
              
              <div className={`flex justify-between items-center p-3 rounded-2xl border ${getHygieneStatus(lastCleanBox1?.createdAt).bg} transition-colors`}>
                <div>
                  <p className="text-xs font-bold">Haupt-Klo</p>
                  <p className="text-[10px] text-stone-400 mt-0.5">Zuletzt: {lastCleanBox1 ? new Date(lastCleanBox1.createdAt).toLocaleTimeString('de-DE', {hour: '2-digit', minute:'2-digit'}) + ' von ' + lastCleanBox1.cleanedBy : 'Unbekannt'}</p>
                </div>
                <form action={async () => { "use server"; await cleanLitterBox(1); }}>
                  <button className="bg-stone-800 hover:bg-stone-700 text-white w-10 h-10 rounded-xl flex items-center justify-center shadow-sm active:scale-95 transition-all">✓</button>
                </form>
              </div>

              <div className={`flex justify-between items-center p-3 rounded-2xl border ${getHygieneStatus(lastCleanBox2?.createdAt).bg} transition-colors`}>
                <div>
                  <p className="text-xs font-bold">Zweit-Klo</p>
                  <p className="text-[10px] text-stone-400 mt-0.5">Zuletzt: {lastCleanBox2 ? new Date(lastCleanBox2.createdAt).toLocaleTimeString('de-DE', {hour: '2-digit', minute:'2-digit'}) + ' von ' + lastCleanBox2.cleanedBy : 'Unbekannt'}</p>
                </div>
                <form action={async () => { "use server"; await cleanLitterBox(2); }}>
                  <button className="bg-stone-800 hover:bg-stone-700 text-white w-10 h-10 rounded-xl flex items-center justify-center shadow-sm active:scale-95 transition-all">✓</button>
                </form>
              </div>
            </div>

            {/* Futter Management Buttons */}
            <div className="flex gap-2 mb-4">
              <form action={consumePetFood} className="flex-1"><button className="w-full h-10 bg-stone-800 rounded-xl flex items-center justify-center font-bold text-stone-300 shadow-sm active:scale-95 transition-all">-1 Dose</button></form>
              <form action={async () => { "use server"; await addPetFood(6); }} className="flex-1"><button className="w-full h-10 bg-[#C5A38E] text-stone-900 rounded-xl flex items-center justify-center font-bold shadow-sm hover:bg-[#A38572] active:scale-95 transition-all">+6 Dosen</button></form>
            </div>

            {/* Medical Tracker */}
            <div className="pt-4 border-t border-stone-800">
              <p className="text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-3">Medizin & Vorsorge</p>
              <div className="space-y-2 max-h-32 overflow-y-auto scrollbar-thin pr-1">
                {healthEvents.map(event => (
                  <div key={event.id} className="flex justify-between items-center bg-stone-800/50 p-2.5 rounded-xl">
                    <span className="text-xs font-medium">{event.title}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-[#C5A38E] font-bold">{new Date(event.dueDate).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}</span>
                      <form action={async () => { "use server"; await deleteHealthEvent(event.id); }}>
                        <button className="text-stone-500 hover:text-emerald-500 transition-colors"><Check size={14}/></button>
                      </form>
                    </div>
                  </div>
                ))}
                {healthEvents.length === 0 && <p className="text-[10px] text-stone-500 italic">Keine Termine geplant.</p>}
              </div>
              
              <form action={async (formData) => { "use server"; await addHealthEvent(formData.get("title") as string, formData.get("date") as string); }} className="mt-3 flex gap-2">
                <input name="title" placeholder="Wurmkur..." className="w-1/2 bg-stone-800 text-xs px-3 h-8 rounded-lg outline-none focus:ring-1 focus:ring-[#C5A38E]" required />
                <input name="date" type="date" className="w-1/2 bg-stone-800 text-xs px-3 h-8 rounded-lg outline-none focus:ring-1 focus:ring-[#C5A38E]" required />
                <button className="bg-[#C5A38E] text-stone-900 font-bold px-3 h-8 rounded-lg hover:bg-[#A38572] active:scale-95 transition-all">+</button>
              </form>
            </div>
          </div>

          {/* Das Schwarze Brett (Sticky Notes) */}
          <div className="bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-6 shadow-sm flex flex-col h-[550px] md:h-auto lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare size={18} className="text-[#C5A38E]" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-stone-400">Das Schwarze Brett</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
              {stickyNotes.map(note => (
                <div key={note.id} className="group bg-white dark:bg-stone-800/50 p-4 rounded-2xl relative flex flex-col gap-2 shadow-sm border border-stone-100 dark:border-stone-800">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-[#C5A38E]">{note.author}</span>
                    <form action={async () => { "use server"; await deleteStickyNote(note.id); }}>
                      <button className="text-stone-400 hover:text-rose-400 w-6 h-6 flex items-center justify-center"><X size={12} /></button>
                    </form>
                  </div>
                  {note.text && <p className="text-sm text-stone-700 dark:text-stone-300">{note.text}</p>}
                  {note.imageUrl && (
                    <div className="relative w-full h-40 mt-2 rounded-xl overflow-hidden border border-stone-200 dark:border-stone-700">
                      <Image src={note.imageUrl} alt="Notiz Bild" fill className="object-cover" />
                    </div>
                  )}
                </div>
              ))}
              {stickyNotes.length === 0 && <p className="text-stone-400 dark:text-stone-500 italic text-xs">Noch keine Notizen hinterlassen.</p>}
            </div>

            <form action={addStickyNote} className="mt-4 pt-4 border-t border-stone-200 dark:border-stone-800 flex gap-2">
              <input name="text" placeholder="Notiz hinterlassen..." className="flex-1 min-w-0 px-4 h-12 bg-white dark:bg-stone-950 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#C5A38E]/50 border border-stone-200 dark:border-stone-800" />
              
              <label className="w-12 h-12 shrink-0 bg-stone-100 dark:bg-stone-800 rounded-xl flex items-center justify-center hover:bg-[#C5A38E] hover:text-white transition-colors cursor-pointer text-stone-500 dark:text-stone-300">
                <Camera size={18} />
                <input type="file" name="file" accept="image/*" className="hidden" />
              </label>

              <button type="submit" className="px-4 h-12 bg-[#C5A38E] text-white rounded-xl flex items-center justify-center font-bold hover:bg-[#A38572] transition-colors active:scale-95 shadow-sm">Senden</button>
            </form>
          </div>

          {/* Kassenbons */}
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl p-6 shadow-sm flex flex-col h-[350px] lg:col-span-3">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest">Kassenbons (Dieser Monat)</h3>
              <span className="text-xs font-bold text-stone-500 bg-stone-100 dark:bg-stone-800 px-3 py-1.5 rounded-lg">Total: € {totalVariable.toFixed(0)}</span>
            </div>
            <div className="flex-1 overflow-y-auto pr-2 space-y-1 overscroll-contain scrollbar-thin">
              {expenses.map(ex => (
                <div key={ex.id} className="group flex justify-between items-center p-3 hover:bg-stone-50 dark:hover:bg-stone-800/50 rounded-xl transition-colors">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{ex.title}</span>
                    <span className="text-[10px] text-stone-400 uppercase tracking-wider">{ex.user.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-rose-500">-€ {ex.amount}</span>
                    <form action={async () => { "use server"; await deleteExpense(ex.id); }}>
                      <button className="text-stone-300 hover:text-red-500 transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-50 dark:hover:bg-red-950"><X size={14} /></button>
                    </form>
                  </div>
                </div>
              ))}
              {expenses.length === 0 && <p className="text-stone-400 italic text-sm text-center py-10">Alles sauber diesen Monat!</p>}
            </div>
            <form action={async (formData) => { "use server"; await addExpense(formData.get("title") as string, parseFloat(formData.get("amount") as string)); }} className="mt-4 pt-4 border-t border-stone-100 dark:border-stone-800 flex gap-2">
              <input name="title" placeholder="Rewe, Tanken..." className="flex-1 min-w-0 px-4 h-12 bg-stone-50 dark:bg-stone-950 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#C5A38E]/50" required />
              <input name="amount" type="number" inputMode="decimal" placeholder="€" className="w-20 px-3 h-12 bg-stone-50 dark:bg-stone-950 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#C5A38E]/50 text-center" required />
              <button className="w-12 h-12 bg-[#C5A38E] text-white rounded-xl flex items-center justify-center hover:bg-[#A38572] transition-colors shadow-sm"><Plus size={18} /></button>
            </form>
          </div>

        </section>

        {/* 5. BUCKETLIST & DREAMS */}
        <section className="pt-6 border-t border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-2 mb-6">
            <PiggyBank size={18} className="text-[#C5A38E]" />
            <h2 className="text-sm font-bold uppercase tracking-widest">Träume & Sinking Funds</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {jointItems.map(item => {
              const isZeroTarget = item.price === 0;
              const progressPct = isZeroTarget ? 0 : Math.min((item.savedAmount / item.price) * 100, 100);
              const isReady = !isZeroTarget && progressPct >= 100;
              
              return (
                <div key={item.id} className={`bg-white dark:bg-stone-900 p-6 rounded-3xl shadow-sm border ${isReady ? 'border-emerald-500/50' : 'border-stone-200 dark:border-stone-800'} relative flex flex-col justify-between min-h-[160px]`}>
                  <div className="flex justify-between items-start mb-4">
                    <div className="pr-4">
                      <h3 className="text-lg font-bold text-stone-800 dark:text-stone-100 leading-tight">{item.title} {item.isSurprise ? '🎁' : ''}</h3>
                      <p className="text-[10px] font-bold text-stone-400 mt-1 uppercase tracking-widest">{isZeroTarget ? 'Offenes Ziel' : `Ziel: € ${item.price.toLocaleString('de-DE')}`}</p>
                    </div>
                    {isReady ? (
                      <form action={async () => { "use server"; await markItemCompleted(item.id); }}>
                        <button className="bg-emerald-500 text-white w-10 h-10 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"><Check size={18} /></button>
                      </form>
                    ) : (
                      <form action={async () => { "use server"; await deleteBucketItem(item.id); }}>
                        <button className="text-stone-300 hover:text-red-500 transition-colors w-8 h-8 flex items-center justify-center"><X size={16}/></button>
                      </form>
                    )}
                  </div>
                  
                  <div className="space-y-3 mt-auto">
                    <div className="flex justify-between items-end">
                      <div className="text-[10px] uppercase font-bold tracking-widest text-[#C5A38E]">
                        Gespart: € {item.savedAmount} {isZeroTarget ? '' : `/ ${progressPct.toFixed(0)}%`}
                      </div>
                      {!isReady && (
                        <form action={async (formData) => { "use server"; await addFundsToItem(item.id, parseFloat(formData.get("amount") as string)); }} className="flex gap-2">
                           <input name="amount" type="number" inputMode="decimal" placeholder="€" className="w-16 h-8 text-xs px-2 bg-stone-50 dark:bg-stone-950 rounded-lg outline-none text-center border border-stone-200 dark:border-stone-800 focus:border-[#C5A38E]" required />
                           <button className="h-8 bg-stone-900 dark:bg-stone-800 text-white text-[10px] font-bold px-3 rounded-lg hover:bg-[#C5A38E] uppercase tracking-wider transition-colors shadow-sm">Save</button>
                        </form>
                      )}
                    </div>
                    {!isZeroTarget && (
                      <div className="h-1.5 w-full bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                        <div className={`h-full transition-all duration-1000 ease-out ${isReady ? 'bg-emerald-500' : 'bg-[#C5A38E]'}`} style={{ width: `${progressPct}%` }} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Eigene Listen & Post */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            
            {/* Eigene Liste */}
            <div className="bg-stone-50 dark:bg-stone-900/40 border border-stone-200 dark:border-stone-800 rounded-3xl p-6">
              <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-4">Deine Einzel-Träume</h3>
              <div className="space-y-2">
                {myIndividualItems.map(item => (
                  <div key={item.id} className="bg-white dark:bg-stone-900 p-4 rounded-2xl flex justify-between items-center shadow-sm">
                    <div>
                      <p className="text-sm font-medium">{item.title} {item.isSurprise ? '🎁' : ''}</p>
                      <p className="text-[10px] text-stone-400 uppercase tracking-wider font-bold mt-0.5">{item.price > 0 ? `€ ${item.price}` : 'Flex'}</p>
                    </div>
                    <form action={async () => { "use server"; await deleteBucketItem(item.id); }}><button className="text-stone-300 hover:text-red-500 p-2"><X size={14}/></button></form>
                  </div>
                ))}
                {myIndividualItems.length === 0 && <p className="text-xs text-stone-400 italic">Keine Einzelepisode geplant.</p>}
              </div>
            </div>

            {/* Postfach */}
            <div className="bg-[#C5A38E]/10 border border-[#C5A38E]/20 rounded-3xl p-6">
              <h3 className="text-[10px] font-bold text-[#C5A38E] uppercase tracking-widest mb-4">Post von {partner?.name || 'Partner'}</h3>
              <div className="space-y-2">
                {partnerIndividualItems.map(item => (
                  <div key={item.id} className="bg-white/80 dark:bg-stone-900/80 backdrop-blur-sm p-4 rounded-2xl flex justify-between items-center shadow-sm relative overflow-hidden group">
                    {item.isSurprise && (
                       <div className="absolute inset-0 bg-stone-900/95 flex items-center justify-between px-4 z-10">
                          <span className="text-white font-medium text-xs">🎁 Überraschung (€ {item.price})</span>
                          <form action={async () => { "use server"; await approveBucketItem(item.id); }}><button className="bg-[#C5A38E] text-white px-3 py-1.5 rounded-lg text-xs font-bold">Approve</button></form>
                       </div>
                    )}
                    <div className={item.isSurprise ? "opacity-0" : ""}>
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="text-[10px] text-[#C5A38E] uppercase tracking-wider font-bold mt-0.5">{item.price > 0 ? `€ ${item.price}` : 'Flex'}</p>
                    </div>
                    {!item.isSurprise && (
                      <form action={async () => { "use server"; await approveBucketItem(item.id); }}>
                        <button className="bg-stone-900 dark:bg-stone-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-[#C5A38E] transition-colors">Approve</button>
                      </form>
                    )}
                  </div>
                ))}
                {partnerIndividualItems.length === 0 && <p className="text-xs text-[#C5A38E]/60 italic">Posteingang leer.</p>}
              </div>
            </div>

          </div>
        </section>

      </main>

      {/* 6. IOS DYNAMIC FLOATING BAR (Bucketlist Form) */}
      <div className="fixed bottom-6 left-0 right-0 px-4 pointer-events-none z-50 flex justify-center">
        <form action={async (formData) => { 
          "use server"; 
          await addBucketItem(
            formData.get("title") as string, 
            parseFloat(formData.get("price") as string) || 0,
            formData.get("isSurprise") === "on"
          ); 
        }} className="w-full max-w-md bg-white/90 dark:bg-stone-900/90 backdrop-blur-xl p-3 md:p-4 rounded-[2rem] shadow-2xl border border-stone-200/50 dark:border-stone-700/50 pointer-events-auto flex flex-col gap-3 transition-transform hover:scale-[1.01]">
          <div className="flex gap-2">
            <input name="title" placeholder="Neues Ziel / Traum..." className="flex-1 h-12 bg-stone-100/80 dark:bg-black/40 border-none text-sm px-4 rounded-2xl outline-none focus:ring-2 focus:ring-[#C5A38E]/50 transition-all" required />
            <input name="price" type="number" inputMode="decimal" placeholder="€" className="w-20 h-12 bg-stone-100/80 dark:bg-black/40 border-none text-sm px-3 rounded-2xl outline-none text-center focus:ring-2 focus:ring-[#C5A38E]/50 transition-all" />
            <button type="submit" className="h-12 w-12 shrink-0 bg-[#C5A38E] text-white rounded-2xl hover:bg-[#A38572] transition-colors flex items-center justify-center shadow-md"><Plus size={20} /></button>
          </div>
          <div className="flex items-center justify-center gap-2">
            <label className="flex items-center gap-2 cursor-pointer group">
              <div className="relative flex items-center justify-center">
                <input type="checkbox" name="isSurprise" className="peer appearance-none w-4 h-4 rounded border border-stone-300 dark:border-stone-600 checked:bg-[#C5A38E] checked:border-[#C5A38E] transition-colors cursor-pointer" />
                <Check size={10} className="absolute text-white opacity-0 peer-checked:opacity-100 pointer-events-none" />
              </div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-stone-500 group-hover:text-stone-700 dark:group-hover:text-stone-300 transition-colors">Als geheime Überraschung anfragen</span>
            </label>
          </div>
        </form>
      </div>

    </div>
  );
}