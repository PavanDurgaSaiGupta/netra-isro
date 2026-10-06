import { useMemo, useRef } from 'react'
import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { geodeticToVector3 } from '../../services/satelliteData'

// Scratch vectors — reused across every frame, never allocated inside useFrame
const _normal = new THREE.Vector3()
const _camToStation = new THREE.Vector3()

export default function GroundStationBeam() {
  const pos = useMemo(() => geodeticToVector3(12.9716, 77.5946, 0), [])
  const labelRef = useRef<HTMLDivElement>(null)
  const stationWorldPos = useMemo(() => new THREE.Vector3(...pos), [pos])

  useFrame(({ camera }) => {
    if (!labelRef.current) return
    _normal.copy(stationWorldPos).normalize()
    _camToStation.copy(stationWorldPos).sub(camera.position)
    const dist = _camToStation.length()
    const isFacingCamera = _normal.dot(_camToStation) < 0
    if (!isFacingCamera) {
      labelRef.current.style.display = 'none'
      return
    }
    labelRef.current.style.display = 'inline-flex'
    const scale = THREE.MathUtils.clamp(1.05 - (dist / 16) * 0.35, 0.68, 1.05)
    labelRef.current.style.transform = `translate(-50%, -150%) scale(${scale})`
  })

  return (
    <group position={pos}>
      <mesh>
        <sphereGeometry args={[0.024, 16, 16]} />
        <meshBasicMaterial color="#00f0ff" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.032, 0.052, 24]} />
        <meshBasicMaterial color="#00f0ff" transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>
      <Html position={[0, 0, 0]} center style={{ pointerEvents: 'none' }}>
        <div ref={labelRef} className="scene-station-tag hud-text">
          ISTRAC BENGALURU
        </div>
      </Html>
    </group>
  )
}
