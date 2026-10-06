// Constellation lens data layer — NavIC/IRNSS, GPS, Galileo, BeiDou operator groups.
// Kept separate from the main catalog on purpose: these satellites render as a dimmed
// lens overlay inside OrbitScene — they are never catalog entries and never selectable.
// Fetch is capped per group and cached in localStorage for 24 h (netra_constellations_v1).

import { validTLE } from './tleCache.js'

export type ConstellationGroup = 'irnss' | 'gps-ops' | 'galileo' | 'beidou'

export const CONSTELLATION_GROUPS: ConstellationGroup[] = ['irnss', 'gps-ops', 'galileo', 'beidou']

export const CONSTELLATION_LABELS: Record<ConstellationGroup, string> = {
  irnss: 'IRNSS',
  'gps-ops': 'GPS',
  galileo: 'GALILEO',
  beidou: 'BEIDOU',
}

export interface ConstellationSat {
  noradId: number
  name: string
  tle1: string
  tle2: string
  group: ConstellationGroup
}

export const CONSTELLATIONS_CACHE_KEY = 'netra_constellations_v1'
export const CONSTELLATIONS_TTL_MS = 24 * 60 * 60 * 1000
const MAX_PER_GROUP = 25
const FETCH_TIMEOUT_MS = 6000

const groupUrl = (group: ConstellationGroup): string =>
  `https://celestrak.org/NORAD/elements/gp.php?GROUP=${group}&FORMAT=tle`

interface ConstellationsCachePayload {
  fetchedAt: number
  groups: Record<ConstellationGroup, ConstellationSat[]>
}

// Three-line TLE blocks → capped lightweight lens entries (same shape as parseDebrisGroup).
export function parseConstellationGroup(text: string, group: ConstellationGroup): ConstellationSat[] {
  const lines = text.split(/\r?\n/)
  const out: ConstellationSat[] = []
  for (let i = 0; i < lines.length - 2 && out.length < MAX_PER_GROUP; i++) {
    const name = lines[i].trim()
    const l1 = lines[i + 1]
    const l2 = lines[i + 2]
    if (!l1.startsWith('1 ') || !l2.startsWith('2 ')) continue
    const norad = Number(l1.slice(2, 7))
    if (!Number.isInteger(norad)) continue
    i += 2
    // Strict (checksum-validated) like parseCelesTrakTLE — SGP4 ignores the checksum
    // column, so the checksum is the only guard against a hand-corrupted element set.
    if (!validTLE(l1, l2, norad, true)) continue
    out.push({ noradId: norad, name: name || `OBJECT ${norad}`, tle1: l1, tle2: l2, group })
  }
  return out
}

function isConstellationSat(s: unknown, group: ConstellationGroup): s is ConstellationSat {
  if (!s || typeof s !== 'object') return false
  const sat = s as Partial<ConstellationSat>
  return (
    typeof sat.name === 'string' &&
    typeof sat.tle1 === 'string' &&
    typeof sat.tle2 === 'string' &&
    sat.group === group &&
    Number.isInteger(sat.noradId) &&
    validTLE(sat.tle1, sat.tle2, sat.noradId, true)
  )
}

// maxAgeMs defaults to the 24 h TTL; pass Infinity to read a stale cache as offline fallback.
export function readConstellationsCache(maxAgeMs: number = CONSTELLATIONS_TTL_MS): ConstellationsCachePayload | null {
  let raw: string | null
  try {
    raw = localStorage.getItem(CONSTELLATIONS_CACHE_KEY)
  } catch {
    return null
  }
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<ConstellationsCachePayload>
    if (!parsed || typeof parsed.fetchedAt !== 'number' || !parsed.groups) return null
    const age = Date.now() - parsed.fetchedAt
    if (!(Number.isFinite(age) && age >= 0 && age < maxAgeMs)) return null
    for (const group of CONSTELLATION_GROUPS) {
      const arr = parsed.groups[group]
      if (!Array.isArray(arr) || !arr.every((s) => isConstellationSat(s, group))) return null
    }
    return parsed as ConstellationsCachePayload
  } catch {
    return null
  }
}

export function writeConstellationsCache(groups: Record<ConstellationGroup, ConstellationSat[]>, fetchedAt: number): void {
  const payload: ConstellationsCachePayload = { fetchedAt, groups }
  try {
    localStorage.setItem(CONSTELLATIONS_CACHE_KEY, JSON.stringify(payload))
  } catch {
    // storage may be full or blocked — the lens just re-fetches next mount
  }
}

const emptyGroups = (): Record<ConstellationGroup, ConstellationSat[]> => ({
  irnss: [],
  'gps-ops': [],
  galileo: [],
  beidou: [],
})

// Fetch all four groups in parallel; a 24 h-fresh cache short-circuits the network.
// A group is only cached when every group resolved — a partial fetch must not poison
// the cache for a day, so partial results fall back to any previous cache (stale OK).
export async function fetchConstellations(): Promise<Record<ConstellationGroup, ConstellationSat[]>> {
  const fresh = readConstellationsCache()
  if (fresh) return fresh.groups

  const settled = await Promise.all(
    CONSTELLATION_GROUPS.map(async (group): Promise<ConstellationSat[] | null> => {
      try {
        const res = await fetch(groupUrl(group), { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
        if (!res.ok) return null
        return parseConstellationGroup(await res.text(), group)
      } catch {
        return null
      }
    }),
  )

  const complete = settled.every((sats) => sats !== null && sats.length > 0)
  if (complete) {
    const groups = emptyGroups()
    CONSTELLATION_GROUPS.forEach((group, i) => {
      groups[group] = settled[i] ?? []
    })
    writeConstellationsCache(groups, Date.now())
    return groups
  }

  const stale = readConstellationsCache(Number.POSITIVE_INFINITY)
  if (stale) return stale.groups

  return emptyGroups()
}
