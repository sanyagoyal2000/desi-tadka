"use client";

import { Moon, Sun } from "@phosphor-icons/react/dist/ssr";

// Flips the resolved theme the inline script in layout.tsx set on <html>, and remembers it.
export default function ThemeToggle() {
  return (
    <button
      type="button"
      aria-label="Toggle dark mode"
      onClick={() => {
        const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", next);
        try {
          localStorage.setItem("theme", next);
        } catch {}
      }}
      className="grid size-10 place-items-center rounded-full bg-surface text-lg shadow-[0_2px_8px_rgba(42,26,16,0.08)] focus-visible:outline-2 focus-visible:outline-turmeric"
    >
      <Moon aria-hidden="true" size={20} weight="bold" className="text-chili dark:hidden" />
      <Sun aria-hidden="true" size={20} weight="bold" className="hidden text-turmeric dark:block" />
    </button>
  );
}
