import { useLayoutEffect, useRef } from 'react'
import { DUR, EASE, gsap, prefersReducedMotion, useGSAP } from '../../lib/motion'

type OdometerNumberProps = {
  value: number
  /** Maps the numeric value to the rendered string (rounding, unit conversion, suffix). */
  format?: (n: number) => string
  className?: string
}

const defaultFormat = (n: number) => String(Math.round(n))

/**
 * Rolling odometer readout (contract §3).
 *
 * The roll is a gsap tween on a throwaway proxy object; every frame it writes
 * `textContent` straight through the ref — zero React state, zero re-renders
 * per frame. On a new `value` the previous tween is discarded and the roll
 * continues from wherever the digits currently sit, so rapid updates (telemetry
 * heartbeats, clock ticks) stay smooth.
 *
 * The `format` function lives in a ref: swapping it (unit toggles) re-maps the
 * SAME live value instantly instead of restarting a roll.
 *
 * Reduced motion: snaps straight to the formatted end-state on every change.
 */
export default function OdometerNumber({ value, format, className }: OdometerNumberProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const currentRef = useRef(value)
  const formatRef = useRef(format ?? defaultFormat)

  // Runs before paint (so the span is never blank) and after every render: keeps
  // the formatter in a ref and re-renders the current value through it immediately.
  useLayoutEffect(() => {
    formatRef.current = format ?? defaultFormat
    const el = ref.current
    if (el) el.textContent = formatRef.current(currentRef.current)
  })

  useGSAP(
    () => {
      const el = ref.current
      if (!el) return
      const target = Number.isFinite(value) ? value : 0
      const write = (n: number) => {
        currentRef.current = n
        el.textContent = formatRef.current(n)
      }
      if (prefersReducedMotion() || target === currentRef.current) {
        write(target)
        return
      }
      const proxy = { n: currentRef.current }
      gsap.to(proxy, {
        n: target,
        duration: DUR.slow,
        ease: EASE.entrance,
        onUpdate: () => write(proxy.n),
        onComplete: () => write(target),
      })
    },
    { scope: ref, dependencies: [value] },
  )

  return <span ref={ref} className={className} />
}
