import type { Metadata } from "next";
import "./globals.css";

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

// Runs before first paint to apply the saved (or system) theme, so there's no
// flash of the default. `data-theme="dark"` on <html> is the no-JS fallback.
const THEME_INIT = `(function(){try{var t=localStorage.getItem('theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia&&window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';}document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
