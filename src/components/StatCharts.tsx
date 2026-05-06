// src/components/StatCharts.tsx
"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line, ComposedChart, Legend } from 'recharts';
import type { Expense, EnergyReading, Income } from "@prisma/client";

type StatChartsProps = {
  expenses: Expense[];
  energy: EnergyReading[];
  incomes: Income[];
  totalFixed: number;
  statsStartDateISO: string;
};

export default function StatCharts({ expenses, energy, incomes, totalFixed, statsStartDateISO }: StatChartsProps) {
  
  const statsStartDate = new Date(statsStartDateISO);
  const getValidMonths = () => {
    const result = [];
    const startYear = statsStartDate.getFullYear();
    const startMonth = statsStartDate.getMonth();
    
    const now = new Date();
    let currentYear = now.getFullYear();
    let currentMonth = now.getMonth();

    if (currentYear < startYear || (currentYear === startYear && currentMonth < startMonth)) {
       currentYear = startYear;
       currentMonth = startMonth;
    }

    for (let i = 5; i >= 0; i--) {
      let y = currentYear;
      let m = currentMonth - i;
      while (m < 0) {
        m += 12;
        y -= 1;
      }
      
      if (y > startYear || (y === startYear && m >= startMonth)) {
        const d = new Date(y, m, 1);
        result.push({
          month: m,
          year: y,
          label: d.toLocaleDateString('de-DE', { month: 'short', year: '2-digit' })
        });
      }
    }
    return result;
  };

  const displayMonths = getValidMonths();

  const cashflowData = displayMonths.map(m => {
    const monthExpenses = expenses.filter(e => new Date(e.date).getMonth() === m.month && new Date(e.date).getFullYear() === m.year);
    const monthIncomes = incomes.filter(i => new Date(i.date).getMonth() === m.month && new Date(i.date).getFullYear() === m.year);
    
    const variableCosts = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
    const actualIncome = monthIncomes.reduce((sum, i) => sum + i.amount, 0);
    
    let totalOut = totalFixed + variableCosts; 
    let balance = actualIncome - totalOut;

    // Logik-Glättung: Wenn in diesem Monat absolut keine Geldbewegungen waren (z.B. weil wir 
    // uns im Mai befinden, aber noch nichts eingetragen wurde), wollen wir nicht, dass das
    // Diagramm hart im Minus steht, nur weil die Fixkosten abgezogen wurden. 
    if (actualIncome === 0 && variableCosts === 0) {
      totalOut = 0;
      balance = 0;
    }

    return {
      name: m.label,
      Einkommen: actualIncome,
      Ausgaben: totalOut,
      Überschuss: balance
    };
  });

  const lineData = energy.map(r => ({
    name: new Date(r.date).toLocaleDateString('de-DE', { month: 'short', day: 'numeric' }),
    kWh: r.value
  }));

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ color: string; name: string; value: number }>; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-stone-900 border border-stone-700 p-4 rounded-2xl shadow-xl">
          <p className="text-stone-400 text-xs font-bold uppercase tracking-widest mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm font-medium">
              {entry.name}: € {Number(entry.value).toFixed(0)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-6 rounded-[2.5rem] shadow-sm flex flex-col">
        <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-6">Monats-Trend (Plus/Minus)</h3>
        <div className="h-72 w-full">
          {cashflowData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={cashflowData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" vertical={false} opacity={0.3} />
                <XAxis dataKey="name" stroke="#888" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#888" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                
                <Bar dataKey="Ausgaben" fill="#A8A29E" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Line type="monotone" dataKey="Überschuss" stroke="#C5A38E" strokeWidth={3} dot={{ r: 4, fill: '#C5A38E' }} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-stone-400 italic text-sm">Noch keine Daten im gewählten Zeitraum.</div>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-6 rounded-[2.5rem] shadow-sm flex flex-col">
        <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-6">Stromzähler Historie</h3>
        <div className="h-72 w-full">
          {lineData.length > 0 ? (
             <ResponsiveContainer width="100%" height="100%">
               <LineChart data={lineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                 <CartesianGrid strokeDasharray="3 3" stroke="#444" vertical={false} opacity={0.3} />
                 <XAxis dataKey="name" stroke="#888" fontSize={10} tickLine={false} axisLine={false} />
                 <YAxis stroke="#888" fontSize={10} tickLine={false} axisLine={false} domain={['dataMin', 'dataMax']} />
                 <Tooltip
                   contentStyle={{ borderRadius: '1rem', border: 'none', backgroundColor: '#1C1917', color: '#fff' }}
                   formatter={(value) => [`${Number(value ?? 0).toFixed(1)} kWh`, "Stromzaehler"]}
                 />
                 <Line type="monotone" dataKey="kWh" stroke="#C5A38E" strokeWidth={3} dot={{ r: 4, fill: '#C5A38E' }} />
               </LineChart>
             </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-stone-400 italic text-sm">Noch keine Stromdaten im gewählten Zeitraum.</div>
          )}
        </div>
      </div>

    </div>
  );
}