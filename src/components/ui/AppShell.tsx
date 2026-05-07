import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import type { ReactNode } from "react";

type AppShellProps = {
  title: string;
  subtitle?: string;
  backHref?: string;
  actions?: ReactNode;
  children: ReactNode;
  maxWidthClassName?: string;
};

export default function AppShell({
  title,
  subtitle,
  backHref,
  actions,
  children,
  maxWidthClassName = "max-w-6xl",
}: AppShellProps) {
  return (
    <div className="min-h-screen bg-[var(--surface)] text-[var(--foreground)] transition-colors duration-300">
      <div className={`mx-auto w-full ${maxWidthClassName} space-y-8 px-4 pb-[calc(4rem+env(safe-area-inset-bottom))] pt-4 md:px-8 md:pt-6`}>
        <header className="sticky top-2 z-40 rounded-2xl border border-[var(--border)] bg-[var(--card)]/90 p-4 backdrop-blur-xl md:top-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              {backHref ? (
                <Link
                  href={backHref}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] text-[var(--muted-foreground)] transition hover:bg-[var(--surface-soft)] hover:text-[var(--foreground)]"
                  aria-label="Zurück"
                >
                  <ArrowLeft size={16} />
                </Link>
              ) : null}
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
                {subtitle ? <p className="text-sm text-[var(--muted-foreground)]">{subtitle}</p> : null}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {actions}
              <ThemeToggle />
            </div>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
