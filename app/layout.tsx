import type { Metadata, Viewport } from "next";
import { Geist, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

/* Three families — display + body + one outlier — which is the ceiling.
 *
 * Space Grotesk was already here. Geist replaces the `"Inter"` that globals.css
 * named but never imported, so every body string was silently falling through to
 * system-ui. JetBrains Mono was named third in the old --font-mono stack, behind
 * ui-monospace, which meant it never won either.
 *
 * All three are variable fonts: one file per family, every weight available, so
 * the 200–300 unit display/body contrast costs no extra bytes.
 *
 * Not loaded: public/fonts/GoingToDoGreatThings.ttf. A cursive face inline-styled
 * into the h1 and the wordmark was family number four and the loudest tell in the
 * old design. The file is left on disk untouched. See design.md § 3. */
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Anomalyze — Upload data, get instant insights",
  description:
    "Upload any CSV or Excel file and get an instant statistical report, robust anomaly detection, an auto-built chart dashboard, and a data-aware chat — computed privately in your browser.",
  metadataBase: new URL("https://anomalyze.vercel.app"),
  openGraph: {
    title: "Anomalyze — Upload data, get instant insights",
    description:
      "Instant EDA: stats, robust anomaly detection, charts, and a data-aware chat. Your data is analyzed in the browser.",
    type: "website",
  },
};

// viewport-fit=cover so env(safe-area-inset-*) resolves on notched devices.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Runs before first paint to apply the saved (or system) theme, so there's no
// flash of the default. `data-theme="dark"` on <html> is the no-JS fallback.
const THEME_INIT = `(function(){try{var t=localStorage.getItem('theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia&&window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';}document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      data-theme="dark"
      suppressHydrationWarning
      className={`${spaceGrotesk.variable} ${geist.variable} ${jetbrainsMono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      {/* dvh, not vh — vh doesn't account for mobile browser chrome. */}
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
