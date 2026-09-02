# Anomalyze — design system

Single source of truth for the visual design. One route, two states (landing ·
dashboard), one locked system. Every colour and every font in the app comes
through a token defined here. If you need a value that isn't here, add it here
first — do not inline a hex, an `oklch(...)`, or a `font-family`.

```
genre         modern-minimal
theme route   custom (tuned)
vibe          analyst's instrument, quiet, evidence-first
axes          light / geometric-sans / warm (ochre ~49°)
macrostructure  05 Workbench (landing) · 16 Feature Stack discipline (dashboard app shell)
nav           N9 Edge-aligned minimal
footer        Ft5 Statement
scope         designed-as-app
```

---

## 1 · Why these choices

**The product is an instrument, not a campaign.** Two audiences: a hiring
manager deciding in ten seconds whether this was designed or generated, and an
analyst deciding whether it's worth uploading a real file to. Both are served by
the same thing — the page showing its actual work instead of describing it. So
the real uploader is the hero, the real anomaly call-out is the artwork, and
there are no mockups, no device frames, no invented numbers.

**The accent is inherited, not chosen.** `#b45309` / `#f0a83c` is already the
brand signal, so it survives the redesign unchanged — only the notation moves to
OKLCH. What changes is everything *around* it.

**The one structural diagnosis.** The old palette paired a warm ochre accent
(hue 49°) with cool blue-grey neutrals (hue 265°). That is the failure
`color.md` names outright: it looks wrong and readers can't say why. Retinting
the neutrals warm (→ hue 78°) at identical lightness values is the highest-value
change in this redesign and costs no contrast.

**Chrome and data are different languages.** The UI accent (ochre) marks
interface state — focus, active nav, primary action. The chart palette encodes
data. They must never trade places, or chrome starts reading as a data series.
See § 6.

---

## 2 · Colour

OKLCH throughout. Lightness values are carried over from the previous hex
palette, so contrast ratios are preserved exactly; hue and chroma move.

### Light (`:root`)

| Token | Value | Role |
| --- | --- | --- |
| `--background` | `oklch(97.4% 0.006 80)` | paper |
| `--surface` | `oklch(99.2% 0.004 80)` | panels (was `#fff` — now tinted) |
| `--surface-2` | `oklch(95.6% 0.008 80)` | one elevation step |
| `--surface-3` | `oklch(93.2% 0.010 78)` | two steps |
| `--border` | `oklch(91.5% 0.010 78)` | hairline rule |
| `--border-strong` | `oklch(86.5% 0.014 76)` | emphasised rule |
| `--foreground` | `oklch(20.5% 0.012 70)` | ink |
| `--muted` | `oklch(47.5% 0.014 72)` | secondary text |
| `--muted-2` | `oklch(54.0% 0.012 74)` | tertiary text |
| `--accent` | `oklch(55.5% 0.145 49)` | **inherited brand ochre** |
| `--accent-hover` | `oklch(47.3% 0.125 46)` | inherited |
| `--accent-soft` | `oklch(96.1% 0.024 71)` | inherited |
| `--accent-fg` | `oklch(99.2% 0.004 80)` | text on accent fill |
| `--ring` | `oklch(52% 0.190 49)` | focus only, chroma raised for visibility |

### Dark (`[data-theme="dark"]`)

| Token | Value |
| --- | --- |
| `--background` | `oklch(14.8% 0.008 70)` |
| `--surface` | `oklch(19.4% 0.010 70)` |
| `--surface-2` | `oklch(22.8% 0.012 72)` |
| `--surface-3` | `oklch(26.4% 0.013 72)` |
| `--border` | `oklch(28.6% 0.012 70)` |
| `--border-strong` | `oklch(35.6% 0.014 72)` |
| `--foreground` | `oklch(93.8% 0.008 80)` |
| `--muted` | `oklch(71.0% 0.012 74)` |
| `--muted-2` | `oklch(64.5% 0.012 74)` |
| `--accent` | `oklch(78.3% 0.145 73)` |
| `--accent-hover` | `oklch(83.0% 0.125 77)` |
| `--accent-soft` | `oklch(24.8% 0.032 76)` |
| `--accent-fg` | `oklch(14.8% 0.008 70)` |
| `--ring` | `oklch(80% 0.180 73)` |

Hue never switches between modes. Elevation on dark is *lightness*, never
shadow — `surface` → `surface-2` → `surface-3` climbs ~3.5% L per step.

### Semantic signals

`--ok` 164° · `--warn` **88°** · `--danger` 20° · `--info` 245°.

`--warn` moved from 70° to 88°. At 70° it sat 21° from the accent, so an amber
warn badge was indistinguishable from an accent badge on a warm page. It is
still unmistakably amber; it is now unmistakably not the accent.

