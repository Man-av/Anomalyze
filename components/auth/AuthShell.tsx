"use client";

/**
 * AuthShell — wrapper for /sign-in and /sign-up pages.
 *
 * Keeps the app header visible while Clerk renders its card.
 * Appearance prop mirrors design tokens and responds to dark/light toggle.
 *
 * Three things cannot be styled via appearance API in Clerk v7:
 *   - GitHub Octocat icon (black SVG, invisible on dark)
 *   - "Last used" badge on social buttons
 *   - "Secured by Clerk" footer branding
 * These are patched via an injected <style> tag targeting .cl-* class names.
 *
 * Hydration: the <style> is only injected after mount (useEffect) so the
 * server render never includes it — preventing SSR/client mismatch.
 */

import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

// ---------------------------------------------------------------------------
// Clerk appearance factory
// ---------------------------------------------------------------------------

function buildAppearance(dark: boolean) {
  if (dark) {
    const bg        = "oklch(14.8% 0.008 70)";
    const cardBg    = "oklch(19.4% 0.010 70)";
    const btnBg     = "oklch(24.0% 0.013 70)";
    const borderMid = "oklch(35.6% 0.014 72)";
    const fg        = "oklch(95.0% 0.006 80)";
    const muted     = "oklch(68.0% 0.012 74)";
    const accent    = "oklch(72.0% 0.180 49)";
    const accentFg  = "oklch(14.8% 0.008 70)";
    const danger    = "oklch(69.0% 0.170 20)";

    return {
      variables: {
        colorBackground: bg,
        colorInputBackground: btnBg,
        colorInputText: fg,
        colorText: fg,
        colorTextSecondary: muted,
        colorPrimary: accent,
        colorDanger: danger,
        colorNeutral: fg,
        borderRadius: "8px",
        fontFamily: "var(--font-geist), 'Geist', ui-sans-serif, system-ui, sans-serif",
        fontFamilyButtons: "var(--font-space-grotesk), 'Space Grotesk', ui-sans-serif, sans-serif",
      },
      elements: {
        card: {
          backgroundColor: cardBg,
          border: `1px solid ${borderMid}`,
          boxShadow: "0 8px 32px -8px oklch(4% 0.010 70 / 0.7)",
        },
        headerTitle: {
          fontFamily: "var(--font-space-grotesk), 'Space Grotesk', ui-sans-serif, sans-serif",
          color: fg,
          fontWeight: "700",
        },
        headerSubtitle: { color: muted },
        dividerLine: { backgroundColor: borderMid },
        dividerText: { color: muted },
        formFieldLabel: { color: muted, fontWeight: "500" },
        formFieldInput: {
          backgroundColor: btnBg,
          borderColor: borderMid,
          borderWidth: "1.5px",
          color: fg,
        },
        formFieldInputShowPasswordButton: { color: muted },
        formButtonPrimary: {
          backgroundColor: accent,
          color: accentFg,
          fontWeight: "600",
          boxShadow: "none",
        },
        footerActionLink: { color: accent, fontWeight: "600" },
        footerActionText: { color: muted },
        identityPreviewText: { color: fg },
        identityPreviewEditButton: { color: accent },
        socialButtonsBlockButton: {
          backgroundColor: btnBg,
          borderColor: borderMid,
          borderWidth: "1.5px",
          color: fg,
        },
        socialButtonsBlockButtonText: { color: fg, fontWeight: "500" },
        badge: {
          backgroundColor: "oklch(22% 0.045 49)",
          color: "oklch(72% 0.180 49)",
          border: "1px solid oklch(45% 0.130 49)",
        },
        otpCodeFieldInput: {
          backgroundColor: btnBg,
          borderColor: borderMid,
          color: fg,
        },
        alternativeMethodsBlockButton: {
          backgroundColor: btnBg,
          borderColor: borderMid,
          color: fg,
        },
      },
    };
  }

  // ── Light mode ──────────────────────────────────────────────────────────
  const bg      = "oklch(97.4% 0.006 80)";
  const surface = "oklch(99.2% 0.004 80)";
  const surface2= "oklch(95.6% 0.008 80)";
  const border  = "oklch(88.0% 0.012 78)";
  const fg      = "oklch(20.5% 0.012 70)";
  const muted   = "oklch(47.5% 0.014 72)";
  const accent  = "oklch(55.5% 0.145 49)";
  const accentFg= "oklch(99.2% 0.004 80)";
  const danger  = "oklch(59.8% 0.181 20)";

  return {
    variables: {
      colorBackground: bg,
      colorInputBackground: surface2,
      colorInputText: fg,
      colorText: fg,
      colorTextSecondary: muted,
      colorPrimary: accent,
      colorDanger: danger,
      colorNeutral: fg,
      borderRadius: "8px",
      fontFamily: "var(--font-geist), 'Geist', ui-sans-serif, system-ui, sans-serif",
      fontFamilyButtons: "var(--font-space-grotesk), 'Space Grotesk', ui-sans-serif, sans-serif",
    },
    elements: {
      card: {
        backgroundColor: surface,
        border: `1px solid ${border}`,
        boxShadow: "0 4px 16px -4px oklch(20% 0.012 70 / 0.10)",
      },
      headerTitle: {
        fontFamily: "var(--font-space-grotesk), 'Space Grotesk', ui-sans-serif, sans-serif",
        color: fg,
        fontWeight: "700",
      },
      headerSubtitle: { color: muted },
      dividerLine: { backgroundColor: border },
      dividerText: { color: muted },
      formFieldLabel: { color: muted, fontWeight: "500" },
      formFieldInput: {
        backgroundColor: surface2,
        borderColor: border,
        borderWidth: "1.5px",
        color: fg,
      },
      formButtonPrimary: {
        backgroundColor: accent,
        color: accentFg,
        fontWeight: "600",
        boxShadow: "none",
      },
      footerActionLink: { color: accent, fontWeight: "600" },
      footerActionText: { color: muted },
      identityPreviewText: { color: fg },
      identityPreviewEditButton: { color: accent },
      socialButtonsBlockButton: {
        borderColor: border,
        borderWidth: "1.5px",
        backgroundColor: surface,
        color: fg,
      },
      socialButtonsBlockButtonText: { color: fg, fontWeight: "500" },
      alternativeMethodsBlockButton: {
        borderColor: border,
        backgroundColor: surface,
        color: fg,
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Note: Clerk dark-mode patches (badge, hint text, footer, GitHub icon) live
// in app/globals.css under [data-theme="dark"] — pure CSS, no JS injection.
// ---------------------------------------------------------------------------


// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

function useDarkMode() {
  const [dark, setDark] = useState(false); // safe default for SSR

  useEffect(() => {
    // Read actual theme after mount
    const current =
      document.documentElement.getAttribute("data-theme") === "dark";
    setDark(current);

    const observer = new MutationObserver(() => {
      setDark(
        document.documentElement.getAttribute("data-theme") === "dark"
      );
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  return dark;
}



// ---------------------------------------------------------------------------
// AuthShell
// ---------------------------------------------------------------------------

interface AuthShellProps {
  children: (appearance: ReturnType<typeof buildAppearance>) => React.ReactNode;
}

export function AuthShell({ children }: AuthShellProps) {
  const dark       = useDarkMode();
  const appearance = buildAppearance(dark);

  return (
    <div className="relative z-10 flex min-h-dvh flex-col">

      {/* ── Header ── */}
      <header className="sticky top-0 z-[var(--z-sticky)] border-b border-border bg-background">
        <div className="mx-auto flex max-w-6xl items-center gap-x-4 px-4 py-3 sm:px-6">
          <a
            href="https://anomalyze-khaki.vercel.app/"
            className="shrink-0 font-brand text-panel leading-head font-bold tracking-tight text-foreground no-underline transition-colors duration-[var(--dur-micro)] hover:text-accent"
          >
            Anomalyze
          </a>
          <nav className="ml-auto flex items-center gap-1 sm:gap-2">
            <ThemeToggle />
          </nav>
        </div>
      </header>

      {/* ── Clerk card ── */}
      <main className="flex flex-1 items-center justify-center p-6">
        {children(appearance)}
      </main>
    </div>
  );
}