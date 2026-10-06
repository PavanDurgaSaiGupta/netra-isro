import { useSatellites } from '../../context/SatelliteContext'
import OdometerNumber from '../shell/OdometerNumber'
import { formatIST } from '../../services/satelliteData'

/** Scrub step of the ±1m buttons (±10m buttons use 10× this). */
const SCRUB_STEP_MS = 60000
/** |offset| under which (with rate 1) the mission clock still counts as LIVE. */
const LIVE_TOLERANCE_MS = 2500

const RATE_STEPS = [1, 10, 60] as const

const pad2 = (n: number) => String(n).padStart(2, '0')

/** "OFFSET +mm:ss" readout (hh:mm:ss once the gap passes an hour). */
function formatOffset(ms: number): string {
  const sign = ms < 0 ? '-' : '+'
  const abs = Math.abs(ms)
  const h = Math.floor(abs / 3600000)
  const m = Math.floor((abs % 3600000) / 60000)
  const s = Math.floor((abs % 60000) / 1000)
  return h > 0 ? `${sign}${h}:${pad2(m)}:${pad2(s)}` : `${sign}${pad2(m)}:${pad2(s)}`
}

/**
 * Cockpit mission-time HUD (item 7). Live badge, scrub buttons, pause and rate
 * steps — every control is a real <button> with `aria-pressed` where it toggles,
 * so the whole strip is keyboard operable. The sim clock rolls through
 * OdometerNumber (ref-driven textContent, no per-frame React state, reduced-motion
 * safe); the offset readout renders only while the clock is off the wall clock.
 */
export default function TimeControls() {
  const { simTime, timeRate, timeOffsetMs, setTimeRate, scrubTime, goLive } = useSatellites()

  const isLive = timeRate === 1 && Math.abs(timeOffsetMs) < LIVE_TOLERANCE_MS
  const paused = timeRate === 0

  return (
    <div
      role="group"
      aria-label="Mission time controls"
      className="hud-text"
      style={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 6,
        padding: '6px 10px',
        background: 'rgba(6, 10, 16, 0.9)',
        border: '1px solid var(--line-hairline-strong)',
        borderRadius: 'var(--radius-panel)',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.7)',
        whiteSpace: 'nowrap',
      }}
    >
      {/* LIVE badge — green when rate 1 & offset ≈ 0; click snaps the clock back live */}
      <button
        type="button"
        className={`tracking-view__pill ${isLive ? 'tracking-view__pill--active' : ''}`}
        aria-pressed={isLive}
        onClick={goLive}
        title={isLive ? 'Mission clock is live' : 'Snap mission clock back to live (offset 0, rate 1×)'}
      >
        <span
          aria-hidden="true"
          style={{
            display: 'inline-block',
            width: 6,
            height: 6,
            borderRadius: '50%',
            marginRight: 5,
            background: isLive ? 'var(--status-active)' : 'var(--status-warning)',
            boxShadow: isLive
              ? '0 0 8px var(--status-active)'
              : '0 0 8px var(--status-warning)',
            verticalAlign: 'middle',
          }}
        />
        {isLive ? 'LIVE' : 'GO LIVE'}
      </button>

      {/* Scrub the mission clock */}
      <button
        type="button"
        className="tracking-view__pill"
        onClick={() => scrubTime(-10 * SCRUB_STEP_MS)}
        title="Rewind mission time 10 minutes"
      >
        -10m
      </button>
      <button
        type="button"
        className="tracking-view__pill"
        onClick={() => scrubTime(-SCRUB_STEP_MS)}
        title="Rewind mission time 1 minute"
      >
        -1m
      </button>
      <button
        type="button"
        className="tracking-view__pill"
        aria-pressed={paused}
        onClick={() => setTimeRate(paused ? 1 : 0)}
        title={paused ? 'Resume mission clock (rate 1×)' : 'Freeze mission clock (rate 0)'}
      >
        {paused ? '▶' : '⏸'}
      </button>
      <button
        type="button"
        className="tracking-view__pill"
        onClick={() => scrubTime(SCRUB_STEP_MS)}
        title="Advance mission time 1 minute"
      >
        +1m
      </button>
      <button
        type="button"
        className="tracking-view__pill"
        onClick={() => scrubTime(10 * SCRUB_STEP_MS)}
        title="Advance mission time 10 minutes"
      >
        +10m
      </button>

      {/* Rate steps */}
      {RATE_STEPS.map((rate) => (
        <button
          key={rate}
          type="button"
          className={`tracking-view__pill ${timeRate === rate ? 'tracking-view__pill--active' : ''}`}
          aria-pressed={timeRate === rate}
          onClick={() => setTimeRate(rate)}
          title={`Propagate at ${rate}× real time`}
        >
          {rate}×
        </button>
      ))}

      {/* Sim-time readout (IST) + offset while off the wall clock */}
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'baseline',
          gap: 6,
          marginLeft: 4,
          paddingLeft: 10,
          borderLeft: '1px solid var(--line-hairline)',
        }}
      >
        <span className="hud__faint">SIM</span>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            color: 'var(--accent-cyan)',
            textShadow: '0 0 12px rgba(0, 240, 255, 0.35)',
          }}
        >
          <OdometerNumber value={simTime} format={(n) => formatIST(new Date(n))} />
        </span>
        <span className="hud__faint">IST</span>
        {!isLive && (
          <span
            style={{
              marginLeft: 4,
              paddingLeft: 8,
              borderLeft: '1px solid var(--line-hairline)',
              color: 'var(--status-warning)',
            }}
          >
            OFFSET {formatOffset(timeOffsetMs)}
          </span>
        )}
      </span>
    </div>
  )
}
