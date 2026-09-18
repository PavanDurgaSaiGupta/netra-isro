import React, { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from 'react'
import {
  type SatelliteItem,
  SEED_CATALOG,
  computeState,
  fetchLiveCelesTrak,
  formatIST,
} from '../services/satelliteData'
import { playLockSound } from '../utils/audio'

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

export const SatelliteProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [rawCatalog, setRawCatalog] = useState(SEED_CATALOG)
  const [loading] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dataSource, setDataSource] = useState<SatelliteItem['source']>('seed')
  const requestRef = useRef(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterRegime, setFilterRegime] = useState<'ALL' | 'ISRO' | 'DEBRIS' | 'LEO' | 'MEO' | 'GEO'>('ALL')
  const [issData, setIssData] = useState<ISSData | null>(null)
  const [alerts, setAlerts] = useState<AlertLogItem[]>(INITIAL_ALERTS)
  const [tick, setTick] = useState(() => Date.now())
  const [apiStatus, setApiStatus] = useState<'ONLINE' | 'SYNCING' | 'STANDBY'>('SYNCING')
  const [lastSyncTime, setLastSyncTime] = useState('DEMO ELEMENTS')
  const [recenterTrigger, setRecenterTrigger] = useState(0)
  const [resetViewTrigger, setResetViewTrigger] = useState(0)

  const triggerRecenter = () => setRecenterTrigger((t) => t + 1)
  const triggerResetView = () => {
    setSelectedId(null)
    setResetViewTrigger((t) => t + 1)
  }

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

  // Propagate all satellites every 1.5 seconds using satellite.js SGP4
  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), 1500)
    return () => clearInterval(id)
  }, [])

  // Poll Where The ISS At every 5 seconds
  useEffect(() => {
    let active = true
    const fetchISS = async () => {
      try {
        const res = await fetch('https://api.wheretheiss.at/v1/satellites/25544', {
          signal: AbortSignal.timeout(3500),
        })
        if (res.ok) {
          const data = await res.json()
          if (active) {
            setIssData({
              latitude: data.latitude,
              longitude: data.longitude,
              altitude: data.altitude,
              velocity: data.velocity,
              visibility: data.visibility,
              timestamp: data.timestamp,
            })
          }
        }
      } catch {
        // graceful fallback
      }
    }
    fetchISS()
    const id = setInterval(fetchISS, 5000)
    return () => {
      active = false
      clearInterval(id)
    }
  }, [])

  // Compute live states
  const satellites = useMemo(() => {
    const now = new Date(tick)
    return rawCatalog
      .map((item) => computeState(item, now, SEED_CATALOG.some((seed) => seed.tle1 === item.tle1 && seed.tle2 === item.tle2) ? 'seed' : dataSource))
      .filter((s): s is SatelliteItem => Boolean(s))
  }, [rawCatalog, tick, dataSource])

  const selectedSat = satellites.find((sat) => sat.id === selectedId) ?? null

  const setSelectedSat = (sat: SatelliteItem | null) => {
    if (sat) playLockSound()
    setSelectedId(sat?.id ?? null)
  }

  const selectSatelliteById = (id: string) => {
    const found = satellites.find((s) => s.id === id || String(s.noradId) === id)
    if (found) {
      setSelectedSat(found)
    }
  }

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

  const addAlert = (
    message: string,
    category: AlertLogItem['category'] = 'SYSTEM',
    severity: AlertLogItem['severity'] = 'nominal',
  ) => {
    const now = new Date()
    const hh = String(now.getHours()).padStart(2, '0')
    const mm = String(now.getMinutes()).padStart(2, '0')
    const ss = String(now.getSeconds()).padStart(2, '0')
    const item: AlertLogItem = {
      id: 'alt-' + Date.now(),
      timestamp: `${hh}:${mm}:${ss}`,
      code: 'DSSAM-' + Math.floor(100 + Math.random() * 900),
      category,
      message,
      severity,
    }
    setAlerts((prev) => [item, ...prev.slice(0, 19)])
  }

  return (
    <SatelliteContext.Provider
      value={{
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
      }}
    >
      {children}
    </SatelliteContext.Provider>
  )
}

export function useSatellites() {
  const ctx = useContext(SatelliteContext)
  if (!ctx) throw new Error('useSatellites must be used within a SatelliteProvider')
  return ctx
}
