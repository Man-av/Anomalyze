# Plan 002: Complete launch metadata and privacy surfaces

## Status
- Priority: P1
- Effort: M
- Risk: MED
- Depends on: plans/001-verification-baseline.md
- Category: docs
- Planned at: commit `0cfd4b6`, 2026-09-07

## Why this matters
Privacy claims exist in README/footer, but there is no Privacy Policy route or disclosure link. `app/layout.tsx` uses `/gemini-svg.svg` as favicon and Open Graph metadata lacks URL and image.

## Current state
- `app/layout.tsx:46-59` has one global title/description, provider favicon, and partial OG metadata.
- No `app/privacy/page.tsx` exists.
- `components/analyzer/AnalyzerApp.tsx` footer has the local-analysis statement but no policy link.
- README documents browser-local parsing, aggregate-only insights, capped chat sample, and optional aggregate history.

## Scope
In scope: `app/layout.tsx`, new `app/privacy/page.tsx`, `components/analyzer/AnalyzerApp.tsx`, and truthful static OG/favicon assets under `public/`. Out of scope: analytics, unsupported legal claims, redesign.

## Steps
1. Add an Anomalyze-branded favicon and update `metadata.icons`; add OG URL/image and Twitter metadata using the deployed canonical URL.
2. Add a privacy page with metadata and sections covering actual browser/API/history data flows. Do not claim encryption, zero retention, compliance, or deletion behavior not evidenced by code.
3. Link `/privacy` from the footer.
4. Add descriptive metadata for sign-in/sign-up routes if they inherit the generic home title. Verify typecheck/build and manually inspect all four routes.

## Done criteria
- Branded favicon, complete OG metadata, working privacy route/link, unique important-page titles, no invented claims.
- Typecheck/build pass.

## STOP conditions
- Retention/deletion behavior cannot be established from `schema.sql` and history routes.
- No suitable branded asset exists without changing brand direction; report it.

## Maintenance notes
Update the page whenever request payloads, Clerk history, retention, or model providers change.
