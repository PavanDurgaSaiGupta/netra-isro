import { useCallback, useEffect, useRef, useState } from 'react'
import { useSatellites } from '../../context/SatelliteContext'
import { gsap, useGSAP, EASE, DUR, prefersReducedMotion } from '../../lib/motion'

/**
 * Go/No-Go boot poll.
 *
 * Mono log lines type in at 28ms/char, staggered 90ms per line (rAF + refs — zero
 * React state per frame; only six line-completion state flips during the whole poll).
 * Status words color green/amber; the UPLINK line reads the live context status and
 * the TEXTURE line folds real asset loading into the poll (LOADING -> NOMINAL).
 * A 2px progress line fills along the bottom with --ease-standard.
 * When every line is typed and assets are in, the end card reveals a giant Orbitron
 * NETRA with a one-time scanline sweep and the ALL SYSTEMS NOMINAL — ENTER CTA
 * (click, any key, or auto-continue). The whole boot is skippable via any key/click.
 */

interface MissionPreloaderProps {
  onComplete?: () => void
}

interface BootLine {
  label: string
  status: string
  tone: 'ok' | 'warn'
  kind: 'static' | 'uplink' | 'texture'
}

const BOOT_LINES: BootLine[] = [
  { label: 'GUIDANCE', status: 'NOMINAL', tone: 'ok', kind: 'static' },
  { label: 'PROPAGATION (SGP4)', status: 'NOMINAL', tone: 'ok', kind: 'static' },
  { label: 'UPLINK (CELESTRAK)', status: 'LIVE', tone: 'ok', kind: 'uplink' },
  { label: 'TEXTURE ASSETS', status: 'NOMINAL', tone: 'ok', kind: 'texture' },
  { label: 'INSTRUMENT GRID', status: 'NOMINAL', tone: 'ok', kind: 'static' },
  { label: 'DSSAM CORE', status: 'ARMED', tone: 'warn', kind: 'static' },
]

const TYPE_MS_PER_CHAR = 28
const LINE_STAGGER_MS = 90
const AUTO_CONTINUE_MS = 2600
const ASSET_SAFETY_TIMEOUT_MS = 3800

/** Dot-leader text typed before the status word, e.g. "GUIDANCE ............. ". */
function bootLineText(label: string): string {
  return `${(label + ' ').padEnd(22, '.')} `
}

interface StatusWord {
  text: string
  tone: 'ok' | 'warn'
}