`--danger` and `--chart-anomaly` share hue 20° deliberately — an anomaly *is* the
danger state in this product, and one hue for one meaning is correct.

### Accent budget

The accent occupies **≤ 3% of any viewport**. Its permitted jobs:

- focus ring (`--ring`)
- the active item in the dashboard section rail
- the primary button fill (one per view)
- one or two words of hero emphasis
- the anomaly count when non-zero

It is **not** a background wash, not a gradient, not a section fill, and never
appears inside a chart canvas.

---

## 3 · Type

Three families — display + body + outlier, exactly at the 2+1 ceiling.

| Token | Face | Loaded as |
| --- | --- | --- |
| `--font-display` | **Space Grotesk** 500/600/700 | `next/font/google`, `--font-space-grotesk` |
| `--font-sans` | **Geist** variable | `next/font/google`, `--font-geist` |
| `--font-mono` | **JetBrains Mono** 400/500/600 | `next/font/google`, `--font-jetbrains` |

`GoingToDoGreatThings` — the cursive face previously inline-styled into the `h1`
and the wordmark — is family number four, and a script face on a statistics tool
is the single loudest generated-template tell in the old design. It is no longer
referenced. The `.ttf` remains in `public/fonts/` untouched; nothing was deleted.

The previous `--font-sans` named `"Inter"` but Inter was never imported, so all
body copy silently rendered `system-ui`. Geist is loaded for real.

### Roles

- **Display** — `h1`, `h2`, panel titles, KPI figures, the wordmark. The
  wordmark uses the display face against a Geist body, which is the one
  typographic register that says *brand* rather than *default* — required here
  because Workbench structures otherwise read visually generic.
- **Body** — all prose, all UI labels, buttons.
- **Mono** — data only: table cells, column names, file names, byte counts,
  σ figures, chart tick labels. Mono is the outlier register and it tags exactly
  one kind of content: *a value the app computed*. It never labels a button.

### Scale — 1.25 major third from 16px

```
text-xs      0.75rem    12px   captions, table meta   (Tailwind default)
text-sm      0.875rem   14px   secondary UI           (Tailwind default)
text-base    1rem       16px   body floor             (Tailwind default)
--fs-lede    1.25rem    20px   hero lede
--fs-panel   1.5625rem  25px   panel titles
--fs-head    1.9531rem  31px   section heads
--fs-head-lg 2.4414rem  39px
--fs-hero    clamp(2.125rem, 3.2vw + 1rem, 3.25rem)
--fs-hero-lg clamp(2.75rem,  5vw   + 1rem, 5.25rem)
```

The `--fs-` prefix is load-bearing. Tailwind v4 emits its own theme as `:root`
custom properties, so declaring `--text-lg` / `--text-xl` / `--text-2xl` in
`tokens.css` would silently resize every existing `text-lg` / `text-xl` /
`text-2xl` utility across the app. Steps at or below 1rem are identical to
Tailwind's and are not restated.

The hero `h1` is 63 characters, which lands in the 51–90 bucket → it uses
**`--fs-hero`**, not `--fs-hero-lg`. A 63-char headline at full display size is
the most reliable AI tell in typography.

Line-height: `1.06` display · `1.25` section heads · `1.55` body. Tracking
`-0.025em` on display, `0` on body. **Headings are always roman** — no italic
emphasis word, ever. Emphasis is carried by weight or the accent.

Body weight 400, display 600/700 — a 200–300 unit gap, not 400-next-to-500.
`tabular-nums` on every numeric column and every KPI figure.

---

## 4 · Space, radius, depth

4pt base, nine steps, named by role:

```
--space-3xs 2px   --space-2xs 4px   --space-xs 8px
--space-sm 12px   --space-md 16px   --space-lg 24px
--space-xl 40px   --space-2xl 64px  --space-3xl 96px
```

`gap` for sibling spacing, never stacked margins. Section padding is
deliberately uneven — the hero runs generous top / tight bottom; the feature
list runs tight top / generous bottom. Equal padding everywhere is the flat
rhythm that reads as template.

**Radius** — `--radius-sm 4px` · `--radius-md 6px` · `--radius-card 8px`. Tight,
in the Cobalt register. The old `14px` card radius reads consumer-app; 8px reads
instrument.

**Depth is weight and lightness, not shadow.** Two shadow tokens exist and no
more. `--shadow-hair: 0 1px 0 var(--border)` is a rule masquerading as depth, for
the rare case where an element needs an edge it cannot get from a border.
`--shadow-tooltip` is the one genuine elevation in the app: the chart tooltip
floats over the plot area, so it has to read as detached. No coloured glows, no
stacked shadows, nothing on a dark surface but the tooltip.

**Z-scale** — `--z-base 1` · `--z-raised 10` · `--z-dropdown 100` ·
`--z-sticky 200` · `--z-modal 400` · `--z-toast 500`. No ad-hoc values.

