// src/app/guests/page.tsx
import { Wifi, Home, Coffee, Info, Cat, Heart } from "lucide-react";
import AppShell from "@/components/ui/AppShell";
import Card from "@/components/ui/Card";
import CopyTextButton from "@/components/CopyTextButton";

export default function GuestsPage() {
  const wifiName = process.env.NEXT_PUBLIC_GUEST_WIFI_NAME || "Gast-WLAN";
  const wifiPassword = process.env.NEXT_PUBLIC_GUEST_WIFI_PASSWORD || "";
  const qrData = wifiPassword ? `WIFI:S:${wifiName};T:WPA;P:${wifiPassword};;` : "";
  const qrCodeUrl = qrData
    ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrData)}`
    : "";

  return (
    <AppShell title="Welcome Book" subtitle="Alle Infos fuer euren Besuch." backHref="/" maxWidthClassName="max-w-4xl">
      <div className="space-y-8">
        <div className="py-8 text-center">
          <h2 className="mb-4 text-4xl font-light md:text-5xl">Schoen, dass du da bist.</h2>
          <p className="mx-auto max-w-lg text-[var(--muted-foreground)]">Mach es dir bequem. Hier findest du die wichtigsten Infos fuer deinen Aufenthalt.</p>
        </div>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="group relative flex flex-col items-center justify-center overflow-hidden p-8 shadow-xl">
            <div className="absolute -right-10 -top-10 text-teal-500/10 transition-transform duration-700 group-hover:scale-110">
              <Wifi size={160} />
            </div>

            <h3 className="relative z-10 mb-6 text-xs font-bold uppercase tracking-widest text-teal-600 dark:text-teal-500">WLAN Zugang</h3>

            {qrCodeUrl ? (
              <div className="relative z-10 mb-6 rounded-3xl border border-[var(--border)] bg-white p-4 shadow-sm">
                <img src={qrCodeUrl} alt="WLAN QR Code" className="h-40 w-40 rounded-xl" />
              </div>
            ) : (
              <div className="relative z-10 mb-6 rounded-3xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-4 text-xs text-[var(--muted-foreground)]">
                QR-Code ist deaktiviert, bis ein WLAN-Passwort in den Umgebungsvariablen hinterlegt ist.
              </div>
            )}

            <p className="relative z-10 mb-2 text-sm text-[var(--muted-foreground)]">Oder manuell verbinden:</p>
            <div className="relative z-10 flex w-full max-w-[250px] flex-col items-center gap-2">
              <span className="font-bold text-lg">{wifiName}</span>
              {wifiPassword ? (
                <CopyTextButton text={wifiPassword} label="Passwort kopieren" />
              ) : (
                <p className="rounded-2xl bg-[var(--surface-soft)] px-4 py-3 text-center text-xs text-[var(--muted-foreground)]">
                  Passwort nicht im Frontend gespeichert. Bitte direkt bei uns nachfragen.
                </p>
              )}
            </div>
          </Card>

          <div className="flex flex-col gap-6">
            <Card className="relative flex flex-1 flex-col justify-center overflow-hidden bg-stone-900 p-8 text-white dark:bg-stone-900">
              <div className="relative z-10 mb-4 flex items-center gap-3">
                <Cat size={24} className="text-[#C5A38E]" />
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#C5A38E]">Püppi Guide</h3>
              </div>
              <ul className="relative z-10 space-y-4 text-sm text-stone-300">
                <li className="flex items-start gap-2">
                  <span className="text-[#C5A38E] mt-0.5">•</span>
                  <span>Gerne füttern. <strong className="text-white">Schleckis</strong> mag ich fast am liebsten.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#C5A38E] mt-0.5">•</span>
                  <span>Fenster geschlossen halten</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#C5A38E] mt-0.5">•</span>
                  <span>Kraulen am Bauch ist auf eigene Gefahr! 🐾</span>
                </li>
              </ul>
            </Card>

            <Card className="flex flex-1 flex-col justify-center p-8">
              <div className="flex items-center gap-3 mb-4">
                <Info size={20} className="text-amber-500" />
                <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--muted-foreground)]">Gut zu wissen</h3>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex flex-col items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-center">
                  <Coffee size={20} className="text-[var(--muted-foreground)]" />
                  <span className="font-medium">Getränke</span>
                  <span className="text-[10px] text-[var(--muted-foreground)]">Nimm dir was du brauchst.</span>
                </div>
                <div className="flex flex-col items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-center">
                  <Home size={20} className="text-[var(--muted-foreground)]" />
                  <span className="font-medium">Schuhe</span>
                  <span className="text-[10px] text-[var(--muted-foreground)]">Wir versuchen, schuhfrei zu sein.</span>
                </div>
              </div>
            </Card>
          </div>
          
        </section>

        <div className="flex items-center justify-center gap-2 pt-8 text-center text-xs text-[var(--muted-foreground)]">
          Made with <Heart size={12} className="text-rose-500 fill-rose-500" /> in der Höhle HQ
        </div>

      </div>
    </AppShell>
  );
}