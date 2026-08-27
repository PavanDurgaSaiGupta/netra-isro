# 🛰️ ISRO NETRA — Space Situational Awareness & Orbital Cockpit

[![Live Demo](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-00F0FF?style=for-the-badge&logo=githubpages&logoColor=black)](https://pavandurgasaigupta.github.io/netra-isro/)
[![React](https://img.shields.io/badge/React-19.2-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.2-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-0.185-000000?style=flat-square&logo=threedotjs&logoColor=white)](https://threejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-00F0FF?style=flat-square)](LICENSE)

> 🚀 **LIVE DEMO**: [https://pavandurgasaigupta.github.io/netra-isro/](https://pavandurgasaigupta.github.io/netra-isro/)
>
> **NETRA (Network for Space Objects Tracking and Analysis)** is a next-generation Space Situational Awareness (SSA) and orbital telemetry visualization platform inspired by **ISRO's SSA Control Centre (ISTRAC Bengaluru)**. It provides real-time SGP4 orbit propagation, dynamic 3D camera tracking, collision prediction screening, interactive search, radar coverage cones, and comprehensive spacecraft telemetry.

---

## 📸 Key Capabilities & Features

### 🌍 1. Photorealistic 3D Earth & Orbital Environment
- **High-Resolution Earth Globe**: Textured Earth sphere featuring high-detail continental topography, land relief, and night city lighting grids.
- **Atmospheric Rayleigh Scattering**: Custom WebGL shader atmosphere simulation with soft limb glow.
- **Dynamic Orbital Trails**: Live Keplerian/elliptical orbital paths color-coded by regime (`LEO: Cyan`, `GEO: Orange`, `DEBRIS: Red`).
- **Scale-Accurate Satellite Geometry**: Micro-scaled metallic spacecraft models with solar wing panels and localized point-light beacons.
- **Automatic Horizon Raycast Occlusion**: Geometric raycasting in `useFrame` that detects when an orbiting object or ground station passes behind the Earth sphere (`R = 2.0`), automatically hiding its 2D HUD text label to eliminate clipping through the globe.
- **Drift-Free Screen-Space Anchoring**: Fixed screen-space label offsets that eliminate pendulum swinging or visual lag when rotating the globe.

### 🛰️ 2. Real-Time SGP4/SDP4 Orbital Mechanics
- **SGP4 Ephemeris Engine**: Accurate mathematical propagation of Two-Line Element (TLE) sets using `satellite.js`.
- **Live Ephemeris Feeds**: Integrated with CelesTrak GP feeds and Open-Notify ISS real-time streaming APIs.
- **Kinematic Readouts**: Real-time computation of:
  - Sub-satellite Geodetic Coordinates (Latitude, Longitude, Altitude)
  - Orbital Velocity ($V \approx 7.6\text{ km/s}$)
  - Orbital Inclination, Period, and Apogee/Perigee
  - Ground station Azimuth, Elevation, and Range ($A_z, E_l, \rho$) relative to ISTRAC Bengaluru ($12.97^\circ\text{N}, 77.59^\circ\text{E}$).

### 🎮 3. Interactive Mission Cockpit & Search Engine
- **Instant Search & Autocomplete**: Real-time dropdown search panel querying satellite names, NORAD IDs, and mission operators.
  - Full keyboard navigation (<kbd>↓</kbd> / <kbd>↑</kbd> to cycle, <kbd>Enter</kbd> to fly, <kbd>Esc</kbd> to clear).
  - Quick **`FLY TO ↗`** action to lock onto any object immediately.
- **Smooth 3D Camera Glide**: Fluid camera animation that smoothly transitions between satellites without disorienting cuts.
- **Clickable Telemetry Cards**: Interactive unit conversions on live flight data:
  - Velocity: $\text{km/s} \leftrightarrow \text{km/h} \leftrightarrow \text{mph}$
  - Altitude: $\text{km} \leftrightarrow \text{miles} \leftrightarrow \text{nautical miles}$
  - Inclination: $\text{degrees} \leftrightarrow \text{radians}$
  - Signal: $\text{dBm} \leftrightarrow \text{quality } \%$
- **Bengaluru ISTRAC Overhead Radar**: Interactive 3,200 km radar coverage cone with simulated sweep, overhead blips, and single-click **`⊙ LOCK ISS`** target acquisition.
- **Subsystem Telemetry Panel**: Interactive health status monitoring for Radar, Telemetry Link, Collision Predictor, Ground Stations, Power Bus, and Comms Array with manual diagnostic test triggers.
- **Detailed Satellite Drawer**: Comprehensive technical dossiers, orbital parameters, launch details, pass schedules, raw TLE records, and Prev/Next satellite switcher.
- **Synthesizer Web Audio Engine**: Native browser Web Audio API generating procedural radar pings, telemetry blips, and target acquisition chimes with zero external audio files.

---

## 🛠️ Technologies Used

### Frontend Architecture & Frameworks
| Technology | Version | Purpose |
| :--- | :--- | :--- |
| **[React](https://react.dev/)** | `19.2.8` | Component architecture, state management, and modern concurrent rendering |
| **[TypeScript](https://www.typescriptlang.org/)** | `6.0.2` | Strict end-to-end type safety and interface definitions |
| **[Vite](https://vitejs.dev/)** | `8.2.2` | Lightning-fast development server, HMR, and optimized production bundler |
| **[React Router](https://reactrouter.com/)** | `7.18.2` | Client-side routing across Landing, Cockpit, Analytics, and About views |

### 3D Graphics & WebGL
| Technology | Version | Purpose |
| :--- | :--- | :--- |
| **[Three.js](https://threejs.org/)** | `0.185.1` | Core 3D engine, WebGL shaders, camera projections, and lighting |
| **[@react-three/fiber](https://r3f.docs.pmnd.rs/)** | `9.7.0` | Declarative Three.js scene graph embedded in React |
| **[@react-three/drei](https://github.com/pmndrs/drei)** | `10.7.8` | OrbitControls, HTML overlays, stars, and camera utilities |

### Orbital Physics & Mathematics
| Technology | Version | Purpose |
| :--- | :--- | :--- |
| **[satellite.js](https://github.com/shashwatak/satellite-js)** | `5.0.0` | SGP4/SDP4 satellite propagation, coordinate transformations (TEME, ECF, Geodetic) |

### Animation & Audio
| Technology | Version | Purpose |
| :--- | :--- | :--- |
| **[GSAP](https://gsap.com/)** | `3.15.0` | High-performance HUD transitions and timeline sequencing |
| **[@gsap/react](https://gsap.com/react)** | `2.1.2` | Safe GSAP animations with React lifecycle cleanup |
| **[Anime.js](https://animejs.com/)** | `4.5.0` | Smooth numerical telemetry interpolation and sensor fluctuation |
| **[Framer Motion](https://www.framer.com/motion/)** | `13.1.1` | Drawer animations and gesture-driven UI components |
| **[Lenis](https://lenis.darkroom.engineering/)** | `1.3.26` | Smooth momentum scrolling for landing and document pages |
| **Web Audio API** | Native | Procedural frequency synthesis for radar pings, telemetry blips, and target locks |

### Styling & Tooling
| Technology | Version | Purpose |
| :--- | :--- | :--- |
| **Custom Vanilla CSS** | Standard | High-end aerospace HUD design system, glassmorphism, scanlines, and typography |
| **[Tailwind CSS](https://tailwindcss.com/)** | `4.3.3` | Utility styling integration with Vite plugin |
| **[Oxlint](https://oxc.rs/)** | `1.79.0` | Ultra-fast linter for code health |

---

## 📋 Prerequisites

Before running the project, make sure you have the following installed:

- **[Node.js](https://nodejs.org/)**: Version `18.0.0` or higher (Node 20+ LTS recommended)
- **[npm](https://www.npmjs.com/)**: Version `9.0.0` or higher (bundled with Node.js)
- A modern web browser with **WebGL 2.0** support (Chrome, Edge, Firefox, Brave, Safari)

---

## 🚀 Steps to Run the Project

### 1. Clone or Open the Repository
```bash
cd "EARTH SATELITE WEBSITE/netra-isro"
```

### 2. Install Dependencies
Install all required packages:
```bash
npm install
```

### 3. Start the Development Server
Launch Vite's local development server:
```bash
npm run dev
```

Once started, the console will output the local address:
```
  VITE v8.2.2  ready in 240 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

Open **[http://localhost:5173/](http://localhost:5173/)** in your browser:
- **Landing Page**: `http://localhost:5173/`
- **3D Live Tracking Cockpit**: `http://localhost:5173/tracking`
- **Fleet Analytics**: `http://localhost:5173/analytics`
- **About Mission NETRA**: `http://localhost:5173/about`

### 4. Build for Production
To compile and type-check the project into an optimized production bundle:
```bash
npm run build
```
This runs `tsc -b` to verify TypeScript types, followed by `vite build` to generate the production assets in the `dist/` directory.

### 5. Preview the Production Build
To test the production build locally:
```bash
npm run preview
```

### 6. Lint the Codebase
To run fast static analysis checks:
```bash
npm run lint
```

---

## 🗂️ Project Directory Structure

```
netra-isro/
├── public/                     # Static assets, textures, and icons
├── src/
│   ├── components/             # Reusable UI & 3D Components
│   │   ├── OrbitScene.tsx      # Main Three.js/R3F Canvas (Earth, Sun, Satellites, Raycasting)
│   │   ├── OverheadRadar.tsx   # ISTRAC Bengaluru Radar Cone & live ISS tracker
│   │   ├── TacticalCursor.tsx  # Screen-space Azimuth/Elevation reticle
│   │   ├── SSATicker.tsx       # Live ISRO-SSA mission event ticker
│   │   └── console/            # Cockpit HUD components
│   │       ├── AlertsFeed.tsx            # Event logs and conjunction screening feed
│   │       ├── SatelliteDetailDrawer.tsx # Slide-in spacecraft telemetry dossier
│   │       ├── SystemStatusPanel.tsx     # Subsystem health status with manual diagnostics
│   │       └── TelemetryReadout.tsx      # Clickable unit-toggling flight kinematic cards
│   ├── context/
│   │   └── SatelliteContext.tsx # Centralized state (catalog, propagation loop, filters, active selection)
│   ├── services/
│   │   └── satelliteData.ts    # SGP4 propagation engine, TLE parsing, and CelesTrak integration
│   ├── utils/
│   │   └── audio.ts            # Web Audio API procedural synthesizer sound engine
│   ├── views/                  # Main Route Pages
│   │   ├── LandingView.tsx     # Cinematic mission brief and fleet summary
│   │   ├── LiveTrackingView.tsx# Fullscreen 3D satellite cockpit with interactive search
│   │   ├── AnalyticsView.tsx   # Orbital distribution and risk charts
│   │   └── AboutView.tsx       # ISRO Project NETRA mandates and ground stations
│   ├── App.tsx                 # Top-level Router, Layout, and Navigation bar
│   ├── index.css               # Space console CSS design system & visual tokens
│   └── main.tsx                # Application bootstrap entry point
├── index.html                  # HTML entry template with custom space typography
├── package.json                # Dependencies and script definitions
├── tsconfig.json               # TypeScript compiler configuration
└── vite.config.ts              # Vite configuration with React & Tailwind plugins
```

---

## 🎯 Keyboard & Mouse Controls

| Action | Control |
| :--- | :--- |
| **Rotate Earth Globe** | Left Click + Drag |
| **Pan Orbit View** | Right Click + Drag / Two-Finger Drag |
| **Zoom In / Out** | Mouse Wheel / Pinch Gesture |
| **Inspect Satellite** | Click 3D satellite model, label, or radar blip |
| **Search Autocomplete** | Type in top-left search input (<kbd>↓</kbd> / <kbd>↑</kbd> to cycle, <kbd>Enter</kbd> to fly) |
| **Toggle Metric Units** | Click any card in the bottom-left Telemetry Readout |
| **Run Subsystem Diagnostic**| Click any row in the top-right Subsystem Telemetry panel |
| **Release Lock / Recenter** | Click `⊙ CENTER EARTH VIEW` or `⊙ RESET VIEW` at bottom center |

---

## 🌐 Live Demo & Deployment

The application is deployed on **GitHub Pages** with continuous deployment:

- 🔗 **Production URL**: [https://pavandurgasaigupta.github.io/netra-isro/](https://pavandurgasaigupta.github.io/netra-isro/)
- 📱 **Device Compatibility**: Fully responsive on **Mobile Phones** (iPhone, Pixel, Galaxy), **Tablets** (iPad, Surface), **Laptops**, and **Desktops**.
- ⚡ **Mission Preloader**: Automatically pre-caches high-resolution planetary textures, SGP4 ephemeris matrices, and Google Fonts across all devices.

---

## 📜 License

This project is open-source and distributed under the **MIT License**. Created for aerospace research, educational space situational awareness visualization, and orbital telemetry exploration.