---

## 5 · Motion

Motion-cut project — no animation library. CSS transitions only.

```
--dur-micro 120ms   --dur-short 220ms   --dur-long 420ms
--ease-out    cubic-bezier(0.16, 1, 0.3, 1)
--ease-in     cubic-bezier(0.7, 0, 0.84, 0)
--ease-in-out cubic-bezier(0.65, 0, 0.35, 1)
```

Animate `transform` and `opacity` only. Never `transition-all`. Never browser
`ease`. No scroll-triggered reveals, no hover-lift on every card, no bounce.

`prefers-reduced-motion: reduce` collapses spatial motion to opacity; functional
motion (the parse/profile spinner, the quality meter fill) keeps running, slower.

**Focus rings never animate.** They appear instantly, on `:focus-visible`, at
≥ 3:1 against both the element and its background.

---

## 6 · Data-visualisation separation

The chart palette is carried over **unchanged** — hues, order, and the
cool-vs-warm diverging pair were validated for colour-vision deficiency and that
validation is not something a visual redesign gets to invalidate. Only the
notation moves to OKLCH.

Two hard rules:

1. **No chart component references `--accent`, `--accent-hover`, or
   `--accent-soft`.** Verified: zero matches under `components/charts/`. Keep it
   that way.
2. **No chrome element references `--chart-*`,** with two exceptions —
   `--chart-grid` and `--chart-axis`, which *are* chrome and are therefore
   retinted warm to match the page (they are the only chart tokens whose hue
   moves).

The accent (49°) does sit near `--chart-3` (58°) and `--chart-8` (41°). Because
neither language ever enters the other's surface, the adjacency is invisible in
practice. The mitigation is the separation rule above, not a repainted palette.

---

## 7 · Structure — landing state

**05 Workbench.** The page is the product in use, not a description of it.

1. **Hero** — two columns, `1.05fr / 0.95fr`, left-biased and asymmetric, and
   left-aligned at every width: a centred hero column is the most common
   generated-landing layout there is. Left: a plain sentence-case product
   descriptor, the `h1` at `--fs-hero`, the lede at `--fs-lede` capped to 65ch.
   Right: `AnomalySparkline` in a hairline frame, no shadow — the border already
   draws the edge. No eyebrow pattern — no leading dot, no mono uppercase, no
   tracking.
2. **Upload** — the real `Uploader` at full width of a 34rem column. This is the
   page's primary action and its largest single element. Width is decided once,
   here, so the drop target, the processing card, the error card, and the format
   caption under them can never disagree. Section head is a stacked single-column
   `h2`; the `01` ordinal and the trailing `h-px flex-1` hairline are gone.
3. **What it does** — a hairline `<dl>`. Each feature is a row: `<dt>` name in
   the display face, `<dd>` body in Geist, hairline between rows. No icon tiles,
   no coloured icon chips, no three-equal-column grid, no decorative fake bar
   chart.

**Removed:** `.bg-hero-glow`. A radial accent bloom behind a hero is
decoration with no semantic role, and it is on every generated landing page.

---

## 8 · Structure — dashboard state

**16 Feature Stack discipline, implemented as an app shell.** The catalog entry
describes a scroll-synced marketing tour; this is a working view, so it takes
the sticky-pane *structure* and drops the cinematic pacing.

The problem being solved: seven unlabelled panels stacked with `mt-8`, no
orientation, and the file identity scrolling out of view within one screen.

- **KPI strip** — full width, above everything else. It summarises the whole file,
  so it belongs with the identity rather than inside the panel column, and it is
  deliberately *not* in the rail: a nav link to the top of the page is not
  orientation.
- **Sticky rail** (`≥ 60rem`) — a left column listing the six panels as anchor
  links. Every label is the panel's own existing title; the rail names things, it
  does not rename them. The current section is marked with the accent, which is
  the whole of the rail's share of the accent budget. This is navigation, not an
  eyebrow row.
- **Panel canvas** — right column, one panel per row. The `Data quality` /
  `Anomalies` pair used to share a `0.8fr / 1.2fr` grid; the rail now occupies
  that horizontal space, and a five-column anomaly table in a 374px track is
  worse than the same table full width. Each panel is wrapped in a div carrying
  the rail's target `id` and `scroll-margin-block-start`, so the sticky header
  never covers a heading and no panel component has to know it is a link target.
- **Current-section tracking** — one `IntersectionObserver` whose root is squeezed
  to a band just under the sticky header. At most one panel crosses that band, so
  "current" needs no scoring heuristic; the last known section is held when
  nothing is in the band, because between two long panels the rail should keep
  its place rather than blank out.
