// src/app/timeline/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { addTimelineEvent, deleteTimelineEvent } from "@/lib/actions";
import SubmitButton from "@/components/SubmitButton";
import AppShell from "@/components/ui/AppShell";

export default async function TimelinePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const events = await prisma.timelineEvent.findMany({ orderBy: { date: 'asc' } });

  return (
    <AppShell title="Kalender" subtitle="Alle Termine und Erinnerungen an einem Ort." backHref="/" maxWidthClassName="max-w-2xl">
      <div className="space-y-8">

        <div className="bg-white dark:bg-stone-900 p-6 rounded-3xl shadow-sm border border-stone-100 dark:border-stone-800 mb-8">
          <h2 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4">Termin hinzufügen</h2>
          <form action={async (formData) => { "use server"; await addTimelineEvent(formData.get("title") as string, formData.get("date") as string, formData.get("type") as string); }} className="flex flex-col gap-3">
            <input name="title" placeholder="Was steht an? (z.B. Zahnarzt, Mülltonne, Jahrestag)" className="bg-stone-50 dark:bg-stone-950 p-3 rounded-xl outline-none text-sm" required />
            <div className="flex gap-2">
              <input name="date" type="date" className="flex-1 bg-stone-50 dark:bg-stone-950 p-3 rounded-xl outline-none text-sm" required />
              <select name="type" className="flex-1 bg-stone-50 dark:bg-stone-950 p-3 rounded-xl outline-none text-sm font-bold text-[#C5A38E]">
                <option value="EVENT">📅 Termin / Event</option>
                <option value="MEETING">☕ Treffen / Besuch</option>
                <option value="BIRTHDAY">🎂 Geburtstag</option>
                <option value="DOCTOR">🏥 Arzttermin</option>
                <option value="REMINDER">🔔 Erinnerung (Müll etc.)</option>
                <option value="PAYMENT">💸 Zahlung fällig</option>
                <option value="MILESTONE">💖 Meilenstein</option>
                <option value="DEADLINE">🚨 Deadline</option>
              </select>
              <SubmitButton className="rounded-xl bg-stone-800 px-5 font-bold text-white transition hover:bg-stone-600 dark:bg-stone-700">+</SubmitButton>
            </div>
          </form>
        </div>

        <div className="relative border-l-2 border-stone-200 dark:border-stone-800 ml-4 space-y-8">
          {events.length === 0 ? <p className="ml-6 text-stone-500 italic">Keine Einträge.</p> : events.map(ev => {
             // Termine von gestern oder älter werden ausgegraut
             const isFutureOrToday = new Date(ev.date) >= new Date(new Date().setHours(0,0,0,0));
             return (
              <div key={ev.id} className={`ml-6 relative ${isFutureOrToday ? 'opacity-100' : 'opacity-40'}`}>
                <div className="absolute -left-[33px] top-1 w-4 h-4 rounded-full border-4 border-[#F9F7F5] dark:border-stone-950 bg-stone-400"></div>
                <div className="bg-white dark:bg-stone-900 p-4 rounded-2xl border border-stone-100 dark:border-stone-800 shadow-sm flex justify-between items-start">
                  <div>
                    <div className="flex gap-2 items-center mb-1">
                      <p className="text-xs font-bold text-[#C5A38E]">{ev.date.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
                      <span className="text-[9px] uppercase font-bold text-stone-400 bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded">{ev.type}</span>
                    </div>
                    <p className="font-bold">{ev.title}</p>
                  </div>
                  <form action={async () => { "use server"; await deleteTimelineEvent(ev.id); }}><SubmitButton isIconOnly className="text-xs text-stone-300 hover:text-red-400">✕</SubmitButton></form>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}