export default function MissionPreloader({ onComplete }: MissionPreloaderProps) {
  const { apiStatus } = useSatellites()
  const [typedCount, setTypedCount] = useState(0)
  const [assetsReady, setAssetsReady] = useState(false)
  const [gone, setGone] = useState(false)

  const pollComplete = typedCount >= BOOT_LINES.length && assetsReady
  const bootRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const brandRef = useRef<HTMLDivElement>(null)
  const scanlineRef = useRef<HTMLSpanElement>(null)
  const ctaRef = useRef<HTMLButtonElement>(null)
  const lineTextRefs = useRef<Array<HTMLSpanElement | null>>([])
  const finishedRef = useRef(false)
  const soundPlayedRef = useRef(false)
  const progressShownRef = useRef(0.02)

  const enter = useCallback(() => {
    if (finishedRef.current) return
    finishedRef.current = true
    const root = bootRef.current
    const finish = () => {
      setGone(true)
      onComplete?.()
    }
    if (!root || prefersReducedMotion()) {
      finish()
      return
    }
    gsap.to(root, { opacity: 0, y: -14, duration: 0.32, ease: EASE.exit, onComplete: finish })
  }, [onComplete])

  // Typed log lines: one rAF loop writes textContent through refs.
  useEffect(() => {
    const texts = BOOT_LINES.map((line) => bootLineText(line.label))

    if (prefersReducedMotion()) {
      texts.forEach((text, i) => {
        const el = lineTextRefs.current[i]
        if (el) el.textContent = text
      })
      const rafId = requestAnimationFrame(() => setTypedCount(BOOT_LINES.length))
      return () => cancelAnimationFrame(rafId)
    }

    let rafId = 0
    const startedAt = performance.now()
    const completed = BOOT_LINES.map(() => false)

    const tick = (now: number) => {
      const elapsed = now - startedAt
      let pending = false
      BOOT_LINES.forEach((_, i) => {
        const el = lineTextRefs.current[i]
        if (!el) return
        const text = texts[i]
        const visible = Math.min(
          text.length,
          Math.floor(Math.max(0, elapsed - i * LINE_STAGGER_MS) / TYPE_MS_PER_CHAR),
        )
        const next = text.slice(0, visible)
        if (el.textContent !== next) el.textContent = next
        if (visible < text.length) {
          pending = true
        } else if (!completed[i]) {
          completed[i] = true
          setTypedCount((c) => Math.max(c, i + 1))
        }
      })
      if (pending) rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [])

  // Asset pipeline (textures + web fonts) folded into the poll; safety timer prevents hangs.
  useEffect(() => {
    const base = import.meta.env.BASE_URL || '/'
    const assets = [
      'textures/earth-day.jpg',
      'textures/earth-normal.jpg',
      'textures/earth-specular.jpg',
      'textures/earth-clouds.png',
      'earth_orbit_cinematic.jpg',
    ]
    let remaining = assets.length + 1 // +1 for fonts
    const settle = () => {
      remaining -= 1
      if (remaining <= 0) setAssetsReady(true)
    }
    assets.forEach((src) => {
      const img = new Image()
      img.onload = settle
      img.onerror = settle // never block the poll on a missing asset
      img.src = base + src
    })
    if (document.fonts) {
      document.fonts.ready.then(settle).catch(settle)
    } else {
      settle()
    }
    const safety = setTimeout(setAssetsReady, ASSET_SAFETY_TIMEOUT_MS)
    return () => clearTimeout(safety)
  }, [])

  // Poll verdict: one lock sound the moment every line is typed and assets are in.
  useEffect(() => {
    if (!pollComplete || soundPlayedRef.current) return
    soundPlayedRef.current = true
  }, [pollComplete])

  // 2px progress line along the bottom, filling with --ease-standard.
  const progressTarget = pollComplete
    ? 1
    : (typedCount / BOOT_LINES.length) * 0.7 + (assetsReady ? 0.3 : 0)
  useGSAP(
    () => {
      const el = progressRef.current
      if (!el) return
      const from = progressShownRef.current
      progressShownRef.current = progressTarget
      if (prefersReducedMotion()) {
        gsap.set(el, { scaleX: progressTarget, transformOrigin: 'left center' })
        return
      }
      gsap.fromTo(el, { scaleX: from }, {
        scaleX: progressTarget,
        transformOrigin: 'left center',
        duration: DUR.base,
        ease: EASE.standard,
        overwrite: 'auto',
      })
    },
    { scope: bootRef, dependencies: [progressTarget] },
  )

  // End card: one-time scanline reveal over the brand, then the CTA + auto-continue.
  useGSAP(
    () => {
      if (!pollComplete) return
      const brand = brandRef.current
      const scan = scanlineRef.current
      const cta = ctaRef.current
      if (!brand || !cta) return

      if (prefersReducedMotion()) {
        gsap.set(brand, { opacity: 1, clipPath: 'inset(0 0 0% 0)' })
        gsap.set(cta, { opacity: 1, y: 0 })
        if (scan) gsap.set(scan, { opacity: 0 })
        cta.focus({ preventScroll: true })
        const timer = setTimeout(enter, AUTO_CONTINUE_MS)
        return () => clearTimeout(timer)
      }

      const tl = gsap.timeline({
        onComplete: () => cta.focus({ preventScroll: true }),
      })
      if (scan) {
        tl.fromTo(scan, { y: 0, opacity: 1 }, {
          y: () => brand.offsetHeight,
          opacity: 0,
          duration: DUR.slow,
          ease: 'power2.inOut',
        }, 0)
      }
      tl.fromTo(brand, { clipPath: 'inset(0 0 100% 0)' }, {
        clipPath: 'inset(0 0 0% 0)',
        duration: DUR.slow,
        ease: EASE.entrance,
      }, 0)
        .fromTo(cta, { opacity: 0, y: 14 }, {
          opacity: 1,
          y: 0,
          duration: DUR.base,
          ease: EASE.entrance,
        }, DUR.slow * 0.7)

      const timer = setTimeout(enter, AUTO_CONTINUE_MS)
      return () => {
        clearTimeout(timer)
        tl.kill()
      }
    },
    { scope: bootRef, dependencies: [pollComplete] },
  )

  // Skippable via any key.
  useEffect(() => {
    const onKey = () => enter()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [enter])

  if (gone) return null

  const statusFor = (line: BootLine): StatusWord => {
    if (line.kind === 'uplink') {
      return apiStatus === 'ONLINE'
        ? { text: 'LIVE', tone: 'ok' }
        : { text: apiStatus, tone: 'warn' }
    }
    if (line.kind === 'texture') {
      return assetsReady ? { text: 'NOMINAL', tone: 'ok' } : { text: 'LOADING', tone: 'warn' }
    }
    return { text: line.status, tone: line.tone }
  }

  return (
    <div ref={bootRef} className="boot" onClick={enter}>
      <div className="boot__meta hud-text" aria-hidden="true">
        <span>ISTRAC BENGALURU</span>
        <span>GO / NO-GO POLL</span>
      </div>

      {/* Boot poll log — typed via refs, so it is hidden from assistive tech;
          the sr-only status region below carries the announcement. */}
      <div className="boot__log" aria-hidden="true">
        {BOOT_LINES.map((line, i) => {
          const status = statusFor(line)
          const revealed = typedCount > i
          return (
            <div className="boot__line hud-text" key={line.label}>
              <span
                className="boot__text"
                ref={(el) => {
                  lineTextRefs.current[i] = el
                }}
              >
                {''}
              </span>
              <span
                className={`boot__status boot__status--${status.tone}${
                  revealed ? ' boot__status--on' : ''
                }`}
              >
                {revealed ? status.text : ''}
              </span>
            </div>
          )
        })}
      </div>

      {/* End card: brand reserved in flow so the reveal causes no reflow */}
      <div
        ref={brandRef}
        className="boot__brand"
        style={{ clipPath: 'inset(0 0 100% 0)' }}
        aria-hidden={!pollComplete}
      >
        NETRA
        <span ref={scanlineRef} className="boot__scanline" aria-hidden="true" />
      </div>

      <button
        type="button"
        ref={ctaRef}
        className="boot__cta hud-text"
        style={{ opacity: 0 }}
        onClick={enter}
        tabIndex={pollComplete ? 0 : -1}
        aria-hidden={!pollComplete}
      >
        ALL SYSTEMS NOMINAL — ENTER
      </button>

      <p className="sr-only" role="status">
        {pollComplete
          ? 'All systems nominal. Press Enter to enter the console.'
          : 'Mission boot poll in progress. Press any key to skip.'}
      </p>

      <div ref={progressRef} className="boot__progress" aria-hidden="true" />
    </div>
  )
}