- **Pinned identity** — the file name, row/column counts, and byte size move into
  the nav's middle slot in this state, so they stay visible at any scroll depth.
  The "New file" reset stays reachable at all times. Neither is repeated in the
  canvas.
- **Mobile fallback** (`< 60rem`) — the rail unsticks and becomes a horizontally
  scrollable chip strip directly beneath the header, bleeding to the viewport
  edge. Feature Stack explicitly warns against sticky + scroll-sync on small
  screens; this is that fallback. One markup path serves both layouts, and the
  2px left rule that marks the current item keeps its shape across the
  breakpoint.

`60rem` is not a Tailwind breakpoint, so the rail layout uses the `min-[60rem]:`
arbitrary variant rather than redefining `lg:` — which would silently reflow
`KpiCards` and `Dashboard` too.

Panel order and every panel's content are unchanged: KPIs → Report → Charts →
Chat → Quality → Anomalies → Columns.

---

## 9 · Interactive states

Every interactive element implements all eight: **rest · hover · active ·
focus-visible · disabled · loading · error · success**. The previous `Button`
covered four.

- `hover` — background shift + `translateY(-1px)`, `--dur-micro`, `--ease-out`.
  Wrapped in `@media (hover: hover) and (pointer: fine)`.
- `active` — `translateY(0)` and a darker fill. Present on every button.
- `focus-visible` — `--ring`, 2px, 2px offset, instant, never animated.
- `disabled` — `opacity: 0.55`, `cursor: not-allowed`, no hover response.
- `loading` — `aria-busy`, spinner replaces the label, width held so the button
  doesn't reflow.
- `error` / `success` — carried by `states.tsx` and the existing badge tones, not
  by button colour.
- `@media (pointer: coarse)` — 48px minimum target height.

No hover-only affordances: anything reachable by hover is reachable by focus and
by tap.

---

## 10 · Responsive floor

Verified at **320 · 375 · 414 · 768px**. Non-negotiable:

- `overflow-x: clip` on both `html` and `body` — `clip`, never `hidden`, because
  `hidden` creates a scroll container and breaks the sticky rail.
- No clickable text wraps to two lines. `white-space: nowrap` on buttons, nav
  links, footer links, and rail chips.
- Every grid track that can contain a chart or figure uses `minmax(0, 1fr)`,
  never bare `1fr`.
- Display headers carry `overflow-wrap: anywhere; min-width: 0`.
- Section heads are single-column at every width.
- `dvh` not `vh`. Never `100vw`.
- Breakpoints in `rem`, `min-width` direction only: `40rem` · `60rem` · `90rem`.

---

## 11 · Copy discipline

**Every string in the app is preserved verbatim.** This redesign changes
structure and styling only. No copy was rewritten, shortened, or invented.

Three strings changed *role* rather than wording:

- `"Anomaly Detection · In-browser"` — was a dot + mono-uppercase eyebrow, now a
  plain sentence-case product descriptor above the `h1`. Same words.
- `"Upload your data"` / `"What it does"` — were tag-left/heading-right section
  heads, now stacked single-column `h2`s. Same words.
- `"Statistics computed locally · AI narration is optional"` — was footer small
  print, now the Ft5 statement set as type. Same words. The footer had no other
  candidate: a statement footer needs one sentence worth reading, and inventing
  one would have been new copy.

Two purely ordinal decorations were dropped: the `01` and `02` numerals. They
are not content, and gate 54 bans the pattern they belonged to.

One string was *promoted*, not changed: the long "Auto dashboard" body that the
bento grid gave its large cell is now the `<dd>` for that row in the `<dl>`. The
short version the array carried was a prefix of it, so the `<dl>` loses nothing.

Two strings were *dropped* along with the elements that held them, and neither
was content: the KPI strip's file-identity duplicate (the header owns the file
name, counts, and size in the dashboard state, so the canvas repeated them) and
the second `New file` button that sat beside it.

No metric appears on the page that the app did not compute. There are no
testimonials, no logo wall, no "trusted by", no uptime figure, no speed claim.
The old decorative 10-bar fake chart beside "Auto dashboard" is gone.

---

## 12 · Prohibited in this codebase

- Inline `#hex`, `oklch(...)`, `rgb(...)`, or `font-family` anywhere in `.tsx`.
  Tokens only.
- Eyebrows. Section ordinals. Tag-left / heading-right section heads.
- Hanging headers (not requested; opt-in only).
- Gradient backgrounds. Gradient text. Radial glows. Glassmorphism.
- Re-drawn browser bars, phone frames, IDE chrome, or fake code windows.
- Icon-in-coloured-square feature cards. Three-equal-column feature grids.
- Emoji as an icon.
- Italic headings.
- Card-in-card nesting.
- `transition-all`, `hover:scale-105`, bounce/elastic easing, parallax.
- A fourth font family.
