import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { addTrip, deleteTrip } from "@/lib/actions";
import Link from "next/link";
import AppShell from "@/components/ui/AppShell";
import SubmitButton from "@/components/SubmitButton";

export default async function TripsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const trips = await prisma.trip.findMany({ orderBy: { date: 'asc' } });
  const upcomingTrips = trips.filter(t => new Date(t.date) >= new Date(new Date().setHours(0,0,0,0)));

  return (
    <AppShell title="Trips" subtitle="Schnellansicht geplanter Reisen." backHref="/" maxWidthClassName="max-w-3xl">
      <div className="space-y-8">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--muted-foreground)]">
          Kartenansicht mit allen Zielen: <Link className="font-semibold text-[var(--accent)] hover:underline" href="/map">zum Reisezentrum</Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {upcomingTrips.length === 0 ? <p className="text-stone-400 italic">Noch keine Reisen geplant.</p> : upcomingTrips.map(trip => {
             const daysLeft = Math.ceil((new Date(trip.date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
             return (
              <div key={trip.id} className="bg-white dark:bg-stone-900 p-6 rounded-3xl border border-stone-100 dark:border-stone-800 shadow-sm relative overflow-hidden group">
                <div className="absolute -right-4 -bottom-4 text-8xl opacity-5">🧳</div>
                <div className="flex justify-between items-start mb-4">
                  <span className="text-xs uppercase font-bold tracking-widest text-[#C5A38E] bg-[#C5A38E]/10 px-3 py-1 rounded-full">
                    {daysLeft === 0 ? "Heute!" : `In ${daysLeft} Tagen`}
                  </span>
                  <form action={async () => { "use server"; await deleteTrip(trip.id); }}>
                    <SubmitButton isIconOnly className="text-stone-300 hover:text-red-400 text-sm opacity-0 group-hover:opacity-100 transition-opacity">✕</SubmitButton>
                  </form>
                </div>
                <h2 className="text-2xl font-bold mb-1">{trip.destination}</h2>
                <p className="text-stone-500 font-medium text-sm">{trip.title}</p>
                <p className="text-xs text-stone-400 mt-4 border-t border-stone-100 dark:border-stone-800 pt-4">Abflug: {trip.date.toLocaleDateString('de-DE')}</p>
              </div>
            );
          })}
        </div>

        <form action={async (formData) => { "use server"; await addTrip(formData.get("title") as string, formData.get("destination") as string, formData.get("date") as string); }} className="bg-stone-900 p-6 rounded-3xl flex flex-col gap-3 mt-8 shadow-xl">
          <h2 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Neue Reise eintragen</h2>
          <input name="title" placeholder="Anlass (z.B. Sommerurlaub)" className="bg-stone-800 text-white p-3 rounded-xl outline-none text-sm" required />
          <div className="flex gap-2">
            <input name="destination" placeholder="Zielort (z.B. Rom)" className="flex-1 bg-stone-800 text-white p-3 rounded-xl outline-none text-sm" required />
            <input name="date" type="date" className="bg-stone-800 text-white p-3 rounded-xl outline-none text-sm" required />
            <SubmitButton className="bg-[#C5A38E] text-white px-6 rounded-xl font-bold hover:bg-[#A38572] transition">Packen!</SubmitButton>
          </div>
        </form>
      </div>
    </AppShell>
  );
}