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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
