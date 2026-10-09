import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { gsap } from '../../lib/motion'
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
    const radial = targetPos.clone().normalize()
    const targetCam = targetPos.clone().add(radial.multiplyScalar(0.75)).add(new THREE.Vector3(0.2, 0.22, 0.18))
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
