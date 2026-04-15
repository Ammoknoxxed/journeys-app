import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { addGiftIdea, toggleGiftPurchased, deleteGiftIdea } from "@/lib/actions";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

export default async function GiftsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) redirect("/login");

  const gifts = await prisma.giftIdea.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } });

  return (
    <div className="min-h-screen bg-[#F9F7F5] dark:bg-stone-950 text-stone-900 dark:text-stone-100 p-4 md:p-8 transition-colors duration-300 pb-32">
      <div className="max-w-2xl mx-auto space-y-8">
        <header className="flex items-center justify-between pb-6 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-4">
            <Link href="/" className="w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 hover:bg-stone-50 transition">←</Link>
            <h1 className="text-3xl font-bold text-[#C5A38E]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Secret Gifts</h1>
          </div>
          <ThemeToggle />
        </header>

        <section className="bg-stone-900 text-white p-6 rounded-3xl shadow-xl">
          <h2 className="text-sm font-bold text-[#C5A38E] uppercase tracking-widest mb-2 flex items-center gap-2"><span>🤫</span> Streng Geheim</h2>
          <p className="text-xs text-stone-400 mb-6">Diese Liste ist nur für dich sichtbar.</p>
          
          <div className="space-y-4">
            {gifts.length === 0 ? <p className="text-stone-500 italic text-sm">Noch keine Ideen gesammelt.</p> : gifts.map(gift => (
              <div key={gift.id} className={`p-4 rounded-2xl border ${gift.isPurchased ? 'bg-stone-800/50 border-stone-700 opacity-60' : 'bg-stone-800 border-stone-700'}`}>
                <div className="flex justify-between items-start mb-2">
                  <p className={`font-bold ${gift.isPurchased ? 'line-through text-stone-500' : 'text-white'}`}>{gift.title}</p>
                  <form action={async () => { "use server"; await deleteGiftIdea(gift.id); }}><button className="text-stone-500 hover:text-red-400 text-sm">✕</button></form>
                </div>
                <div className="flex justify-between items-end">
                  <div className="text-xs text-stone-400 space-x-3">
                    {gift.price && <span>€ {gift.price}</span>}
                    {gift.url && <a href={gift.url} target="_blank" className="text-[#C5A38E] hover:underline">Link ↗</a>}
                  </div>
                  <form action={async () => { "use server"; await toggleGiftPurchased(gift.id, !gift.isPurchased); }}>
                    <button className={`text-xs px-3 py-1 rounded-lg font-bold ${gift.isPurchased ? 'bg-stone-700 text-stone-300' : 'bg-[#C5A38E] text-white'}`}>
                      {gift.isPurchased ? 'Gekauft ✓' : 'Als gekauft markieren'}
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </section>

        <form action={async (formData) => { "use server"; await addGiftIdea(formData.get("title") as string, formData.get("price") as string, formData.get("url") as string); }} className="bg-white dark:bg-stone-900 p-4 rounded-3xl shadow-sm border border-stone-100 dark:border-stone-800 flex flex-col gap-3">
          <input name="title" placeholder="Geschenk-Idee..." className="bg-stone-50 dark:bg-stone-950 p-3 rounded-xl outline-none text-sm" required />
          <div className="flex gap-2">
            <input name="price" type="number" placeholder="€" className="w-24 bg-stone-50 dark:bg-stone-950 p-3 rounded-xl outline-none text-sm" />
            <input name="url" type="url" placeholder="Link (optional)" className="flex-1 bg-stone-50 dark:bg-stone-950 p-3 rounded-xl outline-none text-sm" />
            <button type="submit" className="bg-stone-800 dark:bg-stone-700 text-white px-5 rounded-xl font-bold">+</button>
          </div>
        </form>
      </div>
    </div>
  );
}