import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { 
  addBucketItem, approveBucketItem, deleteBucketItem, 
  addObligation, deleteObligation, addExpense, 
  deleteExpense, addFundsToItem, markItemCompleted
} from "@/lib/actions";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import { 
  LayoutDashboard, Wallet, ShoppingCart, Utensils, 
  Map, Heart, Lock, BookOpen, Calendar, Sparkles, 
  Cat, CheckCircle2, TrendingUp, PiggyBank, ClipboardList
} from "lucide-react";

// --- DYNAMISCHE GIMMICKS ---
function getRandomGreeting() {
  const hour = new Date().getHours();
  
  const morningGreetings = [
    "Guten Morgen", "Zeit für den ersten Kaffee", "Rise and shine", 
    "Ein neuer erfolgreicher Tag", "Guten Start in den Tag", 
    "System online, guten Morgen", "Bereit für den Tag"
  ];
  
  const dayGreetings = [
    "Guten Tag", "Willkommen im Headquarter", "Hallo zurück", 
    "Läuft alles nach Plan?", "Management-Konsole aktiv", 
    "Erfolgreichen Nachmittag", "System-Check bestanden"
  ];
  
  const eveningGreetings = [
    "Guten Abend", "Zeit zum Abschalten", "Abendliche Grüße", 
    "Tagesziele erreicht?", "Feierabend-Modus aktiviert", 
    "Gute Arbeit heute", "Willkommen zur Date-Night-Planung"
  ];

  let selection = dayGreetings;
  if (hour < 12) selection = morningGreetings;
  else if (hour > 18) selection = eveningGreetings;

  return selection[Math.floor(Math.random() * selection.length)];
}

