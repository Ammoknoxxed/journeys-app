import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { 
  addBucketItem, approveBucketItem, deleteBucketItem, 
  addExpense, deleteExpense, addFundsToItem, markItemCompleted,
  addStickyNote, deleteStickyNote, consumePetFood, addPetFood,
  cleanLitterBox, addHealthEvent, deleteHealthEvent,
  updatePantryCount, addPantryItem, addEnergyReading, addSharedContact, deleteSharedContact
} from "@/lib/actions";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import { 
  LayoutDashboard, Wallet, ShoppingCart, Utensils, 
  Map, Heart, Lock, BookOpen, Calendar,
  Cat, CheckCircle2, TrendingUp, PiggyBank, ClipboardList,
  Plus, X, Check, Camera, MessageSquare, Zap, Phone, Timer, Star
} from "lucide-react";

// --- HELPERS ---
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

  // --- DATA FETCHING ---
  const allUsers = await prisma.user.findMany();
  const currentUser = allUsers.find(u => u.email === session.user?.email);
  const partner = allUsers.find(u => u.email !== session.user?.email);
  const obligations = await prisma.financialObligation.findMany();
  const openShoppingItemsCount = await prisma.shoppingItem.count({ where: { checked: false } });
  
  // Püppi & Dashboard Modules
  let petFood = await prisma.petFood.findFirst();
  if (!petFood) petFood = await prisma.petFood.create({ data: { cans: 10 } });
  const stickyNotes = await prisma.stickyNote.findMany({ orderBy: { createdAt: 'desc' }, take: 10 });
  const lastCleanBox1 = await prisma.litterBoxLog.findFirst({ where: { boxId: 1 }, orderBy: { createdAt: 'desc' } });
  const lastCleanBox2 = await prisma.litterBoxLog.findFirst({ where: { boxId: 2 }, orderBy: { createdAt: 'desc' } });
  const healthEvents = await prisma.petHealthEvent.findMany({ orderBy: { dueDate: 'asc' } });
  
  // New Modules Data
  const pantryItems = await prisma.pantryItem.findMany({ orderBy: { name: 'asc' } });
  const energyReadings = await prisma.energyReading.findMany({ orderBy: { date: 'desc' }, take: 5 });
  const contacts = await prisma.sharedContact.findMany({ orderBy: { role: 'asc' } });
  const nextTrip = await prisma.trip.findFirst({ where: { date: { gte: new Date() } }, orderBy: { date: 'asc' } });

  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const expenses = await prisma.expense.findMany({
    where: { date: { gte: startOfMonth } },
    include: { user: true },
    orderBy: { date: 'desc' }
  });

  // Weekly Recap Calculation
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const weeklyExpenses = expenses.filter(e => e.date >= sevenDaysAgo).reduce((sum, e) => sum + e.amount, 0);
  const choresDoneThisWeek = await prisma.chore.count({ where: { lastDoneAt: { gte: sevenDaysAgo } } });

  const allItems = await prisma.bucketItem.findMany({
    include: { creator: true, approver: true },
    orderBy: { createdAt: 'desc' }
  });

  // --- MATH ---
  const myIncome = currentUser?.netIncome || 0;
  const partnerIncome = partner?.netIncome || 0;
  const totalIncome = myIncome + partnerIncome;
  const totalExpenses = obligations.reduce((sum, ob) => sum + ob.amount, 0);
  const totalVariable = expenses.reduce((sum, ex) => sum + ex.amount, 0);
  const freeCashflow = totalIncome - totalExpenses - totalVariable;
  const mySharePct = totalIncome > 0 ? (myIncome / totalIncome) : 0.5;

  // Countdown Logic
  const daysUntilTrip = nextTrip ? Math.ceil((nextTrip.date.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null;

  return (
    <div className="min-h-screen bg-[#FDFCFB] dark:bg-stone-950 text-stone-900 dark:text-stone-100 pb-40 font-sans selection:bg-[#C5A38E]/30">
      
      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-[#FDFCFB]/80 dark:bg-stone-950/80 backdrop-blur-xl border-b border-stone-200/50 dark:border-stone-800/50 px-4 md:px-8 py-4 flex justify-between items-center">
        <h1 className="text-xl md:text-2xl font-bold tracking-tight" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
          Die Höhle <span className="text-[#C5A38E] font-light">HQ</span>
        </h1>
        <ThemeToggle />
      </header>

      <main className="max-w-6xl mx-auto px-4 md:px-8 mt-6 space-y-8">
        
        {/* TOP ROW: RECAP & COUNTDOWN */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Weekly Recap */}
          <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 p-6 rounded-[2.5rem] flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 mb-1">
                <Star size={16} />
                <span className="text-[10px] font-bold uppercase tracking-widest">Weekly Recap</span>
              </div>
              <p className="text-sm font-medium">Wir haben {choresDoneThisWeek} Aufgaben erledigt und € {weeklyExpenses.toFixed(0)} ausgegeben.</p>
            </div>
            <div className="h-12 w-12 bg-white dark:bg-stone-900 rounded-2xl flex items-center justify-center shadow-sm">
              <TrendingUp size={20} className="text-emerald-500" />
            </div>
          </div>

          {/* Urlaub Countdown */}
          <div className="bg-[#C5A38E] text-white p-6 rounded-[2.5rem] flex items-center justify-between shadow-lg relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center gap-2 opacity-80 mb-1">
                <Timer size={16} />
                <span className="text-[10px] font-bold uppercase tracking-widest">Nächster Trip: {nextTrip?.destination || 'Noch offen'}</span>
              </div>
              <p className="text-2xl font-light tracking-tight">{daysUntilTrip !== null ? `Noch ${daysUntilTrip} Tage bis zum Abflug!` : 'Plane dein nächstes Abenteuer'}</p>
            </div>
            <Map size={40} className="opacity-20 absolute -right-2 -bottom-2" />
          </div>
        </section>

        {/* MIDDLE SECTION: PANTRY & ENERGY */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          
          {/* Vorratsschrank (Pantry) */}
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-[2.5rem] p-6 shadow-sm flex flex-col h-[400px]">
            <div className="flex items-center gap-2 mb-4">
              <ShoppingCart size={18} className="text-[#C5A38E]" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-stone-400">Pantry Inventory</h3>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
              {pantryItems.map(item => (
                <div key={item.id} className="flex justify-between items-center p-3 bg-stone-50 dark:bg-stone-800/50 rounded-2xl">
                  <span className={`text-sm ${item.count <= item.minCount ? 'text-rose-500 font-bold' : ''}`}>{item.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold tabular-nums">{item.count}</span>
                    <div className="flex gap-1">
                      <form action={async () => { "use server"; await updatePantryCount(item.id, -1); }}><button className="w-8 h-8 bg-white dark:bg-stone-800 rounded-lg text-xs hover:bg-rose-50 hover:text-rose-500 shadow-sm transition-colors">-</button></form>
                      <form action={async () => { "use server"; await updatePantryCount(item.id, 1); }}><button className="w-8 h-8 bg-stone-900 dark:bg-stone-700 text-white rounded-lg text-xs shadow-sm">+</button></form>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <form action={async (formData) => { "use server"; await addPantryItem(formData.get("name") as string, 1); }} className="mt-4 flex gap-2">
              <input name="name" placeholder="Kaffee, Klopapier..." className="flex-1 h-10 bg-stone-50 dark:bg-stone-950 px-4 rounded-xl text-xs outline-none" required />
              <button className="w-10 h-10 bg-[#C5A38E] text-white rounded-xl flex items-center justify-center shadow-sm">+</button>
            </form>
          </div>

          {/* Energy Predictor */}
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-[2.5rem] p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4 text-amber-500">
                <Zap size={18} />
                <h3 className="text-xs font-bold uppercase tracking-widest text-stone-400">Energy Tracker</h3>
              </div>
              <div className="space-y-3">
                {energyReadings.map(r => (
                  <div key={r.id} className="flex justify-between items-center text-sm border-b border-stone-100 dark:border-stone-800 pb-2">
                    <span className="text-stone-500">{new Date(r.date).toLocaleDateString('de-DE', { month: 'short', day: '2-digit' })}</span>
                    <span className="font-bold tabular-nums">{r.value} kWh</span>
                    <span className="text-[10px] uppercase font-bold text-[#C5A38E]">{r.type}</span>
                  </div>
                ))}
              </div>
            </div>
            <form action={async (formData) => { "use server"; await addEnergyReading("STROM", parseFloat(formData.get("val") as string)); }} className="mt-4 flex gap-2">
              <input name="val" type="number" step="0.1" placeholder="Zählerstand..." className="flex-1 h-12 bg-stone-50 dark:bg-stone-950 px-4 rounded-xl text-xs outline-none" required />
              <button className="px-4 h-12 bg-amber-500 text-white rounded-xl text-xs font-bold shadow-sm">Save</button>
            </form>
          </div>

          {/* Shared Contacts */}
          <div className="bg-stone-900 text-white rounded-[2.5rem] p-6 shadow-lg flex flex-col h-[400px]">
            <div className="flex items-center gap-2 mb-4 text-[#C5A38E]">
              <Phone size={18} />
              <h3 className="text-xs font-bold uppercase tracking-widest">Shared Contacts</h3>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
              {contacts.map(c => (
                <div key={c.id} className="p-3 bg-stone-800 rounded-2xl border border-stone-700/50">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold text-[#C5A38E] uppercase">{c.role}</span>
                    <form action={async () => { "use server"; await deleteSharedContact(c.id); }}><button className="text-stone-500 hover:text-rose-400"><X size={12}/></button></form>
                  </div>
                  <p className="text-sm font-bold mt-1">{c.name}</p>
                  <p className="text-[10px] text-stone-400 mt-1">{c.phone || c.email || 'Keine Daten'}</p>
                </div>
              ))}
            </div>
            <form action={async (formData) => { "use server"; await addSharedContact(formData.get("n") as string, formData.get("r") as string, formData.get("p") as string); }} className="mt-4 grid grid-cols-2 gap-2">
              <input name="n" placeholder="Name" className="bg-stone-800 px-3 h-10 rounded-xl text-[10px] outline-none" required />
              <input name="r" placeholder="Rolle" className="bg-stone-800 px-3 h-10 rounded-xl text-[10px] outline-none" required />
              <input name="p" placeholder="Tel/Mail" className="col-span-2 bg-stone-800 px-3 h-10 rounded-xl text-[10px] outline-none" />
              <button className="col-span-2 h-10 bg-[#C5A38E] text-white rounded-xl text-[10px] font-bold shadow-sm">Add Contact</button>
            </form>
          </div>

        </section>

        {/* BOTTOM SECTION: STICKY NOTES & CARE CENTER */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          
          {/* Schwarzes Brett (IMAGE FIX) */}
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-[2.5rem] p-6 shadow-sm flex flex-col h-[500px]">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare size={18} className="text-[#C5A38E]" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-stone-400">Das Schwarze Brett</h3>
            </div>
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
              {stickyNotes.map(note => (
                <div key={note.id} className="bg-stone-50 dark:bg-stone-800/40 p-4 rounded-[2rem] border border-stone-100 dark:border-stone-800 relative group">
                  <div className="flex justify-between mb-2">
                    <span className="text-[10px] font-bold text-[#C5A38E]">{note.author}</span>
                    <form action={async () => { "use server"; await deleteStickyNote(note.id); }}><button className="opacity-0 group-hover:opacity-100 text-stone-300 hover:text-rose-500 transition-all"><X size={14}/></button></form>
                  </div>
                  {note.text && <p className="text-sm">{note.text}</p>}
                  {note.imageUrl && (
                    <div className="mt-3 rounded-2xl overflow-hidden border border-stone-200 dark:border-stone-700 shadow-sm">
                      <img src={note.imageUrl} alt="Sticky" className="w-full h-auto max-h-48 object-cover" />
                    </div>
                  )}
                </div>
              ))}
            </div>
            <form action={addStickyNote} className="mt-4 flex gap-2">
              <input name="text" placeholder="Notiz hinterlassen..." className="flex-1 h-12 bg-stone-50 dark:bg-stone-950 px-5 rounded-2xl outline-none text-sm" />
              <label className="w-12 h-12 bg-stone-100 dark:bg-stone-800 rounded-2xl flex items-center justify-center cursor-pointer hover:bg-[#C5A38E] hover:text-white transition-all shadow-sm">
                <Camera size={20} /><input type="file" name="file" className="hidden" />
              </label>
              <button className="px-6 h-12 bg-[#C5A38E] text-white rounded-2xl font-bold shadow-md hover:bg-[#A38572] transition-all">Senden</button>
            </form>
          </div>

          {/* Püppis Care Center */}
          <div className="bg-stone-900 text-white rounded-[2.5rem] p-6 shadow-xl flex flex-col justify-between">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-2 text-[#C5A38E]">
                <Cat size={24} />
                <h3 className="text-sm font-bold uppercase tracking-[0.2em]">Püppi's Care Center</h3>
              </div>
              <div className="text-right">
                <p className="text-3xl font-light text-white">{petFood.cans}</p>
                <p className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">Dosen</p>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <div className={`flex justify-between items-center p-4 rounded-[1.5rem] border ${getHygieneStatus(lastCleanBox1?.createdAt).bg} transition-all`}>
                <span className="text-sm font-bold">Haupt-Klo</span>
                <form action={async () => { "use server"; await cleanLitterBox(1); }}><button className="h-10 w-10 bg-white/10 rounded-xl hover:bg-white/20 flex items-center justify-center transition-all">✓</button></form>
              </div>
              <div className={`flex justify-between items-center p-4 rounded-[1.5rem] border ${getHygieneStatus(lastCleanBox2?.createdAt).bg} transition-all`}>
                <span className="text-sm font-bold">Zweit-Klo</span>
                <form action={async () => { "use server"; await cleanLitterBox(2); }}><button className="h-10 w-10 bg-white/10 rounded-xl hover:bg-white/20 flex items-center justify-center transition-all">✓</button></form>
              </div>
            </div>

            <div className="flex gap-2">
              <form action={consumePetFood} className="flex-1"><button className="w-full h-12 bg-stone-800 rounded-2xl text-xs font-bold hover:bg-rose-500/20 transition-all">-1 Dose</button></form>
              <form action={async () => { "use server"; await addPetFood(6); }} className="flex-1"><button className="w-full h-12 bg-[#C5A38E] text-stone-900 rounded-2xl text-xs font-bold hover:bg-[#A38572] transition-all">+6 Dosen</button></form>
            </div>
          </div>

        </section>

      </main>
      
      {/* IOS DYNAMIC BAR */}
      <div className="fixed bottom-6 left-0 right-0 px-4 pointer-events-none z-50 flex justify-center">
        <form action={async (formData) => { 
          "use server"; 
          await addBucketItem(formData.get("title") as string, parseFloat(formData.get("price") as string) || 0, formData.get("isSurprise") === "on"); 
        }} className="w-full max-w-md bg-white/90 dark:bg-stone-900/90 backdrop-blur-xl p-4 rounded-[2rem] shadow-2xl border border-stone-200/50 dark:border-stone-700/50 pointer-events-auto flex flex-col gap-3 transition-transform hover:scale-[1.01]">
          <div className="flex gap-2">
            <input name="title" placeholder="Neuer Wunsch..." className="flex-1 h-12 bg-stone-100/50 dark:bg-black/20 px-5 rounded-2xl outline-none text-sm" required />
            <input name="price" type="number" placeholder="€" className="w-20 h-12 bg-stone-100/50 dark:bg-black/20 rounded-2xl outline-none text-center text-sm" />
            <button className="w-12 h-12 bg-[#C5A38E] text-white rounded-2xl shadow-md flex items-center justify-center"><Plus size={24}/></button>
          </div>
        </form>
      </div>

    </div>
  );
}