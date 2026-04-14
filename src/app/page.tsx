import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { 
  updateNetIncome, addBucketItem, approveBucketItem, 
  deleteBucketItem, addObligation, deleteObligation,
  addExpense, deleteExpense, addFundsToItem, markItemCompleted
} from "@/lib/actions";
import ThemeToggle from "@/components/ThemeToggle";
import Link from "next/link";

export default async function Dashboard() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  // --- DATEN ABRUFEN ---
  const allUsers = await prisma.user.findMany();
  const currentUser = allUsers.find(u => u.email === session.user?.email);
  const partner = allUsers.find(u => u.email !== session.user?.email);
  
  const obligations = await prisma.financialObligation.findMany();
  
  // Ausgaben des aktuellen Monats
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
  
  const totalExpenses = obligations.reduce((sum: number, ob: any) => sum + ob.amount, 0);
  const totalVariable = expenses.reduce((sum: number, ex: any) => sum + ex.amount, 0);
  const freeCashflow = totalIncome - totalExpenses - totalVariable;

  // Prozentualer Anteil am Haushalt (Sicherheit vor Division durch 0)
  const mySharePct = totalIncome > 0 ? (myIncome / totalIncome) : 0.5;
  const partnerSharePct = totalIncome > 0 ? (partnerIncome / totalIncome) : 0.5;

  const myFairCost = totalExpenses * mySharePct;
  const partnerFairCost = totalExpenses * partnerSharePct;

  // --- FILTER ---
  // isCompleted = false (Archivierte Träume werden ausgeblendet)
  const activeItems = allItems.filter(i => !i.isCompleted);
  const jointItems = activeItems.filter(i => i.approverId !== null);
  const partnerProposals = activeItems.filter(i => i.creatorId !== currentUser?.id && i.approverId === null);
  const myProposals = activeItems.filter(i => i.creatorId === currentUser?.id && i.approverId === null);

  return (
    <div className="min-h-screen bg-[#F9F7F5] dark:bg-stone-950 text-stone-900 dark:text-stone-100 p-4 md:p-8 pb-32 transition-colors duration-300">
      <div className="max-w-4xl mx-auto space-y-10">
        
        {/* HEADER */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center py-6 border-b border-stone-200 dark:border-stone-800 gap-6">
          <div className="flex items-center gap-4">
            <div className="flex -space-x-3">
              <div className="w-12 h-12 rounded-full border-4 border-[#F9F7F5] dark:border-stone-950 bg-stone-300 text-stone-700 flex items-center justify-center text-lg font-bold shadow-sm z-10">
                {currentUser?.name?.charAt(0)?.toUpperCase()}
              </div>
              <div className="w-12 h-12 rounded-full border-4 border-[#F9F7F5] dark:border-stone-950 bg-[#C5A38E] text-white flex items-center justify-center text-lg font-bold shadow-sm">
                {partner?.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-[#C5A38E] dark:text-[#D4B9A8]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                Our Journeys
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-5 w-full md:w-auto justify-between md:justify-end">
            <div className="text-left md:text-right">
               <p className="text-2xl font-bold text-stone-800 dark:text-stone-100">€ {freeCashflow.toLocaleString('de-DE', { maximumFractionDigits: 0 })}</p>
               <p className="text-[10px] text-[#C5A38E] font-bold uppercase tracking-wider">Netto Cashflow / Monat</p>
            </div>
            <div className="h-8 w-px bg-stone-200 dark:bg-stone-800 hidden md:block"></div>
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <Link href="/profile" className="p-2.5 rounded-full hover:bg-stone-200 dark:hover:bg-stone-800 transition text-xl flex items-center justify-center">⚙️</Link>
            </div>
          </div>
        </header>

        {/* MODUL 1: FAIR SHARE & VARIABLE AUSGABEN */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Fair Share Dashboard */}
          <section className="col-span-1 md:col-span-2 bg-white dark:bg-stone-900 p-6 rounded-3xl shadow-sm border border-stone-100 dark:border-stone-800">
            <h2 className="text-sm font-bold text-stone-400 uppercase mb-6 flex justify-between">
              <span>Haushalts-Aufteilung</span>
              <span className="text-stone-500">Fixkosten: € {totalExpenses}</span>
            </h2>
            
            <div className="space-y-6">
              {/* Du */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-bold">{currentUser?.name}</span>
                  <span className="text-stone-500">Trägt {(mySharePct * 100).toFixed(0)}% (Fair: € {myFairCost.toFixed(0)})</span>
                </div>
                <div className="h-2 w-full bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden flex">
                  <div className="bg-stone-700 h-full" style={{ width: `${mySharePct * 100}%` }}></div>
                </div>
              </div>
              
              {/* Partner */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-bold">{partner?.name || 'Partner'}</span>
                  <span className="text-stone-500">Trägt {(partnerSharePct * 100).toFixed(0)}% (Fair: € {partnerFairCost.toFixed(0)})</span>
                </div>
                <div className="h-2 w-full bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden flex">
                  <div className="bg-[#C5A38E] h-full" style={{ width: `${partnerSharePct * 100}%` }}></div>
                </div>
              </div>
            </div>
          </section>

          {/* Daily Sync: Variable Ausgaben */}
          <section className="col-span-1 bg-white dark:bg-stone-900 p-6 rounded-3xl shadow-sm border border-stone-100 dark:border-stone-800 flex flex-col h-full">
            <h2 className="text-sm font-bold text-stone-400 uppercase mb-4">Kassenbons (Dieser Monat)</h2>
            <div className="flex-1 space-y-3 overflow-y-auto max-h-32 mb-4 pr-2">
              {expenses.map(ex => (
                <div key={ex.id} className="flex justify-between items-center text-sm border-b border-stone-50 dark:border-stone-800 pb-2">
                  <div className="flex flex-col">
                    <span className="font-medium text-stone-700 dark:text-stone-300">{ex.title}</span>
                    <span className="text-[10px] text-stone-400">{ex.user.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#C5A38E]">-€ {ex.amount}</span>
                    <form action={async () => { "use server"; await deleteExpense(ex.id); }}>
                      <button className="text-stone-300 dark:text-stone-600 hover:text-red-400 transition">✕</button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
            <form action={async (formData) => { "use server"; await addExpense(formData.get("title") as string, parseFloat(formData.get("amount") as string)); }} className="flex gap-2 mt-auto">
              <input name="title" placeholder="Supermarkt" className="flex-1 text-xs p-3 bg-stone-50 dark:bg-stone-950 dark:text-stone-200 rounded-xl outline-none border border-stone-200 dark:border-stone-800" required />
              <input name="amount" type="number" step="0.01" placeholder="€" className="w-16 text-xs p-3 bg-stone-50 dark:bg-stone-950 dark:text-stone-200 rounded-xl outline-none border border-stone-200 dark:border-stone-800" required />
              <button className="p-3 bg-stone-800 dark:bg-stone-700 text-white rounded-xl text-xs font-bold">+</button>
            </form>
          </section>
        </div>

        {/* MODUL 2: BUCKETLIST VORSCHLÄGE (Mit Überraschungs-Logik) */}
        {partnerProposals.length > 0 && (
          <section className="animate-in fade-in slide-in-from-top-4 duration-700">
            <h2 className="text-xs font-bold text-[#C5A38E] uppercase tracking-widest mb-4">Post von {partner?.name}</h2>
            <div className="grid gap-4">
              {partnerProposals.map(item => (
                <div key={item.id} className="bg-[#C5A38E]/10 p-6 rounded-3xl border-2 border-dashed border-[#C5A38E]/30 flex justify-between items-center relative overflow-hidden">
                  {/* Das Geheimnis! */}
                  {item.isSurprise ? (
                    <div className="absolute inset-0 bg-stone-900/90 backdrop-blur-md flex flex-col items-center justify-center text-center p-4">
                      <span className="text-3xl mb-2">🎁</span>
                      <p className="text-white font-bold mb-1">Überraschungs-Date!</p>
                      <p className="text-stone-400 text-sm mb-4">Bist du dabei? (Budget: € {item.price})</p>
                      <form action={async () => { "use server"; await approveBucketItem(item.id); }}>
                        <button className="bg-[#C5A38E] text-white px-6 py-2 rounded-xl font-bold hover:scale-105 transition">Blind Zustimmen</button>
                      </form>
                    </div>
                  ) : null}

                  {/* Normale Ansicht, falls keine Überraschung */}
                  <div className={item.isSurprise ? "opacity-0" : ""}>
                    <p className="font-bold text-stone-800 dark:text-stone-100 text-xl">{item.title}</p>
                    <p className="text-[#C5A38E] font-bold">€ {item.price.toLocaleString('de-DE')}</p>
                  </div>
                  <div className={`flex gap-3 ${item.isSurprise ? "opacity-0" : ""}`}>
                    <form action={async () => { "use server"; await deleteBucketItem(item.id); }}><button className="px-4 py-2 text-stone-400">Ablehnen</button></form>
                    <form action={async () => { "use server"; await approveBucketItem(item.id); }}><button className="bg-[#C5A38E] text-white px-6 py-2 rounded-xl font-bold">Zustimmen</button></form>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* MODUL 2: GEMEINSAME TRÄUME (Sinking Funds) */}
        <section className="space-y-6">
          <h2 className="text-xs font-bold text-stone-400 uppercase tracking-widest">Unsere Sparziele</h2>
          <div className="grid gap-6">
            {jointItems.map(item => {
              const progressPct = Math.min((item.savedAmount / item.price) * 100, 100);
              const isReady = progressPct >= 100;

              return (
                <div key={item.id} className={`bg-white dark:bg-stone-900 p-6 rounded-3xl shadow-sm border ${isReady ? 'border-green-400 dark:border-green-500' : 'border-stone-100 dark:border-stone-800'} relative`}>
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-xl font-bold text-stone-800 dark:text-stone-100">{item.title} {item.isSurprise ? '🎁' : ''}</h3>
                      <p className="text-sm text-stone-400">Ziel: € {item.price.toLocaleString('de-DE')}</p>
                    </div>
                    {isReady ? (
                      <form action={async () => { "use server"; await markItemCompleted(item.id); }}>
                        <button className="bg-green-500 text-white text-sm font-bold px-4 py-2 rounded-lg shadow-lg hover:bg-green-600 transition animate-pulse">Erlebt! ✓</button>
                      </form>
                    ) : (
                      <form action={async () => { "use server"; await deleteBucketItem(item.id); }}>
                        <button className="text-stone-300 dark:text-stone-600 hover:text-red-400 text-sm">Abbrechen</button>
                      </form>
                    )}
                  </div>
                  
                  {/* Sinking Fund Progress */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-end">
                      <div className="text-[10px] uppercase font-bold tracking-tighter text-stone-400">
                        Gespart: € {item.savedAmount} / {progressPct.toFixed(0)}%
                      </div>
                      {!isReady && (
                        <form action={async (formData) => { "use server"; await addFundsToItem(item.id, parseFloat(formData.get("amount") as string)); }} className="flex gap-2">
                           <input name="amount" type="number" placeholder="50" className="w-14 text-xs p-1.5 bg-stone-50 dark:bg-stone-950 dark:text-stone-200 border border-stone-200 dark:border-stone-800 rounded outline-none text-center" required />
                           <button className="bg-stone-800 dark:bg-stone-700 text-white text-[10px] px-2 rounded hover:bg-[#C5A38E] transition">Einzahlen</button>
                        </form>
                      )}
                    </div>
                    <div className="h-3 w-full bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                      <div className={`h-full transition-all duration-1000 ${isReady ? 'bg-green-400' : 'bg-[#C5A38E]'}`} style={{ width: `${progressPct}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* EIGENE OFFENE VORSCHLÄGE */}
        {myProposals.length > 0 && (
          <section className="space-y-4 opacity-70">
            <h2 className="text-xs font-bold text-stone-400 uppercase tracking-widest">Warten auf {partner?.name || 'Partner'}</h2>
            <div className="grid gap-3">
              {myProposals.map(item => (
                <div key={item.id} className="bg-stone-50 dark:bg-stone-900/50 p-4 rounded-2xl border border-dashed border-stone-200 dark:border-stone-800 flex justify-between items-center">
                  <div>
                    <p className="font-medium text-stone-600 dark:text-stone-400">{item.title} {item.isSurprise ? '(Überraschung)' : ''}</p>
                  </div>
                  <form action={async () => { "use server"; await deleteBucketItem(item.id); }}>
                    <button className="text-stone-400 hover:text-red-400 transition text-sm font-medium">✕</button>
                  </form>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* FLOATING ACTION BAR: Eingabe mit Checkbox für Überraschung */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-lg z-50">
          <form action={async (formData) => { 
            "use server"; 
            await addBucketItem(
              formData.get("title") as string, 
              parseFloat(formData.get("price") as string),
              formData.get("isSurprise") === "on"
            ); 
          }} className="bg-stone-900/95 dark:bg-black/90 backdrop-blur-md p-3 rounded-2xl shadow-2xl flex flex-col gap-2 border border-stone-700/50">
            <div className="flex gap-2">
              <input name="title" placeholder="Neuer Traum..." className="flex-1 bg-stone-800 border-none text-white text-sm px-4 py-2 rounded-xl outline-none" required />
              <input name="price" type="number" placeholder="€" className="w-20 bg-stone-800 border-none text-white text-sm px-3 py-2 rounded-xl outline-none" required />
              <button type="submit" className="bg-[#C5A38E] text-white p-2 rounded-xl hover:bg-[#A38572] transition px-4 font-bold">+</button>
            </div>
            <label className="flex items-center gap-2 px-2 text-xs text-stone-400 cursor-pointer">
              <input type="checkbox" name="isSurprise" className="accent-[#C5A38E]" />
              Als Überraschung anfragen (Titel bleibt versteckt)
            </label>
          </form>
        </div>

      </div>
    </div>
  );
}