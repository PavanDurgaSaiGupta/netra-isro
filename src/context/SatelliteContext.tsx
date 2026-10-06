import React, { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from 'react'
import {
  type SatelliteItem,
  SEED_CATALOG,
  computeState,
  fetchLiveCelesTrak,
  formatIST,
} from '../services/satelliteData'

export interface ISSData {
  latitude: number
  longitude: number
  altitude: number
  velocity: number
  visibility: string
  timestamp: number
}

export interface AlertLogItem {
  id: string
  timestamp: string
  code: string
  category: 'TLE' | 'CONJUNCTION' | 'GROUND_STATION' | 'WEATHER' | 'SYSTEM'
  message: string
  severity: 'nominal' | 'warning' | 'alert'
}

interface SatelliteContextType {
  satellites: SatelliteItem[]
  loading: boolean
  selectedSat: SatelliteItem | null
  setSelectedSat: (sat: SatelliteItem | null) => void
  searchQuery: string
  setSearchQuery: (q: string) => void
  filterRegime: 'ALL' | 'ISRO' | 'DEBRIS' | 'LEO' | 'MEO' | 'GEO'
  setFilterRegime: (r: 'ALL' | 'ISRO' | 'DEBRIS' | 'LEO' | 'MEO' | 'GEO') => void
  filteredSatellites: SatelliteItem[]
  issData: ISSData | null
  alerts: AlertLogItem[]
  addAlert: (message: string, category?: AlertLogItem['category'], severity?: AlertLogItem['severity']) => void
  selectSatelliteById: (id: string) => void
  recenterTrigger: number
  triggerRecenter: () => void
  resetViewTrigger: number
  triggerResetView: () => void
  apiStatus: 'ONLINE' | 'SYNCING' | 'STANDBY'
  lastSyncTime: string
  refreshData: () => Promise<void>
  /** Mission sim time (ms epoch) — satellites propagate at this instant, not wall clock. */
  simTime: number
  /** Sim-time rate multiplier: 1 = live, 0 = paused, 10 / 60 = fast-forward. */
  timeRate: number
  /** sim time − wall clock (ms). ≈0 while live; grows while paused or scrubbed. */
  timeOffsetMs: number
  setTimeRate: (rate: number) => void
  /** Move sim time by deltaMs (negative = into the past) and tick immediately. */
  scrubTime: (deltaMs: number) => void
  /** Snap sim time back to the wall clock (offset 0) and restore rate 1. */
  goLive: () => void
}

const INITIAL_ALERTS: AlertLogItem[] = [
  {
    id: 'alt-1',
    timestamp: '18:00:14',
    code: 'DSSAM-701',
    category: 'TLE',
    message: 'TLE UPDATE RECEIVED — OBJECT 44804 (CARTOSAT-3)',
    severity: 'nominal',
  },
  {
    id: 'alt-2',
    timestamp: '17:59:42',
    code: 'DSSAM-442',
    category: 'CONJUNCTION',
    message: 'CONJUNCTION SCREENING COMPLETE: 1,482 PAIRS — NO MANEUVER REQUIRED',
    severity: 'nominal',
  },
  {
    id: 'alt-3',
    timestamp: '17:59:15',
    code: 'ISTRAC-BLR',
    category: 'GROUND_STATION',
    message: 'GROUND STATION BENGALURU — X-BAND PASS ACQUIRED ON RISAT-2B',
    severity: 'nominal',
  },
  {
    id: 'alt-4',
    timestamp: '17:58:30',
    code: 'SPACE-WX',
    category: 'WEATHER',
    message: 'SOLAR FLUX INDEX (F10.7): 146 SFU — MODERATE ATMOSPHERIC DRAG FORECAST',
    severity: 'warning',
  },
  {
    id: 'alt-5',
    timestamp: '17:57:02',
    code: 'DEB-MON',
    category: 'CONJUNCTION',
    message: 'IRIDIUM 33 DEBRIS FRAGMENT DISTANCE 4.2 KM TO STARLINK-2182 (MONITORED)',
    severity: 'warning',
  },
]

const SatelliteContext = createContext<SatelliteContextType | undefined>(undefined)

const SEED_TLES = new Set(SEED_CATALOG.map((s) => `${s.tle1}|${s.tle2}`))

export const SatelliteProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [rawCatalog, setRawCatalog] = useState(SEED_CATALOG)
  const [loading] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dataSource, setDataSource] = useState<SatelliteItem['source']>('seed')
  const requestRef = useRef(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterRegime, setFilterRegime] = useState<'ALL' | 'ISRO' | 'DEBRIS' | 'LEO' | 'MEO' | 'GEO'>('ALL')
  const [issData] = useState<ISSData | null>(null)
  const [alerts, setAlerts] = useState<AlertLogItem[]>(INITIAL_ALERTS)
  const [tick, setTick] = useState(() => Date.now())

  // Mission time (item 7). The 1.5 s interval now advances a sim-time ref instead of
  // reading the wall clock, so every consumer keeps propagating at `tick` with zero
  // API change — `tick` simply *is* sim time from here on. Nominal cadence per the
  // contract: simTimeRef += 1500 * rate per tick; we advance by the real elapsed gap
  // (which is that same 1500 * rate on schedule) so rate 1 never accumulates
  // setInterval scheduling jitter and stays glued to the wall clock. Refs seed from
  // the mount-time `tick` (lazy useState initializer — keeps render pure).
  const simTimeRef = useRef(tick)
  const timeRateRef = useRef(1)
  const lastTickAtRef = useRef(tick)
  const [timeRate, setTimeRateState] = useState(1)
  const [timeOffsetMs, setTimeOffsetMs] = useState(0)

  const [apiStatus, setApiStatus] = useState<'ONLINE' | 'SYNCING' | 'STANDBY'>('SYNCING')
  const [lastSyncTime, setLastSyncTime] = useState('DEMO ELEMENTS')
  const [recenterTrigger, setRecenterTrigger] = useState(0)
  const [resetViewTrigger, setResetViewTrigger] = useState(0)

  const triggerRecenter = useCallback(() => setRecenterTrigger((t) => t + 1), [])
  const triggerResetView = useCallback(() => {
    setSelectedId(null)
    setResetViewTrigger((t) => t + 1)
  }, [])

  const loadData = useCallback(async () => {
    const request = ++requestRef.current
    try {
      const live = await fetchLiveCelesTrak()
      if (request !== requestRef.current) return
      setRawCatalog(live.items)
      setDataSource(live.status === 'ONLINE' ? 'celestrak' : live.status === 'CACHE' ? 'cached' : 'seed')
      setApiStatus(live.status === 'ONLINE' ? 'ONLINE' : 'STANDBY')
      setLastSyncTime(live.fetchedAt ? `${formatIST(new Date(live.fetchedAt))} IST${live.status === 'CACHE' ? ' / CACHED' : ''}` : 'DEMO ELEMENTS')
    } catch {
      if (request === requestRef.current) setApiStatus('STANDBY')
    }
  }, [])

  useEffect(() => {
    void loadData()
    return () => { requestRef.current++ }
  }, [loadData])

  // Propagate all satellites every 1.5 seconds using satellite.js SGP4 — at sim time.
  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now()
      const elapsed = Math.min(Math.max(now - lastTickAtRef.current, 0), 60000)
      lastTickAtRef.current = now
      simTimeRef.current += Math.round(elapsed * timeRateRef.current)
      setTick(simTimeRef.current)
      setTimeOffsetMs(simTimeRef.current - now)
    }, 1500)
    return () => clearInterval(id)
  }, [])

  // Mission-time control surface (item 7). Rate lives in a ref (read by the interval)
  // mirrored by state (read by the cockpit HUD); scrubbing moves sim time and ticks
  // immediately so the whole console reacts in the same frame.
  const setTimeRate = useCallback((rate: number) => {
    const next = Number.isFinite(rate) ? Math.max(0, rate) : 1
    timeRateRef.current = next
    setTimeRateState(next)
  }, [])

  const scrubTime = useCallback((deltaMs: number) => {
    if (!Number.isFinite(deltaMs) || deltaMs === 0) return
    simTimeRef.current += deltaMs
    setTick(simTimeRef.current)
    setTimeOffsetMs(simTimeRef.current - Date.now())
  }, [])

  const goLive = useCallback(() => {
    const now = Date.now()
    simTimeRef.current = now
    lastTickAtRef.current = now
    timeRateRef.current = 1
    setTimeRateState(1)
    setTimeOffsetMs(0)
    setTick(now)
  }, [])

  // Poll Where The ISS At — OverheadRadar owns the only ISS poll; the previous 5 s poll here
  // stored into issData that no component reads (dead requests + a provider re-render every 5 s).

  // Compute live states
  const satellites = useMemo(() => {
    const now = new Date(tick)
    return rawCatalog
      .map((item) => computeState(item, now, SEED_TLES.has(`${item.tle1}|${item.tle2}`) ? 'seed' : dataSource))
      .filter((s): s is SatelliteItem => Boolean(s))
  }, [rawCatalog, tick, dataSource])

  const selectedSat = satellites.find((sat) => sat.id === selectedId) ?? null

  // Stable callbacks: consumers key effects on these (e.g. AlertsFeed's auto-append
  // interval on addAlert) — a fresh identity every render silently killed those effects.
  const setSelectedSat = useCallback((sat: SatelliteItem | null) => {
    setSelectedId(sat?.id ?? null)
  }, [])

  const selectSatelliteById = useCallback(
    (id: string) => {
      const found = satellites.find((s) => s.id === id || String(s.noradId) === id)
      if (found) {
        setSelectedSat(found)
      }
    },
    [satellites, setSelectedSat],
  )

  // Filter satellites based on query and regime
  const filteredSatellites = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return satellites.filter((s) => {
      const matchesQuery =
        !query ||
        s.name.toLowerCase().includes(query) ||
        String(s.noradId).includes(query) ||
        s.operator.toLowerCase().includes(query)

      if (!matchesQuery) return false

      if (filterRegime === 'ALL') return true
      if (filterRegime === 'ISRO') return s.operator.includes('ISRO')
      if (filterRegime === 'DEBRIS') return s.type === 'debris'
      if (filterRegime === 'LEO') return s.orbitClass === 'LEO' || s.orbitClass === 'SSO'
      if (filterRegime === 'GEO') return s.orbitClass === 'GEO' || s.orbitClass === 'IGSO'
      return s.orbitClass === filterRegime
    })
  }, [satellites, searchQuery, filterRegime])

  const addAlert = useCallback(
    (
      message: string,
      category: AlertLogItem['category'] = 'SYSTEM',
      severity: AlertLogItem['severity'] = 'nominal',
    ) => {
      const item: AlertLogItem = {
        id: `alt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: formatIST(new Date()),
        code: 'DSSAM-' + Math.floor(100 + Math.random() * 900),
        category,
        message,
        severity,
      }
      setAlerts((prev) => [item, ...prev.slice(0, 19)])
    },
    [],
  )

  const contextValue = useMemo(
    () => ({
      satellites,
      loading,
      selectedSat,
      setSelectedSat,
      searchQuery,
      setSearchQuery,
      filterRegime,
      setFilterRegime,
      filteredSatellites,
      issData,
      alerts,
      addAlert,
      selectSatelliteById,
      recenterTrigger,
      triggerRecenter,
      resetViewTrigger,
      triggerResetView,
      apiStatus,
      lastSyncTime,
      refreshData: loadData,
      simTime: tick,
      timeRate,
      timeOffsetMs,
      setTimeRate,
      scrubTime,
      goLive,
    }),
    [
      satellites,
      selectedSat,
      searchQuery,
      filterRegime,
      filteredSatellites,
      issData,
      alerts,
      addAlert,
      selectSatelliteById,
      recenterTrigger,
      triggerRecenter,
      resetViewTrigger,
      triggerResetView,
      apiStatus,
      lastSyncTime,
      loadData,
      tick,
      timeRate,
      timeOffsetMs,
      setTimeRate,
      scrubTime,
      goLive,
    ],
  )

  return (
    <SatelliteContext.Provider value={contextValue}>
      {children}
    </SatelliteContext.Provider>
  )
}

export function useSatellites() {
  const ctx = useContext(SatelliteContext)
  if (!ctx) throw new Error('useSatellites must be used within a SatelliteProvider')
  return ctx
}
