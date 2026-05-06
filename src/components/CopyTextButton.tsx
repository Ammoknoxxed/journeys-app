"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

type CopyTextButtonProps = {
  text: string;
  label?: string;
};

export default function CopyTextButton({ text, label = "Kopieren" }: CopyTextButtonProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <button
      onClick={copyToClipboard}
      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--surface-soft)] px-4 py-3 font-mono text-sm transition-colors hover:brightness-95"
      type="button"
    >
      {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} className="text-[var(--muted-foreground)]" />}
      {copied ? <span className="text-emerald-500">Kopiert</span> : <span>{label}</span>}
    </button>
  );
}
