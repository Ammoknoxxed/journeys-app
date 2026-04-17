// src/components/RecipeForm.tsx
"use client";

import { useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { addRecipe } from "@/lib/actions";

export default function RecipeForm() {
  const [ingredients, setIngredients] = useState([{ amount: 1, unit: "Stück", name: "" }]);
  const [isPending, startTransition] = useTransition();

  const handleAdd = () => setIngredients([...ingredients, { amount: 1, unit: "Stück", name: "" }]);
  
  const handleRemove = (indexToRemove: number) => {
    if (ingredients.length > 1) {
      setIngredients(ingredients.filter((_, idx) => idx !== indexToRemove));
    }
  };

  const handleChange = (i: number, field: string, val: any) => {
    const copy = [...ingredients];
    copy[i] = { ...copy[i], [field]: val };
    setIngredients(copy);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
     e.preventDefault();
     const form = e.currentTarget;
     const formData = new FormData(form);

     startTransition(async () => {
        const title = formData.get("title") as string;
        const instructions = formData.get("instructions") as string;
        const validIngredients = ingredients.filter(ing => ing.name.trim() !== "");

        await addRecipe(title, instructions, JSON.stringify(validIngredients));

        setIngredients([{ amount: 1, unit: "Stück", name: "" }]);
        form.reset();
     });
  };

  return (
     <form onSubmit={handleSubmit} className="bg-stone-900 p-6 md:p-8 rounded-[2.5rem] shadow-xl flex flex-col gap-6 border border-stone-800 transition-colors w-full overflow-hidden">
        <div className="border-b border-stone-800 pb-4">
           <p className="text-[10px] uppercase font-bold text-[#C5A38E] tracking-widest mb-1">Neues Rezept</p>
           <h3 className="text-white font-medium text-sm">Ins Kochbuch aufnehmen</h3>
        </div>

        <input 
           name="title" 
           placeholder="Name des Gerichts (z.B. Lasagne)" 
           className="w-full bg-stone-800 border-none text-sm px-4 py-3 rounded-2xl outline-none focus:ring-1 focus:ring-[#C5A38E] text-white" 
           required 
        />
        
        <div className="space-y-3 w-full">
           <p className="text-[10px] uppercase font-bold text-stone-500 tracking-widest">Zutaten</p>
           
           {ingredients.map((ing, i) => (
             <div key={i} className="flex gap-1.5 sm:gap-2 items-center w-full">
                <input 
                  type="number" 
                  step="any"
                  value={ing.amount}
                  onChange={(e) => handleChange(i, "amount", e.target.value)}
                  placeholder="Menge" 
                  // flex-shrink-0 verhindert, dass das Feld weggedrückt wird. w-14 für Mobile, w-16 für Desktop
                  className="w-14 sm:w-16 flex-shrink-0 bg-stone-800 border-none text-xs px-2 py-3 rounded-xl outline-none focus:ring-1 focus:ring-[#C5A38E] text-white text-center" 
                  required 
                />
                <select 
                  value={ing.unit}
                  onChange={(e) => handleChange(i, "unit", e.target.value)}
                  className="w-20 sm:w-24 flex-shrink-0 bg-stone-800 border-none text-[11px] sm:text-xs px-1 sm:px-2 py-3 rounded-xl outline-none focus:ring-1 focus:ring-[#C5A38E] text-white"
                >
                  <option value="Stück">Stück</option>
                  <option value="Gramm">Gramm</option>
                  <option value="Kg">Kg</option>
                  <option value="Liter">Liter</option>
                  <option value="ml">ml</option>
                  <option value="Packung">Pack.</option>
                  <option value="Prise">Prise</option>
                  <option value="EL">EL</option>
                  <option value="TL">TL</option>
                </select>
                <input 
                  type="text"
                  value={ing.name}
                  onChange={(e) => handleChange(i, "name", e.target.value)}
                  placeholder="Zutat" 
                  // min-w-0 ist hier der magische Fix, der das Rausragen verhindert!
                  className="flex-1 min-w-0 bg-stone-800 border-none text-xs px-3 py-3 rounded-xl outline-none focus:ring-1 focus:ring-[#C5A38E] text-white" 
                  required 
                />
                <button type="button" onClick={() => handleRemove(i)} className="flex-shrink-0 text-stone-500 hover:text-rose-500 transition-colors p-1 sm:p-2">
                  <X size={14} />
                </button>
             </div>
           ))}
           
           <button type="button" onClick={handleAdd} className="text-[10px] font-bold text-[#C5A38E] hover:text-white flex items-center gap-1 transition-colors mt-2">
              <Plus size={12} /> Zutat hinzufügen
           </button>
        </div>

        <textarea 
           name="instructions" 
           rows={3} 
           placeholder="Notizen / Zubereitung (optional)..." 
           className="w-full bg-stone-800 border-none text-xs px-4 py-3 rounded-2xl outline-none focus:ring-1 focus:ring-[#C5A38E] text-white resize-none scrollbar-thin" 
        />
        
        <button 
           disabled={isPending}
           className="w-full bg-[#C5A38E] text-stone-900 font-bold py-4 rounded-2xl text-xs hover:bg-[#A38572] transition-colors shadow-md disabled:opacity-50"
        >
           {isPending ? "Wird gespeichert..." : "Rezept speichern"}
        </button>
     </form>
  );
}