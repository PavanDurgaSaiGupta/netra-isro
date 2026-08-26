import { useState } from 'react'
import DebrisGrowthChart from '../components/DebrisGrowthChart'
import MissionStats from '../components/MissionStats'
import { playBlip, playLockSound } from '../utils/audio'

interface ConjunctionPair {
  id: string
  primaryAsset: string
  noradPrimary: number
  chaserObject: string
  noradChaser: number
  missDistanceKm: number
  radialMissKm: number
  collisionProbability: string
  tcaUtc: string
  status: 'MONITORED' | 'CAM PLANNED' | 'MANEUVER EXECUTED' | 'SAFE PASS'
  statusColor: string
}

const CONJUNCTION_SCREENING_DATA: ConjunctionPair[] = [
  {
    id: 'conj-01',
    primaryAsset: 'CARTOSAT-3',
    noradPrimary: 44804,
    chaserObject: 'COSMOS 1408 DEBRIS',
    noradChaser: 49863,
    missDistanceKm: 1.42,
    radialMissKm: 0.18,
    collisionProbability: '3.82E-05',
    tcaUtc: '2026-08-27 04:18:22 UTC',
    status: 'MONITORED',
    statusColor: 'var(--status-warning)',
  },
  {
    id: 'conj-02',
    primaryAsset: 'RISAT-2B',
    noradPrimary: 44252,
    chaserObject: 'IRIDIUM 33 DEBRIS',
    noradChaser: 33777,
    missDistanceKm: 0.74,
    radialMissKm: 0.09,
    collisionProbability: '2.45E-04',
    tcaUtc: '2026-08-27 08:44:10 UTC',
    status: 'CAM PLANNED',
    statusColor: 'var(--accent-orange)',
  },
  {
    id: 'conj-03',
    primaryAsset: 'RESOURCESAT-2A',
    noradPrimary: 41877,
    chaserObject: 'FENGYUN-1C DEBRIS',
    noradChaser: 30124,
    missDistanceKm: 2.85,
    radialMissKm: 0.45,
    collisionProbability: '8.12E-07',
    tcaUtc: '2026-08-27 11:02:40 UTC',
    status: 'SAFE PASS',
    statusColor: 'var(--status-active)',
  },
  {
    id: 'conj-04',
    primaryAsset: 'OCEANSAT-3 (EOS-06)',
    noradPrimary: 54361,
    chaserObject: 'PSLV-C45 DEBRIS',
    noradChaser: 44133,
    missDistanceKm: 3.12,
    radialMissKm: 0.52,
    collisionProbability: '4.91E-07',
    tcaUtc: '2026-08-27 15:30:15 UTC',
    status: 'SAFE PASS',
    statusColor: 'var(--status-active)',
  },
  {
    id: 'conj-05',
    primaryAsset: 'GSAT-7A',
    noradPrimary: 43864,
    chaserObject: 'TITAN 3C TRANSTAGE DEB',
    noradChaser: 3594,
    missDistanceKm: 4.85,
    radialMissKm: 1.15,
    collisionProbability: '1.05E-08',
    tcaUtc: '2026-08-28 01:12:00 UTC',
    status: 'SAFE PASS',
    statusColor: 'var(--status-active)',
  },
  {
    id: 'conj-06',
    primaryAsset: 'EOS-04 (RISAT-1A)',
    noradPrimary: 51656,
    chaserObject: 'SL-16 R/B DEBRIS',
    noradChaser: 22803,
    missDistanceKm: 1.88,
    radialMissKm: 0.24,
    collisionProbability: '1.24E-05',
    tcaUtc: '2026-08-28 06:28:50 UTC',
    status: 'MONITORED',
    statusColor: 'var(--status-warning)',
  },
]

