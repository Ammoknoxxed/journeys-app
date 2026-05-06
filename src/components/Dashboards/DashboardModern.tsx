// src/components/Dashboards/DashboardModern.tsx
import ThemeToggle from "@/components/ThemeToggle";
import FinanceWidget from "@/components/widgets/FinanceWidget";
import BucketListWidget from "@/components/widgets/BucketListWidget";
import PetWidget from "@/components/widgets/PetWidget";
import StickyNotesWidget from "@/components/widgets/StickyNotesWidget";
import { Suspense } from "react";
import Link from "next/link";
import SubmitButton from "@/components/SubmitButton";
import { updateUiLayout } from "@/lib/actions";
import { CheckCircle2, CreditCard, Plane, ShoppingBag, LayoutGrid } from "lucide-react";
import type { DashboardProps } from "@/lib/dashboard";
import { APP_SECTIONS } from "@/lib/navigation";

export default function DashboardModern({ currentUser, data }: DashboardProps) {
  const statCards = [
    { label: "Erledigte Aufgaben", value: String(data.choresDoneThisWeek), icon: CheckCircle2 },
    { label: "Ausgaben (7 Tage)", value: `€ ${data.weeklyExpensesAgg?._sum?.amount?.toFixed(0) || 0}`, icon: CreditCard },
    {
      label: "Tage bis Trip",
      value: data.nextTrip ? String(Math.ceil((data.nextTrip.date.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : "-",
      icon: Plane,
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--surface)] pb-32 font-sans text-[var(--foreground)]">
      <div className="mx-auto flex w-full max-w-7xl justify-center px-4 pt-6">
        <nav className="flex w-full items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--card)]/90 px-5 py-3 shadow-sm backdrop-blur-2xl">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--surface-soft)]">
              <LayoutGrid size={16} className="text-[var(--foreground)]" />
            </div>
            <span className="hidden text-sm font-semibold tracking-wide md:block">Höhle HQ</span>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <div className="h-4 w-px bg-[var(--border)]" />
            <form action={async () => { "use server"; await updateUiLayout("CLASSIC"); }}>
              <SubmitButton className="rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-semibold text-[var(--muted-foreground)] transition hover:bg-[var(--surface-soft)] hover:text-[var(--foreground)]">
                Classic UI
              </SubmitButton>
            </form>
          </div>
        </nav>
      </div>

      <main className="mx-auto mt-10 w-full max-w-7xl space-y-10 px-4">
        <div className="flex flex-col justify-between gap-6 px-2 md:flex-row md:items-end">
          <div>
            <h1 className="mb-2 text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
              Willkommen, <span className="text-[var(--accent)]">{currentUser?.name}</span>.
            </h1>
            <p className="text-sm font-medium text-[var(--muted-foreground)] md:text-base">Dein Haushaltsstatus fuer heute.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 md:gap-6 lg:grid-cols-4">
          {statCards.map((card) => (
            <div key={card.label} className="group flex flex-col justify-between rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 transition-colors hover:border-[var(--accent)]/40">
              <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface-soft)] transition-transform group-hover:scale-110">
                <card.icon size={20} />
              </div>
              <div>
                <p className="text-3xl font-semibold tracking-tight">{card.value}</p>
                <p className="mt-1 text-xs font-medium text-[var(--muted-foreground)] md:text-sm">{card.label}</p>
              </div>
            </div>
          ))}

          <Link href="/shopping" className="block h-full w-full">
            <div className="group flex h-full flex-col justify-between rounded-3xl border border-[var(--accent)]/30 bg-[var(--accent)]/10 p-6 transition-colors hover:bg-[var(--accent)]/20">
              <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--foreground)] text-[var(--background)] transition-transform group-hover:scale-110">
                <ShoppingBag size={20} />
              </div>
              <div>
                <p className="text-3xl font-semibold tracking-tight">{data.openShoppingItemsCount}</p>
                <p className="mt-1 text-xs font-bold text-[var(--muted-foreground)] md:text-sm">Auf Einkaufsliste</p>
              </div>
            </div>
          </Link>
        </div>

        <section className="grid gap-4 md:grid-cols-3">
          {APP_SECTIONS.map((section) => (
            <div key={section.title} className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5">
              <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">{section.title}</p>
              <div className="grid gap-2">
                {section.links.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-[var(--muted-foreground)] transition hover:bg-[var(--surface-soft)] hover:text-[var(--foreground)]"
                  >
                    <item.icon size={15} />
                    {item.title}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </section>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="flex w-full flex-col space-y-8">
            <div className="w-full overflow-hidden rounded-[2.5rem]">
              <Suspense fallback={<div className="h-64 animate-pulse rounded-[2.5rem] border border-[var(--border)] bg-[var(--card)]" />}>
                <FinanceWidget />
              </Suspense>
            </div>
            <div className="w-full overflow-hidden rounded-[2.5rem]">
              <Suspense fallback={<div className="h-64 animate-pulse rounded-[2.5rem] border border-[var(--border)] bg-[var(--card)]" />}>
                <PetWidget />
              </Suspense>
            </div>
          </div>

          <div className="flex w-full flex-col space-y-8">
            <div className="w-full overflow-hidden rounded-[2.5rem]">
              <Suspense fallback={<div className="h-64 animate-pulse rounded-[2.5rem] border border-[var(--border)] bg-[var(--card)]" />}>
                <BucketListWidget />
              </Suspense>
            </div>
            <div className="w-full overflow-hidden rounded-[2.5rem]">
              <Suspense fallback={<div className="h-64 animate-pulse rounded-[2.5rem] border border-[var(--border)] bg-[var(--card)]" />}>
                <StickyNotesWidget />
              </Suspense>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}