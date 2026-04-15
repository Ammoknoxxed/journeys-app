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

        {/* QUICK APPS HUB (Alle 13 Apps) */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-4">
          <Link href="/shopping" className="bg-stone-800 dark:bg-stone-900 text-white p-5 rounded-3xl shadow-lg hover:bg-stone-700 transition flex flex-col justify-between h-28 group">
            <div className="flex justify-between items-start"><h2 className="text-sm font-bold">Shopping</h2><span className="text-xl group-hover:scale-110 transition-transform">🛒</span></div>
            <p className="text-xs text-stone-400">{openShoppingItemsCount} Artikel</p>
          </Link>
          <Link href="/mealprep" className="bg-[#C5A38E] text-white p-5 rounded-3xl shadow-lg hover:bg-[#A38572] transition flex flex-col justify-between h-28 group">
            <div className="flex justify-between items-start"><h2 className="text-sm font-bold">Meal Prep</h2><span className="text-xl group-hover:scale-110 transition-transform">🍳</span></div>
            <p className="text-xs text-white/80">Planer</p>
          </Link>
          <Link href="/chores" className="bg-stone-800 dark:bg-stone-900 text-white p-5 rounded-3xl shadow-lg hover:bg-stone-700 transition flex flex-col justify-between h-28 group">
            <div className="flex justify-between items-start"><h2 className="text-sm font-bold">Putzplan</h2><span className="text-xl group-hover:scale-110 transition-transform">✨</span></div>
            <p className="text-xs text-stone-400">{currentUser?.chorePoints || 0} Pkt</p>
          </Link>
          <Link href="/roulette" className="bg-white dark:bg-stone-900 text-stone-900 dark:text-white border border-stone-200 dark:border-stone-800 p-5 rounded-3xl shadow-sm hover:border-[#C5A38E] transition flex flex-col justify-between h-28 group">
            <div className="flex justify-between items-start"><h2 className="text-sm font-bold">Roulette</h2><span className="text-xl group-hover:scale-110 transition-transform">🎲</span></div>
            <p className="text-xs text-stone-500">Date Night</p>
          </Link>
          <Link href="/checkin" className="bg-stone-800 dark:bg-stone-900 text-white p-5 rounded-3xl shadow-lg hover:bg-stone-700 transition flex flex-col justify-between h-28 group">
            <div className="flex justify-between items-start"><h2 className="text-sm font-bold">Check-In</h2><span className="text-xl group-hover:scale-110 transition-transform">💬</span></div>
            <p className="text-xs text-[#C5A38E]">Weekly Sync</p>
          </Link>
          <Link href="/timeline" className="bg-white dark:bg-stone-900 text-stone-900 dark:text-white border border-stone-200 dark:border-stone-800 p-5 rounded-3xl shadow-sm hover:border-[#C5A38E] transition flex flex-col justify-between h-28 group">
            <div className="flex justify-between items-start"><h2 className="text-sm font-bold">Kalender</h2><span className="text-xl group-hover:scale-110 transition-transform">📅</span></div>
            <p className="text-xs text-stone-400">Timeline</p>
          </Link>
          <Link href="/gifts" className="bg-stone-900 text-white border border-stone-700 p-5 rounded-3xl shadow-sm hover:border-[#C5A38E] transition flex flex-col justify-between h-28 group">
            <div className="flex justify-between items-start"><h2 className="text-sm font-bold text-[#C5A38E]">Geheim</h2><span className="text-xl group-hover:scale-110 transition-transform">🤫</span></div>
            <p className="text-xs text-stone-400">Geschenke</p>
          </Link>
          <Link href="/vault" className="bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 p-5 rounded-3xl shadow-sm hover:bg-stone-300 transition flex flex-col justify-between h-28 group">
            <div className="flex justify-between items-start"><h2 className="text-sm font-bold">Tresor</h2><span className="text-xl group-hover:scale-110 transition-transform">🔒</span></div>
            <p className="text-xs text-stone-500">Dokumente</p>
          </Link>
          <Link href="/subscriptions" className="bg-[#C5A38E] text-white p-5 rounded-3xl shadow-lg hover:bg-[#A38572] transition flex flex-col justify-between h-28 group">
            <div className="flex justify-between items-start"><h2 className="text-sm font-bold">Abos</h2><span className="text-xl group-hover:scale-110 transition-transform">📡</span></div>
            <p className="text-xs text-white/80">Radar</p>
          </Link>
          <Link href="/wiki" className="bg-stone-800 dark:bg-stone-900 text-white p-5 rounded-3xl shadow-lg hover:bg-stone-700 transition flex flex-col justify-between h-28 group">
            <div className="flex justify-between items-start"><h2 className="text-sm font-bold">Wiki</h2><span className="text-xl group-hover:scale-110 transition-transform">📖</span></div>
            <p className="text-xs text-stone-400">Handbuch</p>
          </Link>
          <Link href="/trips" className="bg-white dark:bg-stone-900 text-stone-900 dark:text-white border border-stone-200 dark:border-stone-800 p-5 rounded-3xl shadow-sm hover:border-[#C5A38E] transition flex flex-col justify-between h-28 group">
            <div className="flex justify-between items-start"><h2 className="text-sm font-bold">Koffer</h2><span className="text-xl group-hover:scale-110 transition-transform">🧳</span></div>
            <p className="text-xs text-stone-500">Reisen</p>
          </Link>
          <Link href="/map" className="bg-[#C5A38E] text-white p-5 rounded-3xl shadow-lg hover:bg-[#A38572] transition flex flex-col justify-between h-28 group">
            <div className="flex justify-between items-start"><h2 className="text-sm font-bold">Weltkarte</h2><span className="text-xl group-hover:scale-110 transition-transform">🌍</span></div>
            <p className="text-xs text-white/80">Tracker</p>
          </Link>
          {/* Smart Home Button */}
          <Link href="/smarthome" className="bg-stone-900 text-white border border-stone-700 p-5 rounded-3xl shadow-lg hover:border-[#C5A38E] hover:shadow-[#C5A38E]/20 transition-all flex flex-col justify-between h-28 group relative overflow-hidden">
            <div className="absolute -right-2 -top-2 w-12 h-12 bg-[#C5A38E]/20 rounded-full blur-xl group-hover:bg-[#C5A38E]/40 transition-colors"></div>
            <div className="flex justify-between items-start relative z-10"><h2 className="text-sm font-bold text-[#C5A38E]">Smart Home</h2><span className="text-xl group-hover:scale-110 transition-transform">💡</span></div>
            <p className="text-xs text-stone-400 relative z-10">Zentrale</p>
          </Link>
        </div>

        {/* FINANZEN & FAIR SHARE */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <section className="bg-white dark:bg-stone-900 p-6 rounded-3xl shadow-sm border border-stone-100 dark:border-stone-800 space-y-6">
            <div>
              <h2 className="text-sm font-bold text-stone-400 uppercase mb-4">Dein Netto-Einkommen</h2>
              <form action={async (formData) => { "use server"; await updateNetIncome(parseFloat(formData.get("income") as string)); }} className="flex gap-2">
                <input name="income" type="number" step="0.01" placeholder={currentUser?.netIncome.toString()} className="flex-1 px-4 py-2 bg-stone-50 dark:bg-stone-950 dark:text-stone-200 rounded-xl outline-none border border-stone-100 dark:border-stone-800" />
                <button className="bg-stone-800 dark:bg-stone-700 text-white px-4 py-2 font-bold rounded-xl text-sm">Update</button>
              </form>
            </div>
            <div className="pt-4 border-t border-stone-100 dark:border-stone-800">
              <h2 className="text-sm font-bold text-stone-400 uppercase mb-4 flex justify-between">
                <span>Fair Share Verteilung</span>
                <span className="text-[#C5A38E]">Fixkosten: € {totalExpenses}</span>
              </h2>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-bold">{currentUser?.name}</span>
                    <span className="text-stone-500">{(mySharePct * 100).toFixed(0)}% (Soll: € {myFairCost.toFixed(0)})</span>
                  </div>
                  <div className="h-2 w-full bg-stone-100 dark:bg-stone-800 rounded-full flex"><div className="bg-stone-700 h-full" style={{ width: `${mySharePct * 100}%` }}></div></div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-bold">{partner?.name || 'Partner'}</span>
                    <span className="text-stone-500">{(partnerSharePct * 100).toFixed(0)}% (Soll: € {partnerFairCost.toFixed(0)})</span>
                  </div>
                  <div className="h-2 w-full bg-stone-100 dark:bg-stone-800 rounded-full flex"><div className="bg-[#C5A38E] h-full" style={{ width: `${partnerSharePct * 100}%` }}></div></div>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white dark:bg-stone-900 p-6 rounded-3xl shadow-sm border border-stone-100 dark:border-stone-800 flex flex-col">
            <h2 className="text-sm font-bold text-stone-400 uppercase mb-4">Fixkosten Eingabe</h2>
            <div className="flex-1 space-y-3 overflow-y-auto max-h-40 mb-4 pr-2">
              {obligations.map(ob => (
                <div key={ob.id} className="flex justify-between items-center text-sm border-b border-stone-50 dark:border-stone-800 pb-2">
                  <span className="text-stone-600 dark:text-stone-300">{ob.title}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-bold">€ {ob.amount}</span>
                    <form action={async () => { "use server"; await deleteObligation(ob.id); }}>
                      <button className="text-stone-300 hover:text-red-400">✕</button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
            <form action={async (formData) => { "use server"; await addObligation(formData.get("title") as string, parseFloat(formData.get("amount") as string)); }} className="flex gap-2 mt-auto">
              <input name="title" placeholder="Miete, Strom..." className="flex-1 text-sm p-3 bg-stone-50 dark:bg-stone-950 dark:text-stone-200 rounded-xl outline-none" required />
              <input name="amount" type="number" placeholder="€" className="w-20 text-sm p-3 bg-stone-50 dark:bg-stone-950 dark:text-stone-200 rounded-xl outline-none" required />
              <button className="p-3 bg-[#C5A38E] text-white rounded-xl text-sm font-bold">+</button>
            </form>
          </section>
        </div>

        {/* DAILY SYNC: Kassenbons */}
        <section className="bg-white dark:bg-stone-900 p-6 rounded-3xl shadow-sm border border-stone-100 dark:border-stone-800 flex flex-col h-full">
          <h2 className="text-sm font-bold text-stone-400 uppercase mb-4">Kassenbons (Dieser Monat)</h2>
          <div className="flex-1 space-y-3 overflow-y-auto max-h-48 mb-4 pr-2">
            {expenses.map(ex => (
              <div key={ex.id} className="flex justify-between items-center text-sm border-b border-stone-50 dark:border-stone-800 pb-2">
                <div className="flex flex-col">
                  <span className="font-medium text-stone-700 dark:text-stone-300">{ex.title}</span>
                  <span className="text-[10px] text-stone-400">{ex.user.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#C5A38E]">-€ {ex.amount}</span>
                  <form action={async () => { "use server"; await deleteExpense(ex.id); }}><button className="text-stone-300 hover:text-red-400">✕</button></form>
                </div>
              </div>
            ))}
          </div>
          <form action={async (formData) => { "use server"; await addExpense(formData.get("title") as string, parseFloat(formData.get("amount") as string)); }} className="flex gap-2 mt-auto">
            <input name="title" placeholder="Rewe, DM, Tanken..." className="flex-1 text-sm p-3 bg-stone-50 dark:bg-stone-950 rounded-xl outline-none border border-stone-100 dark:border-stone-800" required />
            <input name="amount" type="number" step="0.01" placeholder="€" className="w-24 text-sm p-3 bg-stone-50 dark:bg-stone-950 rounded-xl outline-none border border-stone-100 dark:border-stone-800" required />
            <button className="p-3 bg-stone-800 dark:bg-stone-700 text-white rounded-xl text-sm font-bold">+</button>
          </form>
        </section>

        {/* BUCKETLISTS */}
        <div className="pt-6 border-t border-stone-200 dark:border-stone-800 space-y-10">
          <section className="space-y-6">
            <h2 className="text-xs font-bold text-stone-400 uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400"></span> Gemeinsame Träume & Sinking Funds
            </h2>
            <div className="grid gap-6">
              {jointItems.map(item => {
                const isZeroTarget = item.price === 0;
                const progressPct = isZeroTarget ? 0 : Math.min((item.savedAmount / item.price) * 100, 100);
                const isReady = !isZeroTarget && progressPct >= 100;
                return (
                  <div key={item.id} className={`bg-white dark:bg-stone-900 p-6 rounded-3xl shadow-sm border ${isReady ? 'border-green-400' : 'border-stone-100 dark:border-stone-800'} relative`}>
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h3 className="text-xl font-bold text-stone-800 dark:text-stone-100">{item.title} {item.isSurprise ? '🎁' : ''}</h3>
                        <p className="text-sm text-stone-400">{isZeroTarget ? 'Offenes Ziel' : `Ziel: € ${item.price.toLocaleString('de-DE')}`}</p>
                      </div>
                      {isReady ? (
                        <form action={async () => { "use server"; await markItemCompleted(item.id); }}>
                          <button className="bg-green-500 text-white text-sm font-bold px-4 py-2 rounded-lg shadow-lg hover:bg-green-600 animate-pulse">Erlebt! ✓</button>
                        </form>
                      ) : (
                        <form action={async () => { "use server"; await deleteBucketItem(item.id); }}>
                          <button className="text-stone-300 dark:text-stone-600 hover:text-red-400 text-sm">Abbrechen</button>
                        </form>
                      )}
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-end">
                        <div className="text-[10px] uppercase font-bold tracking-tighter text-stone-400">
                          Gespart: € {item.savedAmount} {isZeroTarget ? '' : `/ ${progressPct.toFixed(0)}%`}
                        </div>
                        {!isReady && (
                          <form action={async (formData) => { "use server"; await addFundsToItem(item.id, parseFloat(formData.get("amount") as string)); }} className="flex gap-2">
                             <input name="amount" type="number" placeholder="50" className="w-14 text-xs p-1.5 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded outline-none text-center" required />
                             <button className="bg-stone-800 dark:bg-stone-700 text-white text-[10px] px-2 rounded hover:bg-[#C5A38E]">Einzahlen</button>
                          </form>
                        )}
                      </div>
                      {!isZeroTarget && (
                        <div className="h-3 w-full bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                          <div className={`h-full transition-all duration-1000 ${isReady ? 'bg-green-400' : 'bg-[#C5A38E]'}`} style={{ width: `${progressPct}%` }} />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <section className="space-y-4 opacity-80">
              <h2 className="text-xs font-bold text-stone-400 uppercase tracking-widest">Deine Liste</h2>
              <div className="grid gap-3">
                {myIndividualItems.map(item => (
                  <div key={item.id} className="bg-stone-50 dark:bg-stone-900/50 p-4 rounded-2xl border border-stone-200 dark:border-stone-800 flex justify-between items-center">
                    <div>
                      <p className="font-medium text-stone-600 dark:text-stone-400">{item.title} {item.isSurprise ? '🎁' : ''}</p>
                      <p className="text-xs text-stone-400">{item.price > 0 ? `€ ${item.price}` : 'Flex-Ziel'}</p>
                    </div>
                    <form action={async () => { "use server"; await deleteBucketItem(item.id); }}>
                      <button className="text-stone-400 hover:text-red-400">✕</button>
                    </form>
                  </div>
                ))}
              </div>
            </section>
            <section className="space-y-4">
              <h2 className="text-xs font-bold text-[#C5A38E] uppercase tracking-widest">Post von {partner?.name}</h2>
              <div className="grid gap-3">
                {partnerIndividualItems.map(item => (
                  <div key={item.id} className="bg-[#C5A38E]/5 dark:bg-[#C5A38E]/10 p-4 rounded-2xl border-2 border-dashed border-[#C5A38E]/30 flex justify-between items-center relative overflow-hidden">
                    {item.isSurprise && (
                       <div className="absolute inset-0 bg-stone-900/95 flex items-center justify-between p-4 z-10">
                          <span className="text-white font-bold text-sm flex items-center gap-2">🎁 Überraschung (€ {item.price})</span>
                          <form action={async () => { "use server"; await approveBucketItem(item.id); }}><button className="bg-[#C5A38E] text-white px-4 py-1.5 rounded-lg text-xs font-bold">Zustimmen</button></form>
                       </div>
                    )}
                    <div className={item.isSurprise ? "opacity-0" : ""}>
                      <p className="font-medium text-stone-800 dark:text-stone-200">{item.title}</p>
                      <p className="text-xs text-[#C5A38E] font-bold">{item.price > 0 ? `€ ${item.price}` : 'Flex-Ziel'}</p>
                    </div>
                    {!item.isSurprise && (
                      <form action={async () => { "use server"; await approveBucketItem(item.id); }}>
                        <button className="bg-[#C5A38E] text-white px-4 py-1.5 rounded-xl text-xs font-bold">👍 Zustimmen</button>
                      </form>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>

        {/* FLOATING ACTION BAR */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-lg z-50">
          <form action={async (formData) => { 
            "use server"; 
            await addBucketItem(
              formData.get("title") as string, 
              parseFloat(formData.get("price") as string) || 0,
              formData.get("isSurprise") === "on"
            ); 
          }} className="bg-stone-900/95 dark:bg-black/90 backdrop-blur-md p-3 rounded-2xl shadow-2xl flex flex-col gap-2 border border-stone-700/50">
            <div className="flex gap-2">
              <input name="title" placeholder="Neuer Traum / Ziel..." className="flex-1 bg-stone-800 border-none text-white text-sm px-4 py-2 rounded-xl outline-none" required />
              <input name="price" type="number" placeholder="€" className="w-24 bg-stone-800 border-none text-white text-sm px-3 py-2 rounded-xl outline-none" />
              <button type="submit" className="bg-[#C5A38E] text-white p-2 rounded-xl hover:bg-[#A38572] transition px-4 font-bold">+</button>
            </div>
            <label className="flex items-center gap-2 px-2 text-xs text-stone-400 cursor-pointer">
              <input type="checkbox" name="isSurprise" className="accent-[#C5A38E]" />
              Als Überraschung anfragen
            </label>
          </form>
        </div>
      </div>
    </div>
  );
}