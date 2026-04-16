// src/app/mealprep/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { addMealPlan, deleteMealPlan, syncIngredientsToShoppingList } from "@/lib/actions";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import { ExternalLink, Trash2 } from "lucide-react";

const DAYS = [
  { id: 1, name: "Montag" }, { id: 2, name: "Dienstag" }, { id: 3, name: "Mittwoch" },
  { id: 4, name: "Donnerstag" }, { id: 5, name: "Freitag" }, { id: 6, name: "Samstag" }, { id: 7, name: "Sonntag" }
];

export default async function MealPrepPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const meals = await prisma.mealPlan.findMany({ orderBy: { dayOfWeek: 'asc' } });

  return (
    <div className="min-h-screen bg-[#F9F7F5] dark:bg-stone-950 text-stone-900 dark:text-stone-100 p-4 md:p-8 transition-colors duration-300 pb-40">
      <div className="max-w-4xl mx-auto space-y-8">
        
        <header className="flex items-center justify-between pb-6 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-4">
            <Link href="/" className="w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800 transition">←</Link>
            <h1 className="text-3xl font-bold text-[#C5A38E]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Meal Prep</h1>
          </div>
          <ThemeToggle />
        </header>

        {/* WOCHENPLANER */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {DAYS.map(day => {
            const dayMeals = meals.filter(m => m.dayOfWeek === day.id);
            // Sortierung: Mittagessen vor Abendessen
            const sortedMeals = dayMeals.sort((a, b) => a.mealType === 'MITTAGESSEN' ? -1 : 1);

            return (
              <section key={day.id} className="bg-white dark:bg-stone-900 p-6 rounded-3xl shadow-sm border border-stone-100 dark:border-stone-800">
                <h2 className="text-sm font-bold text-stone-400 uppercase tracking-widest mb-4 border-b border-stone-100 dark:border-stone-800 pb-2">{day.name}</h2>
                
                <div className="space-y-4 mb-4 min-h-[4rem]">
                  {sortedMeals.length === 0 ? (
                    <p className="text-xs text-stone-400 italic">Noch nichts geplant.</p>
                  ) : (
                    sortedMeals.map(meal => (
                      <div key={meal.id} className="p-4 bg-stone-50 dark:bg-stone-950 rounded-2xl border border-stone-100 dark:border-stone-800 relative group">
                        <div className="flex justify-between items-start mb-2">
                          <p className="font-bold text-sm">
                            <span className="text-[#C5A38E] mr-2">{meal.mealType === 'MITTAGESSEN' ? '☀️ Mittag' : '🌙 Abend'}</span>
                            {meal.recipe}
                          </p>
                          <form action={async () => { "use server"; await deleteMealPlan(meal.id); }}>
                            <button className="text-stone-300 hover:text-red-400"><Trash2 size={14}/></button>
                          </form>
                        </div>
                        
                        {/* Notes / Links Rendering */}
                        {meal.recipeNotes && (
                           <div className="mt-2 mb-3">
                             {meal.recipeNotes.startsWith('http') ? (
                               <a href={meal.recipeNotes} target="_blank" className="text-[10px] text-blue-500 hover:underline flex items-center gap-1"><ExternalLink size={10} /> Rezept ansehen</a>
                             ) : (
                               <p className="text-[10px] text-stone-500 italic flex items-center gap-1">💡 {meal.recipeNotes}</p>
                             )}
                           </div>
                        )}

                        {meal.ingredients.length > 0 && (
                          <div className="flex justify-between items-end mt-2 pt-2 border-t border-stone-200 dark:border-stone-800">
                            <p className="text-[10px] text-stone-500 truncate max-w-[60%]">{meal.ingredients.join(', ')}</p>
                            <form action={async () => { "use server"; await syncIngredientsToShoppingList(meal.id); }}>
                              <button className="text-[10px] bg-stone-800 dark:bg-stone-700 text-white px-2 py-1 rounded hover:bg-[#C5A38E] transition">🛒 Zutaten auf Liste</button>
                            </form>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </section>
            );
          })}
        </div>

        {/* EINGABE (FLOATING) */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-2xl z-50">
          <form action={async (formData) => { 
            "use server"; 
            await addMealPlan(
              parseInt(formData.get("dayOfWeek") as string),
              formData.get("mealType") as string,
              formData.get("recipe") as string,
              formData.get("ingredients") as string,
              formData.get("notes") as string
            ); 
          }} className="bg-stone-900/95 dark:bg-black/90 backdrop-blur-md p-4 rounded-3xl shadow-2xl flex flex-col gap-3 border border-stone-700/50">
            <div className="flex gap-2">
              <select name="dayOfWeek" className="bg-stone-800 border-none text-white text-sm px-3 py-2 rounded-xl outline-none" required>
                {DAYS.map(d => <option key={d.id} value={d.id}>{d.name.substring(0,2)}</option>)}
              </select>
              <select name="mealType" className="bg-stone-800 border-none text-[#C5A38E] font-bold text-sm px-3 py-2 rounded-xl outline-none" required>
                <option value="MITTAGESSEN">Mittag</option>
                <option value="ABENDESSEN">Abend</option>
              </select>
              <input name="recipe" placeholder="Rezept (z.B. Lasagne)" className="flex-1 bg-stone-800 border-none text-white text-sm px-4 py-2 rounded-xl outline-none" required />
              <button type="submit" className="bg-[#C5A38E] text-white p-2 rounded-xl hover:bg-[#A38572] transition px-4 font-bold">+</button>
            </div>
            <div className="flex gap-2">
               <input name="ingredients" placeholder="Zutaten (Tomaten, Hack...)" className="w-1/2 bg-stone-800 border-none text-white text-xs px-4 py-2 rounded-xl outline-none placeholder:text-stone-500" />
               <input name="notes" placeholder="Link oder Notiz (200°C 30min)" className="w-1/2 bg-stone-800 border-none text-white text-xs px-4 py-2 rounded-xl outline-none placeholder:text-stone-500" />
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}