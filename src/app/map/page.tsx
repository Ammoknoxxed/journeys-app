// src/app/map/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { addTravelPoint, addTrip, deleteTravelPoint, deleteTrip } from "@/lib/actions";
import AppShell from "@/components/ui/AppShell";
import Card from "@/components/ui/Card";
import SubmitButton from "@/components/SubmitButton";
import TravelMapPanel from "@/components/TravelMapPanel";
import { MapPin, Plane, Map as MapIcon, Trash2 } from "lucide-react";

type MappedTravelPoint = {
  id: string;
  name: string;
  type: "VISITED" | "WANT_TO_GO" | "TRIP";
  lat: number;
  lng: number;
};

async function geocodeLocation(name: string) {
  const query = encodeURIComponent(name);
  const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`, {
    headers: { "User-Agent": "hoehlehq-map/1.0" },
    next: { revalidate: 86400 },
  });
  if (!response.ok) return null;
  const result = (await response.json()) as Array<{ lat: string; lon: string }>;
  if (!result.length) return null;
  return { lat: Number(result[0].lat), lng: Number(result[0].lon) };
}

export default async function MapPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  const points = await prisma.travelPoint.findMany({ orderBy: { createdAt: 'desc' } });
  const visited = points.filter(p => p.type === "VISITED");
  const goals = points.filter(p => p.type === "WANT_TO_GO");
  const plannedTrips = await prisma.trip.findMany({ orderBy: { date: 'asc' } });

  const pointSources: Array<{ id: string; name: string; type: "VISITED" | "WANT_TO_GO" | "TRIP" }> = [
    ...points.map((point) => ({ id: point.id, name: point.name, type: point.type as "VISITED" | "WANT_TO_GO" })),
    ...plannedTrips.map((trip) => ({ id: `trip-${trip.id}`, name: trip.destination, type: "TRIP" as const })),
  ];

  const uniqueNames = Array.from(new Set(pointSources.map((point) => point.name.trim()).filter(Boolean)));
  const coordinatesByName = new Map<string, { lat: number; lng: number }>();
  const geocoded = await Promise.all(uniqueNames.map(async (name) => ({ name, coords: await geocodeLocation(name) })));
  geocoded.forEach((entry) => {
    if (entry.coords) coordinatesByName.set(entry.name, entry.coords);
  });

  const mapPoints: MappedTravelPoint[] = pointSources
    .map((point) => {
      const coords = coordinatesByName.get(point.name);
      if (!coords) return null;
      return { ...point, lat: coords.lat, lng: coords.lng };
    })
    .filter((point): point is MappedTravelPoint => Boolean(point));

  return (
    <AppShell title="Reisezentrum" subtitle="Trips planen und Ziele auf echter Karte sehen." backHref="/" maxWidthClassName="max-w-5xl">
      <div className="space-y-8 pb-20">
        <Card className="p-2">
          <TravelMapPanel points={mapPoints} />
          {mapPoints.length === 0 ? (
            <p className="px-4 pb-4 pt-3 text-xs text-[var(--muted-foreground)]">
              Noch keine geocodierbaren Orte gefunden. Nutze klare Ortsnamen wie `Rom, Italien`.
            </p>
          ) : null}
        </Card>

        <section className="relative overflow-hidden rounded-3xl bg-stone-900 p-8 text-white shadow-xl">
          <div className="absolute top-0 right-0 p-4 opacity-5 text-9xl"><Plane /></div>
          <div className="relative z-10">
            <h2 className="text-sm font-bold text-[#C5A38E] uppercase tracking-widest mb-6">Gebuchte Reisen</h2>
            
            <div className="space-y-3 mb-8">
              {plannedTrips.length === 0 && <p className="text-xs text-stone-400 italic">Noch keine Reise gebucht.</p>}
              {plannedTrips.map(trip => (
                <div key={trip.id} className="bg-stone-800 p-4 rounded-2xl border border-stone-700 flex justify-between items-center group">
                  <div>
                    <p className="font-bold">{trip.title} <span className="text-stone-400 font-normal">({trip.destination})</span></p>
                    <p className="text-[10px] text-stone-400 uppercase mt-1">
                      Datum: {trip.date.toLocaleDateString('de-DE')} | Budget-Topf: <span className="text-[#C5A38E] font-bold">€{trip.savedAmount}</span>
                    </p>
                  </div>
                  <form action={async () => { "use server"; await deleteTrip(trip.id); }}>
                    <SubmitButton isIconOnly className="p-2 text-stone-500 transition-colors hover:text-rose-500"><Trash2 size={16} /></SubmitButton>
                  </form>
                </div>
              ))}
            </div>

            <form action={async (formData) => { "use server"; await addTrip(formData.get("title") as string, formData.get("dest") as string, formData.get("date") as string, parseFloat(formData.get("amount") as string) || 0); }} className="bg-black/30 p-4 rounded-2xl flex flex-col gap-3">
               <h3 className="text-[10px] uppercase font-bold text-stone-500">Neue Reise anlegen (Countdown startet sofort)</h3>
               <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <input name="title" placeholder="Titel (z.B. Sommerurlaub)" className="bg-stone-800 px-3 py-2 rounded-xl text-xs outline-none" required />
                  <input name="dest" placeholder="Ort (z.B. Italien)" className="bg-stone-800 px-3 py-2 rounded-xl text-xs outline-none" required />
                  <input name="date" type="date" className="bg-stone-800 px-3 py-2 rounded-xl text-xs outline-none" required />
                  <input name="amount" type="number" placeholder="Budget in € (optional)" className="bg-stone-800 px-3 py-2 rounded-xl text-xs outline-none" />
               </div>
               <SubmitButton className="mt-1 w-full rounded-xl bg-[#C5A38E] py-2 text-xs font-bold text-white transition-colors hover:bg-[#A38572]">Reise buchen</SubmitButton>
            </form>
          </div>
        </section>

        <Card className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <MapPin size={18} className="text-emerald-500" />
                <h2 className="text-xs font-bold text-stone-400 uppercase tracking-widest">Schon besucht</h2>
              </div>
              <ul className="space-y-2">
                {visited.map(p => (
                  <li key={p.id} className="text-sm font-bold flex justify-between group">
                    <span>✓ {p.name}</span>
                    <form action={async () => { "use server"; await deleteTravelPoint(p.id); }}><SubmitButton isIconOnly className="opacity-0 group-hover:opacity-100 text-stone-300 hover:text-rose-500"><Trash2 size={12}/></SubmitButton></form>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-4">
                <MapIcon size={18} className="text-[#C5A38E]" />
                <h2 className="text-xs font-bold text-[#C5A38E] uppercase tracking-widest">Träume</h2>
              </div>
              <ul className="space-y-2">
                {goals.map(p => (
                   <li key={p.id} className="text-sm font-bold text-stone-500 flex justify-between group">
                     <span>{p.name}</span>
                     <form action={async () => { "use server"; await deleteTravelPoint(p.id); }}><SubmitButton isIconOnly className="opacity-0 group-hover:opacity-100 text-stone-300 hover:text-rose-500"><Trash2 size={12}/></SubmitButton></form>
                   </li>
                ))}
              </ul>
            </div>
          </div>

          <form action={async (formData) => { "use server"; await addTravelPoint(formData.get("name") as string, formData.get("type") as string); }} className="mt-8 border-t border-stone-100 dark:border-stone-800 pt-6 flex flex-col md:flex-row gap-3">
            <input name="name" placeholder="Ort/Land markieren (z. B. Rom, Italien)..." className="flex-1 bg-stone-50 dark:bg-stone-950 px-4 py-3 rounded-xl text-sm outline-none border border-transparent focus:border-[#C5A38E]" required />
            <div className="flex gap-2">
              <SubmitButton name="type" value="VISITED" className="px-4 py-3 bg-stone-800 dark:bg-stone-700 text-white rounded-xl text-xs font-bold hover:bg-stone-700 transition">War ich schon!</SubmitButton>
              <SubmitButton name="type" value="WANT_TO_GO" className="px-4 py-3 bg-[#C5A38E] text-white rounded-xl text-xs font-bold hover:bg-[#A38572] transition">Da will ich hin!</SubmitButton>
            </div>
          </form>
        </Card>
      </div>
    </AppShell>
  );
}