// src/components/widgets/FinanceWidget.tsx
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Wallet, X } from "lucide-react";
import SubmitButton from "@/components/SubmitButton";
import { getStatsStartDate } from "@/lib/dateConfig";
import { 
  addIncome, deleteIncome, addObligation, deleteObligation, 
  addExpense, deleteExpense, updateNetIncome 
} from "@/lib/actions";

export default async function FinanceWidget() {
  const session = await getServerSession(authOptions);
  
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const systemStartDate = getStatsStartDate();

  const [allUsers, obligations, currentMonthExpenses, allItems, expenseAgg, incomeAgg, tripAgg, currentMonthIncomes] = await Promise.all([
    prisma.user.findMany(),
    prisma.financialObligation.findMany(),
    prisma.expense.findMany({ where: { date: { gte: startOfMonth } }, orderBy: { date: 'desc' } }),
    prisma.bucketItem.findMany(),
    prisma.expense.aggregate({ where: { date: { gte: systemStartDate } }, _sum: { amount: true } }),
    prisma.income.aggregate({ where: { date: { gte: systemStartDate } }, _sum: { amount: true } }),
    prisma.trip.aggregate({ _sum: { savedAmount: true } }),
    prisma.income.findMany({ where: { date: { gte: startOfMonth } }, orderBy: { date: 'desc' } })
  ]);

  const currentUser = allUsers.find(u => u.email === session?.user?.email);
  const partner = allUsers.find(u => u.email !== session?.user?.email);

  const now = new Date();
  let monthsActive =
    (now.getFullYear() - systemStartDate.getFullYear()) * 12 +
    (now.getMonth() - systemStartDate.getMonth()) +
    1;
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

  return (
    <>
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
                   <SubmitButton className="bg-[#C5A38E] text-white py-2 rounded-xl text-[10px] font-bold hover:bg-[#A38572] mt-1">Speichern</SubmitButton>
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
                        <form action={async () => { "use server"; await deleteIncome(inc.id); }}><SubmitButton isIconOnly className="opacity-0 group-hover:opacity-100 text-rose-500 transition-all"><X size={12}/></SubmitButton></form>
                    </div>
                  </div>
                ))}
            </div>
            <form action={async (formData) => { "use server"; await addIncome(formData.get("title") as string, parseFloat(formData.get("amount") as string)); }} className="mt-auto pt-4 border-t border-stone-800/50 flex flex-col gap-2">
                <input name="title" placeholder="Gehalt..." className="w-full bg-stone-800 border-none text-[10px] px-3 py-2.5 rounded-xl outline-none focus:ring-1 focus:ring-emerald-500" required />
                <div className="flex gap-2">
                  <input name="amount" type="number" step="0.01" placeholder="€ Betrag" className="flex-1 bg-stone-800 border-none text-[10px] px-3 py-2.5 rounded-xl outline-none focus:ring-1 focus:ring-emerald-500" required />
                  <SubmitButton className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-[10px] font-bold hover:bg-emerald-500 transition-colors">Hinzufügen</SubmitButton>
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
                        <form action={async () => { "use server"; await deleteObligation(ob.id); }}><SubmitButton isIconOnly className="opacity-0 group-hover:opacity-100 text-stone-600 hover:text-rose-500 transition-all"><X size={12}/></SubmitButton></form>
                    </div>
                  </div>
                ))}
            </div>
            <form action={async (formData) => { "use server"; await addObligation(formData.get("title") as string, parseFloat(formData.get("amount") as string)); }} className="mt-auto pt-4 border-t border-stone-800/50 flex flex-col gap-2">
                <input name="title" placeholder="Miete, Strom..." className="w-full bg-stone-800 border-none text-[10px] px-3 py-2.5 rounded-xl outline-none focus:ring-1 focus:ring-[#C5A38E]" required />
                <div className="flex gap-2">
                  <input name="amount" type="number" step="0.01" placeholder="€ Betrag" className="flex-1 bg-stone-800 border-none text-[10px] px-3 py-2.5 rounded-xl outline-none focus:ring-1 focus:ring-[#C5A38E]" required />
                  <SubmitButton className="bg-[#C5A38E] text-stone-900 px-4 py-2.5 rounded-xl text-[10px] font-bold hover:bg-[#A38572] transition-colors">Hinzufügen</SubmitButton>
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
                        <form action={async () => { "use server"; await deleteExpense(ex.id); }}><SubmitButton isIconOnly className="opacity-0 group-hover:opacity-100 text-stone-600 hover:text-rose-500 transition-all"><X size={12}/></SubmitButton></form>
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
                  <SubmitButton className="bg-[#C5A38E] text-stone-900 px-4 py-2.5 rounded-xl text-[10px] font-bold hover:bg-[#A38572] transition-colors">+</SubmitButton>
                </div>
            </form>
          </div>
      </section>
    </>
  );
}