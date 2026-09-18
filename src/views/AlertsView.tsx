import { useState } from 'react'
import { useSatellites, type AlertLogItem } from '../context/SatelliteContext'
import AlertsFeed from '../components/console/AlertsFeed'
import { playBlip, playLockSound } from '../utils/audio'

type CategoryFilter = 'ALL' | AlertLogItem['category']

interface GroundStationStatus {
  name: string
  location: string
  status: 'ACTIVE' | 'CALIBRATING' | 'STANDBY'
  frequencyBand: string
  azimuthCoverage: string
  elevationMin: string
}

const GROUND_STATION_NETWORK: GroundStationStatus[] = [
  {
    name: 'DSSAM BENGALURU',
    location: 'ISTRAC Peenya, Bengaluru (12.97°N, 77.59°E)',
    status: 'ACTIVE',
    frequencyBand: 'S-band / X-band (8.4 GHz)',
    azimuthCoverage: '0° - 360° Hemispherical',
    elevationMin: '5.0° Above Horizon',
  },
  {
    name: 'MOTR SRIHARIKOTA',
    location: 'SDSC SHAR (13.72°N, 80.23°E)',
    status: 'ACTIVE',
    frequencyBand: 'Phased Array L-band (1.2 GHz)',
    azimuthCoverage: '±60° Electronic Steering',
    elevationMin: '10.0° Phased Cone',
  },
  {
    name: 'DEEP SPACE NETWORK BYALALU',
    location: 'IDSN Byalalu (12.90°N, 77.37°E)',
    status: 'ACTIVE',
    frequencyBand: '32m & 18m Deep Space Reflectors',
    azimuthCoverage: 'Deep Space Graveyard & GEO',
    elevationMin: '7.5° Elevation',
  },
  {
    name: 'MOUNT ABU OBSERVATORY',
    location: 'Gurushikhar, Rajasthan (24.65°N, 72.78°E)',
    status: 'ACTIVE',
    frequencyBand: 'Electro-Optical 1.2m Infrared/Visible',
    azimuthCoverage: 'GEO Graveyard Belt Scan',
    elevationMin: '15.0° Clear Night Sky',
  },
  {
    name: 'PORT BLAIR DOWNRANGE',
    location: 'Andaman & Nicobar (11.62°N, 92.72°E)',
    status: 'ACTIVE',
    frequencyBand: 'Telemetry Telecommand S-band',
    azimuthCoverage: 'Equatorial Launch Arc',
    elevationMin: '3.0° Oceanic Horizon',
  },
]

