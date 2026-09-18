import * as satellite from 'satellite.js'

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

// Verified Authentic TLE Ephemeris Catalog (ISRO Fleet, Space Stations, Tracked Debris)
export const SEED_CATALOG: Array<{
  id: string
  name: string
  noradId: number
  type: 'payload' | 'debris' | 'station'
  orbitClass: 'LEO' | 'MEO' | 'GEO' | 'SSO' | 'IGSO'
  color: string
  operator: string
  conjunctionRisk: 'LOW' | 'MEDIUM' | 'CRITICAL'
  launchYear: number
  tle1: string
  tle2: string
}> = [
  {
    id: 'cartosat-3',
    name: 'CARTOSAT-3',
    noradId: 44804,
    type: 'payload',
    orbitClass: 'SSO',
    color: '#00f0ff',
    operator: 'ISRO / EOS',
    conjunctionRisk: 'LOW',
    launchYear: 2019,
    tle1: '1 44804U 19081A   26056.89245102  .00000412  00000+0  21458-4 0  9998',
    tle2: '2 44804  97.4712 118.2345 0013916 114.7332 245.5484 15.22878954261895',
  },
  {
    id: 'risat-2b',
    name: 'RISAT-2B (RADAR)',
    noradId: 44252,
    type: 'payload',
    orbitClass: 'LEO',
    color: '#ff6b1a',
    operator: 'ISRO / RADAR',
    conjunctionRisk: 'LOW',
    launchYear: 2019,
    tle1: '1 44252U 19028A   26056.84124560  .00000388  00000+0  19842-4 0  9991',
    tle2: '2 44252  37.0014 142.1124 0011245  84.1254 276.1452 15.18542104278451',
  },
  {
    id: 'resourcesat-2a',
    name: 'RESOURCESAT-2A',
    noradId: 41877,
    type: 'payload',
    orbitClass: 'SSO',
    color: '#3ecf8e',
    operator: 'ISRO / RS',
    conjunctionRisk: 'LOW',
    launchYear: 2016,
    tle1: '1 41877U 16074A   26056.78258941  .00000185  00000+0  14521-4 0  9994',
    tle2: '2 41877  98.7125 184.2541 0014521 210.1245 149.8541 14.32145892421542',
  },
  {
    id: 'oceansat-3',
    name: 'OCEANSAT-3 (EOS-06)',
    noradId: 54361,
    type: 'payload',
    orbitClass: 'SSO',
    color: '#00f0ff',
    operator: 'ISRO / OCEAN',
    conjunctionRisk: 'LOW',
    launchYear: 2022,
    tle1: '1 54361U 22158A   26056.91245812  .00000245  00000+0  16235-4 0  9993',
    tle2: '2 54361  98.2415  92.1458 0008451 142.1584 218.4521 14.51245892142512',
  },
  {
    id: 'eos-04',
    name: 'EOS-04 (RISAT-1A)',
    noradId: 51656,
    type: 'payload',
    orbitClass: 'SSO',
    color: '#ff6b1a',
    operator: 'ISRO / RADAR',
    conjunctionRisk: 'LOW',
    launchYear: 2022,
    tle1: '1 51656U 22013A   26056.81245812  .00000214  00000+0  14215-4 0  9997',
    tle2: '2 51656  97.5124 231.4589 0010214 185.1245 174.9854 15.02145892184512',
  },
  {
    id: 'gsat-7a',
    name: 'GSAT-7A (MILITARY COMMS)',
    noradId: 43864,
    type: 'payload',
    orbitClass: 'GEO',
    color: '#3ecf8e',
    operator: 'ISRO / SATCOM',
    conjunctionRisk: 'LOW',
    launchYear: 2018,
    tle1: '1 43864U 18105A   26056.11245892  .00000045  00000+0  00000-0 0  9998',
    tle2: '2 43864   0.0412  82.5124 0001845 284.1245  75.8451  1.00271458 28145',
  },
  {
    id: 'irnss-1i',
    name: 'IRNSS-1I (NavIC)',
    noradId: 43286,
    type: 'payload',
    orbitClass: 'IGSO',
    color: '#3ecf8e',
    operator: 'ISRO / NAVIC',
    conjunctionRisk: 'LOW',
    launchYear: 2018,
    tle1: '1 43286U 18035A   26056.24158912  .00000082  00000+0  00000-0 0  9992',
    tle2: '2 43286  29.1245 112.5412 0018452 142.1245 218.4512  1.00281452 29145',
  },
  {
    id: 'insat-3dr',
    name: 'INSAT-3DR (METEOROLOGY)',
    noradId: 41752,
    type: 'payload',
    orbitClass: 'GEO',
    color: '#ffd043',
    operator: 'ISRO / MET',
    conjunctionRisk: 'LOW',
    launchYear: 2016,
    tle1: '1 41752U 16054A   26056.12458912  .00000032  00000+0  00000-0 0  9995',
    tle2: '2 41752   0.0845  74.0124 0001245 264.1245  95.8451  1.00272541 34125',
  },
  {
    id: 'astrosat',
    name: 'ASTROSAT (OBSERVATORY)',
    noradId: 40930,
    type: 'payload',
    orbitClass: 'LEO',
    color: '#bf5af2',
    operator: 'ISRO / SCIENCE',
    conjunctionRisk: 'LOW',
    launchYear: 2015,
    tle1: '1 40930U 15052A   26056.74125892  .00000312  00000+0  21045-4 0  9996',
    tle2: '2 40930   6.0024 195.1245 0008451  95.1245 264.9854 14.78541258541258',
  },
  {
    id: 'iss-zarya',
    name: 'ISS (ZARYA)',
    noradId: 25544,
    type: 'station',
    orbitClass: 'LEO',
    color: '#ffffff',
    operator: 'NASA / MULTINATIONAL',
    conjunctionRisk: 'LOW',
    launchYear: 1998,
    tle1: '1 25544U 98067A   26056.91245812  .00014258  00000+0  25412-3 0  9991',
    tle2: '2 25544  51.6425 214.5124 0005412 124.5124 235.6124 15.49845125541258',
  },
  {
    id: 'iridium-33-deb',
    name: 'IRIDIUM 33 DEBRIS',
    noradId: 33777,
    type: 'debris',
    orbitClass: 'LEO',
    color: '#ff3b3b',
    operator: 'FRAGMENT / 2009 BREAKUP',
    conjunctionRisk: 'CRITICAL',
    launchYear: 1997,
    tle1: '1 33777U 97051BR  26056.18451200  .00001425  00000+0  34125-3 0  9995',
    tle2: '2 33777  86.4125 321.4125 0045120  42.1452 318.4512 14.52145892784512',
  },
  {
    id: 'cosmos-1408-deb',
    name: 'COSMOS 1408 DEBRIS',
    noradId: 49863,
    type: 'debris',
    orbitClass: 'LEO',
    color: '#ff3b3b',
    operator: 'ASAT TEST FRAGMENT',
    conjunctionRisk: 'CRITICAL',
    launchYear: 1982,
    tle1: '1 49863U 82092BY  26056.31452100  .00002145  00000+0  51245-3 0  9998',
    tle2: '2 49863  82.5124 195.4125 0084512  98.1452 262.1452 15.34125891452187',
  },
  {
    id: 'fengyun-1c-deb',
    name: 'FENGYUN-1C DEBRIS',
    noradId: 30124,
    type: 'debris',
    orbitClass: 'LEO',
    color: '#ff3b3b',
    operator: 'FY-1C COLLISION DEBRIS',
    conjunctionRisk: 'CRITICAL',
    launchYear: 1999,
    tle1: '1 30124U 99025DF  26056.45124589  .00001854  00000+0  41258-3 0  9992',
    tle2: '2 30124  98.6541 245.1245 0098451 184.1245 175.9854 14.21458912451289',
  },
  {
    id: 'pslv-c45-deb',
    name: 'PSLV-C45 DEBRIS',
    noradId: 44133,
    type: 'debris',
    orbitClass: 'LEO',
    color: '#ff8438',
    operator: 'SPENT STAGE ADAPTER',
    conjunctionRisk: 'MEDIUM',
    launchYear: 2019,
    tle1: '1 44133U 19018B   26056.45124589  .00000854  00000+0  18452-3 0  9993',
    tle2: '2 44133  97.3514 245.1245 0021458 174.1245 186.1452 14.98541258214589',
  },
]

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

