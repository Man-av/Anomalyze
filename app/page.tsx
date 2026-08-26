export default function Home() {
  return (
    <div className="bg-hero-glow min-h-screen">
      {/* Top bar */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2.5">
          <LogoMark />
          <span className="text-[15px] font-semibold tracking-tight">
            Anomalyze
          </span>
        </div>
        <nav className="flex items-center gap-6 text-sm text-muted">
          <a
            href="https://github.com/man-av"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-foreground"
          >
            GitHub
          </a>
        </nav>
      </header>

      {/* Hero */}
      <main className="mx-auto max-w-6xl px-6">
        <section className="pt-16 pb-14 text-center sm:pt-24">
          <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1 text-xs text-muted backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-ok" />
            Analyzed in your browser — your data never leaves your device for the report
          </div>
          <h1 className="mx-auto max-w-3xl text-balance text-4xl font-semibold leading-[1.1] tracking-tight sm:text-6xl">
            Upload a dataset.
            <br />
            <span className="text-accent">Understand it in seconds.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-pretty text-base text-muted sm:text-lg">
            Drop in any CSV or Excel file and Anomalyze profiles every column,
            flags real anomalies, builds the right charts, and lets you ask
            questions in plain English.
          </p>

          {/* Dropzone placeholder (wired up in the app build) */}
          <div className="mx-auto mt-10 max-w-xl">
            <div className="group cursor-pointer rounded-2xl border-2 border-dashed border-border-strong bg-surface/50 p-10 text-center transition-colors hover:border-accent hover:bg-surface">
              <UploadIcon />
              <p className="mt-4 text-[15px] font-medium text-foreground">
                Drop your file here, or click to browse
              </p>
              <p className="mt-1 text-sm text-muted-2">
                .csv, .xlsx or .xls — up to ~25MB
              </p>
            </div>
            <p className="mt-3 text-xs text-muted-2">
              No account needed. Try a sample dataset instead once the app is live.
            </p>
          </div>
        </section>

        {/* What you get */}
        <section className="grid gap-4 pb-24 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-[var(--radius-card)] border border-border bg-surface p-5"
            >
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-accent-soft text-accent">
                {f.icon}
              </div>
              <h3 className="text-sm font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">
                {f.body}
              </p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-6 py-8 text-sm text-muted-2 sm:flex-row">
          <p>
            Built by Manav Sharma ·{" "}
            <a
              href="https://github.com/man-av"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:text-accent-hover"
            >
              @man-av
            </a>
          </p>
          <p>Statistics computed locally · AI narration is optional</p>
        </div>
      </footer>
    </div>
  );
}

const FEATURES = [
  {
    title: "Instant report",
    body: "A plain-English read on what the data is, its shape, trends, and quality — no setup.",
    icon: <DocIcon />,
  },
  {
    title: "Robust anomalies",
    body: "Outliers found with MAD & IQR methods that don't get fooled by the outliers themselves.",
    icon: <AlertIcon />,
  },
  {
    title: "Auto dashboard",
    body: "Histograms, time series, correlations — the right chart chosen per column type.",
    icon: <ChartIcon />,
  },
  {
    title: "Chat with it",
    body: "Ask questions in plain language, grounded on computed facts — not raw-row guesswork.",
    icon: <ChatIcon />,
  },
];

/* --- Inline icons (no icon dependency) --- */
function LogoMark() {
  return (
    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-accent-fg">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M3 17l5-6 4 4 5-8 4 6"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
function UploadIcon() {
  return (
    <svg
      className="mx-auto text-muted transition-colors group-hover:text-accent"
      width="34"
      height="34"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M12 16V4m0 0l-4 4m4-4l4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function DocIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 3h8l4 4v14a1 1 0 01-1 1H6a1 1 0 01-1-1V4a1 1 0 011-1z M14 3v4h4 M8 12h8 M8 16h5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function AlertIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3l9 16H3l9-16z M12 10v4 M12 17.5v.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function ChartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 20V10 M10 20V4 M16 20v-7 M22 20H2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function ChatIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M21 12a8 8 0 01-11.5 7.2L4 20l1-4.2A8 8 0 1121 12z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
