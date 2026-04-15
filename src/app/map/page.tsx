import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { addTravelPoint } from "@/lib/actions";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

export default async function MapPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const points = await prisma.travelPoint.findMany({ orderBy: { createdAt: 'desc' } });
  const visited = points.filter(p => p.type === "VISITED");
  const goals = points.filter(p => p.type === "WANT_TO_GO");

  return (
    <div className="min-h-screen bg-[#F9F7F5] dark:bg-stone-950 text-stone-900 dark:text-stone-100 p-4 md:p-8 transition-colors duration-300 pb-32">
      <div className="max-w-2xl mx-auto space-y-8">
        <header className="flex items-center justify-between pb-6 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-4">
            <Link href="/" className="w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 hover:bg-stone-50 transition">←</Link>
            <h1 className="text-3xl font-bold text-[#C5A38E]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Weltkarte</h1>
          </div>
          <ThemeToggle />
        </header>

        <section className="bg-white dark:bg-stone-900 p-8 rounded-3xl shadow-xl relative overflow-hidden border border-stone-100 dark:border-stone-800">
          <div className="absolute top-0 right-0 p-4 opacity-5 text-9xl">🌍</div>
          <div className="grid grid-cols-2 gap-8 relative z-10">
            <div>
              <h2 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4">Schon besucht 📍</h2>
              <ul className="space-y-2">
                {visited.map(p => <li key={p.id} className="text-lg font-bold">✓ {p.name}</li>)}
              </ul>
            </div>
            <div>
              <h2 className="text-xs font-bold text-[#C5A38E] uppercase tracking-widest mb-4">Träume ✈️</h2>
              <ul className="space-y-2">
                {goals.map(p => <li key={p.id} className="text-lg font-bold text-stone-400 dark:text-stone-500">{p.name}</li>)}
              </ul>
            </div>
          </div>
        </section>

        <form action={async (formData) => { "use server"; await addTravelPoint(formData.get("name") as string, formData.get("type") as string); }} className="bg-stone-900 p-6 rounded-3xl flex flex-col gap-4 shadow-xl">
          <input name="name" placeholder="Ort/Land eingeben..." className="bg-stone-800 text-white p-3 rounded-xl outline-none" required />
          <div className="flex gap-2">
            <button name="type" value="VISITED" className="flex-1 bg-stone-700 hover:bg-stone-600 text-white p-3 rounded-xl font-bold transition">War ich schon!</button>
            <button name="type" value="WANT_TO_GO" className="flex-1 bg-[#C5A38E] hover:bg-[#A38572] text-white p-3 rounded-xl font-bold transition">Da will ich hin!</button>
          </div>
        </form>
      </div>
    </div>
  );
}