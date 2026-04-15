import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { addWikiEntry, deleteWikiEntry } from "@/lib/actions";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

export default async function WikiPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const entries = await prisma.wikiEntry.findMany({ orderBy: { category: 'asc' } });

  return (
    <div className="min-h-screen bg-[#F9F7F5] dark:bg-stone-950 text-stone-900 dark:text-stone-100 p-4 md:p-8 transition-colors duration-300">
      <div className="max-w-3xl mx-auto space-y-8">
        <header className="flex items-center justify-between pb-6 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-4">
            <Link href="/" className="w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 hover:bg-stone-50 transition">←</Link>
            <h1 className="text-3xl font-bold text-[#C5A38E]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Home Wiki</h1>
          </div>
          <ThemeToggle />
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {entries.length === 0 ? <p className="text-stone-400 italic">Noch keine Einträge.</p> : entries.map(entry => (
            <div key={entry.id} className="bg-white dark:bg-stone-900 p-5 rounded-3xl border border-stone-100 dark:border-stone-800 shadow-sm relative group">
              <span className="text-[10px] uppercase font-bold text-[#C5A38E] tracking-widest">{entry.category}</span>
              <h2 className="font-bold text-lg mt-1 mb-2">{entry.title}</h2>
              <p className="text-sm text-stone-500 whitespace-pre-wrap">{entry.content}</p>
              <form action={async () => { "use server"; await deleteWikiEntry(entry.id); }} className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="text-stone-300 hover:text-red-400 text-xs">✕</button>
              </form>
            </div>
          ))}
        </div>

        <form action={async (formData) => { "use server"; await addWikiEntry(formData.get("title") as string, formData.get("content") as string, formData.get("category") as string); }} className="bg-stone-900 p-6 rounded-3xl shadow-xl flex flex-col gap-4 mt-12">
          <h2 className="text-[#C5A38E] text-xs uppercase font-bold tracking-widest">Neuen Eintrag erstellen</h2>
          <div className="flex gap-2">
            <input name="title" placeholder="Titel (z.B. WLAN Passwort)" className="flex-1 bg-stone-800 text-white p-3 rounded-xl outline-none text-sm" required />
            <input name="category" placeholder="Kategorie (z.B. Technik)" className="w-1/3 bg-stone-800 text-white p-3 rounded-xl outline-none text-sm" required />
          </div>
          <textarea name="content" placeholder="Inhalt..." className="w-full bg-stone-800 text-white p-3 rounded-xl outline-none text-sm min-h-[100px]" required />
          <button type="submit" className="bg-[#C5A38E] text-white p-3 rounded-xl font-bold hover:bg-[#A38572] transition">Im Wiki speichern</button>
        </form>
      </div>
    </div>
  );
}