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
// CSS injected client-side only for elements not in Clerk appearance API.
// Uses broad attribute selectors alongside .cl-* to survive Clerk class hashing.
// ---------------------------------------------------------------------------

const DARK_CLERK_CSS = `
  /* ── GitHub Octocat: black SVG → white ── */
  .cl-socialButtonsProviderIcon__github {
    filter: invert(1) brightness(1.2) !important;
  }

  /* ── "Last used" badge (stable .cl-badge public class) ── */
  .cl-badge {
    background-color: oklch(26% 0.055 49) !important;
    color: oklch(80% 0.200 49) !important;
    border: 1px solid oklch(50% 0.150 49) !important;
    font-weight: 700 !important;
    font-size: 0.58rem !important;
    letter-spacing: 0.05em !important;
    padding: 2px 6px !important;
    border-radius: 4px !important;
    opacity: 1 !important;
    visibility: visible !important;
  }

  /* ── "Secured by Clerk" footer ──
     Target only the stable .cl-footer container and its direct text.
     SVG inherits currentColor so no need to pierce internal elements. */
  .cl-footer {
    color: oklch(62% 0.010 74) !important;
    opacity: 1 !important;
  }
  .cl-footer * {
    color: inherit !important;
    fill: currentColor !important;
  }
`;

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

// Prevents the style tag from rendering on the server (SSR) to avoid
// hydration mismatch. It only becomes true after the component mounts.
function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

// ---------------------------------------------------------------------------
// AuthShell
// ---------------------------------------------------------------------------

interface AuthShellProps {
  children: (appearance: ReturnType<typeof buildAppearance>) => React.ReactNode;
}

export function AuthShell({ children }: AuthShellProps) {
  const dark    = useDarkMode();
  const mounted = useMounted();
  const appearance = buildAppearance(dark);

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Only injected client-side after mount — prevents hydration mismatch */}
      {mounted && dark && (
        <style
          id="clerk-dark-patch"
          dangerouslySetInnerHTML={{ __html: DARK_CLERK_CSS }}
        />
      )}

      {/* ── Header ── */}
      <header className="sticky top-0 z-[var(--z-sticky)] border-b border-border bg-background">
        <div className="mx-auto flex max-w-6xl items-center gap-x-4 px-4 py-3 sm:px-6">
          <a
            href="https://anomalyze-khaki.vercel.app/"
            className="shrink-0 font-brand text-panel leading-head font-bold tracking-tight text-foreground no-underline"
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