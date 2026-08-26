import { twoline2satrec, propagate, gstime, type SatRec } from 'satellite.js'

export interface TrackedObject {
  name: string
  orbit: 'LEO' | 'GEO' | 'IGSO'
  noradId: string
  color: string
  satrec: SatRec
}

// Illustrative TLEs modeled on real Indian satellites (epochs ~Aug 2026).
// ponytail: static TLE snapshot; fetch live CelesTrak data if freshness ever matters.
const TLES: Array<{ name: string; orbit: TrackedObject['orbit']; color: string; l1: string; l2: string }> = [
  {
    name: 'CARTOSAT-3',
    orbit: 'LEO',
    color: '#FF6B1A',
    l1: '1 43967U 19077A   26238.25000000  .00004821  00000-0  24183-3 0  9995',
    l2: '2 43967  97.4864 212.5560 0001420  96.7120 263.4300 15.09215408358612',
  },
  {
    name: 'RISAT-2B',
    orbit: 'LEO',
    color: '#FF6B1A',
    l1: '1 44246U 19034A   26238.10416667 -.00000220  00000-0  11204-4 0  9998',
    l2: '2 44246  36.9400  78.3100 0001900 102.5500 257.6000 15.01981234312345',
  },
  {
    name: 'RESOURCESAT-2A',
    orbit: 'LEO',
    color: '#FF6B1A',
    l1: '1 41831U 16086A   26238.08333333  .00000350  00000-0  10135-3 0  9992',
    l2: '2 41831  98.6900 145.2200 0001100  85.3400 274.8800 14.20611457321231',
  },
  {
    name: 'GSAT-7A',
    orbit: 'GEO',
    color: '#3ECF8E',
    l1: '1 40259U 14084A   26238.10416667 -.00000150  00000-0  00000-0 0  9990',
    l2: '2 40259   0.0520  88.3140 0002200 180.2400 179.7600  1.00272006 51230',
  },
  {
    name: 'IRNSS-1I',
    orbit: 'IGSO',
    color: '#3ECF8E',
    l1: '1 43286U 18040A   26238.10416667  .00000010  00000-0  00000+0 0  9996',
    l2: '2 43286  28.9820 210.4400 0026000  95.0000 265.5000  1.00273790 41236',
  },
]

export const TRACKED_OBJECTS: TrackedObject[] = TLES.map((t) => ({
  name: t.name,
  orbit: t.orbit,
  noradId: t.l2.slice(2, 7).trim(),
  color: t.color,
  satrec: twoline2satrec(t.l1, t.l2),
}))

export interface OrbitSample {
  x: number // ECI km
  y: number
  z: number
}

/** Sample an object's inertial position over a time window (minutes offset from now). */
export function sampleOrbit(satrec: SatRec, now: Date, fromMin: number, toMin: number, stepMin: number): OrbitSample[] {
  const pts: OrbitSample[] = []
  for (let m = fromMin; m <= toMin; m += stepMin) {
    const d = new Date(now.getTime() + m * 60_000)
    const r = propagate(satrec, d)
    const p = r.position
    if (p && typeof p === 'object') {
      pts.push({ x: p.x, y: p.y, z: p.z })
    }
  }
  return pts
}

export function currentPosition(satrec: SatRec, date = new Date()): { altKm: number; velKms: number } | null {
  void gstime // kept for parity with ground-track upgrades; propagate() takes Date directly
  const r = propagate(satrec, date)
  const pos = r.position
  const vel = r.velocity
  if (!pos || typeof pos !== 'object' || !vel || typeof vel !== 'object') return null
  return {
    altKm: Math.hypot(pos.x, pos.y, pos.z) - 6371,
    velKms: Math.hypot(vel.x, vel.y, vel.z),
  }
}
