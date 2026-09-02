"use client";

/**
 * Dark/light toggle. The initial theme is set before paint by the inline
 * script in app/layout.tsx (localStorage → system preference → dark), so this
 * button only flips `data-theme` on <html> and persists the choice.
 *
 * The icon is swapped by CSS (the `dark:` variant reads `data-theme`), not React
 * state — so there's no hydration mismatch and no flash on load.
 */

import { MoonIcon, SunIcon } from "@/components/icons";

export function ThemeToggle() {
  function toggle() {
    const el = document.documentElement;
    const next = el.getAttribute("data-theme") === "dark" ? "light" : "dark";
    el.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* storage unavailable — the choice just won't persist */
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle dark mode"
      title="Toggle theme"
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted transition-colors duration-[var(--dur-micro)] ease-out hover:bg-surface-2 hover:text-foreground"
    >
      {/* sun shows in dark mode (click → light); moon shows in light mode */}
      <SunIcon size={18} className="hidden dark:block" />
      <MoonIcon size={18} className="block dark:hidden" />
    </button>
  );
}
