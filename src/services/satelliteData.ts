import * as satellite from 'satellite.js'
import {
  CELESTRAK_TLE_URL,
  readCelesTrakCache,
  writeCelesTrakCache,
  validTLE,
  type CelesTrakResult,
} from './tleCache.js'
import { SEED_CATALOG, type SeedItem } from './seedCatalog.js'

// Re-export cache/TLE primitives for existing barrel imports (regression.test.mjs etc.)
export { CELESTRAK_TLE_URL, validTLE, readCelesTrakCache, writeCelesTrakCache }
export type { CelesTrakResult, SeedItem }

export interface SatelliteItem {
  id: string
  name: string
  noradId: number
  type: 'payload' | 'debris' | 'station'
  orbitClass: 'LEO' | 'MEO' | 'GEO' | 'SSO' | 'IGSO'
  tle1: string
  tle2: string
  lat: number
  lng: number
  altKm: number
  speedKmS: number
  pos3D: [number, number, number]
  azimuthDeg: number
  elevationDeg: number
  rangeKm: number
  isOverhead: boolean
  color: string
  source: 'celestrak' | 'wheretheiss' | 'cached' | 'seed'
  conjunctionRisk: 'LOW' | 'MEDIUM' | 'CRITICAL'
  operator: string
  inclinationDeg: number
  periodMin: number
  launchYear: number
}

// ISTRAC Ground Station Bengaluru coordinates
export const BENGALURU_OBSERVER = {
  latitude: satellite.degreesToRadians(12.9716),
  longitude: satellite.degreesToRadians(77.5946),
  height: 0.92, // 920 meters above sea level
}

export function formatIST(d: Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(d)
}

export { SEED_CATALOG }

// Convert geodetic coordinates to centered 3D vector matching Earth's radius (R = 2.0)
export function geodeticToVector3(lat: number, lng: number, altKm: number): [number, number, number] {
  const earthRadius = 2.0
  // Scaling: LEO (200-1200km) -> 2.15 to 2.4; GEO (35786km) -> 4.8
  const scaledAlt = Math.min(altKm / 35786, 1.25) * 2.8
  const r = earthRadius + 0.12 + scaledAlt

  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lng + 180) * (Math.PI / 180)

  const x = -(r * Math.sin(phi) * Math.cos(theta))
  const z = r * Math.sin(phi) * Math.sin(theta)
  const y = r * Math.cos(phi)

  return [x, y, z]
}

// Compute live orbital state via satellite.js SGP4 propagator
export function computeState(
  base: (typeof SEED_CATALOG)[0],
  date: Date = new Date(),
  source: SatelliteItem['source'] = 'seed',
): SatelliteItem | null {
  try {
    if (!Number.isFinite(date.getTime())) return null
    const satrec = satellite.twoline2satrec(base.tle1, base.tle2)
    if (satrec.error || !validTLE(base.tle1, base.tle2, base.noradId)) return null
    const pv = satellite.propagate(satrec, date)
    if (!pv || !pv.position || !pv.velocity ||
      typeof pv.position === 'boolean' || typeof pv.velocity === 'boolean' ||
      ![pv.position.x, pv.position.y, pv.position.z, pv.velocity.x, pv.velocity.y, pv.velocity.z].every(Number.isFinite)) return null

    const gmst = satellite.gstime(date)
    const geodetic = satellite.eciToGeodetic(pv.position, gmst)
    const lat = satellite.degreesLat(geodetic.latitude)
    const lng = satellite.degreesLong(geodetic.longitude)
    const altKm = geodetic.height
    const speedKmS = Math.hypot(pv.velocity.x, pv.velocity.y, pv.velocity.z)

    // Look angles from Bengaluru DSSAM ground station
    const posEcf = satellite.eciToEcf(pv.position, gmst)
    const lookAngles = satellite.ecfToLookAngles(BENGALURU_OBSERVER, posEcf)
    const azimuthDeg = (lookAngles.azimuth * 180) / Math.PI
    const elevationDeg = (lookAngles.elevation * 180) / Math.PI
    const rangeKm = lookAngles.rangeSat

    // Inclination and Period
    const inclinationDeg = (satrec.inclo * 180) / Math.PI
    const periodMin = (2 * Math.PI) / satrec.no
    if (![lat, lng, altKm, speedKmS, azimuthDeg, elevationDeg, rangeKm, inclinationDeg, periodMin].every(Number.isFinite) ||
      altKm <= 0 || speedKmS <= 0 || rangeKm <= 0 || periodMin <= 0) return null

    return {
      ...base,
      lat,
      lng,
      altKm,
      speedKmS,
      pos3D: geodeticToVector3(lat, lng, altKm),
      azimuthDeg,
      elevationDeg,
      rangeKm,
      isOverhead: elevationDeg > 0,
      source,
      inclinationDeg,
      periodMin,
      launchYear: base.launchYear || 2019,
    }
  } catch (err) {
    console.warn('Propagation error for', base.name, err)
    return null
  }
}



