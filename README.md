# 🛰️ NETRA — ISRO Mission Control & Orbital Cockpit

[![Live Demo](https://img.shields.io/badge/Live_Demo-GitHub_Pages-00F0FF?style=for-the-badge&logo=github&logoColor=white)](https://pavandurgasaigupta.github.io/netra-isro/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![three.js](https://img.shields.io/badge/three.js-r185-000000?style=flat-square&logo=threedotjs&logoColor=white)](https://threejs.org/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vite.dev/)
[![satellite.js](https://img.shields.io/badge/SGP4-satellite.js-FF6B1A?style=flat-square)](https://github.com/shashwatak/satellite-js)

> **NETRA v2 — "THE LIVING INSTRUMENT"** — a real-time ISRO satellite tracking cockpit. A photoreal 3D Earth, SGP4-propagated live orbital positions, a mission-time scrubber that rewinds and fast-forwards the entire simulation, real debris clouds, radio profiles, and pass predictions over ISTRAC Bengaluru — all in a dark, motion-choreographed instrument interface.

**▶ Live: [pavandurgasaigupta.github.io/netra-isro](https://pavandurgasaigupta.github.io/netra-isro/)**

---

## ✨ What it does

### 🌍 Live 3D orbital cockpit
- Photoreal Earth (day/normal/specular/cloud textures) with an additive atmosphere shader, starfield, orbit planes and ground-station beam — rendered with **react-three-fiber**.
- Every satellite position is **propagated client-side with SGP4** (satellite.js) from live CelesTrak element sets, refreshed on a 1.5 s instrument tick.
- Click any object: the camera flies to it, and a staged **dossier drawer** slides in — identity, kinematics (rolling odometer digits), ground-station look angles from ISTRAC Bengaluru, real radio transmitter profiles, and next-pass predictions.
- Orbit trails are rendered in each satellite's **true orbital plane** (node angle solved from inclination + ascending longitude), so a trail passes through the marker it belongs to.

### ⏱ Mission time
- **Scrub the mission**: −10 m to +10 m steps, pause, or run the whole simulation at 1× / 10× / 60× — every orbit, trail, radar blip and telemetry readout follows the simulation clock.
- **Live dateline**: a bottom-edge timeline with a NOW marker and every DSSAM alert plotted as an event tick — draggable by pointer or keyboard (`role="slider"`).

### 📡 Real data, zero backend
| Source | What it feeds |
| --- | --- |
| [CelesTrak GP API](https://celestrak.org/) (Dr. T.S. Kelso) | Live ISRO payload elements + four real debris clouds (Cosmos-2251, Fengyun-1C, Cosmos-1408, Iridium-33) + GNSS constellations (IRNSS/NavIC, GPS, Galileo, BeiDou) — ETag/304 conditional caching, seed-catalog offline fallback |
| [WhereTheISS.at?](https://wheretheiss.at/w/developer) | ISS live position, ±36-minute ground-track trail on the globe, reverse-geocoded "OVER:" sub-point region |
| [SatNOGS DB](https://db.satnogs.org/) (Libre Space Foundation) | Real RF transmitter profiles — downlink frequencies, modes, baud rates — in the dossier |
| Client-side SGP4 | **Pass predictions** over ISTRAC Bengaluru (48 h horizon, coarse+refined scan): AOS → max elevation → LOS, with live countdowns |

### 🧭 Instrument interface (v2)
- **Go/No-Go boot poll** — typed system checks with live uplink/texture statuses before the console arms.
- **Radar-first navigation** — the sidebar is a live polar scope; your routes are contacts under a rotating sweep.
- **Page transitions as maneuvers**, kinetic hero choreography, Lenis-smooth landing scroll, orbit-band ticker — one motion grammar (GSAP + `@gsap/react`, `prefers-reduced-motion` respected).
- **A11y-first**: real buttons everywhere, `aria-pressed`/`aria-sort`/`aria-live`, single `h1` per page, keyboard-operable diagnostic rows/sort headers, ≥24 px hit areas, AA contrast tokens, ESC closes the drawer, error boundaries on every lazy route.

## 🚀 Quick start

```bash
git clone https://github.com/PavanDurgaSaiGupta/netra-isro.git
cd netra-isro
npm install
npm run dev        # → http://localhost:5173/netra-isro/
```

```bash
npm run build      # typecheck + production bundle → dist/
npm run deploy     # build + publish dist/ to GitHub Pages (gh-pages branch)
npm test           # regression suite (TLE validation, SGP4 smoke, IST clock)
npm run lint       # oxlint
```

## 🧱 Stack

React 19 · TypeScript · Vite 8 · react-three-fiber + three.js · satellite.js (SGP4) · GSAP + @gsap/react · Lenis · hand-built tokenized design system (BEM, no UI framework) · oxlint · GitHub Pages.

## 📁 Project structure

```
src/
├── services/        # satelliteData (SGP4 + CelesTrak), tleCache (ETag), passes,
│                    # constellations, satnogs, issTrack — all keyless, cached, paced
├── context/         # SatelliteContext — propagation tick + simulation-time control
├── components/
│   ├── orbit/       # Earth, SatelliteMarker (plane-corrected trails), CameraController
│   ├── console/     # dossier drawer, telemetry, alerts feed, time controls, dateline
│   └── shell/       # radar nav, boot poll, top bar, view boundary
├── views/           # landing · live tracking · catalog · debris · alerts · about
└── lib/motion.ts    # motion tokens + reduced-motion helpers
docs/specs/          # design contracts ("Living Instrument", START HERE 8)
```

## ⚠️ Disclaimer

Independent **educational** visualization — not an official ISRO service. Positions are SGP4-propagated estimates; seed elements, alerts and risk scenarios are illustrative, not operational guidance. Data courtesy of [CelesTrak](https://celestrak.org/), [WhereTheISS.at?](https://wheretheiss.at/) and [SatNOGS DB](https://db.satnogs.org/).

---

Built by [PavanDurgaSaiGupta](https://github.com/PavanDurgaSaiGupta) · ⭐ Star the repo if the mission console speaks to you.
