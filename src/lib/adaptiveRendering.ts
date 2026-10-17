import { useEffect, useRef, useState } from 'react'

export type DeviceTier = 'HIGH' | 'MEDIUM' | 'LOW'

export interface QualityProfile {
  tier: DeviceTier
  label: string
  dpr: [number, number]
  starCount: number
  sphereSegments: number
  shadows: boolean
  shadowMapSize: number
  targetFps: number
}

const HIGH_PROFILE: QualityProfile = {
  tier: 'HIGH',
  label: 'TIER-1 ULTRA // 60 FPS',
  dpr: [1, 1.75],
  starCount: 1200,
  sphereSegments: 64,
  shadows: true,
  shadowMapSize: 2048,
  targetFps: 60,
}

const MEDIUM_PROFILE: QualityProfile = {
  tier: 'MEDIUM',
  label: 'TIER-2 BALANCED // 60 FPS',
  dpr: [1, 1.35],
  starCount: 750,
  sphereSegments: 48,
  shadows: true,
  shadowMapSize: 1024,
  targetFps: 60,
}

const LOW_PROFILE: QualityProfile = {
  tier: 'LOW',
  label: 'TIER-3 MOBILE-OPT // 60 FPS',
  dpr: [1, 1.0],
  starCount: 400,
  sphereSegments: 36,
  shadows: false,
  shadowMapSize: 512,
  targetFps: 60,
}

export function detectDeviceProfile(): QualityProfile {
  if (typeof window === 'undefined') return HIGH_PROFILE

  const isMobile = window.innerWidth < 768 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
  const cores = navigator.hardwareConcurrency ?? 4
  const memory = (navigator as unknown as { deviceMemory?: number }).deviceMemory ?? 4

  if (isMobile || cores <= 4 || memory < 4) {
    return LOW_PROFILE
  }
  if (cores <= 6 || window.innerWidth < 1200) {
    return MEDIUM_PROFILE
  }
  return HIGH_PROFILE
}

const TIER_RANK: Record<DeviceTier, number> = { LOW: 0, MEDIUM: 1, HIGH: 2 }
const PROFILE_BY_RANK: QualityProfile[] = [LOW_PROFILE, MEDIUM_PROFILE, HIGH_PROFILE]
const FPS_SAMPLE_MS = 1000
const FPS_FLOOR = 42
const FPS_STRIKES = 2
const FPS_RECOVER = 56
const RECOVER_WINDOWS = 6

/**
 * Hook that supplies auto-adaptive rendering quality and dynamically monitors
 * device performance to prevent frame drops.
 *
 * The tier is detected on mount from CPU cores / memory / viewport, then a
 * lightweight rAF watchdog demotes the profile one tier at a time whenever the
 * measured frame rate stays below the floor for consecutive one-second
 * samples. When a demoted profile then holds at or above the recovery
 * threshold for a sustained stretch, the watchdog promotes it back — but never
 * beyond the highest tier the hardware itself ever detected, so a genuinely
 * slow device cannot climb past its ceiling. The FPS state update is
 * change-gated (≥2 fps drift or a tier change) to keep consumers from
 * re-rendering on every one-second sample.
 */
export function useAdaptiveRendering() {
  const [profile, setProfile] = useState<QualityProfile>(detectDeviceProfile)
  const [currentFps, setCurrentFps] = useState(60)

  // Highest tier the hardware itself ever detected this session — the
  // promotion ceiling. Initialized lazily from the first render's profile.
  const capRankRef = useRef<number | null>(null)
  if (capRankRef.current === null) capRankRef.current = TIER_RANK[profile.tier]

  // Last value pushed into `currentFps`, used to gate state updates.
  const lastFpsRef = useRef(60)

  // Re-detect on resize/orientation: settle downward to the new detection and
  // raise the promotion ceiling if a roomier layout reveals more capacity.
  useEffect(() => {
    const onResize = () => {
      const detected = detectDeviceProfile()
      capRankRef.current = Math.max(capRankRef.current ?? 0, TIER_RANK[detected.tier])
      setProfile((prev) => (TIER_RANK[detected.tier] < TIER_RANK[prev.tier] ? detected : prev))
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // FPS watchdog: one-second sampling windows. Two consecutive windows under
  // the floor demote one tier; six consecutive windows at/above the recovery
  // threshold promote one tier back, capped at the detected ceiling.
  useEffect(() => {
    if (typeof window === 'undefined') return
    let raf = 0
    let alive = true
    let frames = 0
    let windowStart = performance.now()
    let slowStrikes = 0
    let fastStreak = 0

    const tick = () => {
      if (!alive) return
      frames += 1
      const now = performance.now()
      const elapsed = now - windowStart
      if (elapsed >= FPS_SAMPLE_MS) {
        const fps = Math.round((frames * 1000) / elapsed)
        frames = 0
        windowStart = now

        let tierChanged = false
        if (fps < FPS_FLOOR) {
          fastStreak = 0
          slowStrikes += 1
          if (slowStrikes >= FPS_STRIKES) {
            slowStrikes = 0
            tierChanged = true
            setProfile((prev) => {
              const nextRank = TIER_RANK[prev.tier] - 1
              return nextRank >= 0 ? PROFILE_BY_RANK[nextRank] : prev
            })
          }
        } else {
          slowStrikes = 0
          if (fps >= FPS_RECOVER) {
            fastStreak += 1
            if (fastStreak >= RECOVER_WINDOWS) {
              fastStreak = 0
              tierChanged = true
              setProfile((prev) => {
                const nextRank = Math.min(TIER_RANK[prev.tier] + 1, capRankRef.current ?? TIER_RANK[prev.tier])
                return nextRank > TIER_RANK[prev.tier] ? PROFILE_BY_RANK[nextRank] : prev
              })
            }
          } else {
            fastStreak = 0
          }
        }

        if (tierChanged || Math.abs(fps - lastFpsRef.current) >= 2) {
          lastFpsRef.current = fps
          setCurrentFps(fps)
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      alive = false
      cancelAnimationFrame(raf)
    }
  }, [])

  return {
    profile,
    currentFps,
    setFps: setCurrentFps,
    isLowTier: profile.tier === 'LOW',
  }
}

/**
 * Detects whether WebGL 1.0 or 2.0 is supported and hardware accelerated on this device.
 */
export function isWebGLAvailable(): boolean {
  if (typeof window === 'undefined') return true
  try {
    const canvas = document.createElement('canvas')
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl')),
    )
  } catch {
    return false
  }
}

