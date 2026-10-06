import * as satellite from 'satellite.js'
import type { GeodeticLocation } from 'satellite.js'
import { BENGALURU_OBSERVER, formatIST, validTLE } from './satelliteData.js'

/**
 * Pass prediction over the ISTRAC Bengaluru ground station (contract item 4).
 *
 * `predictPasses` coarse-scans the look-angle elevation from BENGALURU_OBSERVER at
 * 60 s steps to bracket horizon crossings (elevation > 0°), refines each crossing's
 * AOS/LOS at 5 s steps, then fine-sweeps the pass itself at 5 s to record the true
 * maximum elevation. Call budget per object ≈ 2,880 coarse + ~40 refinement + ~450
 * sweep samples — computed once per selection, never per frame.
 */

/** Minimal shape predictPasses needs — SeedItem and SatelliteItem both satisfy it. */
export interface PassTarget {
  noradId: number
  tle1: string
  tle2: string
}

/**
 * One predicted pass. `aosUtc`/`losUtc` are the contract's field names and hold
 * IST strings rendered via formatIST (the contract mandates the shape AND the
 * formatIST rendering — the names are kept verbatim). `aosMs`/`losMs` carry the
 * raw epoch milliseconds so the UI can run a live countdown without re-parsing.
 */
export interface PassPrediction {
  aosUtc: string
  maxElevDeg: number
  losUtc: string
  durationMin: number
  aosMs: number
  losMs: number
}

export interface NextPassInfo {
  /** `in-progress` = satellite currently above the horizon; `upcoming` = waiting for AOS. */
  phase: 'in-progress' | 'upcoming' | 'none'
  pass: PassPrediction | null
  /** Seconds until AOS (upcoming) or LOS (in-progress); 0 when phase is `none`. */
  secondsUntilEvent: number
}

const COARSE_STEP_MS = 60_000
const FINE_STEP_MS = 5_000
const MAX_PASSES = 3
/** Keep scanning up to 2 h past the requested window so an in-flight pass gets a real LOS. */
const LOS_CLOSE_PAD_MS = 2 * 3_600_000
/** Session cache TTL — long enough to absorb re-selections, short enough that the
 * countdown never reads a stale AOS (entries are also rejected once every pass in
 * them has already set). */
const CACHE_TTL_MS = 30 * 60_000
const DEFAULT_HOURS_AHEAD = 48

// TLE parsing is expensive; parse each element set once and reuse the satrec
// (same pattern as satelliteData.getSatrec).
const satrecCache = new Map<string, ReturnType<typeof satellite.twoline2satrec>>()
function getSatrec(tle1: string, tle2: string): ReturnType<typeof satellite.twoline2satrec> | null {
  const key = `${tle1}|${tle2}`
  let rec = satrecCache.get(key)
  if (!rec) {
    try {
      rec = satellite.twoline2satrec(tle1, tle2)
    } catch {
      return null
    }
    satrecCache.set(key, rec)
  }
  return rec
}

// Session-level pass cache, keyed per noradId (contract).
interface PassCacheEntry {
  computedAt: number
  hoursAhead: number
  passes: PassPrediction[]
}
const passCache = new Map<number, PassCacheEntry>()

/** Elevation (deg) of the satellite above the observer's local horizon, or null when SGP4 fails. */
function elevationDegAt(
  satrec: ReturnType<typeof satellite.twoline2satrec>,
  date: Date,
  observer: GeodeticLocation,
): number | null {
  try {
    const pv = satellite.propagate(satrec, date)
    if (!pv || typeof pv.position === 'boolean' || !pv.position) return null
    const posEcf = satellite.eciToEcf(pv.position, satellite.gstime(date))
    const look = satellite.ecfToLookAngles(observer, posEcf)
    const deg = (look.elevation * 180) / Math.PI
    return Number.isFinite(deg) ? deg : null
  } catch {
    return null
  }
}

// 5 s refinement: first sample back above the horizon inside a rising 60 s bracket.
function refineAosMs(
  satrec: ReturnType<typeof satellite.twoline2satrec>,
  observer: GeodeticLocation,
  belowMs: number,
  aboveMs: number,
): number {
  for (let t = belowMs + FINE_STEP_MS; t < aboveMs; t += FINE_STEP_MS) {
    const e = elevationDegAt(satrec, new Date(t), observer)
    if (e !== null && e > 0) return t
  }
  return aboveMs
}

// 5 s refinement: first sample back below the horizon inside a setting 60 s bracket.
function refineLosMs(
  satrec: ReturnType<typeof satellite.twoline2satrec>,
  observer: GeodeticLocation,
  aboveMs: number,
  belowMs: number,
): number {
  for (let t = aboveMs + FINE_STEP_MS; t < belowMs; t += FINE_STEP_MS) {
    const e = elevationDegAt(satrec, new Date(t), observer)
    if (e !== null && e <= 0) return t
  }
  return belowMs
}

// 5 s sweep across the whole pass for the true peak elevation (coarse 60 s sampling
// alone can under-read the apex of a short pass).
function maxElevationDeg(
  satrec: ReturnType<typeof satellite.twoline2satrec>,
  observer: GeodeticLocation,
  fromMs: number,
  toMs: number,
): number {
  let max = 0
  for (let t = fromMs; t <= toMs; t += FINE_STEP_MS) {
    const e = elevationDegAt(satrec, new Date(t), observer)
    if (e !== null && e > max) max = e
  }
  return max
}

const round1 = (n: number) => Math.round(n * 10) / 10

