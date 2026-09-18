// CelesTrak TLE cache + TLE validation — extracted to lower satelliteData.ts complexity
// No import from satelliteData.ts to avoid circular dependency.

export const CELESTRAK_TLE_URL = 'https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle'
export const CACHE_KEY = 'netra_celestrak_cache_v3'
export const CACHE_TIME_KEY = 'netra_celestrak_time_v3'
export const CACHE_TTL_MS = 15 * 60 * 1000

import type { SeedItem } from './seedCatalog.js'
export type { SeedItem } from './seedCatalog.js'

export interface CelesTrakResult {
  items: SeedItem[]
  status: 'ONLINE' | 'CACHE' | 'SEED'
  fetchedAt: number
}

interface CelesTrakCachePayload {
  items: SeedItem[]
  fetchedAt: number
  endpoint: string
  format: 'tle'
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
    tle1.length !== 69 ||
    tle2.length !== 69 ||
    !tle1.startsWith('1 ') ||
    !tle2.startsWith('2 ') ||
    tle1.slice(2, 7).trim() !== tle2.slice(2, 7).trim() ||
    (noradId !== undefined && Number(tle1.slice(2, 7)) !== noradId)
  )
    return false
  return !strict || (Number(tle1.slice(68)) === tleChecksum(tle1) && Number(tle2.slice(68)) === tleChecksum(tle2))
}

export function readCelesTrakCache(): CelesTrakResult | null {
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
      parsed.endpoint === CELESTRAK_TLE_URL &&
      parsed.format === 'tle' &&
      Array.isArray(parsed.items) &&
      parsed.items.length > 0 &&
      parsed.items.every(
        (it) =>
          it &&
          typeof it.id === 'string' &&
          typeof it.name === 'string' &&
          typeof it.operator === 'string' &&
          typeof it.color === 'string' &&
          Number.isInteger(it.noradId) &&
          ['payload', 'debris', 'station'].includes(it.type) &&
          ['LEO', 'MEO', 'GEO', 'SSO', 'IGSO'].includes(it.orbitClass) &&
          validTLE(it.tle1, it.tle2, it.noradId),
      )
    if (!fresh || !proven) return null
    return { items: parsed.items, status: 'CACHE', fetchedAt: parsed.fetchedAt }
  } catch {
    return null
  }
}

export function writeCelesTrakCache(items: SeedItem[], fetchedAt: number): void {
  const payload: CelesTrakCachePayload = { items, fetchedAt, endpoint: CELESTRAK_TLE_URL, format: 'tle' }
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(payload))
    localStorage.setItem(CACHE_TIME_KEY, String(fetchedAt))
  } catch {
    // storage may be full or blocked — seed fallback will be used
  }
}
