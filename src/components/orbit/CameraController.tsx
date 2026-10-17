import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { gsap } from '../../lib/motion'
import {
  closestChordDistance,
  computeBulge,
  computeMissHeight,
  computeStandoff,
  flightDuration,
} from '../../lib/cameraFlight'
import type { SatelliteItem } from '../../services/satelliteData'

// Scratch vector — the follow loop runs every frame; never allocate inside useFrame
const _livePos = new THREE.Vector3()

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export default function CameraController({
  controlsRef,
  selectedSat,
  recenterTrigger,
  resetViewTrigger,
}: {
  controlsRef: React.RefObject<OrbitControlsImpl | null>
  selectedSat: SatelliteItem | null
  recenterTrigger: number
  resetViewTrigger: number
}) {
  const { camera } = useThree()
  const isFollowingRef = useRef(false)
  const isUserDraggingRef = useRef(false)
  const lastTargetIdRef = useRef<string | null>(null)
  const lastRecenterRef = useRef(0)
  const lastResetRef = useRef(0)
  const activeTweenRef = useRef<gsap.core.Tween | null>(null)

  // Kill any in-flight camera tween when the scene unmounts
  useEffect(
    () => () => {
      activeTweenRef.current?.kill()
      activeTweenRef.current = null
    },
    [],
  )

  useEffect(() => {
    const ctrl = controlsRef.current
    if (!ctrl) return
    // Dev-only camera inspector so headless probes can assert framing (#11):
    // reading three internals from outside the canvas is otherwise impossible.
    // DEV-bundled only — import.meta.env.DEV is false in production builds.
    if (import.meta.env.DEV) {
      ;(window as unknown as Record<string, unknown>).__NETRA_CAM = () => ({
        cam: camera.position.toArray(),
        tgt: ctrl.target.toArray(),
      })
    }
    const handleStart = () => {
      isUserDraggingRef.current = true
      isFollowingRef.current = false
      if (activeTweenRef.current) {
        activeTweenRef.current.kill()
        activeTweenRef.current = null
      }
    }
    const handleEnd = () => {
      isUserDraggingRef.current = false
    }
    ctrl.addEventListener('start', handleStart)
    ctrl.addEventListener('end', handleEnd)
    return () => {
      ctrl.removeEventListener('start', handleStart)
      ctrl.removeEventListener('end', handleEnd)
    }
  }, [controlsRef])

  useEffect(() => {
    if (!selectedSat || !controlsRef.current) return
    const satId = selectedSat.id
    const isNewSat = satId !== lastTargetIdRef.current
    const isExplicitRecenter = recenterTrigger !== lastRecenterRef.current
    if (!isNewSat && !isExplicitRecenter) return
    lastTargetIdRef.current = satId
    lastRecenterRef.current = recenterTrigger
    isFollowingRef.current = false
    if (activeTweenRef.current) {
      activeTweenRef.current.kill()
      activeTweenRef.current = null
    }
    const ctrl = controlsRef.current
    const targetPos = new THREE.Vector3(...selectedSat.pos3D)
    // Mostly-radial vantage with a small tilt so the Earth's limb stays in
    // frame; the camera parks at a fixed radius from the Earth's centre so
    // the globe keeps its proportions while the satellite sits centred (#11).
    const orbitR = targetPos.length()
    // Scalar framing/flight math lives in lib/cameraFlight (unit-tested pure).
    const standoff = computeStandoff(orbitR)
    const radial = targetPos.clone().normalize()
    const offsetDir = radial.add(new THREE.Vector3(0.12, 0.14, 0.12)).normalize()
    const targetCam = targetPos.clone().addScaledVector(offsetDir, standoff)

    // Flight path: a slight arc bowed away from the Earth's centre, so every
    // approach reads as a pass around the target rather than a straight charge
    // across the globe's face — and so a chord that would otherwise clip the
    // planet (target on the far side) clears the surface with margin.
    const startCam = camera.position.clone()
    const startTgt = ctrl.target.clone()
    const pathLen = startCam.distanceTo(targetCam)
    // Chord clearance from the Earth's surface + parabolic arc bulge — pure
    // helpers from lib/cameraFlight (see regression.test.mjs for the maths).
    const straightClear = closestChordDistance(startCam.toArray(), targetCam.toArray())
    const missHeight = computeMissHeight(straightClear)
    const bulge = computeBulge(pathLen, missHeight)
    const midDir = startCam.clone().lerp(targetCam, 0.5)
    if (midDir.lengthSq() < 1e-9) midDir.set(0, 1, 0)
    midDir.normalize()

    const flight = { t: 0 }
    activeTweenRef.current = gsap.to(flight, {
      t: 1,
      duration: prefersReducedMotion() ? 0 : flightDuration(pathLen),
      ease: 'power3.inOut',
      onUpdate: () => {
        const e = flight.t
        camera.position
          .copy(startCam)
          .lerp(targetCam, e)
          .addScaledVector(midDir, Math.sin(Math.PI * e) * bulge)
        ctrl.target.copy(startTgt).lerp(targetPos, e)
        ctrl.update()
      },
      onComplete: () => {
        isFollowingRef.current = true
        activeTweenRef.current = null
      },
    })
  }, [selectedSat, recenterTrigger, camera, controlsRef])

  useEffect(() => {
    if (!controlsRef.current) return
    if (resetViewTrigger === lastResetRef.current) return
    lastResetRef.current = resetViewTrigger
    lastTargetIdRef.current = null
    isFollowingRef.current = false
    if (activeTweenRef.current) {
      activeTweenRef.current.kill()
      activeTweenRef.current = null
    }
    const ctrl = controlsRef.current
    const targetCam = new THREE.Vector3(0, 0, 8.5)
    const targetPos = new THREE.Vector3(0, 0, 0)
    const animProxy = {
      cx: camera.position.x,
      cy: camera.position.y,
      cz: camera.position.z,
      tx: ctrl.target.x,
      ty: ctrl.target.y,
      tz: ctrl.target.z,
    }
    activeTweenRef.current = gsap.to(animProxy, {
      cx: targetCam.x,
      cy: targetCam.y,
      cz: targetCam.z,
      tx: targetPos.x,
      ty: targetPos.y,
      tz: targetPos.z,
      duration: prefersReducedMotion() ? 0 : 1.2,
      ease: 'power3.inOut',
      onUpdate: () => {
        camera.position.set(animProxy.cx, animProxy.cy, animProxy.cz)
        ctrl.target.set(animProxy.tx, animProxy.ty, animProxy.tz)
        ctrl.update()
      },
      onComplete: () => {
        activeTweenRef.current = null
      },
    })
  }, [resetViewTrigger, camera, controlsRef])

  useFrame(() => {
    if (isFollowingRef.current && selectedSat && controlsRef.current && !isUserDraggingRef.current && !activeTweenRef.current) {
      _livePos.set(...selectedSat.pos3D)
      controlsRef.current.target.lerp(_livePos, 0.08)
      controlsRef.current.update()
    }
  })

  return null
}
