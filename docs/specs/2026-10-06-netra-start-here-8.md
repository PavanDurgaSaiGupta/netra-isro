# START HERE 8 — implementation contract (addendum to the v2 Living Instrument spec)

Every builder MUST read `2026-10-06-netra-v2-living-instrument.md` first, then this file.
Ownership is DISJOINT. If two items need the same file, the ownership table wins.

## Verified facts (measured/fetched this session — do not re-verify)

- `--text-tertiary: #5a6472` on `--bg-void: #05070a` = **3.36:1** (fails WCAG AA 4.5:1).
  `#8a94a3` on `#05070a` = **6.57:1** (passes). Hierarchy check: `--text-secondary: #9ca3af`
  stays lighter than the new tertiary — emphasis order is preserved.
- CelesTrak `GROUP=irnss` exists (IRNSS-1A …) and `GROUP=gps-ops` exists — TLE format.

## Ownership (disjoint — never touch a file you don't own)

| Builder | Items | Owns |
| --- | --- | --- |
| type-contrast | 1, 6 | `src/index.css`, `index.html` |
| keyboard-targets | 2, 3 | `src/components/console/SystemStatusPanel.tsx`, `src/views/SatelliteCatalogView.tsx`, `src/components/shell/TopBar.tsx`, `src/components/shell/SSATicker.tsx`, `src/components/shell/MobileBottomNav.tsx` |
| pass-predictions | 4 | `src/services/passes.ts` (NEW), `src/components/console/SatelliteDetailDrawer.tsx`, `src/components/OverheadRadar.tsx` |
| constellation-lens | 5 | `src/services/constellations.ts` (NEW), `src/components/OrbitScene.tsx` |
| mission-time | 7, 8 | `src/context/SatelliteContext.tsx`, `src/components/console/TimeControls.tsx` (NEW), `src/components/console/LiveDateline.tsx` (NEW), `src/views/LiveTrackingView.tsx` |
| verify/fixer | — | gates only; fixer may edit anything to make gates pass |

Forbidden to everyone: `src/services/satelliteData.ts`, `src/services/tleCache.ts`,
`src/services/satnogs.ts`, `src/services/issTrack.ts`, `src/utils/*` (empty),
`src/components/shell/ViewBoundary.tsx`. No new npm dependencies.

## Item contracts

**1 + 6 — type-contrast.** Set `--text-tertiary: #8a94a3`. Then walk EVERY pair where
text tokens sit on `--bg-panel: #0b0e13` or `--bg-panel-hover: #12161d` and measure with a
node one-liner (same luminance formula); fix any pair under 4.5:1 (or 3:1 for ≥24px/19px
bold). Typography floor: grep `font-weight:` uses of 100–300 and fix any below 18px to
≥400; ensure every line-height is unitless; ensure `index.html` loads only font weights
actually used in CSS (grep to prove); prose blocks keep their 68ch measure.

**2 — keyboard.** SystemStatusPanel diagnostic rows: real `<button>` (or role="button" +
tabIndex + Enter/Space) with accessible names; SatelliteCatalogView sortable `<th>`:
place a real `<button>` inside each th (keep `aria-sort` on the th). Focus-visible styles
must exist (2px cyan outline, offset) — add where missing.

**3 — hit areas.** WCAG 2.2 AA 2.5.8: every interactive control ≥24×24px CSS pixels.
Audit TopBar buttons/pills, orbit-band items, mobile nav, drawer close, sidebar radar
contacts (they're SVG — expand the hit shape). Fix via padding or an expanded
`::before` hit layer. List every control you fixed in notes.

**4 — pass predictions.** `src/services/passes.ts`:
`predictPasses(base: SeedItem-like, hoursAhead = 48, observer = BENGALURU_OBSERVER)`.
Algorithm: import BENGALURU_OBSERVER from satelliteData; parse satrec via
`twoline2satrec` (or reuse the pattern); coarse-scan elevation at 60 s steps for horizon
crossings (elevation > 0°), refine each crossing's AOS/LOS at 5 s steps, record max
elevation; return up to 3 passes `{ aosUtc, maxElevDeg, losUtc, durationMin }` as IST
strings via `formatIST`. Cache results per noradId in a session Map. Guard total SGP4
calls (48 h × 60 s = 2,880 per object — fine for one object on selection).
Drawer GROUND LINK: "NEXT PASS OVER ISTRAC" block — countdown to AOS (OdometerNumber),
max elevation, then the following 2 passes; OverheadRadar: one-line "NEXT PASS IN mm:ss"
for the selected/ISS object. Only compute when a satellite is selected; never per frame.

**5 — constellation lens.** `src/services/constellations.ts`: fetch GROUP=irnss, gps-ops,
galileo, beidou (FORMAT=tle, cap 25 per group), 24 h localStorage cache
(`netra_constellations_v1`), parse to lightweight `{ noradId, name, tle1, tle2, group }`.
OrbitScene: a `ConstellationLens` component — small overlay control (four toggle pills:
IRNSS · GPS · GALILEO · BEIDOU) rendered inside the scene container; active groups'
satellites render as dimmed small points (0.008 spheres, group-colored, opacity 0.5),
propagated from their own satrecs on the context tick (use useSatellites tick or a local
1.5 s interval — do NOT add context state). Not in the catalog, not selectable. Dispose
geometries properly.

**7 — mission time.** SatelliteContext: keep the 1.5 s interval; add
`simTimeRef` (starts Date.now()), rate ref; each tick advances `simTimeRef += 1500 * rate`
and `setTick(simTimeRef.current)` — so `satellites` propagate at sim time with zero
changes to consumers. Expose on the context: `timeRate`, `setTimeRate(rate: number)`,
`scrubTime(deltaMs: number)` (moves simTimeRef, triggers immediate tick), `goLive()`
(offset 0, rate 1). Update the context type. TimeControls.tsx: compact cockpit HUD —
LIVE badge (green when rate=1 & offset≈0), buttons: −10m −1m ⏸/▶ +1m +10m and rate steps
1× 10× 60×; a readout of sim time (IST via formatIST) + "OFFSET +mm:ss" when not live.
LiveDateline.tsx: bottom-of-cockpit horizontal timeline — NOW marker, one tick per alert
(from alerts timestamps, positioned relative to sim time), sim-time readout; scrubbing
via the same context API. Mount both in LiveTrackingView (controls near the bottom pill,
dateline along the bottom edge). Keep everything keyboard-accessible.

**8** — covered by LiveDateline above (NOW line + event ticks + sim readout).

## Gates (verify/fixer — cwd is the run workspace = netra-isro)

```
node node_modules/typescript/bin/tsc -b . --noEmit
node node_modules/oxlint/bin/oxlint . --config .oxlintrc.json
node node_modules/tsx/dist/cli.mjs regression.test.mjs
node node_modules/vite/bin/vite.js build .
```
