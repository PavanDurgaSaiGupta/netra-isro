import { useEffect, useRef, useState } from 'react'

export default function TacticalCursor() {
  const cursorRef = useRef<HTMLDivElement>(null)
  const coordsRef = useRef<HTMLSpanElement>(null)
  const lockBadgeRef = useRef<HTMLSpanElement>(null)
  const [isTouchDevice] = useState(
    () =>
      typeof window !== 'undefined' &&
      (window.matchMedia('(pointer: coarse), (hover: none)').matches || 'ontouchstart' in window),
  )

  useEffect(() => {
    if (isTouchDevice) return

    const cursor = cursorRef.current
    const coordsEl = coordsRef.current
    const lockEl = lockBadgeRef.current
    if (!cursor) return

    let mouseX = window.innerWidth / 2
    let mouseY = window.innerHeight / 2
    let curX = mouseX
    let curY = mouseY
    let rafId: number
    let isVisible = false
    let isLocked = false

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX
      mouseY = e.clientY

      if (!isVisible) {
        isVisible = true
        cursor.classList.add('tactical-cursor--visible')
      }

      // Update virtual azimuth/elevation directly in DOM (zero React re-renders)
      if (coordsEl) {
        const az = Math.round(((e.clientX / window.innerWidth) * 360) % 360)
        const el = Math.round(90 - (e.clientY / window.innerHeight) * 90)
        coordsEl.textContent = `AZ:${String(az).padStart(3, '0')}° EL:${String(el).padStart(2, '0')}°`
      }

      const target = e.target as HTMLElement | null
      const isInput = target?.closest('input, textarea, .tracking-view__search-wrapper, .search-results-panel')
      if (isInput) {
        if (isVisible) {
          isVisible = false
          cursor.classList.remove('tactical-cursor--visible')
        }
        return
      }

      // Check if hovering interactive target
      const interactive = target?.closest(
        'button, a, .scene-label, .telemetry__row, .stat-row, .chart__milestone, [role="button"]',
      )
      if (interactive) {
        if (!isLocked) {
          isLocked = true
          cursor.classList.add('tactical-cursor--locked')
          const text = interactive.getAttribute('aria-label') || interactive.textContent?.trim().slice(0, 18) || 'TARGET'
          if (lockEl) {
            lockEl.textContent = `LOCK: ${text}`
            lockEl.style.display = 'inline'
          }
        }
      } else if (isLocked) {
        isLocked = false
        cursor.classList.remove('tactical-cursor--locked')
        if (lockEl) lockEl.style.display = 'none'
      }
    }

    const handleMouseLeave = () => {
      isVisible = false
      cursor.classList.remove('tactical-cursor--visible')
    }

    const handleMouseEnter = () => {
      isVisible = true
      cursor.classList.add('tactical-cursor--visible')
    }

    const tick = () => {
      // Smooth interpolation for trailing reticle brackets
      curX += (mouseX - curX) * 0.4
      curY += (mouseY - curY) * 0.4
      cursor.style.transform = `translate3d(${curX}px, ${curY}px, 0)`
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
  }, [isTouchDevice])

  if (isTouchDevice) return null

  return (
    <div ref={cursorRef} className="tactical-cursor" aria-hidden="true">
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
        <span className="tactical-cursor__az-el" ref={coordsRef}>
          AZ:000° EL:00°
        </span>
        <span className="tactical-cursor__lock-badge" ref={lockBadgeRef} style={{ display: 'none' }}>
          LOCK: ACQUIRED
        </span>
      </div>
    </div>
  )
}
