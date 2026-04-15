import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { addTimelineEvent, deleteTimelineEvent } from "@/lib/actions";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

export default async function TimelinePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const events = await prisma.timelineEvent.findMany({ orderBy: { date: 'asc' } });

  return (
    <div className="min-h-screen bg-[#F9F7F5] dark:bg-stone-950 text-stone-900 dark:text-stone-100 p-4 md:p-8 transition-colors duration-300">
      <div className="max-w-2xl mx-auto space-y-8">
        <header className="flex items-center justify-between pb-6 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-4">
            <Link href="/" className="w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 hover:bg-stone-50 transition">←</Link>
            <h1 className="text-3xl font-bold text-[#C5A38E]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Kalender</h1>
          </div>
          <ThemeToggle />
        </header>

        <div className="bg-white dark:bg-stone-900 p-4 rounded-3xl shadow-sm border border-stone-100 dark:border-stone-800 mb-8">
          <form action={async (formData) => { "use server"; await addTimelineEvent(formData.get("title") as string, formData.get("date") as string, formData.get("type") as string); }} className="flex flex-col gap-3">
            <input name="title" placeholder="Ereignis (z.B. Urlaub, Mülltonne...)" className="bg-stone-50 dark:bg-stone-950 p-3 rounded-xl outline-none text-sm" required />
            <div className="flex gap-2">
              <input name="date" type="date" className="bg-stone-50 dark:bg-stone-950 p-3 rounded-xl outline-none text-sm" required />
              <select name="type" className="bg-stone-50 dark:bg-stone-950 p-3 rounded-xl outline-none text-sm font-bold text-[#C5A38E]">
                <option value="EVENT">📅 Event</option>
                <option value="MILESTONE">💖 Meilenstein</option>
                <option value="DEADLINE">🚨 Deadline</option>
              </select>
              <button type="submit" className="bg-stone-800 dark:bg-stone-700 text-white px-5 rounded-xl font-bold hover:bg-stone-600">+</button>
            </div>
          </form>
        </div>

        <div className="relative border-l-2 border-stone-200 dark:border-stone-800 ml-4 space-y-8">
          {events.length === 0 ? <p className="ml-6 text-stone-500 italic">Keine Einträge.</p> : events.map(ev => {
             const isFuture = new Date(ev.date) >= new Date(new Date().setHours(0,0,0,0));
             return (
              <div key={ev.id} className={`ml-6 relative ${isFuture ? 'opacity-100' : 'opacity-40'}`}>
                <div className={`absolute -left-[33px] top-1 w-4 h-4 rounded-full border-4 border-[#F9F7F5] dark:border-stone-950 ${ev.type === 'MILESTONE' ? 'bg-[#C5A38E]' : ev.type === 'DEADLINE' ? 'bg-red-400' : 'bg-stone-400'}`}></div>
                <div className="bg-white dark:bg-stone-900 p-4 rounded-2xl border border-stone-100 dark:border-stone-800 shadow-sm flex justify-between items-start">
                  <div>
                    <p className="text-xs font-bold text-[#C5A38E] mb-1">{ev.date.toLocaleDateString('de-DE')}</p>
                    <p className="font-bold">{ev.title}</p>
                  </div>
                  <form action={async () => { "use server"; await deleteTimelineEvent(ev.id); }}><button className="text-stone-300 hover:text-red-400 text-xs">✕</button></form>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}