/**
 * Predict up to 3 passes of `base` over the observer (ISTRAC by default) within
 * `hoursAhead`. Returns passes ordered by AOS; [] means no pass in the window
 * (or the element set could not be propagated). Computed once per selection —
 * results are cached per noradId in a session Map.
 */
export function predictPasses(
  base: PassTarget,
  hoursAhead: number = DEFAULT_HOURS_AHEAD,
  observer: GeodeticLocation = BENGALURU_OBSERVER,
): PassPrediction[] {
  if (!base || !Number.isFinite(base.noradId) || !validTLE(base.tle1, base.tle2, base.noradId)) return []
  const satrec = getSatrec(base.tle1, base.tle2)
  if (!satrec || satrec.error) return []

  const now = Date.now()
  const windowEnd = now + Math.max(hoursAhead, 0) * 3_600_000

  if (observer === BENGALURU_OBSERVER) {
    const cached = passCache.get(base.noradId)
    if (
      cached &&
      cached.hoursAhead === hoursAhead &&
      now - cached.computedAt < CACHE_TTL_MS &&
      cached.passes.some((p) => p.losMs > now)
    ) {
      return cached.passes
    }
  }

  const hardEnd = windowEnd + LOS_CLOSE_PAD_MS
  const passes: PassPrediction[] = []
  let prevT: number | null = null // time of the previous finite sample
  let prevAbove = false
  let openAosMs: number | null = null // AOS of the pass currently above the horizon
  let lastFiniteT = now

  for (let t = now; t <= hardEnd && passes.length < MAX_PASSES; t += COARSE_STEP_MS) {
    const elev = elevationDegAt(satrec, new Date(t), observer)
    if (elev === null) {
      // No data breaks crossing continuity — wait for a clean below→above edge.
      prevT = null
      prevAbove = false
      continue
    }
    lastFiniteT = t
    const above = elev > 0

    if (above && !prevAbove && prevT !== null) {
      // Rising crossing bracketed by [prevT, t]: refine AOS at 5 s and open a pass.
      // (An above-horizon first sample is a pass already in progress — skipped;
      // only full rise/set cycles are reported so the UI countdown stays positive.)
      openAosMs = refineAosMs(satrec, observer, prevT, t)
    }

    if (!above && openAosMs !== null) {
      // Setting crossing bracketed by [prevT, t]: refine LOS at 5 s and close it.
      const losMs = refineLosMs(satrec, observer, prevT ?? openAosMs, t)
      if (openAosMs <= windowEnd) {
        const maxElevDeg = maxElevationDeg(satrec, observer, openAosMs, losMs)
        passes.push({
          aosUtc: formatIST(new Date(openAosMs)),
          losUtc: formatIST(new Date(losMs)),
          maxElevDeg: round1(maxElevDeg),
          durationMin: round1((losMs - openAosMs) / 60_000),
          aosMs: openAosMs,
          losMs,
        })
      }
      openAosMs = null
    }

    prevT = t
    prevAbove = above
  }

  // A pass still open at the hard end (rose before windowEnd, never sets within the
  // pad — e.g. a quasi-geostationary object): close it at the last finite sample.
  if (openAosMs !== null && openAosMs <= windowEnd && passes.length < MAX_PASSES) {
    const losMs = lastFiniteT
    const maxElevDeg = maxElevationDeg(satrec, observer, openAosMs, losMs)
    passes.push({
      aosUtc: formatIST(new Date(openAosMs)),
      losUtc: formatIST(new Date(losMs)),
      maxElevDeg: round1(maxElevDeg),
      durationMin: round1((losMs - openAosMs) / 60_000),
      aosMs: openAosMs,
      losMs,
    })
  }

  if (observer === BENGALURU_OBSERVER) {
    passCache.set(base.noradId, { computedAt: now, hoursAhead, passes })
  }
  return passes
}

/**
 * UI-side derivation shared by the drawer and the radar: where the satellite is
 * relative to the horizon and how far (seconds) the next horizon event is.
 */
export function describeNextPass(passes: PassPrediction[] | null, nowMs: number = Date.now()): NextPassInfo {
  if (!passes || passes.length === 0) return { phase: 'none', pass: null, secondsUntilEvent: 0 }
  const current = passes.find((p) => p.aosMs <= nowMs && nowMs < p.losMs)
  if (current) {
    return { phase: 'in-progress', pass: current, secondsUntilEvent: Math.max(0, (current.losMs - nowMs) / 1000) }
  }
  const next = passes.find((p) => p.aosMs > nowMs)
  if (next) {
    return { phase: 'upcoming', pass: next, secondsUntilEvent: Math.max(0, (next.aosMs - nowMs) / 1000) }
  }
  return { phase: 'none', pass: null, secondsUntilEvent: 0 }
}

/**
 * Countdown text. `clock` style = mm:ss, switching to h:mm:ss past one hour
 * (drawer odometer). `minutes` style = mm:ss with unbounded minutes, exactly the
 * radar's "NEXT PASS IN mm:ss" contract format.
 */
export function formatCountdown(totalSeconds: number, style: 'clock' | 'minutes' = 'clock'): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const hh = Math.floor(s / 3600)
  const mm = Math.floor((s % 3600) / 60)
  const ss = s % 60
  const two = (n: number) => String(n).padStart(2, '0')
  if (style === 'minutes') return `${two(mm + hh * 60)}:${two(ss)}`
  return hh > 0 ? `${hh}:${two(mm)}:${two(ss)}` : `${two(mm)}:${two(ss)}`
}