function isISROName(name: string): boolean {
  return (
    name.includes('CARTOSAT') || name.includes('RISAT') || name.includes('RESOURCESAT') ||
    name.includes('GSAT') || name.includes('IRNSS') || name.includes('OCEANSAT') ||
    name.includes('EOS') || name.includes('INSAT')
  )
}

export function parseCelesTrakTLE(text: string): Array<(typeof SEED_CATALOG)[0]> {
  const lines = text.split(/\r?\n/)
  const liveItems: Array<(typeof SEED_CATALOG)[0]> = []
  const seedMap = new Map(SEED_CATALOG.map((s) => [s.noradId, s]))
  for (let i = 0; i < lines.length - 2; i++) {
    const name = lines[i].trim()
    const l1 = lines[i + 1]
    const l2 = lines[i + 2]
    if (!l1.startsWith('1 ') || !l2.startsWith('2 ')) continue
    const norad = Number(l1.slice(2, 7))
    if (!Number.isInteger(norad)) continue
    i += 2
    if (!validTLE(l1, l2, norad, true)) continue
    const match = seedMap.get(norad)
    if (match) {
      liveItems.push({ ...match, tle1: l1, tle2: l2 })
    } else if (isISROName(name.toUpperCase())) {
      const inclination = Number(l2.slice(8, 16))
      const meanMotion = Number(l2.slice(52, 63))
      const launchYear = Number(l1.slice(9, 11))
      if (!Number.isFinite(inclination) || !Number.isFinite(meanMotion) || meanMotion <= 0) continue
      liveItems.push({
        id: `isro-${norad}`,
        name,
        noradId: norad,
        type: 'payload',
        orbitClass: Math.abs(meanMotion - 1.0027) < 0.05 ? (inclination < 5 ? 'GEO' : 'IGSO') : meanMotion < 6 ? 'MEO' : inclination > 96 && inclination < 103 ? 'SSO' : 'LEO',
        color: '#00f0ff',
        operator: 'ISRO',
        conjunctionRisk: 'LOW',
        launchYear: launchYear + (launchYear >= 57 ? 1900 : 2000),
        tle1: l1,
        tle2: l2,
      })
    }
  }
  return liveItems
}

export async function fetchLiveCelesTrak(): Promise<CelesTrakResult> {
  const cached = readCelesTrakCache()
  if (cached) return cached

  try {
    const res = await fetch(CELESTRAK_TLE_URL, { signal: AbortSignal.timeout(3500) })
    if (res.ok) {
      const text = await res.text()
      const liveItems = parseCelesTrakTLE(text)
      if (liveItems.length >= 5) {
        const combined = [...liveItems, ...SEED_CATALOG.filter((s) => s.type === 'debris')]
        writeCelesTrakCache(combined, Date.now())
        return { items: combined, status: 'ONLINE', fetchedAt: Date.now() }
      }
    }
  } catch {
    console.info('CelesTrak live fetch failed, using verified authentic TLE seed catalog.')
  }

  return { items: SEED_CATALOG, status: 'SEED', fetchedAt: 0 }
}

// Fetch live ISS telemetry from wheretheiss.at
export async function fetchLiveISS(): Promise<{
  lat: number
  lng: number
  altKm: number
  speedKmS: number
  pos3D: [number, number, number]
  visibility: string
  azimuthDeg: number
  elevationDeg: number
  rangeKm: number
} | null> {
  try {
    const res = await fetch('https://api.wheretheiss.at/v1/satellites/25544', {
      signal: AbortSignal.timeout(3500),
    })
    if (!res.ok) return null
    const d = await res.json()
    const lat = d.latitude
    const lng = d.longitude
    const altKm = d.altitude
    const speedKmS = d.velocity / 3600 // km/h to km/s

    const issGeodetic = {
      latitude: satellite.degreesToRadians(lat),
      longitude: satellite.degreesToRadians(lng),
      height: altKm,
    }
    const issEcf = satellite.geodeticToEcf(issGeodetic)
    const look = satellite.ecfToLookAngles(BENGALURU_OBSERVER, issEcf)

    return {
      lat,
      lng,
      altKm,
      speedKmS,
      pos3D: geodeticToVector3(lat, lng, altKm),
      visibility: d.visibility,
      azimuthDeg: (look.azimuth * 180) / Math.PI,
      elevationDeg: (look.elevation * 180) / Math.PI,
      rangeKm: look.rangeSat,
    }
  } catch {
    return null
  }
}
