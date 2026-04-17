// src/app/guests/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import { Wifi, Copy, Check, Home, Coffee, Info, Cat, Heart } from "lucide-react";

export default function GuestsPage() {
  const [copied, setCopied] = useState(false);
  
  // HIER EURE ECHTEN WLAN-DATEN EINTRAGEN
  const wifiName = "MagentaWLAN-1R19";
  const wifiPassword = "55992058316888683204";
  
  // Generiert automatisch einen scannbaren QR-Code für iPhones/Androids
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=WIFI:S:${wifiName};T:WPA;P:${wifiPassword};;`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(wifiPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#F9F7F5] dark:bg-stone-950 text-stone-900 dark:text-stone-100 p-4 md:p-8 transition-colors duration-300">
      <div className="max-w-4xl mx-auto space-y-8 pb-20">
        
        {/* HEADER */}
        <header className="flex items-center justify-between pb-6 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-4">
            <Link href="/" className="w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800 transition shadow-sm">
              ←
            </Link>
            <h1 className="text-3xl font-bold text-[#C5A38E]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              Welcome Book
            </h1>
          </div>
          <ThemeToggle />
        </header>

        {/* HERO SECTION */}
        <div className="text-center py-8">
          <h2 className="text-4xl md:text-5xl font-light mb-4" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Schön, dass du da bist.</h2>
          <p className="text-stone-500 dark:text-stone-400 max-w-lg mx-auto">Mach es dir bequem! Hier findest du alle wichtigen Infos für deinen Aufenthalt in der Höhle HQ.</p>
        </div>

        {/* GUEST BENTO GRID */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* WLAN WIDGET */}
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-8 rounded-[2.5rem] shadow-xl flex flex-col items-center justify-center relative overflow-hidden group">
            <div className="absolute -right-10 -top-10 text-teal-500/10 group-hover:scale-110 transition-transform duration-700">
              <Wifi size={160} />
            </div>
            
            <h3 className="text-xs font-bold text-teal-600 dark:text-teal-500 uppercase tracking-widest mb-6 relative z-10">WLAN Zugang</h3>
            
            <div className="bg-white p-4 rounded-3xl shadow-sm mb-6 relative z-10 border border-stone-100">
              <img src={qrCodeUrl} alt="WLAN QR Code" className="w-40 h-40 rounded-xl" />
            </div>
            
            <p className="text-sm text-stone-500 mb-2 relative z-10">Oder manuell verbinden:</p>
            <div className="flex flex-col items-center gap-2 relative z-10 w-full max-w-[250px]">
              <span className="font-bold text-lg">{wifiName}</span>
              <button 
                onClick={copyToClipboard}
                className="w-full flex items-center justify-center gap-2 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 px-4 py-3 rounded-2xl transition-colors font-mono text-sm"
              >
                {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} className="text-stone-500" />}
                {copied ? <span className="text-emerald-500">Kopiert!</span> : <span>Passwort kopieren</span>}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            {/* PÜPPI GUIDE */}
            <div className="bg-stone-900 text-white p-8 rounded-[2.5rem] shadow-lg flex-1 flex flex-col justify-center relative overflow-hidden">
              <div className="flex items-center gap-3 mb-4 relative z-10">
                <Cat size={24} className="text-[#C5A38E]" />
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#C5A38E]">Püppi Guide</h3>
              </div>
              <ul className="space-y-4 relative z-10 text-sm text-stone-300">
                <li className="flex items-start gap-2">
                  <span className="text-[#C5A38E] mt-0.5">•</span>
                  <span>Bitte Püppi <strong className="text-white">kein Essen vom Tisch</strong> geben, egal wie süß sie schaut.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#C5A38E] mt-0.5">•</span>
                  <span>Schlafzimmertür bitte immer geschlossen halten.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#C5A38E] mt-0.5">•</span>
                  <span>Kraulen am Bauch ist auf eigene Gefahr! 🐾</span>
                </li>
              </ul>
            </div>

            {/* GOOD TO KNOW */}
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-8 rounded-[2.5rem] shadow-sm flex-1 flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-4">
                <Info size={20} className="text-amber-500" />
                <h3 className="text-xs font-bold uppercase tracking-widest text-stone-400">Gut zu wissen</h3>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-stone-50 dark:bg-stone-950 p-4 rounded-2xl flex flex-col items-center text-center gap-2 border border-stone-100 dark:border-stone-800">
                  <Coffee size={20} className="text-stone-400" />
                  <span className="font-medium">Getränke</span>
                  <span className="text-[10px] text-stone-500">Bedien dich einfach am Kühlschrank!</span>
                </div>
                <div className="bg-stone-50 dark:bg-stone-950 p-4 rounded-2xl flex flex-col items-center text-center gap-2 border border-stone-100 dark:border-stone-800">
                  <Home size={20} className="text-stone-400" />
                  <span className="font-medium">Schuhe</span>
                  <span className="text-[10px] text-stone-500">Wir sind ein schuhfreier Haushalt.</span>
                </div>
              </div>
            </div>
          </div>
          
        </section>

        <div className="text-center pt-8 text-stone-400 flex items-center justify-center gap-2 text-xs">
          Made with <Heart size={12} className="text-rose-500 fill-rose-500" /> in der Höhle HQ
        </div>

      </div>
    </div>
  );
}