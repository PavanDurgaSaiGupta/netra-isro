# NETRA v2 — "THE LIVING INSTRUMENT" — Design Contract

This document is the binding contract for the v2 reinvention. Every implementing agent
MUST read it fully before writing code, plus the three skill files listed in §0.
If the contract and your instinct disagree, the contract wins. If the contract is
ambiguous, choose the most disciplined option and note it in your result summary.

## 0. Mandatory reading (in order)

1. `C:/Users/Lenovo/.agents/skills/motion-design/SKILL.md` — motion grammar
2. `C:/Users/Lenovo/.agents/skills/high-end-visual-design/SKILL.md` — premium execution bar
3. `C:/Users/Lenovo/.agents/skills/design-taste-frontend/SKILL.md` — anti-generic rules

## 1. Identity

The interface is not a dashboard showing a mission — it **is** the mission instrument.
Dark-void canvas, instrument-grade typography, orange (#ff6b1a) as command color,
cyan (#00f0ff) as live-instrument color. Everything moves with orbital rhythm; nothing
decorates. If a motion doesn't communicate state, timing, or hierarchy, cut it.

Brand voice: uppercase mono labels with wide tracking (`hud-text`), Orbitron for
display numerals/titles, Inter for body. Keep `NETRA` / `DSSAM` / `ISTRAC` naming.

## 2. Design tokens (CSS custom properties — CSS agent implements; TSX may reference)

```css
/* existing tokens stay; these are ADDED/CHANGED */
--ease-standard: cubic-bezier(0.4, 0, 0.2, 1);
--ease-entrance: cubic-bezier(0.16, 1, 0.3, 1);   /* decelerate — entrances */
--ease-exit: cubic-bezier(0.55, 0, 0.85, 0.36);   /* accelerate — exits */
--ease-capture: cubic-bezier(0.34, 1.56, 0.64, 1);/* overshoot — confirmations ONLY */
--dur-instant: 120ms; --dur-fast: 240ms; --dur-base: 420ms; --dur-slow: 640ms;
--stagger-step: 60ms;                              /* total stagger budget ≤ 500ms */
--glow-orange: 0 0 24px rgba(255, 107, 26, 0.35);
--glow-cyan: 0 0 24px rgba(0, 240, 255, 0.30);
--surface-raised: linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0));
--radius-panel: 6px;
```

Rules: entrances use `--ease-entrance`, exits `--ease-exit`, hover/focus `--ease-standard`,
`--ease-capture` only for selection/confirmation moments. Durations: micro 120–240ms,
panels 420ms, hero/boot moments up to 640ms. Stagger steps 60ms, total budget 500ms.

## 3. Motion primitives (foundation agent builds; everyone uses — no bespoke animation code)

- `src/lib/motion.ts` — exports: `EASE` (the four curves), `DUR`, `stagger(n)` helper,
  `prefersReducedMotion()` (live check), and `gsap.registerPlugin(ScrollTrigger)` setup.
  All GSAP work in components goes through `useGSAP` from `@gsap/react` (scope + auto-cleanup).
- `src/components/shell/OdometerNumber.tsx` — props `{ value: number, format?: (n: number) => string, className?: string }`.
  Rolls between values with gsap tween on a proxy, writing `textContent` via ref —
  **zero React state per frame**. Respects reduced motion (snaps instantly).
- `prefers-reduced-motion`: every JS animation checks it (via `gsap.matchMedia()` or the
  helper) and snaps to end-state when set. CSS clamp block stays.
- animejs is REMOVED. Its three call sites (Hero, DebrisGrowthChart, TelemetryReadout)
  are migrated to gsap via `useGSAP`. `framer-motion` is removed from package.json too
  (never used). `lenis` is USED: `SmoothScroll` wrapper on content routes (landing, about).

## 4. Per-component contract (class names are binding — CSS agent implements exactly these)

### Boot sequence — `MissionPreloader.tsx` (Go/No-Go poll)
Full-void screen, mono log lines typed in at ~28ms/char, staggered 90ms:
`GUIDANCE ........ NOMINAL` / `PROPAGATION (SGP4) .. NOMINAL` / `UPLINK (CELESTRAK) .. <LIVE status>` /
`INSTRUMENT GRID ..... NOMINAL` / `DSSAM CORE .......... ARMED` — each line's status word
colored (green/amber). Progress bar is a thin 2px line at the bottom filling with
`--ease-standard`. End card: giant Orbitron "NETRA" with a one-time scanline reveal,
then "ALL SYSTEMS NOMINAL — ENTER" CTA (click or auto-continue). Texture loading folds
into the poll (texture line shows LOADING→NOMINAL). Skippable via any key/click.
Class names: `boot`, `boot__log`, `boot__line`, `boot__status`, `boot__brand`,
`boot__cta`, `boot__progress`.

### Radar-first navigation — `Sidebar.tsx`
The sidebar becomes a live polar instrument: an SVG radar (~220px) with range rings,
a rotating sweep (4s linear infinite, conic gradient wedge), and the six nav items as
contacts plotted on the scope. Sweep crossing a contact pulses it. Hover = lock
(artifact ring + label brightens, `--ease-capture`). Active route = locked contact
(filled + persistent ring + label). Below the scope: vertical mono labels.
Class names: `radar-nav`, `radar-nav__scope`, `radar-nav__sweep`, `radar-nav__ring`,
`radar-nav__contact`, `radar-nav__contact--locked`, `radar-nav__label`,
`radar-nav__meta` (footer: version/org id). Mobile: keep existing MobileBottomNav.

### TopBar — mission clock instrument
Left: NETRA wordmark + uplink status dot (pulsing when SYNCING). Center: IST clock as
OdometerNumber digits + `CYCLE nnnn` rolling. Right: search stays (add `aria-expanded`
etc.), mode tabs get `aria-current`. The h1 moves OUT of TopBar (a11y finding) — each
view owns its h1. Class names unchanged + `topbar__clock`, `topbar__cycle`.

### SSA ticker → Orbit band — `SSATicker.tsx`
Full-width 28px band, content duplicated (duplicate copy gets `aria-hidden`),
scrolling marquee pauses on hover; items separated by `·`; leading live-dot.
Class names: `orbit-band`, `orbit-band__track`, `orbit-band__item`, `orbit-band__dot`.

### Page transitions — `App.tsx`
Route changes animate: outgoing view translates along a slight arc (y drift + x) with
`--ease-exit` 240ms, incoming enters from the mirrored side with `--ease-entrance` 420ms.
Implement as a small `PageTransition` wrapper keyed on `location.pathname` using
`useGSAP` (no layout thrash; the three.js scene is NOT remounted — only the content
layer transitions). `SmoothScroll` (Lenis) wraps content routes only.

### Landing — `LandingPageView.tsx`, `ProgramSection.tsx`, `Footer.tsx`
Hero: massive Orbitron kinetic headline ("TRACK THE / INDIAN ORBIT" style, 3–5 words)
assembling word-by-word on load (stagger 90ms, `--ease-entrance`), a thin cyan scanline
sweeping the headline once; sub-copy fades after. Scroll: Lenis + ScrollTrigger —
mission cards get a light-sweep border reveal + slight rise on enter; portal card gets
depth parallax (two layers, `data-depth` attributes, mouse-driven, ±8px, lerped in rAF
via gsap.quickTo). Cards use tinted-surface depth (double-bezel per the premium skill):
outer hairline + inner glow on hover. Disclaimer stays. Class names: existing +
`landing-hero__line`, `landing-hero__scanline`, `mission-summary__card-sweep`.

### Cockpit — `LiveTrackingView`, `OrbitScene`, `orbit/*`, `SatelliteDetailDrawer`, `OverheadRadar`
- Drawer becomes a staged dossier: three groups (IDENTITY / KINEMATICS / GROUND LINK)
  slide in staggered 60ms when selection changes (keyed on id — the fix stays);
  header row: name in Orbitron + type badge; close via ESC (add it) and button.
- Telemetry values use OdometerNumber (foundation migrates the file; cockpit must not
  re-implement animation there).
- Orbit trails FIXED (finding #9): compute the trail ring in the satellite's orbital
  plane — rotate the circle by RAAN (`satrec` node is unavailable in the item; derive an
  approximation from inclination + current ascending longitude: rotate the ring around
  Y by the node angle estimated from current lat/lng so the trail passes through the
  marker; dispose old geometry on change (already done).
- Radar widget: sweep line rotates 4s; blips ease outward with range; ISS contact gets a
  distinct marker. Starfield/atmosphere: keep; Earth atmosphere material disposed on
  unmount (small fix allowed).

### Catalog / Debris / Alerts / About — views agent
- Catalog: rows/cards hover lifts 2px + border glows cyan; sort changes animate rows
  with a 240ms opacity/shift stagger (≤500ms budget); the two h1s collapse to one
  (view-level). Skeleton stays.
- Debris: conjunction rows stagger in on scroll (ScrollTrigger); export buttons unchanged.
- Alerts: wire-feed look — new items slide in from top with the capture easing; the
  auto-append interval (fixed) is the heartbeat; add `role="log" aria-live="polite"`.
- About: timeline items reveal on scroll; keep copy.

### Global a11y must-haves (fold in): click-only divs → button/role+tabIndex+Enter/Space;
`aria-pressed` on pills; `aria-hidden` on duplicated ticker copy; single h1 per page;
ESC closes drawer; focus outlines stay visible (2px cyan offset).

## 5. File ownership (DISJOINT — never touch a file you don't own)

| Agent | Owns |
| --- | --- |
| foundation | `src/lib/motion.ts` (new), `src/components/shell/OdometerNumber.tsx` (new), `src/components/Hero.tsx`, `src/components/DebrisGrowthChart.tsx`, `src/components/console/TelemetryReadout.tsx`, `package.json` (remove `animejs`, `framer-motion`) |
| shell | `src/components/shell/Sidebar.tsx`, `src/components/shell/TopBar.tsx`, `src/components/shell/SSATicker.tsx`, `src/components/shell/MissionPreloader.tsx`, `src/App.tsx`, `index.html` (font loading: preconnect + display=swap, drop unused weights) |
| landing | `src/views/LandingPageView.tsx`, `src/components/ProgramSection.tsx`, `src/components/Footer.tsx` |
| cockpit | `src/views/LiveTrackingView.tsx`, `src/components/OrbitScene.tsx`, `src/components/orbit/Earth.tsx`, `src/components/orbit/SatelliteMarker.tsx`, `src/components/orbit/CameraController.tsx`, `src/components/orbit/GroundStationBeam.tsx`, `src/components/console/SatelliteDetailDrawer.tsx`, `src/components/OverheadRadar.tsx` |
| views | `src/views/SatelliteCatalogView.tsx`, `src/views/DebrisAnalysisView.tsx`, `src/views/AlertsView.tsx`, `src/views/AboutView.tsx`, `src/components/MissionStats.tsx` |
| css | `src/index.css` (ONLY — runs after all TSX agents finish) |
| verify | runs checks only, edits nothing |

Forbidden to everyone: `src/context/SatelliteContext.tsx`, `src/services/*`,
`src/utils/audio.ts`, `src/components/shell/ViewBoundary.tsx` (keep as-is),
`vite.config.ts`, `src/components/shell/MobileBottomNav.tsx`, `src/components/shell/DataSkeleton.tsx`.
Do not add new npm dependencies. Do not change routes, data behavior, or the API of the context.

## 6. Verification gates (verify agent, node-direct from workspace root)

```
node netra-isro/node_modules/typescript/bin/tsc -b netra-isro --noEmit
node netra-isro/node_modules/oxlint/bin/oxlint netra-isro --config netra-isro/.oxlintrc.json
node netra-isro/node_modules/tsx/dist/cli.mjs netra-isro/regression.test.mjs
node netra-isro/node_modules/vite/bin/vite.js build netra-isro
```
All four must pass. CSS agent additionally cross-checks: every class used in TSX exists
in index.css (grep), and no dead section banners remain (sat-modal, orbit-hud-grid,
progressive-hud, scene-label, old hero, inspector modal).

## 7. Out of scope

Backend/API behavior, the data layer, routes, auth, the 3D scene's core rendering
(polish only), new npm dependencies, the context API shape.
