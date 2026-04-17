// src/app/mealprep/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { addMealPlan, deleteMealPlan, syncIngredientsToShoppingList, addRecipe, deleteRecipe, markMealCooked } from "@/lib/actions";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
// HIER WURDE 'ShoppingCart' HINZUGEFÜGT:
import { Trash2, Utensils, BookOpen, CheckCircle, ChevronRight, PlusCircle, Sparkles, ShoppingCart } from "lucide-react";

const DAYS = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];

export default async function MealPrepPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const meals = await prisma.mealPlan.findMany({ orderBy: { dayOfWeek: 'asc' } });
  const recipes = await prisma.recipe.findMany({ include: { ingredients: true }, orderBy: { title: 'asc' } });

  return (
    <div className="min-h-screen bg-[#F9F7F5] dark:bg-stone-950 text-stone-900 dark:text-stone-100 p-4 md:p-8 transition-colors duration-300">
      <div className="max-w-6xl mx-auto space-y-8 pb-20">
        
        {/* HEADER */}
        <header className="flex items-center justify-between pb-6 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-4">
            <Link href="/" className="w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 hover:bg-stone-50 transition shadow-sm">
              ←
            </Link>
            <h1 className="text-3xl font-bold text-orange-600 dark:text-orange-500" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              Meal Prep & Kochbuch
            </h1>
          </div>
          <ThemeToggle />
        </header>

        {/* 2-SPALTEN LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LINKE SPALTE: WOCHENPLAN (2/3 Breite) */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-6">
            
            {/* NEUES GERICHT HINZUFÜGEN */}
            <div className="bg-white dark:bg-stone-900 p-6 rounded-[2.5rem] shadow-sm border border-stone-200 dark:border-stone-800 relative overflow-hidden">
               <div className="absolute -right-4 -top-4 opacity-5 text-orange-500 pointer-events-none"><Utensils size={100} /></div>
               <h2 className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-6 flex items-center gap-2">
                 <PlusCircle size={16} className="text-orange-500" /> Plan hinzufügen
               </h2>
               
               <form action={async (formData) => {
                 "use server";
                 const rId = formData.get("recipeId") as string;
                 const mTitle = formData.get("manualTitle") as string;
                 const title = rId ? "Rezept" : mTitle; 
                 await addMealPlan(
                   parseInt(formData.get("dayOfWeek") as string),
                   formData.get("mealType") as string,
                   title,
                   formData.get("manualIngredients") as string || "",
                   "",
                   rId || undefined
                 );
               }} className="space-y-4 relative z-10">
                 <div className="flex flex-wrap gap-3">
                   <select name="dayOfWeek" className="flex-1 bg-stone-50 dark:bg-stone-950 px-4 py-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500/50 border border-stone-100 dark:border-stone-800">
                     {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                   </select>
                   <select name="mealType" className="flex-1 bg-stone-50 dark:bg-stone-950 px-4 py-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500/50 border border-stone-100 dark:border-stone-800">
                     <option value="Mittagessen">Mittagessen</option>
                     <option value="Abendessen">Abendessen</option>
                     <option value="Frühstück">Frühstück</option>
                   </select>
                 </div>

                 <div className="p-4 bg-orange-50 dark:bg-orange-500/10 rounded-2xl border border-orange-100 dark:border-orange-500/20">
                    <p className="text-[10px] uppercase font-bold text-orange-600 dark:text-orange-400 mb-2 flex items-center gap-1"><Sparkles size={12}/> Automatik-Modus</p>
                    <select name="recipeId" className="w-full bg-white dark:bg-stone-900 px-4 py-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500/50 border border-transparent">
                       <option value="">-- Rezept aus dem Kochbuch wählen --</option>
                       {recipes.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
                    </select>
                    <p className="text-[10px] text-stone-500 mt-2 ml-1">Das System prüft den Vorratsschrank und setzt nur fehlende Dinge auf die Einkaufsliste!</p>
                 </div>

                 <div className="flex items-center gap-4 py-2">
                    <div className="h-px bg-stone-200 dark:bg-stone-800 flex-1"></div>
                    <span className="text-[10px] uppercase text-stone-400 font-bold">Oder manuell</span>
                    <div className="h-px bg-stone-200 dark:bg-stone-800 flex-1"></div>
                 </div>

                 <div className="flex flex-col gap-3">
                   <input name="manualTitle" placeholder="Gericht (z.B. Nudeln mit Pesto)" className="w-full bg-stone-50 dark:bg-stone-950 px-4 py-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500/50 border border-stone-100 dark:border-stone-800" />
                   <input name="manualIngredients" placeholder="Zutaten (kommagetrennt für alte Liste)" className="w-full bg-stone-50 dark:bg-stone-950 px-4 py-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500/50 border border-stone-100 dark:border-stone-800" />
                 </div>

                 <button type="submit" className="w-full bg-orange-500 text-white font-bold py-4 rounded-xl hover:bg-orange-600 transition shadow-md">
                   In den Plan eintragen
                 </button>
               </form>
            </div>

            {/* DIE TAGE */}
            <div className="space-y-6">
              {DAYS.map((day, index) => {
                const dayMeals = meals.filter(m => m.dayOfWeek === index);
                if (dayMeals.length === 0) return null;

                return (
                  <div key={day} className="bg-stone-50 dark:bg-stone-900/50 rounded-3xl p-6 border border-stone-200 dark:border-stone-800 relative">
                    <h3 className="font-bold text-lg mb-4 text-stone-800 dark:text-stone-200">{day}</h3>
                    <div className="space-y-4">
                      {dayMeals.map(meal => (
                        <div key={meal.id} className={`bg-white dark:bg-stone-900 p-5 rounded-2xl shadow-sm border transition-all ${meal.isCooked ? 'border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20 opacity-70' : 'border-stone-100 dark:border-stone-800'}`}>
                          
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">{meal.mealType}</span>
                              <h4 className={`text-base font-bold ${meal.isCooked ? 'line-through text-stone-400' : ''}`}>{meal.recipe}</h4>
                            </div>
                            <div className="flex items-center gap-2">
                              {!meal.isCooked && !meal.recipeId && (
                                <form action={async () => { "use server"; await syncIngredientsToShoppingList(meal.id); }}>
                                  <button title="Manuelle Zutaten auf Einkaufsliste setzen" className="text-stone-400 hover:text-blue-500 bg-stone-100 dark:bg-stone-800 w-8 h-8 rounded-full flex items-center justify-center transition-colors"><ShoppingCart size={14}/></button>
                                </form>
                              )}
                              <form action={async () => { "use server"; await deleteMealPlan(meal.id); }}>
                                <button className="text-stone-400 hover:text-rose-500 bg-stone-100 dark:bg-stone-800 w-8 h-8 rounded-full flex items-center justify-center transition-colors"><Trash2 size={14}/></button>
                              </form>
                            </div>
                          </div>
                          
                          {meal.ingredients.length > 0 && (
                            <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed mb-4">
                              {meal.ingredients.join(' • ')}
                            </p>
                          )}

                          {/* KOCHEN BUTTON (Zieht Vorrat ab) */}
                          {!meal.isCooked && meal.recipeId && (
                            <form action={async () => { "use server"; await markMealCooked(meal.id); }}>
                              <button className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold py-2 rounded-xl transition-colors shadow-sm">
                                <CheckCircle size={14} /> Gekocht! (Vorrat abbuchen)
                              </button>
                            </form>
                          )}
                          
                          {meal.isCooked && (
                            <div className="w-full flex items-center justify-center gap-2 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 text-xs font-bold py-2 rounded-xl">
                              <CheckCircle size={14} /> Erledigt & abgebucht
                            </div>
                          )}

                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

          </div>

          {/* RECHTE SPALTE: KOCHBUCH (1/3 Breite) */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-6">
            
            <div className="bg-stone-900 text-white p-6 md:p-8 rounded-[2.5rem] shadow-xl flex flex-col transition-colors sticky top-24">
              <div className="flex items-center gap-3 mb-6 border-b border-stone-800 pb-4">
                 <BookOpen size={24} className="text-orange-400" />
                 <h2 className="text-xl font-bold" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Das Kochbuch</h2>
              </div>

              {/* LISTE DER REZEPTE */}
              <div className="flex-1 overflow-y-auto pr-2 space-y-3 mb-6 max-h-[40vh] scrollbar-thin scrollbar-thumb-stone-800">
                {recipes.length === 0 && <p className="text-xs text-stone-500 italic text-center py-8">Noch keine Rezepte gespeichert.</p>}
                {recipes.map(recipe => (
                  <details key={recipe.id} className="bg-stone-800 rounded-2xl border border-stone-700/50 group overflow-hidden">
                    <summary className="p-4 flex items-center justify-between cursor-pointer hover:bg-stone-700/30 transition-colors list-none">
                      <span className="font-bold text-sm text-stone-200 truncate">{recipe.title}</span>
                      <ChevronRight size={16} className="text-stone-500 group-open:rotate-90 transition-transform" />
                    </summary>
                    <div className="px-4 pb-4 pt-2 border-t border-stone-700/50 bg-stone-800/50">
                       <p className="text-[10px] text-orange-400 uppercase font-bold mb-2">Zutaten:</p>
                       <ul className="text-xs text-stone-400 space-y-1 mb-4">
                         {recipe.ingredients.map(ing => (
                           <li key={ing.id} className="flex justify-between border-b border-stone-700/50 pb-1">
                             <span>{ing.name}</span>
                             <span className="font-medium text-stone-300">{ing.amount} {ing.unit}</span>
                           </li>
                         ))}
                       </ul>
                       <form action={async () => { "use server"; await deleteRecipe(recipe.id); }} className="flex justify-end">
                         <button className="text-xs text-rose-400 hover:text-rose-500 font-bold flex items-center gap-1"><Trash2 size={12}/> Rezept löschen</button>
                       </form>
                    </div>
                  </details>
                ))}
              </div>

              {/* NEUES REZEPT ANLEGEN */}
              <form action={async (formData) => {
                "use server";
                await addRecipe(
                  formData.get("title") as string,
                  formData.get("instructions") as string,
                  formData.get("ingredients") as string
                );
              }} className="bg-stone-800 p-4 rounded-2xl border border-stone-700 flex flex-col gap-3">
                 <p className="text-[10px] uppercase font-bold text-stone-400 tracking-widest">Neues Rezept speichern</p>
                 <input name="title" placeholder="Rezept Name..." className="w-full bg-stone-900 border-none text-xs px-3 py-3 rounded-xl outline-none focus:ring-1 focus:ring-orange-500" required />
                 
                 <div className="relative">
                   <textarea name="ingredients" rows={4} placeholder="500 Gramm Hackfleisch&#10;1 Packung Nudeln&#10;2 Stück Zwiebeln" className="w-full bg-stone-900 border-none text-xs px-3 py-3 rounded-xl outline-none focus:ring-1 focus:ring-orange-500 resize-none scrollbar-thin" required />
                   <div className="absolute right-2 top-2 text-[9px] text-stone-500 bg-stone-800 px-2 py-1 rounded-md pointer-events-none">1 Zutat pro Zeile</div>
                 </div>

                 <textarea name="instructions" rows={2} placeholder="Notizen / Zubereitung (optional)..." className="w-full bg-stone-900 border-none text-xs px-3 py-3 rounded-xl outline-none focus:ring-1 focus:ring-orange-500 resize-none scrollbar-thin" />
                 
                 <button className="w-full bg-stone-700 text-white font-bold py-3 rounded-xl text-xs hover:bg-orange-600 transition-colors">
                   Ins Kochbuch aufnehmen
                 </button>
              </form>

            </div>

          </div>
        </div>

      </div>
    </div>
  );
}