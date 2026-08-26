import { useEffect, useRef, useState } from 'react'

import { isSoundEnabled, toggleSound } from '../utils/audio'

const istFormatter = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

const PROGRESS_PERIOD_S = 90

export default function HUDOverlay() {
  const [time, setTime] = useState(() => istFormatter.format(new Date()))
  const [cycle, setCycle] = useState(2485)
  const [progress, setProgress] = useState(0)
  const [statusWord, setStatusWord] = useState<'NOMINAL' | 'ACTIVE'>('NOMINAL')
  const [loaded, setLoaded] = useState(false)
  const [soundActive, setSoundActive] = useState(() => isSoundEnabled())
  const statusRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const clock = setInterval(() => setTime(istFormatter.format(new Date())), 1000)
    const cycles = setInterval(() => setCycle((c) => c + 1), 8000)
    const t0 = Date.now()
    const prog = setInterval(
      () => setProgress(((Date.now() - t0) / (PROGRESS_PERIOD_S * 1000)) % 1),
      500,
    )
    const loadedTimer = setTimeout(() => setLoaded(true), 1600)
    return () => {
      clearInterval(clock)
      clearInterval(cycles)
      clearInterval(prog)
      clearTimeout(loadedTimer)
    }
  }, [])

  // Status word crossfade every ~15s
  useEffect(() => {
    let alive = true
    let timeout: ReturnType<typeof setTimeout>
    let anim: ReturnType<typeof import('animejs').animate> | undefined
    import('animejs').then(({ animate }) => {
      if (!alive) return
      ;(function swap() {
        if (!alive) return
        timeout = setTimeout(() => {
          setStatusWord((w) => (w === 'NOMINAL' ? 'ACTIVE' : 'NOMINAL'))
          if (statusRef.current) {
            anim?.pause()
            anim = animate(statusRef.current, {
              opacity: [0, 1],
              duration: 300,
              ease: 'inOutQuad',
            })
          }
          swap()
        }, 15000)
      })()
    })
    return () => {
      alive = false
      clearTimeout(timeout)
      anim?.pause()
    }
  }, [])

  const pct = Math.round(progress * 100)

  return (
    <>
      <header className="hud hud--top hud-text">
        <div className="hud__block">
          <div className="hud__stack">
            <span>
              <span className="hud__brand">
                NETRA <em>—</em> SPACE DEBRIS TRACKING
              </span>{' '}
              <span className="hud__sep">|</span> <span className="hud__dim">M-4</span>
            </span>
            <span className="hud__faint">
              CYCLE • <span style={{ color: 'var(--accent-orange)' }}>{cycle}</span>
              <span className="hud__sep"> • </span>TIME • {time} IST
            </span>
          </div>
        </div>

        <div className="hud__block hud__center" aria-hidden="true">
          <span style={{ color: 'var(--accent-orange)', fontWeight: 700 }}>◆</span>
          <span className="hud__brand">NETRA / नेत्रा &bull; ISRO DSSAM</span>
        </div>

        <nav className="hud__block hud__links" aria-label="Primary">
          <button
            className="u-link"
            onClick={() => setSoundActive(toggleSound())}
            style={{
              background: 'none',
              border: 'none',
              font: 'inherit',
              color: soundActive ? 'var(--accent-orange)' : 'var(--text-tertiary)',
              cursor: 'pointer',
              padding: 0,
            }}
            title="Toggle Web Audio tactical synthesized sounds"
          >
            {soundActive ? '🔊 AUDIO: ACTIVE' : '🔈 AUDIO: MUTED'}
          </button>
          <span className="hud__sep">/</span>
          <a className="u-link" href="#program">SUPPORT NETRA</a>
          <span className="hud__sep">/</span>
          <a className="u-link" href="#program">JOIN THE MISSION</a>
        </nav>
      </header>

      <footer className="hud hud--bottom hud-text">
        <div className="hud__block">
          <span className="hud__dot" aria-hidden="true" />
          <span>DEBRIS MONITORING: ACTIVE</span>
        </div>

        <div className="hud__block hud__center hud__faint">
          {loaded ? (
            <>TRACKING 1,247 OBJECTS • LIVE TELEMETRY</>
          ) : (
            <>LOADING MISSION DATA…</>
          )}
        </div>

        <div className="hud__block">
          <span className="hud__faint">ALL SYSTEMS:</span>
          <span ref={statusRef} style={{ color: 'var(--status-active)' }}>
            {statusWord}
          </span>
          <div className="hud__progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <div className="hud__progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <span className="hud__faint">{pct}%</span>
        </div>
      </footer>
    </>
  )
}
