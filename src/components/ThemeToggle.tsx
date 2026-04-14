// src/components/ThemeToggle.tsx
"use client";

import { useTheme } from "./ThemeProvider";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button 
      onClick={toggleTheme} 
      className="p-2.5 rounded-full hover:bg-stone-200 dark:hover:bg-stone-800 transition text-xl flex items-center justify-center" 
      title="Dark Mode umschalten"
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  );
}