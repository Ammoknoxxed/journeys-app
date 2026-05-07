"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    // Kommuniziert mit unserer API, die wir vorhin gebaut haben
    const res = await signIn("credentials", {
      redirect: false,
      email,
      password,
    });

    if (res?.error) {
      setError("Falsche E-Mail oder falsches Passwort.");
      setIsLoading(false);
    } else {
      router.push("/"); // Bei Erfolg zurück zur Startseite (Dashboard)
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface)] p-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8 shadow-sm">
        <div className="text-center mb-8">
          <h1 className="mb-2 text-3xl font-bold text-[var(--accent)]">
            Die Höhle HQ
          </h1>
          <p className="text-sm font-medium text-[var(--muted-foreground)]">Gemeinsam planen, organisieren und leben.</p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-100 bg-red-50 p-3 text-center text-sm text-red-500">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">E-Mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-[var(--foreground)] transition-all focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">Passwort</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-[var(--foreground)] transition-all focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-[#C5A38E] hover:bg-[#A38572] text-white font-medium rounded-lg transition-colors flex justify-center items-center disabled:opacity-70"
          >
            {isLoading ? "Wird geprüft..." : "Eintreten"}
          </button>
        </form>
        <p className="mt-6 text-center text-xs text-[var(--muted-foreground)]">Nur für euch beide freigeschaltet.</p>
      </div>
    </div>
  );
}