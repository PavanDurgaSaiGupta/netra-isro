import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { useSatellites } from '../context/SatelliteContext'
import { playLockSound } from '../utils/audio'
import GroundStationBeam from './orbit/GroundStationBeam'
import { Earth, EarthFallback } from './orbit/Earth'
import SatelliteMarker from './orbit/SatelliteMarker'
import CameraController from './orbit/CameraController'

function Starfield3D({ count }: { count: number }) {
  const geo = useMemo(() => {
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      // oxlint-disable-next-line react(purity) — starfield seeded once, randomness is intentional
      const v = new THREE.Vector3().randomDirection().multiplyScalar(35 + Math.random() * 25)
      pos.set([v.x, v.y, v.z], i * 3)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    return g
  }, [count])
  return (
    <points geometry={geo}>
      <pointsMaterial size={0.075} color="#d4e0ff" transparent opacity={0.75} sizeAttenuation depthWrite={false} />
    </points>
  )
}

function OrbitPlanes() {
  const planes: Array<[number, [number, number, number]]> = [
    [2.35, [0.35, 0.12, 0.2]],
    [3.4, [1.25, 0.3, -0.4]],
    [4.9, [0.06, 0.05, 0]],
  ]
  return (
    <>
      {planes.map(([r, rot], i) => (
        <mesh key={i} rotation={rot}>
          <torusGeometry args={[r, 0.0028, 8, 128]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.12} />
        </mesh>
      ))}
    </>
  )
}

export default function OrbitScene() {
  const controlsRef = useRef<any>(null)
  const { filteredSatellites, selectedSat, setSelectedSat, recenterTrigger, resetViewTrigger } = useSatellites()
  const [loadingStage, setLoadingStage] = useState(1)
  const prefersReduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const [autoRotate, setAutoRotate] = useState(() => !prefersReduced)
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mobile = typeof window !== 'undefined' && window.innerWidth < 768

  useEffect(() => {
    const t2 = setTimeout(() => setLoadingStage(2), 200)
    const t3 = setTimeout(() => setLoadingStage(3), 500)
    const t4 = setTimeout(() => setLoadingStage(4), 900)
    return () => {
      clearTimeout(t2)
      clearTimeout(t3)
      clearTimeout(t4)
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    }
  }, [])

  const handleControlsStart = () => {
    setAutoRotate(false)
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
  }
  const handleControlsEnd = () => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    idleTimerRef.current = setTimeout(() => {
      if (!selectedSat) setAutoRotate(true)
    }, 6000)
  }

  return (
    <div className="orbit-canvas-container" role="img" aria-label="Interactive 3D globe showing Bharat's satellites and debris in orbit — use mouse to rotate, scroll to zoom, click a satellite to inspect">
      <Canvas shadows="soft" dpr={[1, mobile ? 1.25 : 1.75]} camera={{ position: [0, 0, 8.5], fov: 45 }} gl={{ antialias: true, alpha: true }}>
        <ambientLight color="#1e2e47" intensity={0.65} />
        <directionalLight position={[8, 3.5, 6]} intensity={2.8} color="#fff8eb" castShadow shadow-mapSize={[2048, 2048]} />
        <pointLight position={[-6, -3, -4]} intensity={0.45} color="#00f0ff" />
        <Suspense fallback={<EarthFallback />}>
          <Earth stage={loadingStage} />
          <GroundStationBeam />
          <Starfield3D count={mobile ? 600 : 1200} />
          <OrbitPlanes />
          {filteredSatellites.map((sat) => (
            <SatelliteMarker key={sat.id} sat={sat} isSelected={selectedSat?.id === sat.id} onSelect={() => { playLockSound(); setSelectedSat(sat) }} />
          ))}
        </Suspense>
        <OrbitControls
          ref={controlsRef}
          target={[0, 0, 0]}
          enableZoom
          minDistance={2.4}
          maxDistance={18}
          zoomSpeed={0.85}
          enablePan
          panSpeed={0.45}
          autoRotate={autoRotate && !selectedSat}
          autoRotateSpeed={0.35}
          enableDamping
          dampingFactor={0.06}
          minPolarAngle={Math.PI * 0.12}
          maxPolarAngle={Math.PI * 0.88}
          onStart={handleControlsStart}
          onEnd={handleControlsEnd}
        />
        <CameraController controlsRef={controlsRef} selectedSat={selectedSat} recenterTrigger={recenterTrigger} resetViewTrigger={resetViewTrigger} />
      </Canvas>
      <span className="sr-only">3D orbital surveillance cockpit — {filteredSatellites.length} objects rendered. Select a satellite from the list or click in the 3D view.</span>
    </div>
  )
}
