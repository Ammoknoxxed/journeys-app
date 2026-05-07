import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { addSubscription, deleteSubscription } from "@/lib/actions";
import SubmitButton from "@/components/SubmitButton";
import AppShell from "@/components/ui/AppShell";

export default async function SubscriptionsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const subs = await prisma.subscription.findMany({ orderBy: { amount: 'desc' } });
  const monthlyTotal = subs.reduce((sum, sub) => sum + (sub.cycle === "YEARLY" ? sub.amount / 12 : sub.amount), 0);

  return (
    <AppShell title="Abo-Radar" subtitle="Laufende Kosten immer im Blick." backHref="/" maxWidthClassName="max-w-2xl">
      <div className="space-y-8">

        <section className="bg-stone-900 text-white p-8 rounded-3xl shadow-xl flex justify-between items-center">
          <div>
            <h2 className="text-xs uppercase font-bold text-stone-400 tracking-widest mb-1">Monatliche Belastung</h2>
            <p className="text-4xl font-bold text-[#C5A38E]">€ {monthlyTotal.toFixed(2)}</p>
          </div>
          <div className="text-5xl opacity-20">📡</div>
        </section>

        <div className="space-y-3">
          {subs.length === 0 ? <p className="text-stone-500 italic">Keine Abos gefunden.</p> : subs.map(sub => (
            <div key={sub.id} className="bg-white dark:bg-stone-900 p-4 rounded-2xl border border-stone-100 dark:border-stone-800 flex justify-between items-center shadow-sm">
              <div>
                <p className="font-bold">{sub.title}</p>
                <p className="text-xs text-stone-400">{sub.cycle === "YEARLY" ? `Jährlich (€ ${sub.amount})` : 'Monatlich'}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-bold text-[#C5A38E]">€ {sub.cycle === "YEARLY" ? (sub.amount / 12).toFixed(2) : sub.amount} <span className="text-[10px] text-stone-400">/mo</span></span>
                <form action={async () => { "use server"; await deleteSubscription(sub.id); }}><SubmitButton isIconOnly className="text-stone-300 hover:text-red-400 text-sm">✕</SubmitButton></form>
              </div>
            </div>
          ))}
        </div>

        <form action={async (formData) => { "use server"; await addSubscription(formData.get("title") as string, parseFloat(formData.get("amount") as string), formData.get("cycle") as string); }} className="flex gap-2 pt-6 border-t border-stone-200 dark:border-stone-800">
          <input name="title" placeholder="Netflix, Gym..." className="flex-1 bg-white dark:bg-stone-900 p-3 rounded-xl outline-none border border-stone-200 dark:border-stone-800 text-sm" required />
          <input name="amount" type="number" step="0.01" placeholder="€ Preis" className="w-24 bg-white dark:bg-stone-900 p-3 rounded-xl outline-none border border-stone-200 dark:border-stone-800 text-sm" required />
          <select name="cycle" className="bg-white dark:bg-stone-900 p-3 rounded-xl outline-none border border-stone-200 dark:border-stone-800 text-sm">
            <option value="MONTHLY">Pro Monat</option>
            <option value="YEARLY">Pro Jahr</option>
          </select>
          <SubmitButton className="rounded-xl bg-stone-800 px-5 font-bold text-white dark:bg-stone-700">+</SubmitButton>
        </form>
      </div>
    </AppShell>
  );
}