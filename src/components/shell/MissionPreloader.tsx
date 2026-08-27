import { useEffect, useState, useRef } from 'react'
import { playBlip, playLockSound } from '../../utils/audio'

interface MissionPreloaderProps {
  onComplete?: () => void
}

const BOOT_LOGS = [
  'INITIALIZING HARDWARE-ACCELERATED SPATIAL MATRIX...',
  'PRE-CACHING EARTH HIGH-RES TEXTURE MAPS & CORONA...',
  'PROPAGATING SGP4 ORBITAL STATE VECTORS...',
  'CONNECTING ISTRAC BENGALURU GROUND TELEMETRY BEACON...',
  'CALIBRATING CONJUNCTION SENSORS & KESSLER MODELS...',
  'ISRO DSSAM SURVEILLANCE GRID READY.',
]

export default function MissionPreloader({ onComplete }: MissionPreloaderProps) {
  const [progress, setProgress] = useState(0)
  const [currentLogIndex, setCurrentLogIndex] = useState(0)
  const [isExiting, setIsExiting] = useState(false)
  const [isDone, setIsDone] = useState(false)
  const [deviceLabel, setDeviceLabel] = useState('DESKTOP • WEBGL2')
  const progressTargetRef = useRef(15)
  const hasFinishedRef = useRef(false)

  // Detect device profile
  useEffect(() => {
    const isTouch = window.matchMedia('(pointer: coarse)').matches
    const isSmall = window.innerWidth <= 768
    if (isSmall) {
      setDeviceLabel('MOBILE NODE • WEBGL OPTIMIZED')
    } else if (isTouch) {
      setDeviceLabel('TABLET NODE • TOUCH SENSORS ACTIVE')
    } else {
      setDeviceLabel('WORKSTATION • 3D SPATIAL ACCELERATION')
    }
  }, [])

  // Asset preloader pipeline
  useEffect(() => {
    const base = import.meta.env.BASE_URL || '/'
    const assetsToLoad = [
      `${base}textures/earth-day.jpg`,
      `${base}textures/earth-normal.jpg`,
      `${base}textures/earth-specular.jpg`,
      `${base}textures/earth-clouds.png`,
      `${base}earth_orbit_cinematic.jpg`,
    ]

    let loadedCount = 0
    const totalAssets = assetsToLoad.length + 1 // +1 for fonts

    const updateTarget = () => {
      loadedCount++
      const pct = Math.round((loadedCount / totalAssets) * 90)
      progressTargetRef.current = Math.max(progressTargetRef.current, pct)
    }

    // 1. Preload images
    assetsToLoad.forEach((src) => {
      const img = new Image()
      img.onload = updateTarget
      img.onerror = updateTarget // don't block on error
      img.src = src
    })

    // 2. Wait for web fonts
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(updateTarget).catch(updateTarget)
    } else {
      updateTarget()
    }

    // 3. Fallback safety timer: ensures preloader never hangs indefinitely
    const safetyTimeout = setTimeout(() => {
      progressTargetRef.current = 100
    }, 3800)

    return () => clearTimeout(safetyTimeout)
  }, [])

  // Smooth progress animation loop
  useEffect(() => {
    let rafId: number

    const tick = () => {
      setProgress((prev) => {
        const target = progressTargetRef.current
        if (prev < target) {
          const step = Math.max(0.5, (target - prev) * 0.12)
          const next = Math.min(100, prev + step)
          return next
        }
        return prev
      })
      rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [])

  // Advance logs based on progress thresholds
  useEffect(() => {
    if (progress < 25) setCurrentLogIndex(0)
    else if (progress < 45) setCurrentLogIndex(1)
    else if (progress < 68) setCurrentLogIndex(2)
    else if (progress < 85) setCurrentLogIndex(3)
    else if (progress < 98) setCurrentLogIndex(4)
    else setCurrentLogIndex(5)

    if (progress >= 100 && !hasFinishedRef.current) {
      hasFinishedRef.current = true
      playLockSound()
      const timer = setTimeout(() => {
        setIsExiting(true)
        const exitTimer = setTimeout(() => {
          setIsDone(true)
          onComplete?.()
        }, 550)
        return () => clearTimeout(exitTimer)
      }, 350)
      return () => clearTimeout(timer)
    }
  }, [progress, onComplete])

  const handleSkip = () => {
    if (hasFinishedRef.current) return
    hasFinishedRef.current = true
    playBlip(1400, 0.05)
    progressTargetRef.current = 100
    setProgress(100)
    setIsExiting(true)
    setTimeout(() => {
      setIsDone(true)
      onComplete?.()
    }, 300)
  }

  if (isDone) return null

  const displayPercent = Math.min(100, Math.floor(progress))

  return (
    <div
      className={`mission-preloader ${isExiting ? 'mission-preloader--exiting' : ''}`}
      role="status"
      aria-live="polite"
      aria-label="ISRO NETRA Mission Control System Boot"
    >
      {/* Background Matrix Grid */}
      <div className="mission-preloader__grid" />
      <div className="mission-preloader__vignette" />

      {/* Center Tactical Radar & Status Frame */}
      <div className="mission-preloader__content">
        {/* Holographic Radar Scanner */}
        <div className="mission-preloader__radar">
          <div className="mission-preloader__radar-ring mission-preloader__radar-ring--1" />
          <div className="mission-preloader__radar-ring mission-preloader__radar-ring--2" />
          <div className="mission-preloader__radar-ring mission-preloader__radar-ring--3" />
          <div className="mission-preloader__radar-crosshair-x" />
          <div className="mission-preloader__radar-crosshair-y" />
          <div className="mission-preloader__radar-sweep" />

          {/* Center ISRO / NETRA Glyph */}
          <div className="mission-preloader__center-glyph">
            <span className="mission-preloader__diamond">◆</span>
            <span className="mission-preloader__center-tag hud-text">NETRA</span>
          </div>

          {/* Simulated Satellite Nodes Orbiting in Radar */}
          <div className="mission-preloader__node mission-preloader__node--leo" title="LEO 500km" />
          <div className="mission-preloader__node mission-preloader__node--geo" title="GEO 36,000km" />
          <div className="mission-preloader__node mission-preloader__node--deb" title="DEBRIS" />
        </div>

        {/* Brand & Mandate Title */}
        <div className="mission-preloader__identity">
          <div className="mission-preloader__top-badge hud-text">
            <span className="mission-preloader__pulse-dot" />
            <span>DSSAM / ISTRAC BENGALURU • MISSION BOOT</span>
          </div>
          <h1 className="mission-preloader__title">
            NETRA <span className="mission-preloader__hindi">// नेत्रा</span>
          </h1>
          <p className="mission-preloader__subtitle hud-text">
            BHARAT SPACE SITUATIONAL AWARENESS DIRECTORY
          </p>
        </div>

        {/* Progress Bar & Percentage */}
        <div className="mission-preloader__progress-section">
          <div className="mission-preloader__progress-header hud-text">
            <span className="mission-preloader__status-label">
              {progress >= 100 ? 'SYSTEM INITIALIZED' : 'LOADING MISSION ASSETS...'}
            </span>
            <span className="mission-preloader__pct">{displayPercent}%</span>
          </div>

          <div className="mission-preloader__bar-track">
            <div
              className="mission-preloader__bar-fill"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Terminal Boot Log */}
          <div className="mission-preloader__log-box hud-text">
            <span className="mission-preloader__log-prefix">&gt;</span>
            <span className="mission-preloader__log-text">{BOOT_LOGS[currentLogIndex]}</span>
          </div>
        </div>

        {/* Hardware & Quick Actions Footer */}
        <div className="mission-preloader__footer hud-text">
          <span className="mission-preloader__device-pill">{deviceLabel}</span>
          <button
            type="button"
            className="mission-preloader__skip-btn u-link"
            onClick={handleSkip}
            title="Bypass preloader and enter console immediately"
          >
            FAST ENTER ↗
          </button>
        </div>
      </div>
    </div>
  )
}
