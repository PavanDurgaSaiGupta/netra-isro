import { useRef } from 'react'
import { useSatellites } from '../../context/SatelliteContext'
import { formatIST } from '../../services/satelliteData'

/**
 * Bottom-of-cockpit mission dateline (item 8). The tape is a ±10 min viewport
 * that slides WITH sim time: the NOW marker is fixed at centre and every alert
 * tick sits at `alert time − sim time`, so the tape streams leftward as the
 * mission clock runs and scrubbing drags it. Scrubbing goes through the context
 * API only (scrubTime / goLive) — no local time state, no per-frame setState.
 */

/** Half-window of the tape: each side shows 10 minutes around sim now. */
const WINDOW_TOTAL_MS = 20 * 60000
/** Slider (aria) range — wider than the visible tape; the tape is a viewport. */
const SCRUB_RANGE_MS = 30 * 60000
/** IST is UTC+05:30. */
const IST_OFFSET_MS = 5.5 * 3600000
const DAY_MS = 86400000

const TICK_SEVERITY_COLOR: Record<string, string> = {
  nominal: 'var(--accent-cyan)',
  warning: 'var(--status-warning)',
  alert: 'var(--status-critical)',
}

/** 'HH:MM:SS' (IST wall clock) → ms-of-day delta from sim time, midnight-wrapped. */
function alertDeltaMs(timestamp: string, simMsOfDay: number): number {
  const m = /^(\d{1,2}):(\d{2}):(\d{2})$/.exec(timestamp.trim())
  if (!m) return Number.NaN
  const ms = (Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3])) * 1000
  let delta = ms - simMsOfDay
  if (delta < -DAY_MS / 2) delta += DAY_MS
  else if (delta > DAY_MS / 2) delta -= DAY_MS
  return delta
}

const pad2 = (n: number) => String(n).padStart(2, '0')

function formatOffset(ms: number): string {
  const sign = ms < 0 ? '-' : '+'
  const abs = Math.abs(ms)
  const h = Math.floor(abs / 3600000)
  const m = Math.floor((abs % 3600000) / 60000)
  const s = Math.floor((abs % 60000) / 1000)
  return h > 0 ? `${sign}${h}:${pad2(m)}:${pad2(s)}` : `${sign}${pad2(m)}:${pad2(s)}`
}

/** Distance-from-now gridlines: static marks at ±2.5 / ±5 / ±7.5 min. */
const GRID_OFFSETS_MIN = [-7.5, -5, -2.5, 2.5, 5, 7.5]