export default function AlertsView() {
  const { alerts, addAlert } = useSatellites()
  const [filterCat, setFilterCat] = useState<CategoryFilter>('ALL')
  const [downloadSuccess, setDownloadSuccess] = useState(false)

  const filtered = alerts.filter((a) => {
    if (filterCat === 'ALL') return true
    return a.category === filterCat
  })

  const handleSimulateAlert = () => {
    playLockSound()
    addAlert(
      'CONJUNCTION EARLY WARNING: RISK ELEVATED FOR RISAT-2B vs IRIDIUM-33 DEBRIS (MISS 0.74 KM)',
      'CONJUNCTION',
      'alert'
    )
  }

  const handleExportLogs = () => {
    playLockSound()
    const json = JSON.stringify(alerts, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ISRO_DSSAM_TELEMETRY_LOG_${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)

    setDownloadSuccess(true)
    setTimeout(() => setDownloadSuccess(false), 3000)
  }

  return (
    <div className="alerts-view">
      <div className="alerts-view__header">
        <div>
          <span className="alerts-view__kicker hud-text">
            ISRO DSSAM // TELEMETRY INCIDENT BUFFER &amp; RADAR LOGS
          </span>
          <h1 className="alerts-view__title display">MISSION OPERATIONS LOG &amp; EARLY WARNING FEED</h1>
          <p className="alerts-view__desc">
            Official chronological log of automated conjunction screenings, TLE updates, sensor acquisition sweeps, solar flux drag notices, and ground station antenna vectors.
          </p>
        </div>

        <div className="alerts-view__actions hud-text">
          <button className="alerts-view__sim-btn u-link" onClick={handleSimulateAlert}>
            ⚡ INITIATE SENSOR DRILL ALERT
          </button>
          <button
            className="btn-secondary hud-text"
            style={{ padding: '6px 14px', fontSize: '9.5px', marginLeft: '12px' }}
            onClick={handleExportLogs}
          >
            {downloadSuccess ? '✓ LOGS EXPORTED' : '📥 EXPORT AUDIT LOG (.JSON)'}
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="alerts-view__filters hud-text">
        {(['ALL', 'TLE', 'CONJUNCTION', 'GROUND_STATION', 'WEATHER', 'SYSTEM'] as const).map((cat) => (
          <button
            key={cat}
            className={`alerts-view__tab ${filterCat === cat ? 'alerts-view__tab--active' : ''}`}
            onClick={() => {
              playBlip(1100, 0.02)
              setFilterCat(cat)
            }}
          >
            {cat.replace('_', ' ')}
          </button>
        ))}
        <span className="alerts-view__count hud__faint">
          LOGS IN ACTIVE BUFFER: {filtered.length}
        </span>
      </div>

      {/* Embedded Live Feed and Detailed Log Table */}
      <div className="alerts-view__grid">
        <div className="alerts-view__main-panel">
          <AlertsFeed maxLines={24} showHeader={false} />
        </div>

        <div className="alerts-view__side-stats hud-text">
          <div className="alerts-view__stat-card">
            <span className="hud__faint">STREAM STATUS</span>
            <span style={{ color: 'var(--status-active)', fontWeight: 700 }}>24×7 ACTIVE TELEMETRY</span>
          </div>
          <div className="alerts-view__stat-card">
            <span className="hud__faint">SENSOR SITES</span>
            <span>BENGALURU • SRIHARIKOTA • MOUNT ABU • BYALALU</span>
          </div>
          <div className="alerts-view__stat-card">
            <span className="hud__faint">SPACE SECURITY LEVEL</span>
            <span style={{ color: 'var(--accent-cyan)', fontWeight: 700 }}>DEFENSE READY // LEVEL 2</span>
          </div>
          <div className="alerts-view__stat-card">
            <span className="hud__faint">COLLISION ESCALATION</span>
            <span>MANEUVER PROTOCOL TRIGGERED IF Pc &gt; 1E-04</span>
          </div>
        </div>
      </div>

      {/* ISRO Ground Station Sensor Network Status Table */}
      <section className="station-network-section">
        <div className="debris-screening-section__head">
          <div>
            <span className="hud-text kicker">GROUND INFRASTRUCTURE READINESS</span>
            <h2 className="display" style={{ fontSize: '18px', margin: '4px 0 0' }}>
              ISRO TRACKING RADAR &amp; OPTICAL OBSERVATORY NETWORK
            </h2>
          </div>
        </div>

        <div className="debris-table-wrap">
          <table className="catalog-table" aria-label="ISRO tracking radar and observatory network facilities">
            <thead>
              <tr className="hud-text">
                <th>STATUS</th>
                <th>FACILITY NAME</th>
                <th>GEOGRAPHIC LOCATION</th>
                <th>FREQUENCY / SENSOR BAND</th>
                <th>AZIMUTH COVERAGE</th>
                <th>MIN ELEVATION</th>
              </tr>
            </thead>
            <tbody>
              {GROUND_STATION_NETWORK.map((st) => (
                <tr key={st.name} className="catalog-table__row">
                  <td>
                    <span
                      className="hud-text"
                      style={{
                        fontSize: '8.5px',
                        color: 'var(--status-active)',
                        padding: '2px 6px',
                        border: '1px solid var(--status-active)',
                        background: 'rgba(62, 207, 142, 0.1)',
                      }}
                    >
                      ● {st.status}
                    </span>
                  </td>
                  <td style={{ fontWeight: 700, color: '#fff' }}>{st.name}</td>
                  <td className="hud-text" style={{ color: 'var(--text-secondary)' }}>{st.location}</td>
                  <td className="hud-text" style={{ color: 'var(--accent-cyan)' }}>{st.frequencyBand}</td>
                  <td className="hud-text">{st.azimuthCoverage}</td>
                  <td className="hud-text" style={{ color: 'var(--text-tertiary)' }}>{st.elevationMin}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