export default function DebrisAnalysisView() {
  const [selectedPair, setSelectedPair] = useState<ConjunctionPair | null>(CONJUNCTION_SCREENING_DATA[1])
  const [copiedNotification, setCopiedNotification] = useState(false)

  const handleExport = () => {
    playLockSound()
    const csv =
      'PRIMARY_ASSET,NORAD_ID,CHASER_OBJECT,CHASER_NORAD,MISS_KM,COLLISION_PROBABILITY,TCA_UTC,STATUS\n' +
      CONJUNCTION_SCREENING_DATA.map(
        (c) =>
          `"${c.primaryAsset}",${c.noradPrimary},"${c.chaserObject}",${c.noradChaser},${c.missDistanceKm},${c.collisionProbability},"${c.tcaUtc}","${c.status}"`
      ).join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ISRO_DSSAM_CONJUNCTION_REPORT_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)

    setCopiedNotification(true)
    setTimeout(() => setCopiedNotification(false), 3000)
  }

  return (
    <div className="debris-view">
      {/* Top Telemetry Header Summary */}
      <div className="debris-view__header">
        <div className="debris-view__title-group">
          <span className="debris-view__kicker hud-text">
            ISRO DSSAM // BHARAT SPACE SITUATIONAL AWARENESS DIRECTORY
          </span>
          <h1 className="debris-view__title display">
            ORBITAL DEBRIS CONJUNCTION ASSESSMENT &amp; KESSLER MODELING
          </h1>
          <p className="debris-view__desc">
            The Directorate of Space Situational Awareness and Management (DSSAM) at ISTRAC Bengaluru performs continuous 24×7 multi-sensor orbital screenings to protect active Indian space assets from fragmentation cascades, upper-stage debris, and orbital collisions.
          </p>
        </div>

        <div className="debris-view__stat-strip hud-text">
          <div className="debris-view__stat-card">
            <span className="debris-view__stat-label">CATALOGED OBJECTS</span>
            <span className="debris-view__stat-num" style={{ color: 'var(--accent-orange)' }}>
              72,419+
            </span>
            <span className="debris-view__stat-sub">RADAR &amp; OPTICAL TRACKED</span>
          </div>

          <div className="debris-view__stat-card">
            <span className="debris-view__stat-label">DAILY SGP4 SCREENINGS</span>
            <span className="debris-view__stat-num" style={{ color: 'var(--accent-cyan)' }}>
              1,482
            </span>
            <span className="debris-view__stat-sub">AUTOMATED MISS-DISTANCE</span>
          </div>

          <div className="debris-view__stat-card">
            <span className="debris-view__stat-label">CAM EXECUTED (12M)</span>
            <span className="debris-view__stat-num" style={{ color: 'var(--status-active)' }}>
              23
            </span>
            <span className="debris-view__stat-sub">COLLISION AVOIDANCE BURNS</span>
          </div>

          <div className="debris-view__stat-card">
            <span className="debris-view__stat-label">MANEUVER THRESHOLD</span>
            <span className="debris-view__stat-num" style={{ color: 'var(--status-warning)' }}>
              Pc &gt; 1E-04
            </span>
            <span className="debris-view__stat-sub">OR MISS-DIST &lt; 1.0 KM</span>
          </div>
        </div>
      </div>

      {/* Real-time Conjunction Screening Table (Government Level) */}
      <section className="debris-screening-section">
        <div className="debris-screening-section__head">
          <div>
            <span className="hud-text kicker">REAL-TIME SGP4 HIGH-RISK CONJUNCTIONS</span>
            <h2 className="display" style={{ fontSize: '18px', margin: '4px 0 0' }}>
              ACTIVE CLOSE APPROACH SCREENING MATRIX (NEXT 48 HOURS)
            </h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {copiedNotification && (
              <span className="hud-text" style={{ color: 'var(--status-active)', fontSize: '9px' }}>
                ✓ REPORT DOWNLOADED
              </span>
            )}
            <button
              className="btn-secondary hud-text"
              style={{ padding: '6px 14px', fontSize: '9px' }}
              onClick={handleExport}
            >
              📥 EXPORT CONJUNCTION REPORT (.CSV)
            </button>
          </div>
        </div>

        <div className="debris-table-wrap">
          <table className="catalog-table">
            <thead>
              <tr className="hud-text">
                <th>STATUS</th>
                <th>PRIMARY ASSET</th>
                <th>CHASER DEBRIS FRAGMENT</th>
                <th className="catalog-table__num">TOTAL MISS (KM)</th>
                <th className="catalog-table__num">RADIAL MISS (KM)</th>
                <th className="catalog-table__num">COLLISION PROB (Pc)</th>
                <th>TIME OF CLOSEST APPROACH (TCA)</th>
                <th style={{ textAlign: 'right' }}>PROTOCOL</th>
              </tr>
            </thead>
            <tbody>
              {CONJUNCTION_SCREENING_DATA.map((conj) => {
                const isSelected = selectedPair?.id === conj.id
                return (
                  <tr
                    key={conj.id}
                    className={`catalog-table__row ${isSelected ? 'catalog-table__row--selected' : ''}`}
                    onClick={() => {
                      playBlip(1100, 0.02)
                      setSelectedPair(conj)
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>
                      <span
                        className="hud-text"
                        style={{
                          fontSize: '8.5px',
                          color: conj.statusColor,
                          padding: '2px 6px',
                          border: `1px solid ${conj.statusColor}`,
                          background: 'rgba(0,0,0,0.5)',
                        }}
                      >
                        {conj.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 700, color: '#fff' }}>{conj.primaryAsset}</span>
                        <span className="hud-text hud__faint" style={{ fontSize: '8px' }}>
                          NORAD {conj.noradPrimary}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ color: '#ff6b6b' }}>{conj.chaserObject}</span>
                        <span className="hud-text hud__faint" style={{ fontSize: '8px' }}>
                          CAT ID: {conj.noradChaser}
                        </span>
                      </div>
                    </td>
                    <td className="catalog-table__num hud-text">
                      <span style={{ color: conj.missDistanceKm < 1.0 ? 'var(--accent-orange)' : 'inherit' }}>
                        {conj.missDistanceKm.toFixed(2)} km
                      </span>
                    </td>
                    <td className="catalog-table__num hud-text">{conj.radialMissKm.toFixed(2)} km</td>
                    <td className="catalog-table__num hud-text">
                      <span
                        style={{
                          color:
                            conj.collisionProbability.includes('E-04') || conj.collisionProbability.includes('E-05')
                              ? 'var(--accent-orange)'
                              : 'inherit',
                          fontWeight: conj.collisionProbability.includes('E-04') ? 700 : 400,
                        }}
                      >
                        {conj.collisionProbability}
                      </span>
                    </td>
                    <td className="hud-text" style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>
                      {conj.tcaUtc}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="catalog-table__inspect-btn u-link hud-text"
                        onClick={(e) => {
                          e.stopPropagation()
                          playLockSound()
                          setSelectedPair(conj)
                        }}
                      >
                        ANALYZE ↗
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Selected Conjunction Action Breakdown */}
        {selectedPair && (
          <div className="debris-detail-card hud-text">
            <div className="debris-detail-card__header">
              <span style={{ color: 'var(--accent-cyan)' }}>
                ◆ CONJUNCTION INCIDENT BRIEF: {selectedPair.primaryAsset} vs {selectedPair.chaserObject}
              </span>
              <span style={{ color: selectedPair.statusColor }}>{selectedPair.status}</span>
            </div>
            <div className="debris-detail-card__grid">
              <div>
                <span className="hud__faint">COLLISION THRESHOLD:</span>{' '}
                {selectedPair.missDistanceKm < 1.0
                  ? 'CRITICAL (< 1.0 KM) — AUTOMATED AVOIDANCE BURN TRIGGERED'
                  : 'MONITORED — SGP4 RE-PROPAGATION SCHEDULED EVERY 60 MIN'}
              </div>
              <div>
                <span className="hud__faint">PRIMARY SENSOR:</span> ISTRAC BENGALURU X-BAND RADAR &amp; MOUNT ABU OPTICAL
              </div>
              <div>
                <span className="hud__faint">PROPULSION STATUS:</span> CHEMICAL HYDRAZINE MONOPROPELLANT BUS READY
              </div>
              <div>
                <span className="hud__faint">DIRECTORATE ACTION:</span>{' '}
                {selectedPair.status === 'CAM PLANNED'
                  ? 'GO FOR 12-SECOND PROGRADE DELTA-V BURN AT TCA -4H'
                  : 'CONTINUE MULTI-RADAR TRACKING PASSES'}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ISRO 4-Stage Collision Avoidance Protocol SOP */}
      <section className="debris-protocol-section">
        <div className="debris-screening-section__head">
          <div>
            <span className="hud-text kicker">OPERATIONAL STANDARD OPERATING PROCEDURE (SOP)</span>
            <h2 className="display" style={{ fontSize: '18px', margin: '4px 0 0' }}>
              ISRO COLLISION AVOIDANCE MANEUVER (CAM) DECISION WORKFLOW
            </h2>
          </div>
        </div>

        <div className="debris-protocol-grid">
          <div className="debris-protocol-card">
            <div className="debris-protocol-step hud-text">STAGE 01 // TCA -72H</div>
            <h3 className="debris-protocol-title">Automated Conjunction Screening</h3>
            <p className="debris-protocol-desc">
              DSSAM supercomputers screen all operational Indian satellites against the 72,000+ object space catalog every 6 hours using SGP4 analytical and numerical propagators.
            </p>
          </div>

          <div className="debris-protocol-card">
            <div className="debris-protocol-step hud-text">STAGE 02 // TCA -48H</div>
            <h3 className="debris-protocol-title">Sensor Radar Vector Refinement</h3>
            <p className="debris-protocol-desc">
              Multi-object tracking radars (MOTR) at Sriharikota and optical observatories at Ponmudi and Mount Abu schedule dedicated ground passes to refine orbital state covariance.
            </p>
          </div>

          <div className="debris-protocol-card">
            <div className="debris-protocol-step hud-text">STAGE 03 // TCA -24H</div>
            <h3 className="debris-protocol-title">Directorate CAM Authorization</h3>
            <p className="debris-protocol-desc">
              If collision probability $P_c &gt; 1 \times 10^{-4}$ or miss distance &lt; 1.0 km, the Mission Director authorizes orbital shift. Delta-V maneuver vector is computed.
            </p>
          </div>

          <div className="debris-protocol-card">
            <div className="debris-protocol-step hud-text">STAGE 04 // TCA -12H</div>
            <h3 className="debris-protocol-title">Delta-V Thruster Execution</h3>
            <p className="debris-protocol-desc">
              Onboard thruster burn executed via ISTRAC command uplink. Post-burn ephemeris is published to global registries (Space-Track &amp; UN OOSA) to confirm safe orbital clearance.
            </p>
          </div>
        </div>
      </section>

      {/* Main Chart Section */}
      <div className="debris-view__content">
        <DebrisGrowthChart />
        <MissionStats />
      </div>
    </div>
  )
}