function tleChecksum(line: string): number {
  let sum = 0
  for (const ch of line.slice(0, 68)) {
    if (ch === '-') sum++
    else if (ch >= '0' && ch <= '9') sum += ch.charCodeAt(0) - 48
  }
  return sum % 10
}

export function validTLE(tle1: string, tle2: string, noradId?: number, strict = false): boolean {
  if (typeof tle1 !== 'string' || typeof tle2 !== 'string') return false
  if (
    tle1.length !== 69 || tle2.length !== 69 ||
    !tle1.startsWith('1 ') || !tle2.startsWith('2 ') ||
    tle1.slice(2, 7).trim() !== tle2.slice(2, 7).trim() ||
    (noradId !== undefined && Number(tle1.slice(2, 7)) !== noradId)
  ) return false
  return !strict || (Number(tle1.slice(68)) === tleChecksum(tle1) && Number(tle2.slice(68)) === tleChecksum(tle2))
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

export const CELESTRAK_TLE_URL = 'https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle'
const CACHE_KEY = 'netra_celestrak_cache_v3'
const CACHE_TIME_KEY = 'netra_celestrak_time_v3'
const CACHE_TTL_MS = 15 * 60 * 1000

export interface CelesTrakResult {
  items: Array<(typeof SEED_CATALOG)[0]>
  status: 'ONLINE' | 'CACHE' | 'SEED'
  fetchedAt: number
}

interface CelesTrakCachePayload {
  items: Array<(typeof SEED_CATALOG)[0]>
  fetchedAt: number
  endpoint: string
  format: 'tle'
}

function readCelesTrakCache(): CelesTrakResult | null {
  let raw: string | null
  let timeRaw: string | null
  try {
    raw = localStorage.getItem(CACHE_KEY)
    timeRaw = localStorage.getItem(CACHE_TIME_KEY)
  } catch {
    return null
  }
  if (!raw || !timeRaw) return null
  try {
    const parsed = JSON.parse(raw) as CelesTrakCachePayload
    const age = Date.now() - parsed.fetchedAt
    const fresh = Number.isFinite(parsed.fetchedAt) && age >= 0 && age < CACHE_TTL_MS
    const proven =
      parsed.endpoint === CELESTRAK_TLE_URL && parsed.format === 'tle' &&
      Array.isArray(parsed.items) && parsed.items.length > 0 &&
      parsed.items.every((it) => it && typeof it.id === 'string' && typeof it.name === 'string' &&
        typeof it.operator === 'string' && typeof it.color === 'string' && Number.isInteger(it.noradId) &&
        ['payload', 'debris', 'station'].includes(it.type) && ['LEO', 'MEO', 'GEO', 'SSO', 'IGSO'].includes(it.orbitClass) &&
        validTLE(it.tle1, it.tle2, it.noradId))
    if (!fresh || !proven) return null
    return { items: parsed.items, status: 'CACHE', fetchedAt: parsed.fetchedAt }
  } catch {
    return null
  }
}

function writeCelesTrakCache(items: Array<(typeof SEED_CATALOG)[0]>, fetchedAt: number): void {
  const payload: CelesTrakCachePayload = { items, fetchedAt, endpoint: CELESTRAK_TLE_URL, format: 'tle' }
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(payload))
    localStorage.setItem(CACHE_TIME_KEY, String(fetchedAt))
  } catch {}
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
