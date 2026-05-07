"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SetupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState({ text: "", type: "" });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ text: "", type: "" });

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({ text: data.message, type: "error" });
      } else {
        setMessage({ text: "Account erfolgreich erstellt! Leere die Felder für den nächsten Account.", type: "success" });
        setName("");
        setEmail("");
        setPassword("");
      }
    } catch (error) {
      setMessage({ text: "Verbindungsfehler zur Datenbank.", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface)] p-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8 shadow-sm">
        <div className="text-center mb-8">
          <h1 className="mb-2 text-3xl font-bold text-[var(--accent)]">
            Initiale Einrichtung
          </h1>
          <p className="text-sm font-medium text-[var(--muted-foreground)]">Erstellt eure beiden Accounts (max. 2).</p>
        </div>

        {message.text && (
          <div className={`mb-4 p-3 text-sm rounded-lg border text-center ${
            message.type === "error" ? "bg-red-50 text-red-500 border-red-100" : "bg-green-50 text-green-600 border-green-100"
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--foreground)]">Name (z.B. Mike / Sophie)</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-[var(--foreground)] transition-all focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50"
              required
            />
          </div>

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
            className="flex w-full items-center justify-center rounded-lg bg-stone-800 px-4 py-2.5 font-medium text-white transition-colors hover:bg-stone-700 disabled:opacity-70"
          >
            {isLoading ? "Speichere in Datenbank..." : "Account anlegen"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button onClick={() => router.push("/login")} className="text-sm text-[#C5A38E] hover:underline">
            Zum Login wechseln
          </button>
        </div>
      </div>
    </div>
  );
}