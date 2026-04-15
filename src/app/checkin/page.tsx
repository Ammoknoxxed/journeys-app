import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { submitCheckIn } from "@/lib/actions";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

export default async function CheckInPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  const allUsers = await prisma.user.findMany();
  const currentUser = allUsers.find(u => u.email === session.user?.email);
  
  const now = new Date();
  const weekNum = Math.ceil(Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / (24 * 60 * 60 * 1000)) / 7);
  const currentWeekYear = `${now.getFullYear()}-W${weekNum}`;

  const currentWeekAnswers = await prisma.checkInAnswer.findMany({
    where: { weekYear: currentWeekYear },
    include: { user: true }
  });

  const myAnswer = currentWeekAnswers.find(a => a.userId === currentUser?.id);
  const bothAnswered = currentWeekAnswers.length === 2; 

  return (
    <div className="min-h-screen bg-[#F9F7F5] dark:bg-stone-950 text-stone-900 dark:text-stone-100 p-4 md:p-8 transition-colors duration-300">
      <div className="max-w-2xl mx-auto space-y-8">
        <header className="flex items-center justify-between pb-6 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-4">
            <Link href="/" className="w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 hover:bg-stone-50 transition">←</Link>
            <h1 className="text-3xl font-bold text-[#C5A38E]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Weekly Sync</h1>
          </div>
          <ThemeToggle />
        </header>

        {!myAnswer ? (
          <section className="bg-white dark:bg-stone-900 p-6 rounded-3xl shadow-sm border border-stone-100 dark:border-stone-800">
            <h2 className="text-sm font-bold text-stone-400 uppercase tracking-widest mb-6">Deine Woche ({currentWeekYear})</h2>
            <form action={async (formData) => { "use server"; await submitCheckIn(currentWeekYear, formData.get("h") as string, formData.get("s") as string, formData.get("n") as string); }} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-500 mb-2">Highlight dieser Woche?</label>
                <textarea name="h" className="w-full bg-stone-50 dark:bg-stone-950 p-4 rounded-xl outline-none text-sm min-h-[80px]" required />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-500 mb-2">Was hat gestresst?</label>
                <textarea name="s" className="w-full bg-stone-50 dark:bg-stone-950 p-4 rounded-xl outline-none text-sm min-h-[80px]" required />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-500 mb-2">Worauf freust du dich nächste Woche?</label>
                <textarea name="n" className="w-full bg-stone-50 dark:bg-stone-950 p-4 rounded-xl outline-none text-sm min-h-[80px]" required />
              </div>
              <button type="submit" className="w-full bg-[#C5A38E] text-white py-4 rounded-xl font-bold hover:bg-[#A38572] transition">Einloggen</button>
            </form>
          </section>
        ) : !bothAnswered ? (
          <section className="bg-stone-900 text-white p-10 rounded-3xl text-center space-y-4">
            <div className="text-6xl mb-4">⏳</div>
            <h2 className="text-xl font-bold text-[#C5A38E]">Warten auf Partner...</h2>
            <p className="text-sm text-stone-400">Antworten werden erst aufgedeckt, wenn beide den Check-In ausgefüllt haben.</p>
          </section>
        ) : (
          <div className="space-y-6">
            <h2 className="text-sm font-bold text-stone-400 uppercase tracking-widest text-center">Ergebnisse der Woche</h2>
            {currentWeekAnswers.map(ans => (
              <section key={ans.id} className="bg-white dark:bg-stone-900 p-6 rounded-3xl shadow-sm border border-stone-100 dark:border-stone-800">
                <h3 className="font-bold text-lg text-[#C5A38E] mb-4 border-b border-stone-100 dark:border-stone-800 pb-2">{ans.user.name}</h3>
                <div className="space-y-4 text-sm">
                  <div><span className="block text-xs text-stone-400 font-bold mb-1">Highlight:</span> <p className="bg-stone-50 dark:bg-stone-950 p-3 rounded-lg">{ans.highlight}</p></div>
                  <div><span className="block text-xs text-stone-400 font-bold mb-1">Stress/Support:</span> <p className="bg-stone-50 dark:bg-stone-950 p-3 rounded-lg">{ans.stress}</p></div>
                  <div><span className="block text-xs text-stone-400 font-bold mb-1">Nächste Woche:</span> <p className="bg-stone-50 dark:bg-stone-950 p-3 rounded-lg">{ans.nextWeek}</p></div>
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}