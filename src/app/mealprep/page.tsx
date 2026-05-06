// src/app/mealprep/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { addMealPlan, deleteMealPlan, syncIngredientsToShoppingList, deleteRecipe, markMealCooked } from "@/lib/actions";
import RecipeForm from "@/components/RecipeForm";
import SubmitButton from "@/components/SubmitButton";
import { Trash2, Utensils, BookOpen, CheckCircle, ChevronRight, PlusCircle, Sparkles, ShoppingCart } from "lucide-react";
import AppShell from "@/components/ui/AppShell";

const DAYS = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];

export default async function MealPrepPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const meals = await prisma.mealPlan.findMany({ orderBy: { dayOfWeek: 'asc' } });
  const recipes = await prisma.recipe.findMany({ include: { ingredients: true }, orderBy: { title: 'asc' } });

  return (
    <AppShell
      title="Meal Prep & Kochbuch"
      subtitle="Wochenplanung und Rezepte in einem Flow."
      backHref="/"
      maxWidthClassName="max-w-6xl"
    >

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          <div className="lg:col-span-7 xl:col-span-8 space-y-6">
            
            <div className="bg-white dark:bg-stone-900 p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-stone-200 dark:border-stone-800 relative overflow-hidden transition-colors">
               <div className="absolute -right-4 -top-4 opacity-[0.03] text-[#C5A38E] pointer-events-none"><Utensils size={120} /></div>
               <h2 className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-6 flex items-center gap-2">
                 <PlusCircle size={16} className="text-[#C5A38E]" /> Plan hinzufügen
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
               }} className="space-y-5 relative z-10">
                 <div className="flex flex-wrap gap-3">
                   <select name="dayOfWeek" className="flex-1 bg-stone-50 dark:bg-stone-950 px-4 py-3 rounded-2xl text-sm outline-none focus:ring-1 focus:ring-[#C5A38E] border border-stone-100 dark:border-stone-800 transition-colors">
                     {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                   </select>
                   <select name="mealType" className="flex-1 bg-stone-50 dark:bg-stone-950 px-4 py-3 rounded-2xl text-sm outline-none focus:ring-1 focus:ring-[#C5A38E] border border-stone-100 dark:border-stone-800 transition-colors">
                     <option value="Mittagessen">Mittagessen</option>
                     <option value="Abendessen">Abendessen</option>
                     <option value="Frühstück">Frühstück</option>
                   </select>
                 </div>

                 <div className="p-5 bg-[#C5A38E]/5 rounded-2xl border border-[#C5A38E]/20">
                    <p className="text-[10px] uppercase font-bold text-[#C5A38E] mb-3 flex items-center gap-1"><Sparkles size={12}/> Automatik-Modus</p>
                    <select name="recipeId" className="w-full bg-white dark:bg-stone-900 px-4 py-3 rounded-2xl text-sm outline-none focus:ring-1 focus:ring-[#C5A38E] border border-transparent shadow-sm">
                       <option value="">-- Rezept aus dem Kochbuch wählen --</option>
                       {recipes.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
                    </select>
                    <p className="text-[10px] text-stone-500 mt-2 ml-1">Prüft den Vorratsschrank und setzt nur fehlende Dinge auf die Liste!</p>
                 </div>

                 <div className="flex items-center gap-4 py-2">
                    <div className="h-px bg-stone-200 dark:bg-stone-800 flex-1"></div>
                    <span className="text-[10px] uppercase text-stone-400 font-bold">Oder manuell eintragen</span>
                    <div className="h-px bg-stone-200 dark:bg-stone-800 flex-1"></div>
                 </div>

                 <div className="flex flex-col gap-3">
                   <input name="manualTitle" placeholder="Gericht (z.B. Nudeln mit Pesto)" className="w-full bg-stone-50 dark:bg-stone-950 px-4 py-3 rounded-2xl text-sm outline-none focus:ring-1 focus:ring-[#C5A38E] border border-stone-100 dark:border-stone-800 transition-colors" />
                   <input name="manualIngredients" placeholder="Zutaten (kommagetrennt)" className="w-full bg-stone-50 dark:bg-stone-950 px-4 py-3 rounded-2xl text-sm outline-none focus:ring-1 focus:ring-[#C5A38E] border border-stone-100 dark:border-stone-800 transition-colors" />
                 </div>

                 <SubmitButton className="w-full bg-[#C5A38E] text-white font-bold py-4 rounded-2xl hover:bg-[#A38572] transition shadow-md">
                   In den Plan eintragen
                 </SubmitButton>
               </form>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {DAYS.map((day, index) => {
                const dayMeals = meals.filter(m => m.dayOfWeek === index);
                if (dayMeals.length === 0) return null;

                return (
                  <div key={day} className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-[2rem] p-6 shadow-sm transition-colors">
                    <h3 className="font-bold text-sm mb-4 text-stone-800 dark:text-stone-200 uppercase tracking-wider">{day}</h3>
                    <div className="space-y-3">
                      {dayMeals.map(meal => (
                        <div key={meal.id} className={`p-4 rounded-2xl border transition-all ${meal.isCooked ? 'border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20' : 'border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-950'}`}>
                          
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <span className="text-[9px] font-bold text-[#C5A38E] uppercase tracking-widest">{meal.mealType}</span>
                              <h4 className={`text-sm font-bold ${meal.isCooked ? 'line-through text-stone-400' : ''}`}>{meal.recipe}</h4>
                            </div>
                            <div className="flex items-center gap-1">
                              {!meal.isCooked && !meal.recipeId && (
                                <form action={async () => { "use server"; await syncIngredientsToShoppingList(meal.id); }}>
                                  <SubmitButton isIconOnly title="Zutaten einkaufen" className="text-stone-400 hover:text-blue-500 w-6 h-6 rounded-full flex items-center justify-center transition-colors"><ShoppingCart size={12}/></SubmitButton>
                                </form>
                              )}
                              <form action={async () => { "use server"; await deleteMealPlan(meal.id); }}>
                                <SubmitButton isIconOnly className="text-stone-400 hover:text-rose-500 w-6 h-6 rounded-full flex items-center justify-center transition-colors"><Trash2 size={12}/></SubmitButton>
                              </form>
                            </div>
                          </div>
                          
                          {meal.ingredients.length > 0 && (
                            <p className="text-[10px] text-stone-500 dark:text-stone-400 leading-relaxed mb-3 truncate">
                              {meal.ingredients.join(' • ')}
                            </p>
                          )}

                          {!meal.isCooked && meal.recipeId && (
                            <form action={async () => { "use server"; await markMealCooked(meal.id); }}>
                              <SubmitButton className="w-full flex items-center justify-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold py-2 rounded-xl transition-colors shadow-sm">
                                <CheckCircle size={12} /> Gekocht (Vorrat anpassen)
                              </SubmitButton>
                            </form>
                          )}
                          
                          {meal.isCooked && (
                            <div className="w-full flex items-center justify-center gap-1.5 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold py-2 rounded-xl">
                              <CheckCircle size={12} /> Erledigt
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

          <div className="lg:col-span-5 xl:col-span-4 space-y-6">
            
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-6 md:p-8 rounded-[2.5rem] shadow-sm flex flex-col transition-colors">
              <div className="flex items-center gap-3 mb-6 border-b border-stone-100 dark:border-stone-800 pb-4">
                 <BookOpen size={20} className="text-[#C5A38E]" />
                 <h2 className="text-lg font-bold">Das Kochbuch</h2>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 space-y-2 max-h-[40vh] scrollbar-thin scrollbar-thumb-stone-200 dark:scrollbar-thumb-stone-800">
                {recipes.length === 0 && <p className="text-xs text-stone-500 italic text-center py-8">Noch keine Rezepte gespeichert.</p>}
                {recipes.map(recipe => (
                  <details key={recipe.id} className="bg-stone-50 dark:bg-stone-950 rounded-2xl border border-stone-100 dark:border-stone-800 group overflow-hidden transition-colors">
                    <summary className="p-4 flex items-center justify-between cursor-pointer hover:bg-stone-100 dark:hover:bg-stone-800/50 transition-colors list-none">
                      <span className="font-bold text-sm text-stone-700 dark:text-stone-200 truncate">{recipe.title}</span>
                      <ChevronRight size={14} className="text-stone-400 group-open:rotate-90 transition-transform" />
                    </summary>
                    <div className="px-4 pb-4 pt-2 border-t border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-950">
                       <p className="text-[9px] text-[#C5A38E] uppercase font-bold mb-2">Zutaten:</p>
                       <ul className="text-xs text-stone-500 space-y-1.5 mb-4">
                         {recipe.ingredients.map(ing => (
                           <li key={ing.id} className="flex justify-between border-b border-stone-200 dark:border-stone-800 pb-1">
                             <span>{ing.name}</span>
                             <span className="font-medium text-stone-600 dark:text-stone-300">{ing.amount} {ing.unit}</span>
                           </li>
                         ))}
                       </ul>
                       <form action={async () => { "use server"; await deleteRecipe(recipe.id); }} className="flex justify-end mt-4">
                         <SubmitButton isIconOnly className="text-[10px] text-rose-400 hover:text-rose-500 font-bold flex items-center gap-1 transition-colors"><Trash2 size={12}/> Rezept löschen</SubmitButton>
                       </form>
                    </div>
                  </details>
                ))}
              </div>
            </div>

            <RecipeForm />

          </div>
        </div>

    </AppShell>
  );
}