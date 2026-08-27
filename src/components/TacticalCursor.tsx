import { useEffect, useRef, useState } from 'react'
import { playBlip } from '../utils/audio'

export default function TacticalCursor() {
  const cursorRef = useRef<HTMLDivElement>(null)
  const [coords, setCoords] = useState({ x: 0, y: 0 })
  const [isLocked, setIsLocked] = useState(false)
  const [targetName, setTargetName] = useState<string | null>(null)
  const [visible, setVisible] = useState(false)
  const [isTouchDevice, setIsTouchDevice] = useState(false)

  useEffect(() => {
    // Detect touch / coarse pointer devices
    const isTouch = window.matchMedia('(pointer: coarse), (hover: none)').matches || 'ontouchstart' in window
    if (isTouch) {
      setIsTouchDevice(true)
      return
    }

    const cursor = cursorRef.current
    if (!cursor) return

    let mouseX = window.innerWidth / 2
    let mouseY = window.innerHeight / 2
    let curX = mouseX
    let curY = mouseY
    let rafId: number

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX
      mouseY = e.clientY
      if (!visible) setVisible(true)

      // Virtual Azimuth/Elevation computation from screen position
      const az = Math.round(((e.clientX / window.innerWidth) * 360) % 360)
      const el = Math.round(90 - (e.clientY / window.innerHeight) * 90)
      setCoords({ x: az, y: el })

      const target = e.target as HTMLElement | null
      const isInput = target?.closest('input, textarea, .tracking-view__search-wrapper, .search-results-panel')
      if (isInput) {
        if (visible) setVisible(false)
        return
      }
      if (!visible) setVisible(true)

      // Check if hovering interactive element
      const interactive = target?.closest('button, a, .scene-label, .telemetry__row, .stat-row, .chart__milestone, [role="button"]')
      if (interactive) {
        if (!isLocked) {
          setIsLocked(true)
          playBlip(1200, 0.03)
          const text = interactive.getAttribute('aria-label') || interactive.textContent?.trim().slice(0, 18) || 'TARGET'
          setTargetName(text)
        }
      } else if (isLocked) {
        setIsLocked(false)
        setTargetName(null)
      }
    }

    const handleMouseLeave = () => setVisible(false)
    const handleMouseEnter = () => setVisible(true)

    const tick = () => {
      // Smooth interpolation for trailing brackets, instant for center dot
      curX += (mouseX - curX) * 0.4
      curY += (mouseY - curY) * 0.4

      if (cursor) {
        cursor.style.transform = `translate3d(${curX}px, ${curY}px, 0)`
      }
      rafId = requestAnimationFrame(tick)
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    document.addEventListener('mouseleave', handleMouseLeave)
    document.addEventListener('mouseenter', handleMouseEnter)
    rafId = requestAnimationFrame(tick)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseleave', handleMouseLeave)
      document.removeEventListener('mouseenter', handleMouseEnter)
      cancelAnimationFrame(rafId)
    }
  }, [isLocked, visible])

  if (isTouchDevice) return null

  return (
    <div
      ref={cursorRef}
      className={`tactical-cursor ${visible ? 'tactical-cursor--visible' : ''} ${
        isLocked ? 'tactical-cursor--locked' : ''
      }`}
      aria-hidden="true"
    >
      {/* Precision Center Aiming Dot */}
      <div className="tactical-cursor__dot" />

      {/* Crosshair Hairlines */}
      <div className="tactical-cursor__crosshair tactical-cursor__crosshair--x" />
      <div className="tactical-cursor__crosshair tactical-cursor__crosshair--y" />

      {/* Target Reticle Brackets */}
      <div className="tactical-cursor__bracket tactical-cursor__bracket--tl" />
      <div className="tactical-cursor__bracket tactical-cursor__bracket--tr" />
      <div className="tactical-cursor__bracket tactical-cursor__bracket--bl" />
      <div className="tactical-cursor__bracket tactical-cursor__bracket--br" />

      {/* Live Coordinate Badge */}
      <div className="tactical-cursor__readout">
        <span className="tactical-cursor__az-el">
          AZ:{String(coords.x).padStart(3, '0')}° EL:{String(coords.y).padStart(2, '0')}°
        </span>
        {isLocked && (
          <span className="tactical-cursor__lock-badge">
            LOCK: {targetName || 'ACQUIRED'}
          </span>
        )}
      </div>
    </div>
  )
}