function getRandomCatStatus() {
  const names = ["Mäusschen", "Püppi", "Puppi", "Mietze", "Fratzratz"];
  const statuses = [
    { text: "Zufrieden", color: "text-emerald-500" },
    { text: "Schläft tief & fest", color: "text-emerald-500" },
    { text: "Verlangt Futter", color: "text-amber-500" },
    { text: "Beobachtet euch", color: "text-blue-500" },
    { text: "Plant die Weltherrschaft", color: "text-rose-500" },
    { text: "Hat ihre 5 Minuten", color: "text-amber-500" },
    { text: "Putzt sich", color: "text-emerald-500" },
    { text: "Schnurrt auf Level 10", color: "text-blue-500" },
    { text: "Ignoriert euch gekonnt", color: "text-stone-500" },
    { text: "Belagert den Lieblingsplatz", color: "text-emerald-500" },
    { text: "Wartet auf Streicheleinheiten", color: "text-rose-500" },
    { text: "Patrouilliert das Revier", color: "text-blue-500" },
    { text: "Hat ein Insekt entdeckt", color: "text-amber-500" },
    { text: "Träumt von Leckerlis", color: "text-emerald-500" },
    { text: "Versteckt sich", color: "text-stone-500" },
    { text: "Bettelt am Tisch", color: "text-amber-500" },
    { text: "Macht Yoga-Posen", color: "text-blue-500" },
    { text: "Wärmt sich auf", color: "text-rose-500" },
    { text: "Ist im Kuschel-Modus", color: "text-emerald-500" },
    { text: "Starrt in die Leere", color: "text-stone-500" }
  ];

  const randomName = names[Math.floor(Math.random() * names.length)];
  const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];

  return { name: randomName, status: randomStatus.text, color: randomStatus.color };
}
// ---------------------------

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  // --- DATEN ABRUFEN ---
  const allUsers = await prisma.user.findMany();
  const currentUser = allUsers.find(u => u.email === session.user?.email);
  const partner = allUsers.find(u => u.email !== session.user?.email);
  const obligations = await prisma.financialObligation.findMany();
  const openShoppingItemsCount = await prisma.shoppingItem.count({ where: { checked: false } });
  
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

  // Gimmicks generieren
  const greeting = getRandomGreeting();
  const catGimmick = getRandomCatStatus();

  // Abteilungen
  const categories = [
    { title: "Kommandozentrale", desc: "Smart Home", icon: <LayoutDashboard size={20} />, href: "/smarthome", color: "bg-amber-500/10 text-amber-600" },
    { title: "Finanz-Abos", desc: "Subscriptions", icon: <TrendingUp size={20} />, href: "/subscriptions", color: "bg-emerald-500/10 text-emerald-600" },
    { title: "Versorgungsamt", desc: `${openShoppingItemsCount} Artikel offen`, icon: <ShoppingCart size={20} />, href: "/shopping", color: "bg-blue-500/10 text-blue-600" },
    { title: "Putz-Geschwader", desc: `${currentUser?.chorePoints || 0} Pkt gesammelt`, icon: <CheckCircle2 size={20} />, href: "/chores", color: "bg-stone-500/10 text-stone-600" },
    { title: "Küchen-Chef", desc: "Meal Prep", icon: <Utensils size={20} />, href: "/mealprep", color: "bg-orange-500/10 text-orange-600" },
    { title: "Date Night", desc: "Roulette", icon: <Heart size={20} />, href: "/roulette", color: "bg-pink-500/10 text-pink-600" },
    { title: "Expeditionen", desc: "Weltkarte", icon: <Map size={20} />, href: "/map", color: "bg-cyan-500/10 text-cyan-600" },
    { title: "Das Archiv", desc: "Home Wiki", icon: <BookOpen size={20} />, href: "/wiki", color: "bg-indigo-500/10 text-indigo-600" },
    { title: "Gift Vault", desc: "Geheime Geschenke", icon: <Lock size={20} />, href: "/gifts", color: "bg-violet-500/10 text-violet-600" },
    { title: "Timeline", desc: "Kalender", icon: <Calendar size={20} />, href: "/timeline", color: "bg-sky-500/10 text-sky-600" },
    { title: "Weekly Sync", desc: "Check-In", icon: <ClipboardList size={20} />, href: "/checkin", color: "bg-lime-500/10 text-lime-600" },
    { title: "Tresor", desc: "Dokumente", icon: <Wallet size={20} />, href: "/vault", color: "bg-stone-300 text-stone-700" },
  ];

  return (
    <div className="min-h-screen bg-[#FDFCFB] dark:bg-stone-950 text-stone-900 dark:text-stone-100 transition-colors duration-500 pb-32">
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-10 md:py-16 space-y-16">
        
        {/* HEADER */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[#C5A38E] font-medium tracking-[0.2em] uppercase text-[10px]">
              <Sparkles size={12} />
              <span>Established 2026 — Die Höhle</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-light tracking-tighter" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              Management
            </h1>
            <p className="text-stone-400 dark:text-stone-500 font-light text-xl italic">
              {greeting}, Mike & Sophie.
            </p>
          </div>
          <div className="flex flex-col items-end gap-4">
            <div className="flex items-center gap-3 px-4 py-2 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-sm transition-all hover:scale-105 cursor-default">
              <Cat size={16} className="text-[#C5A38E]" />
              <span className="text-[11px] font-bold text-stone-500 uppercase tracking-widest">
                {catGimmick.name} Status: <span className={catGimmick.color}>{catGimmick.status}</span>
              </span>
            </div>
            <ThemeToggle />
          </div>
        </header>

        {/* CASHFLOW & INCOME SUMMARY */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#C5A38E] text-white p-8 rounded-[2rem] shadow-xl shadow-amber-900/10 relative overflow-hidden flex flex-col justify-between">
            <div className="relative z-10">
              <p className="text-[10px] uppercase tracking-[0.2em] font-bold mb-1 opacity-80">Netto Cashflow / Monat</p>
              <h2 className="text-5xl font-light tabular-nums">€ {freeCashflow.toLocaleString('de-DE', { maximumFractionDigits: 0 })}</h2>
            </div>
            <div className="absolute -right-4 -bottom-4 size-40 bg-white opacity-5 rounded-full blur-2xl"></div>
          </div>

          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-6 md:p-8 rounded-[2rem] flex flex-col justify-center gap-4">
             <h2 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">Dein Netto-Einkommen</h2>
             
             <form action={async (formData) => { 
                "use server"; 
                const raw = formData.get("income") as string;
                if (!raw) return;
                const parsed = parseFloat(raw.replace(/\./g, '').replace(',', '.'));
                if (!isNaN(parsed) && currentUser) {
                  await prisma.user.update({ where: { id: currentUser.id }, data: { netIncome: parsed } });
                  revalidatePath("/");
                }
             }} className="flex items-center gap-3">
                <input name="income" type="text" inputMode="decimal" placeholder={`€ ${currentUser?.netIncome}`} className="flex-1 px-5 py-3 bg-stone-50 dark:bg-stone-950 dark:text-stone-200 rounded-xl outline-none border border-stone-100 dark:border-stone-800 text-lg font-light" required />
                <button className="bg-stone-900 dark:bg-stone-800 hover:bg-[#C5A38E] text-white px-6 py-3 font-bold rounded-xl text-sm transition-colors">Update</button>
             </form>
          </div>
        </div>

        {/* ABTEILUNGEN (App Hub) */}
        <div>
          <h2 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-6">Alle Abteilungen</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {categories.map((cat) => (
              <Link key={cat.title} href={cat.href}>
                <div className="group bg-white dark:bg-stone-900/40 border border-stone-200 dark:border-stone-800 p-6 rounded-[1.5rem] hover:bg-stone-50 dark:hover:bg-stone-900 transition-all duration-300 hover:scale-[1.02] shadow-sm hover:shadow-md">
                  <div className={`w-10 h-10 ${cat.color} rounded-xl flex items-center justify-center mb-6 group-hover:-translate-y-1 transition-transform`}>
                    {cat.icon}
                  </div>
                  <p className="text-sm font-semibold mb-1">{cat.title}</p>
                  <p className="text-[10px] uppercase tracking-wider text-stone-400 font-bold">{cat.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* FINANZEN DETAIL (Fixkosten & Variablen) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Fair Share & Fixkosten */}
          <section className="bg-white dark:bg-stone-900 p-8 rounded-[2rem] border border-stone-200 dark:border-stone-800 flex flex-col shadow-sm">
            <h2 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-6 flex justify-between">
              <span>Fair Share Verteilung</span>
              <span className="text-[#C5A38E]">Fixkosten: € {totalExpenses}</span>
            </h2>
            <div className="space-y-5 mb-8">
              <div>
                <div className="flex justify-between text-xs mb-2">
                  <span className="font-bold uppercase tracking-wider">{currentUser?.name}</span>
                  <span className="text-stone-500">{(mySharePct * 100).toFixed(0)}% (Soll: € {myFairCost.toFixed(0)})</span>
                </div>
                <div className="h-1.5 w-full bg-stone-100 dark:bg-stone-800 rounded-full flex overflow-hidden"><div className="bg-stone-800 dark:bg-stone-600 h-full" style={{ width: `${mySharePct * 100}%` }}></div></div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-2">
                  <span className="font-bold uppercase tracking-wider">{partner?.name || 'Partner'}</span>
                  <span className="text-stone-500">{(partnerSharePct * 100).toFixed(0)}% (Soll: € {partnerFairCost.toFixed(0)})</span>
                </div>
                <div className="h-1.5 w-full bg-stone-100 dark:bg-stone-800 rounded-full flex overflow-hidden"><div className="bg-[#C5A38E] h-full" style={{ width: `${partnerSharePct * 100}%` }}></div></div>
              </div>
            </div>

            <h2 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4">Fixkosten</h2>
            <div className="flex-1 space-y-3 overflow-y-auto max-h-40 mb-6 pr-2">
              {obligations.map(ob => (
                <div key={ob.id} className="flex justify-between items-center text-sm border-b border-stone-100 dark:border-stone-800/50 pb-3">
                  <span className="text-stone-600 dark:text-stone-300">{ob.title}</span>
                  <div className="flex items-center gap-4">
                    <span className="font-medium">€ {ob.amount}</span>
                    <form action={async () => { "use server"; await deleteObligation(ob.id); }}><button className="text-stone-300 hover:text-red-400">✕</button></form>
                  </div>
                </div>
              ))}
            </div>
            <form action={async (formData) => { "use server"; await addObligation(formData.get("title") as string, parseFloat(formData.get("amount") as string)); }} className="flex gap-2 mt-auto">
              <input name="title" placeholder="Miete, Strom..." className="flex-1 text-sm p-4 bg-stone-50 dark:bg-stone-950 rounded-xl outline-none" required />
              <input name="amount" type="number" placeholder="€" className="w-20 text-sm p-4 bg-stone-50 dark:bg-stone-950 rounded-xl outline-none" required />
              <button className="p-4 bg-[#C5A38E] text-white rounded-xl text-sm font-bold hover:bg-[#A38572] transition">+</button>
            </form>
          </section>

          {/* Kassenbons (Dieser Monat) */}
          <section className="bg-white dark:bg-stone-900 p-8 rounded-[2rem] border border-stone-200 dark:border-stone-800 flex flex-col shadow-sm h-full">
            <h2 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-6">Kassenbons (Dieser Monat)</h2>
            <div className="flex-1 space-y-4 overflow-y-auto max-h-[300px] mb-6 pr-2">
              {expenses.map(ex => (
                <div key={ex.id} className="flex justify-between items-center text-sm border-b border-stone-100 dark:border-stone-800/50 pb-3">
                  <div className="flex flex-col">
                    <span className="font-medium text-stone-700 dark:text-stone-200">{ex.title}</span>
                    <span className="text-[10px] text-stone-400 uppercase tracking-wider">{ex.user.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-[#C5A38E]">-€ {ex.amount}</span>
                    <form action={async () => { "use server"; await deleteExpense(ex.id); }}><button className="text-stone-300 hover:text-red-400">✕</button></form>
                  </div>
                </div>
              ))}
              {expenses.length === 0 && <p className="text-stone-400 italic text-sm text-center py-10">Noch keine Ausgaben diesen Monat.</p>}
            </div>
            <form action={async (formData) => { "use server"; await addExpense(formData.get("title") as string, parseFloat(formData.get("amount") as string)); }} className="flex gap-2 mt-auto">
              <input name="title" placeholder="Rewe, DM, Tanken..." className="flex-1 text-sm p-4 bg-stone-50 dark:bg-stone-950 rounded-xl outline-none" required />
              <input name="amount" type="number" step="0.01" placeholder="€" className="w-24 text-sm p-4 bg-stone-50 dark:bg-stone-950 rounded-xl outline-none" required />
              <button className="p-4 bg-stone-900 dark:bg-stone-800 text-white rounded-xl text-sm font-bold hover:bg-[#C5A38E] transition">+</button>
            </form>
          </section>
        </div>

        {/* BUCKETLIST & SINKING FUNDS */}
        <div className="pt-8 border-t border-stone-200 dark:border-stone-800 space-y-12">
          
          {/* GEMEINSAME ZIELE */}
          <section className="space-y-6">
            <h2 className="text-xs font-bold text-stone-400 uppercase tracking-widest flex items-center gap-2">
              <PiggyBank size={14} className="text-[#C5A38E]" /> Gemeinsame Träume & Sinking Funds
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              {jointItems.map(item => {
                const isZeroTarget = item.price === 0;
                const progressPct = isZeroTarget ? 0 : Math.min((item.savedAmount / item.price) * 100, 100);
                const isReady = !isZeroTarget && progressPct >= 100;
                return (
                  <div key={item.id} className={`bg-white dark:bg-stone-900 p-8 rounded-[2rem] shadow-sm border ${isReady ? 'border-emerald-500' : 'border-stone-200 dark:border-stone-800'}`}>
                    <div className="flex justify-between items-start mb-8">
                      <div>
                        <h3 className="text-xl font-medium text-stone-800 dark:text-stone-100">{item.title} {item.isSurprise ? '🎁' : ''}</h3>
                        <p className="text-xs font-bold text-stone-400 mt-1 uppercase tracking-widest">{isZeroTarget ? 'Offenes Ziel' : `Ziel: € ${item.price.toLocaleString('de-DE')}`}</p>
                      </div>
                      {isReady ? (
                        <form action={async () => { "use server"; await markItemCompleted(item.id); }}>
                          <button className="bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-lg hover:bg-emerald-600 animate-pulse">Erlebt ✓</button>
                        </form>
                      ) : (
                        <form action={async () => { "use server"; await deleteBucketItem(item.id); }}>
                          <button className="text-stone-300 hover:text-red-400 text-sm">✕</button>
                        </form>
                      )}
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between items-end">
                        <div className="text-[10px] uppercase font-bold tracking-[0.2em] text-[#C5A38E]">
                          Gespart: € {item.savedAmount} {isZeroTarget ? '' : `/ ${progressPct.toFixed(0)}%`}
                        </div>
                        {!isReady && (
                          <form action={async (formData) => { "use server"; await addFundsToItem(item.id, parseFloat(formData.get("amount") as string)); }} className="flex gap-2">
                             <input name="amount" type="number" placeholder="€" className="w-16 text-xs p-2 bg-stone-50 dark:bg-stone-950 rounded-lg outline-none text-center border border-stone-200 dark:border-stone-800" required />
                             <button className="bg-stone-900 dark:bg-stone-800 text-white text-[10px] font-bold px-3 rounded-lg hover:bg-[#C5A38E] uppercase tracking-wider transition-colors">Deposit</button>
                          </form>
                        )}
                      </div>
                      {!isZeroTarget && (
                        <div className="h-1.5 w-full bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                          <div className={`h-full transition-all duration-1000 ${isReady ? 'bg-emerald-500' : 'bg-[#C5A38E]'}`} style={{ width: `${progressPct}%` }} />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {jointItems.length === 0 && <p className="text-stone-400 italic text-sm">Keine gemeinsamen Träume vorhanden.</p>}
            </div>
          </section>

          {/* INDIVIDUELLE ZIELE */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <section className="space-y-6">
              <h2 className="text-xs font-bold text-stone-400 uppercase tracking-widest">Deine Liste</h2>
              <div className="grid gap-3">
                {myIndividualItems.map(item => (
                  <div key={item.id} className="bg-white dark:bg-stone-900/50 p-5 rounded-2xl border border-stone-200 dark:border-stone-800 flex justify-between items-center">
                    <div>
                      <p className="font-medium">{item.title} {item.isSurprise ? '🎁' : ''}</p>
                      <p className="text-[10px] text-stone-400 uppercase tracking-wider font-bold mt-1">{item.price > 0 ? `€ ${item.price}` : 'Flex-Ziel'}</p>
                    </div>
                    <form action={async () => { "use server"; await deleteBucketItem(item.id); }}><button className="text-stone-400 hover:text-red-400">✕</button></form>
                  </div>
                ))}
              </div>
            </section>
            
            <section className="space-y-6">
              <h2 className="text-xs font-bold text-[#C5A38E] uppercase tracking-widest">Post von {partner?.name}</h2>
              <div className="grid gap-3">
                {partnerIndividualItems.map(item => (
                  <div key={item.id} className="bg-amber-50 dark:bg-amber-900/10 p-5 rounded-2xl border border-amber-200/50 dark:border-amber-900/30 flex justify-between items-center relative overflow-hidden">
                    {item.isSurprise && (
                       <div className="absolute inset-0 bg-stone-900/95 flex items-center justify-between px-5 z-10 backdrop-blur-sm">
                          <span className="text-white font-medium text-sm">🎁 Überraschung (€ {item.price})</span>
                          <form action={async () => { "use server"; await approveBucketItem(item.id); }}><button className="bg-[#C5A38E] text-white px-4 py-2 rounded-xl text-xs font-bold transition-transform hover:scale-105">Zustimmen</button></form>
                       </div>
                    )}
                    <div className={item.isSurprise ? "opacity-0" : ""}>
                      <p className="font-medium text-stone-800 dark:text-stone-200">{item.title}</p>
                      <p className="text-[10px] text-[#C5A38E] uppercase tracking-wider font-bold mt-1">{item.price > 0 ? `€ ${item.price}` : 'Flex-Ziel'}</p>
                    </div>
                    {!item.isSurprise && (
                      <form action={async () => { "use server"; await approveBucketItem(item.id); }}>
                        <button className="bg-stone-900 dark:bg-stone-800 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#C5A38E] transition-colors">Zustimmen</button>
                      </form>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>

        {/* FLOATING ACTION BAR FOR BUCKETLIST */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-lg z-50">
          <form action={async (formData) => { 
            "use server"; 
            await addBucketItem(
              formData.get("title") as string, 
              parseFloat(formData.get("price") as string) || 0,
              formData.get("isSurprise") === "on"
            ); 
          }} className="bg-stone-900/95 dark:bg-black/90 backdrop-blur-xl p-4 rounded-3xl shadow-2xl flex flex-col gap-3 border border-stone-700/50">
            <div className="flex gap-2">
              <input name="title" placeholder="Neuer Traum / Ziel..." className="flex-1 bg-stone-800/50 border-none text-white text-sm px-5 py-3 rounded-2xl outline-none" required />
              <input name="price" type="number" placeholder="€" className="w-24 bg-stone-800/50 border-none text-white text-sm px-4 py-3 rounded-2xl outline-none" />
              <button type="submit" className="bg-[#C5A38E] text-white p-3 rounded-2xl hover:bg-[#A38572] transition px-6 font-bold">+</button>
            </div>
            <label className="flex items-center gap-2 px-3 text-xs text-stone-400 cursor-pointer w-max">
              <input type="checkbox" name="isSurprise" className="accent-[#C5A38E] size-3" />
              Als geheime Überraschung beim Partner anfragen
            </label>
          </form>
        </div>

      </div>
    </div>
  );
}