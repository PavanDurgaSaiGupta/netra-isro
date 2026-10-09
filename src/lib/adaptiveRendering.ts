import { useEffect, useState } from 'react'

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

/**
 * Hook that supplies auto-adaptive rendering quality and dynamically monitors
 * device performance to prevent frame drops.
 */
export function useAdaptiveRendering() {
  const [profile, setProfile] = useState<QualityProfile>(detectDeviceProfile)
  const [currentFps, setCurrentFps] = useState(60)

  // Dynamically listen to window resize and orientation
  useEffect(() => {
    const onResize = () => {
      setProfile((prev) => {
        const detected = detectDeviceProfile()
        if (detected.tier !== prev.tier) return detected
        return prev
      })
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
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

