import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Anomalyze",
  description: "How Anomalyze processes uploaded files, AI requests, and optional analysis history.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-semibold">Privacy Policy</h1>
      <p className="mt-4 text-muted">Anomalyze is designed to keep your uploaded data on your device whenever possible.</p>
      <div className="mt-10 space-y-8 text-sm leading-relaxed">
        <section><h2 className="text-lg font-semibold">Files and analysis</h2><p className="mt-2">CSV and Excel files are parsed and analyzed in your browser. Raw rows are not sent to Anomalyze&apos;s report endpoint.</p></section>
        <section><h2 className="text-lg font-semibold">AI requests</h2><p className="mt-2">When AI is configured, the report endpoint receives aggregate profile statistics. Chat receives grounded statistics and a small capped sample so it can answer questions. Do not upload sensitive information you are not comfortable sending to the configured AI provider.</p></section>
        <section><h2 className="text-lg font-semibold">Optional account history</h2><p className="mt-2">If you sign in, Anomalyze stores analysis aggregates, the generated report, file name/size, and quality counters so you can reopen an analysis. Raw rows are not stored. You can delete saved entries from the history drawer.</p></section>
        <section><h2 className="text-lg font-semibold">Contact</h2><p className="mt-2">For privacy questions, contact Manav Sharma through the project profile linked in the application footer.</p></section>
      </div>
    </main>
  );
}
