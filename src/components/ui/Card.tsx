import type { ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  className?: string;
};

export default function Card({ children, className = "" }: CardProps) {
  return <div className={`rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm ${className}`}>{children}</div>;
}
