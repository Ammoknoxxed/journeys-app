// src/app/chores/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { addChore, completeChore } from "@/lib/actions";
import SubmitButton from "@/components/SubmitButton";
import AppShell from "@/components/ui/AppShell";

export default async function ChoresPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const users = await prisma.user.findMany();
  const chores = await prisma.chore.findMany({ orderBy: { points: 'desc' } });

  return (
    <AppShell title="Putzplan" subtitle="Klarer Überblick über Aufgaben und Karma." backHref="/" maxWidthClassName="max-w-2xl">
      <div className="space-y-8">

        {/* DAS LEADERBOARD */}
        <section className="grid grid-cols-2 gap-4">
          {users.map(u => (
            <div key={u.id} className={`p-6 rounded-3xl border ${u.email === session.user?.email ? 'bg-stone-800 text-white' : 'bg-white dark:bg-stone-900 border-stone-100 dark:border-stone-800'} text-center shadow-sm`}>
              <p className="text-xs uppercase tracking-widest opacity-70 mb-2">{u.name}</p>
              <p className="text-4xl font-bold text-[#C5A38E]">{u.chorePoints}</p>
              <p className="text-[10px] uppercase opacity-50 mt-1">Karma Punkte</p>
            </div>
          ))}
        </section>

        {/* DIE AUFGABEN */}
        <section className="bg-white dark:bg-stone-900 p-6 rounded-3xl shadow-sm border border-stone-100 dark:border-stone-800">
          <h2 className="text-sm font-bold text-stone-400 uppercase tracking-widest mb-6">Offene Aufgaben</h2>
          <div className="space-y-3 mb-6">
            {chores.map(chore => (
              <div key={chore.id} className="flex justify-between items-center p-4 bg-stone-50 dark:bg-stone-950 rounded-2xl border border-stone-100 dark:border-stone-800">
                <div>
                  <p className="font-bold">{chore.title}</p>
                  <p className="text-xs text-stone-400">Zuletzt: {chore.lastDoneBy ? `${chore.lastDoneBy} (${chore.lastDoneAt?.toLocaleDateString('de-DE')})` : 'Noch nie'}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[#C5A38E] font-bold text-sm">+{chore.points} Pkt</span>
                  <form action={async () => { "use server"; await completeChore(chore.id, chore.points); }}>
                    <SubmitButton className="rounded-xl bg-stone-800 px-4 py-2 text-xs font-bold text-white transition hover:bg-[#C5A38E] dark:bg-stone-700">Erledigt</SubmitButton>
                  </form>
                </div>
              </div>
            ))}
          </div>

          <form action={async (formData) => { "use server"; await addChore(formData.get("title") as string, parseInt(formData.get("points") as string)); }} className="flex gap-2 border-t border-stone-100 dark:border-stone-800 pt-6">
            <input name="title" placeholder="Staubsaugen, Bad..." className="flex-1 bg-stone-50 dark:bg-stone-950 p-3 rounded-xl outline-none border border-transparent focus:border-stone-200" required />
            <input name="points" type="number" placeholder="Punkte (z.B. 10)" className="w-24 bg-stone-50 dark:bg-stone-950 p-3 rounded-xl outline-none" required />
            <SubmitButton className="rounded-xl bg-[#C5A38E] px-6 font-bold text-white hover:bg-[#A38572]">+</SubmitButton>
          </form>
        </section>

      </div>
    </AppShell>
  );
}