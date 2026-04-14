// src/app/profile/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-[#F9F7F5] dark:bg-stone-950 text-stone-900 dark:text-stone-100 p-4 md:p-8 transition-colors duration-300">
      <div className="max-w-2xl mx-auto space-y-8">
        
        <header className="flex items-center justify-between pb-6 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-2xl text-stone-400 hover:text-[#C5A38E] transition-colors">
              ←
            </Link>
            <h1 className="text-3xl font-bold text-[#C5A38E]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              Dein Profil
            </h1>
          </div>
        </header>

        <div className="bg-white dark:bg-stone-900 p-8 rounded-3xl shadow-sm border border-stone-100 dark:border-stone-800 space-y-8">
          
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 flex items-center justify-center text-4xl font-bold border-4 border-[#C5A38E]">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-2xl font-bold">{user.name}</h2>
              <p className="text-stone-500 dark:text-stone-400">{user.email}</p>
            </div>
          </div>

          <div className="pt-6 border-t border-stone-100 dark:border-stone-800">
            <h3 className="text-sm font-bold text-stone-400 uppercase mb-4 tracking-widest">Account Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-stone-50 dark:bg-stone-950 rounded-2xl border border-stone-100 dark:border-stone-800">
                <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">Registriert am</p>
                <p className="font-bold text-lg">{new Date(user.createdAt).toLocaleDateString('de-DE')}</p>
              </div>
              <div className="p-4 bg-stone-50 dark:bg-stone-950 rounded-2xl border border-stone-100 dark:border-stone-800">
                <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">Aktuelles Netto</p>
                <p className="font-bold text-lg text-[#C5A38E]">€ {user.netIncome.toLocaleString('de-DE')}</p>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-stone-100 dark:border-stone-800 flex justify-between items-center">
            <Link href="/api/auth/signout" className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 text-sm font-bold px-6 py-3 rounded-xl transition-colors">
              Sicher abmelden
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}