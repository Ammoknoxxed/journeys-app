// src/app/shopping/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { addShoppingItem, toggleShoppingItem, clearShoppingList } from "@/lib/actions";
import SubmitButton from "@/components/SubmitButton";
import { RefreshCw } from "lucide-react";
import AppShell from "@/components/ui/AppShell";
import Card from "@/components/ui/Card";

export default async function ShoppingPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const shoppingList = await prisma.shoppingItem.findMany({ orderBy: { createdAt: 'asc' } });
  
  const activeItems = shoppingList.filter(item => !item.checked);
  const completedItems = shoppingList.filter(item => item.checked);

  return (
    <AppShell
      title="Einkaufsliste"
      subtitle="Alles fuer die naechsten Tage auf einen Blick."
      backHref="/"
      maxWidthClassName="max-w-3xl"
    >
      <div className="space-y-8">

        <Card className="sticky top-24 z-10 p-4">
          <form
            action={async (formData) => {
              "use server";
              const amountValue = formData.get("amount") as string;
              const parsedAmount = amountValue ? parseFloat(amountValue) : undefined;
              const unit = (formData.get("unit") as string) || undefined;
              await addShoppingItem(formData.get("title") as string, Number.isNaN(parsedAmount) ? undefined : parsedAmount, unit);
            }}
            className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_120px_120px_auto]"
          >
            <input name="title" placeholder="Artikel hinzufuegen..." className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 outline-none transition focus:border-[var(--accent)]/60" required autoFocus />
            <input name="amount" type="number" step="any" placeholder="Menge" className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 outline-none transition focus:border-[var(--accent)]/60" />
            <select name="unit" className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 outline-none transition focus:border-[var(--accent)]/60">
              <option value="">Einheit</option>
              <option value="Stück">Stück</option>
              <option value="g">g</option>
              <option value="kg">kg</option>
              <option value="ml">ml</option>
              <option value="l">l</option>
              <option value="Packung">Packung</option>
            </select>
            <SubmitButton className="rounded-xl bg-[var(--accent)] px-8 font-bold text-[var(--accent-contrast)] transition hover:brightness-95">
              Hinzufügen
            </SubmitButton>
          </form>
        </Card>

        <section>
          <h2 className="mb-4 ml-2 text-xs font-bold uppercase tracking-widest text-[var(--muted-foreground)]">Noch zu kaufen ({activeItems.length})</h2>
          <div className="flex flex-wrap gap-3">
            {activeItems.length === 0 ? (
              <p className="ml-2 text-sm italic text-[var(--muted-foreground)]">Alles erledigt. Der Kuehlschrank ist voll.</p>
            ) : (
              activeItems.map(item => (
                <form key={item.id} action={async () => { "use server"; await toggleShoppingItem(item.id, true); }}>
                  <SubmitButton className="rounded-2xl border-2 border-[var(--accent)] px-5 py-3 text-sm font-bold text-[var(--accent)] shadow-sm transition-all hover:-translate-y-0.5 hover:bg-[var(--accent)] hover:text-[var(--accent-contrast)]">
                    {item.amount && item.unit ? `${item.amount} ${item.unit} ` : ''}{item.title}
                  </SubmitButton>
                </form>
              ))
            )}
          </div>
        </section>

        {completedItems.length > 0 && (
          <section className="border-t border-[var(--border)] pt-8">
            <div className="flex justify-between items-center mb-4 ml-2">
              <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--muted-foreground)]">Im Einkaufswagen</h2>
              <form action={async () => { "use server"; await clearShoppingList(); }}>
                <SubmitButton className="rounded-lg bg-rose-100 px-4 py-2 text-xs font-bold text-rose-600 transition-colors hover:bg-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/20">
                  Kauf abschließen & Vorrat füllen
                </SubmitButton>
              </form>
            </div>
            <div className="flex flex-col gap-2">
              {completedItems.map(item => (
                <Card key={item.id} className="flex flex-col justify-between gap-3 rounded-2xl p-3 sm:flex-row sm:items-center">
                  
                  <form action={async () => { "use server"; await toggleShoppingItem(item.id, false); }} className="flex-1">
                    <button className="w-full text-left text-sm font-medium text-[var(--muted-foreground)] line-through transition-colors hover:text-[var(--foreground)]">
                      {item.title}
                    </button>
                  </form>

                  {item.pantryItemId ? (
                    <form action={async (formData) => { "use server"; await toggleShoppingItem(item.id, true, parseFloat(formData.get("amount") as string)); }} className="flex items-center gap-2 rounded-xl bg-[var(--surface)] p-1">
                      <span className="ml-2 text-[10px] font-bold uppercase text-[var(--muted-foreground)]">Gekauft:</span>
                      <input 
                        name="amount" 
                        type="number" 
                        step="any" 
                        defaultValue={item.amount || 1} 
                        className="h-8 w-16 rounded-lg border border-[var(--border)] bg-[var(--card)] text-center text-xs outline-none transition-colors focus:border-[var(--accent)]"
                      />
                      <span className="w-10 truncate text-xs text-[var(--muted-foreground)]">{item.unit || 'Stk'}</span>
                      <SubmitButton isIconOnly className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)] text-[var(--accent-contrast)] transition-colors hover:brightness-95">
                        <RefreshCw size={12} />
                      </SubmitButton>
                    </form>
                  ) : (
                    <span className="px-2 text-[10px] italic text-[var(--muted-foreground)]">Kein Vorrats-Artikel</span>
                  )}
                  
                </Card>
              ))}
            </div>
          </section>
        )}

      </div>
    </AppShell>
  );
}