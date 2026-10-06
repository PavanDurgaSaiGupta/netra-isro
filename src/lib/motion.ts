/**
 * NETRA v2 motion primitives — the single source of animation truth (contract §3).
 * Every GSAP animation in the app imports from this module; no bespoke animation
 * code outside it. All component-level GSAP work goes through `useGSAP` re-exported
 * here (scope + auto-cleanup).
 *
 * Units: durations and stagger values are in SECONDS (gsap convention). The CSS
 * twin tokens in index.css use milliseconds (120/240/420/640ms, 60ms step).
 *
 * Key casing: lowercase keys are primary (they mirror the CSS token casing:
 * --ease-entrance, --dur-fast). UPPER_CASE aliases exist because consumers were
 * authored against both conventions in parallel; the integrator may normalize
 * call sites and drop the aliases later.
 */
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { CustomEase } from 'gsap/CustomEase'
import { useGSAP as useGSAPHook } from '@gsap/react'

gsap.registerPlugin(ScrollTrigger, CustomEase, useGSAPHook)

/**
 * `useGSAP` with the runtime's `register(core)` static surfaced in its type
 * (present in @gsap/react's runtime, missing from its official declarations).
 * The canonical registration happens here, so consumer `useGSAP.register(gsap)`
 * calls are an idempotent no-op.
 */
type UseGSAP = typeof useGSAPHook & { register: (core: typeof gsap) => void }
export const useGSAP = useGSAPHook as UseGSAP
useGSAP.register(gsap)

export { gsap, ScrollTrigger }

/**
 * The four contract curves (§2), parsed by CustomEase as SVG cubic paths —
 * mathematically identical to the CSS cubic-bezier() tokens the stylesheet uses:
 *   M0,0 C x1,y1 x2,y2 1,1  ===  cubic-bezier(x1, y1, x2, y2)
 *
 * Usage rules (§2): entrances → entrance (decelerate), exits → exit (accelerate),
 * hover/focus → standard, capture (overshoot) only for selection/confirmation moments.
 */
const bezier = (x1: number, y1: number, x2: number, y2: number) =>
  `M0,0 C${x1},${y1} ${x2},${y2} 1,1`

const curves = {
  standard: CustomEase.create('netra-ease-standard', bezier(0.4, 0, 0.2, 1)),
  entrance: CustomEase.create('netra-ease-entrance', bezier(0.16, 1, 0.3, 1)),
  exit: CustomEase.create('netra-ease-exit', bezier(0.55, 0, 0.85, 0.36)),
  capture: CustomEase.create('netra-ease-capture', bezier(0.34, 1.56, 0.64, 1)),
}

export const EASE = {
  ...curves,
  STANDARD: curves.standard,
  ENTRANCE: curves.entrance,
  EXIT: curves.exit,
  CAPTURE: curves.capture,
} as const

/** Durations in seconds (gsap). Micro 120–240ms, panels 420ms, hero/boot up to 640ms. */
const durations = { instant: 0.12, fast: 0.24, base: 0.42, slow: 0.64 }

export const DUR = {
  ...durations,
  INSTANT: durations.instant,
  FAST: durations.fast,
  BASE: durations.base,
  SLOW: durations.slow,
} as const

/** Per-item stagger step in seconds (CSS twin: --stagger-step: 60ms). */
export const STAGGER_STEP = 0.06
/** Hard ceiling for the total stagger envelope, start-of-first to start-of-last (§2). */
export const STAGGER_BUDGET = 0.5

/**
 * `each` value for a gsap `stagger` option:
 *   gsap.to(els, { opacity: 1, stagger: stagger(els.length) })
 *
 * Starts from STAGGER_STEP (60ms) and compresses the step when `count` items would
 * overflow the 500ms total budget. An optional `step` override serves the moments the
 * contract pins to a different step (e.g. the landing hero assembles at 90ms).
 */
export function stagger(count: number, step: number = STAGGER_STEP): number {
  if (count <= 1) return 0
  return Math.min(step, STAGGER_BUDGET / (count - 1))
}

/**
 * Live `prefers-reduced-motion` check — call it at animation-build time, not on
 * module load, so OS-level changes are picked up. When it returns true, JS
 * animations must snap straight to their end-state (or simply not run: the
 * default DOM is the end-state).
 */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}
