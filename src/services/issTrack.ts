// ISS ground-track trail + sub-point region — WhereTheISS.at batch and geocode endpoints.
// The batch call carries 10 timestamps in ONE request (±36 minutes of track), so the
// per-minute refresh stays far inside the ~1 req/s rate limit.

const WTIA_POSITIONS = 'https://api.wheretheiss.at/v1/satellites/25544/positions'
const WTIA_GEOCODE = 'https://api.wheretheiss.at/v1/coordinates'

export interface IssTrackPoint {
  lat: number
  lng: number
  altKm: number
  timestamp: number
}

export async function fetchIssTrack(): Promise<IssTrackPoint[]> {
  const now = Math.floor(Date.now() / 1000)
  const stamps: number[] = []
  for (let i = -4; i <= 5; i++) stamps.push(now + i * 540)
  try {
    const res = await fetch(`${WTIA_POSITIONS}?timestamps=${stamps.join(',')}&units=kilometers`, {
      signal: AbortSignal.timeout(4000),
    })
    if (!res.ok) return []
    const arr = (await res.json()) as Array<{
      latitude?: number
      longitude?: number
      altitude?: number
      timestamp?: number
    }>
    return arr
      .filter((p) => [p.latitude, p.longitude, p.altitude, p.timestamp].every(Number.isFinite))
      .map((p) => ({
        lat: Number(p.latitude),
        lng: Number(p.longitude),
        altKm: Number(p.altitude),
        timestamp: Number(p.timestamp),
      }))
  } catch {
    return []
  }
}

// What sits directly below a sub-point — WTIA reverse geocode (country code only).
export async function fetchSubpointRegion(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(`${WTIA_GEOCODE}/${lat.toFixed(2)},${lng.toFixed(2)}`, {
      signal: AbortSignal.timeout(3500),
    })
    if (!res.ok) return null
    const d = (await res.json()) as { country_code?: string }
    return typeof d.country_code === 'string' && d.country_code ? d.country_code : null
  } catch {
    return null
  }
}
