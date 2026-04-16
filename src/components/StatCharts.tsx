// src/components/StatCharts.tsx
"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line, ComposedChart, Legend } from 'recharts';

export default function StatCharts({ expenses, energy, totalIncome, totalFixed }: { expenses: any[], energy: any[], totalIncome: number, totalFixed: number }) {
  
  // 1. Cashflow: Die letzten 6 Monate generieren
  const last6Months = Array.from({length: 6}, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    return {
      month: d.getMonth(),
      year: d.getFullYear(),
      label: d.toLocaleDateString('de-DE', { month: 'short', year: '2-digit' })
    };
  });

  // 2. Ausgaben pro Monat gruppieren und Plus/Minus berechnen
  const cashflowData = last6Months.map(m => {
    // Finde alle Variablen Ausgaben für diesen speziellen Monat
    const monthExpenses = expenses.filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === m.month && d.getFullYear() === m.year;
    });
    
    const variableCosts = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
    const totalOut = totalFixed + variableCosts; // Fixkosten + Alltag
    const balance = totalIncome - totalOut; // Plus oder Minus

    return {
      name: m.label,
      Einkommen: totalIncome,
      Ausgaben: totalOut,
      Überschuss: balance
    };
  });

  // 3. Liniendiagramm Daten vorbereiten (Energie)
  const lineData = energy.map(r => ({
    name: new Date(r.date).toLocaleDateString('de-DE', { month: 'short', day: 'numeric' }),
    kWh: r.value
  }));

  // Custom Tooltip für den Cashflow, damit er "Höhle HQ" mäßig aussieht
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-stone-900 border border-stone-700 p-4 rounded-2xl shadow-xl">
          <p className="text-stone-400 text-xs font-bold uppercase tracking-widest mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm font-medium">
              {entry.name}: € {entry.value.toFixed(0)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      
      {/* CASHFLOW DIAGRAMM (Neu!) */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-6 rounded-[2.5rem] shadow-sm flex flex-col">
        <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-6">Cashflow (Letzte 6 Monate)</h3>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={cashflowData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" vertical={false} opacity={0.3} />
              <XAxis dataKey="name" stroke="#888" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="#888" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
              
              {/* Balken für Ausgaben */}
              <Bar dataKey="Ausgaben" fill="#A8A29E" radius={[4, 4, 0, 0]} maxBarSize={40} />
              {/* Linie für Überschuss (Plus/Minus) */}
              <Line type="monotone" dataKey="Überschuss" stroke="#C5A38E" strokeWidth={3} dot={{ r: 4, fill: '#C5A38E' }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Liniendiagramm (Energie) */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-6 rounded-[2.5rem] shadow-sm flex flex-col">
        <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-6">Stromzähler Historie</h3>
        <div className="h-72 w-full">
          {lineData.length > 0 ? (
             <ResponsiveContainer width="100%" height="100%">
               <LineChart data={lineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                 <CartesianGrid strokeDasharray="3 3" stroke="#444" vertical={false} opacity={0.3} />
                 <XAxis dataKey="name" stroke="#888" fontSize={10} tickLine={false} axisLine={false} />
                 <YAxis stroke="#888" fontSize={10} tickLine={false} axisLine={false} domain={['dataMin', 'dataMax']} />
                 <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', backgroundColor: '#1C1917', color: '#fff' }} />
                 <Line type="monotone" dataKey="kWh" stroke="#C5A38E" strokeWidth={3} dot={{ r: 4, fill: '#C5A38E' }} />
               </LineChart>
             </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-stone-400 italic text-sm">Keine Zählerstände</div>
          )}
        </div>
      </div>

    </div>
  );
}