export default function LiveDateline() {
  const { simTime, timeOffsetMs, alerts, scrubTime, goLive } = useSatellites()
  const dragRef = useRef<{ lastX: number } | null>(null)

  const clampedOffset = Math.max(-SCRUB_RANGE_MS, Math.min(SCRUB_RANGE_MS, timeOffsetMs))
  const simMsOfDay = (((simTime + IST_OFFSET_MS) % DAY_MS) + DAY_MS) % DAY_MS

  const offsetFromClientX = (clientX: number, el: HTMLElement) => {
    const rect = el.getBoundingClientRect()
    if (rect.width <= 0) return 0
    const frac = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1)
    return (frac - 0.5) * WINDOW_TOTAL_MS
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { lastX: e.clientX }
    // Jump the clock so the tapped instant becomes sim now, then drag from there.
    scrubTime(offsetFromClientX(e.clientX, e.currentTarget))
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return
    const rect = e.currentTarget.getBoundingClientRect()
    if (rect.width <= 0) return
    const dx = e.clientX - dragRef.current.lastX
    dragRef.current.lastX = e.clientX
    // Tape follows the pointer: dragging right rewinds, dragging left fast-forwards.
    scrubTime(-(dx / rect.width) * WINDOW_TOTAL_MS)
  }

  const endDrag = () => {
    dragRef.current = null
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const stepMin = e.shiftKey ? 10 : 1
    switch (e.key) {
      case 'ArrowLeft':
      case 'ArrowDown':
        e.preventDefault()
        scrubTime(-stepMin * 60000)
        break
      case 'ArrowRight':
      case 'ArrowUp':
        e.preventDefault()
        scrubTime(stepMin * 60000)
        break
      case 'PageDown':
        e.preventDefault()
        scrubTime(-10 * 60000)
        break
      case 'PageUp':
        e.preventDefault()
        scrubTime(10 * 60000)
        break
      case 'Home':
        e.preventDefault()
        goLive()
        break
      case 'End':
        e.preventDefault()
        scrubTime(30 * 60000)
        break
      default:
        break
    }
  }

  const pct = (deltaMs: number) =>
    `${50 + (deltaMs / WINDOW_TOTAL_MS) * 100}%`

  return (
    <div
      role="group"
      aria-label="Mission dateline"
      className="hud-text"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        padding: '6px 16px 13px',
        background: 'rgba(5, 7, 10, 0.88)',
        borderTop: '1px solid var(--line-hairline)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <span className="hud__faint" style={{ flex: 'none', fontSize: 9 }}>
        MISSION DATELINE
      </span>

      {/* Scrub track — slider semantics; pointer drag + full keyboard control */}
      <div
        role="slider"
        aria-label="Scrub mission time along the dateline"
        aria-orientation="horizontal"
        aria-valuemin={-SCRUB_RANGE_MS / 1000}
        aria-valuemax={SCRUB_RANGE_MS / 1000}
        aria-valuenow={Math.round(clampedOffset / 1000)}
        aria-valuetext={`${formatOffset(timeOffsetMs)} from live, sim time ${formatIST(new Date(simTime))} IST`}
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onLostPointerCapture={endDrag}
        onKeyDown={handleKeyDown}
        style={{
          position: 'relative',
          flex: '1 1 auto',
          height: 26,
          cursor: 'ew-resize',
          touchAction: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
      >
        {/* Baseline */}
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: '50%',
            height: 1,
            background: 'var(--line-hairline-strong)',
          }}
        />

        {/* Distance-from-now gridlines (static — the tape slides under NOW) */}
        {GRID_OFFSETS_MIN.map((min) => (
          <span
            key={min}
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: pct(min * 60000),
              top: '50%',
              width: 1,
              height: 8,
              transform: 'translate(-50%, -50%)',
              background: 'var(--line-hairline)',
            }}
          />
        ))}
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: pct(-5 * 60000),
            top: 'calc(50% + 7px)',
            transform: 'translateX(-50%)',
            fontSize: 7,
            color: 'var(--text-tertiary)',
          }}
        >
          -5m
        </span>
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: pct(5 * 60000),
            top: 'calc(50% + 7px)',
            transform: 'translateX(-50%)',
            fontSize: 7,
            color: 'var(--text-tertiary)',
          }}
        >
          +5m
        </span>

        {/* One tick per alert, positioned relative to sim time */}
        {alerts.map((item) => {
          const delta = alertDeltaMs(item.timestamp, simMsOfDay)
          if (!Number.isFinite(delta) || Math.abs(delta) > WINDOW_TOTAL_MS / 2) return null
          const color = TICK_SEVERITY_COLOR[item.severity] ?? 'var(--accent-cyan)'
          return (
            <span
              key={item.id}
              role="presentation"
              title={`[${item.timestamp}] ${item.code} — ${item.message}`}
              style={{
                position: 'absolute',
                left: pct(delta),
                top: '50%',
                width: 2,
                height: item.severity === 'nominal' ? 10 : 14,
                transform: 'translate(-50%, -50%)',
                background: color,
                boxShadow: `0 0 6px ${color}`,
              }}
            />
          )
        })}

        {/* NOW marker — fixed at centre; the tape moves around it */}
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: '50%',
            top: 0,
            bottom: 0,
            width: 2,
            transform: 'translateX(-50%)',
            background: 'var(--accent-cyan)',
            boxShadow: 'var(--glow-cyan)',
          }}
        />
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: '50%',
            top: 'calc(50% + 7px)',
            transform: 'translateX(-50%)',
            fontSize: 7,
            fontWeight: 700,
            color: 'var(--accent-cyan)',
          }}
        >
          NOW
        </span>
      </div>

      {/* Sim-time readout */}
      <span
        style={{
          flex: 'none',
          display: 'inline-flex',
          alignItems: 'baseline',
          gap: 6,
          fontSize: 10,
        }}
      >
        <span className="hud__faint">SIM</span>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            color: 'var(--accent-cyan)',
            textShadow: '0 0 12px rgba(0, 240, 255, 0.35)',
          }}
        >
          {formatIST(new Date(simTime))}
        </span>
        <span className="hud__faint">IST</span>
      </span>
    </div>
  )
}
