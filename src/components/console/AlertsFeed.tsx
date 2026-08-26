import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { useSatellites } from '../../context/SatelliteContext'
import { playBlip } from '../../utils/audio'

const RANDOM_EVENTS = [
  'TLE EPHEMERIS SYNCED WITH CELESTRAK GP FEED (NORAD ID: 44233)',
  'DOPPLER RESIDUAL WITHIN ±1.4 HZ — S-BAND BEACON NOMINAL',
  'CONJUNCTION SCREENING PASSED: 1,510 ACTIVE SATELLITE PAIRS CHECKED',
  'ISTRAC BENGALURU MONITORS OVERHEAD ELEVATION VECTOR (+22.4°)',
  'SOLAR FLUX SENSOR (F10.7) STABLE AT 146 SFU — DRAG MODEL BALANCED',
  'CARTOSAT-3 SUB-SATELLITE GROUND TRACK RE-PROPAGATED (SSO 97.5°)',
  'X-BAND SYNCHRONIZATION WITH SRIHARIKOTA TRACKING RADAR CONFIRMED',
  'DEBRIS COUPLING ANALYSIS: PROBABILITY OF COLLISION (Pc) < 1E-06',
]

interface AlertsFeedProps {
  maxLines?: number
  showHeader?: boolean
  className?: string
}

export default function AlertsFeed({ maxLines = 8, showHeader = true, className = '' }: AlertsFeedProps) {
  const { alerts, addAlert } = useSatellites()
  const listRef = useRef<HTMLDivElement>(null)

  // Append new simulated alerts every 9 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      const msg = RANDOM_EVENTS[Math.floor(Math.random() * RANDOM_EVENTS.length)]
      const isWarn = msg.includes('DEBRIS') || msg.includes('SOLAR')
      addAlert(msg, isWarn ? 'CONJUNCTION' : 'TLE', isWarn ? 'warning' : 'nominal')
      playBlip(1600, 0.015)
    }, 9500)

    return () => clearInterval(timer)
  }, [addAlert])

  // GSAP slide & fade in on newest row
  useEffect(() => {
    if (!listRef.current) return
    const firstRow = listRef.current.querySelector('.alerts-feed__item:first-child')
    if (firstRow) {
      gsap.fromTo(
        firstRow,
        { opacity: 0, y: -8, backgroundColor: 'rgba(255,107,26,0.15)' },
        { opacity: 1, y: 0, backgroundColor: 'rgba(255,107,26,0)', duration: 0.5, ease: 'power2.out' }
      )
    }
  }, [alerts])

  const displayedAlerts = alerts.slice(0, maxLines)

  return (
    <div className={`alerts-feed ${className}`} aria-label="Real-time mission console alerts feed">
      {showHeader && (
        <div className="alerts-feed__head hud-text">
          <div className="alerts-feed__title-wrap">
            <span className="alerts-feed__live-dot" />
            <span className="alerts-feed__title">MISSION ALERTS & LOGS</span>
          </div>
          <span className="alerts-feed__stream-code hud__faint">FEED: DSSAM-PUB-LIVE</span>
        </div>
      )}

      <div className="alerts-feed__list" ref={listRef}>
        {displayedAlerts.map((item, idx) => {
          // Calculate aging opacity: newest = 1, older lines fade down
          const opacity = Math.max(0.35, 1 - idx * 0.08)
          const isWarn = item.severity === 'warning'
          return (
            <div
              key={item.id}
              className={`alerts-feed__item ${isWarn ? 'alerts-feed__item--warning' : ''}`}
              style={{ opacity }}
            >
              <span className="alerts-feed__timestamp hud-text">[{item.timestamp}]</span>
              <span className="alerts-feed__code hud-text">{item.code}</span>
              <span className="alerts-feed__msg">{item.message}</span>
            </div>
          )
        })}
      </div>

      <div className="alerts-feed__foot hud-text hud__faint">
        <span>AUTO-APPENDING REAL-TIME DSSAM EVENT LOG</span>
        <span>BUFFER: {alerts.length} ENTRIES</span>
      </div>
    </div>
  )
}
