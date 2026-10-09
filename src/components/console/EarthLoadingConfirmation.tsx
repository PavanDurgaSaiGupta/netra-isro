import { useEffect, useState } from 'react'
import { detectDeviceProfile } from '../../lib/adaptiveRendering'

interface Props {
  totalSatellites: number
  onConfirm: () => void
  isOpen: boolean
  onClose?: () => void
}

interface DiagnosticItem {
  id: string
  label: string
  sublabel: string
  done: boolean
}

export default function EarthLoadingConfirmation({
  totalSatellites,
  onConfirm,
  isOpen,
  onClose,
}: Props) {
  const [progress, setProgress] = useState(15)
  const [diagnostics, setDiagnostics] = useState<DiagnosticItem[]>(() => {
    const prof = detectDeviceProfile()
    return [
      {
        id: 'uplink',
        label: 'TELEMETRY UPLINK ESTABLISHED',
        sublabel: 'ISTRAC BENGALURU GROUND STATION // X-BAND DUAL-POL',
        done: false,
      },
      {
        id: 'ephemeris',
        label: 'SGP4 ORBITAL MECHANICS PROPAGATION',
        sublabel: `${totalSatellites || 93} ACTIVE SATELLITES & DEBRIS TRACKED`,
        done: false,
      },
      {
        id: 'mesh',
        label: '3D PLANETARY SPHERE COMPILED',
        sublabel: 'WGS-84 OBLATE SPHEROID & ATMOSPHERIC LIMB SHADER',
        done: false,
      },
      {
        id: 'textures',
        label: 'HIGH-RES TOPOGRAPHY SUITE LOADED',
        sublabel: 'DAY MARBLE (2K) + NORMAL + SPECULAR OCEANS + ADDITIVE CLOUDS (100%)',
        done: false,
      },
      {
        id: 'adaptive',
        label: 'AUTO-ADAPTIVE HARDWARE PROFILE APPLIED',
        sublabel: `${prof.label} (DPR: ${prof.dpr[1]}x, ${prof.starCount} STARS, SHADOWS: ${prof.shadows ? 'ON' : 'OFF'})`,
        done: false,
      },
    ]
  })
  const [isReady, setIsReady] = useState(false)
  const [autoSeconds, setAutoSeconds] = useState(3)

  useEffect(() => {
    if (!isOpen) return

    // Simulate crisp progressive verification sequence
    const t1 = setTimeout(() => {
      setProgress(40)
      setDiagnostics((d) => d.map((item, i) => (i <= 1 ? { ...item, done: true } : item)))
    }, 250)

    const t2 = setTimeout(() => {
      setProgress(75)
      setDiagnostics((d) => d.map((item, i) => (i <= 3 ? { ...item, done: true } : item)))
    }, 550)

    const t3 = setTimeout(() => {
      setProgress(100)
      setDiagnostics((d) => d.map((item) => ({ ...item, done: true })))
      setIsReady(true)
    }, 900)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [isOpen])

  // Countdown timer once ready
  useEffect(() => {
    if (!isReady || !isOpen) return
    if (autoSeconds <= 0) {
      onConfirm()
      return
    }
    const timer = setTimeout(() => {
      setAutoSeconds((s) => s - 1)
    }, 1000)
    return () => clearTimeout(timer)
  }, [isReady, isOpen, autoSeconds, onConfirm])

  if (!isOpen) return null

  return (
    <div className="earth-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="earth-confirm-title">
      <div className="earth-confirm-modal__backdrop" onClick={onClose || onConfirm} />

      <div className="earth-confirm-modal__card">
        {/* Decorative corner brackets */}
        <div className="earth-confirm-modal__bracket earth-confirm-modal__bracket--tl" />
        <div className="earth-confirm-modal__bracket earth-confirm-modal__bracket--tr" />
        <div className="earth-confirm-modal__bracket earth-confirm-modal__bracket--bl" />
        <div className="earth-confirm-modal__bracket earth-confirm-modal__bracket--br" />

        {/* Top Header */}
        <div className="earth-confirm-modal__header">
          <div className="earth-confirm-modal__badge-group">
            <span className="earth-confirm-modal__badge hud-text">DSSAM SENSOR GRID</span>
            <span className="earth-confirm-modal__live-dot" />
            <span className="earth-confirm-modal__status-tag hud-text">
              {isReady ? 'ALL SENSORS NOMINAL' : 'INITIALIZING SENSORS...'}
            </span>
          </div>
          {onClose && (
            <button
              type="button"
              className="earth-confirm-modal__close-btn"
              onClick={onClose}
              title="Close Verification HUD"
            >
              ✕
            </button>
          )}
        </div>

        <h2 id="earth-confirm-title" className="earth-confirm-modal__title display">
          3D EARTH VIEW <span className="accent">CONFIRMATION & TELEMETRY</span>
        </h2>
        <p className="earth-confirm-modal__desc">
          Verifying high-resolution planetary textures, SGP4 orbital mechanics, and auto-adaptive WebGL rendering parameters before engaging interactive flight controls.
        </p>

        {/* Progress bar */}
        <div className="earth-confirm-modal__progress-box">
          <div className="earth-confirm-modal__progress-label hud-text">
            <span>DIAGNOSTIC PIPELINE INTEGRITY</span>
            <span className="accent">{progress}%</span>
          </div>
          <div className="earth-confirm-modal__progress-track">
            <div
              className="earth-confirm-modal__progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Diagnostic checklist */}
        <div className="earth-confirm-modal__checklist">
          {diagnostics.map((diag) => (
            <div
              key={diag.id}
              className={`earth-confirm-modal__item ${diag.done ? 'is-done' : ''}`}
            >
              <div className="earth-confirm-modal__check-icon">
                {diag.done ? '✓' : '◌'}
              </div>
              <div className="earth-confirm-modal__item-info">
                <div className="earth-confirm-modal__item-label hud-text">
                  {diag.label}
                </div>
                <div className="earth-confirm-modal__item-sub hud-text">
                  {diag.sublabel}
                </div>
              </div>
              <span className={`earth-confirm-modal__item-state hud-text ${diag.done ? 'is-nominal' : ''}`}>
                {diag.done ? 'ONLINE' : 'POLLING'}
              </span>
            </div>
          ))}
        </div>

        {/* Action Controls */}
        <div className="earth-confirm-modal__actions">
          <button
            type="button"
            className="earth-confirm-modal__btn-primary"
            onClick={onConfirm}
          >
            <span>{isReady ? 'CONFIRM & ENTER 3D COCKPIT ↗' : 'PRE-INITIALIZING...'}</span>
            {isReady && autoSeconds > 0 && (
              <small className="hud-text">AUTO-ENGAGING IN {autoSeconds}S</small>
            )}
          </button>
          <div className="earth-confirm-modal__meta hud-text">
            <span>● 3D HARDWARE ACCELERATED</span>
            <span>• ZERO-LATENCY FRAME PIPELINE</span>
          </div>
        </div>
      </div>
    </div>
  )
}
