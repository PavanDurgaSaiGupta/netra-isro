// SatNOGS DB transmitter profiles — real downlink data for the dossier's GROUND LINK.
// The registry is fetched whole once per 24 h (its per-object filter proved unreliable)
// and filtered client-side, so one request serves every drawer open.

const SATNOGS_URL = 'https://db.satnogs.org/api/transmitters/?format=json'
const SATNOGS_CACHE_KEY = 'netra_satnogs_transmitters_v1'
const SATNOGS_TTL_MS = 24 * 60 * 60 * 1000

export interface RadioTransmitter {
  description: string
  downlinkMhz: number | null
  mode: string | null
  baud: number | null
  status: string
  alive: boolean
}

interface SatnogsRaw {
  description?: string
  downlink_low?: number | null
  mode?: string | null
  baud?: number | null
  status?: string
  alive?: boolean
  norad_cat_id?: number | null
}

interface CachePayload {
  fetchedAt: number
  rows: (RadioTransmitter & { noradId: number })[]
}

let memoryCache: CachePayload['rows'] | null = null

function readCache(): CachePayload['rows'] | null {
  if (memoryCache) return memoryCache
  try {
    const raw = localStorage.getItem(SATNOGS_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CachePayload
    if (
      !Number.isFinite(parsed.fetchedAt) ||
      Date.now() - parsed.fetchedAt > SATNOGS_TTL_MS ||
      !Array.isArray(parsed.rows)
    )
      return null
    memoryCache = parsed.rows
    return memoryCache
  } catch {
    return null
  }
}

export async function fetchTransmitters(noradId: number): Promise<RadioTransmitter[]> {
  const cached = readCache()
  if (cached) return cached.filter((t) => t.noradId === noradId)

  try {
    const res = await fetch(SATNOGS_URL, { signal: AbortSignal.timeout(6000) })
    if (!res.ok) return cached ?? []
    const raw = (await res.json()) as SatnogsRaw[]
    const rows = (Array.isArray(raw) ? raw : [])
      .filter((r) => Number.isInteger(r?.norad_cat_id))
      .map((r) => ({
        noradId: Number(r.norad_cat_id),
        description: typeof r.description === 'string' ? r.description : 'TRANSMITTER',
        downlinkMhz: Number.isFinite(r.downlink_low) ? (r.downlink_low as number) / 1e6 : null,
        mode: typeof r.mode === 'string' ? r.mode : null,
        baud: Number.isFinite(r.baud) ? (r.baud as number) : null,
        status: typeof r.status === 'string' ? r.status.toUpperCase() : 'UNKNOWN',
        alive: r.alive !== false,
      }))
    memoryCache = rows
    try {
      localStorage.setItem(SATNOGS_CACHE_KEY, JSON.stringify({ fetchedAt: Date.now(), rows }))
    } catch {
      // payload too large for storage — the memory cache still serves this session
    }
    return rows.filter((t) => t.noradId === noradId)
  } catch {
    return cached ?? []
  }
}
