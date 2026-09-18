import { useMemo, useRef, useState } from 'react'
import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { SatelliteItem } from '../../services/satelliteData'

const R_EARTH = 2.0

export default function SatelliteMarker({
  sat,
  isSelected,
  onSelect,
}: {
  sat: SatelliteItem
  isSelected: boolean
  onSelect: () => void
}) {
  const isDebris = sat.type === 'debris'
  const isStation = sat.type === 'station'
  const pos = sat.pos3D
  const reticleRef = useRef<THREE.Mesh>(null)
  const labelRef = useRef<HTMLDivElement>(null)
  const [hovered, setHovered] = useState(false)
  const satWorldPos = useMemo(() => new THREE.Vector3(...pos), [pos])

  useFrame((_, dt) => {
    if (reticleRef.current && isSelected) reticleRef.current.rotation.z += dt * 2.2
  })

  useFrame(({ camera }) => {
    if (!labelRef.current) return
    satWorldPos.set(...sat.pos3D)
    const camPos = camera.position
    const camToSat = satWorldPos.clone().sub(camPos)
    const dist = camToSat.length()
    const dir = camToSat.clone().normalize()
    const t = -camPos.dot(dir)
    let isBehindEarth = false
    if (t > 0 && t < dist) {
      const closestSq = camPos.clone().add(dir.clone().multiplyScalar(t)).lengthSq()
      if (closestSq < (R_EARTH * 1.01) ** 2) isBehindEarth = true
    }
    if (isBehindEarth) {
      labelRef.current.style.display = 'none'
      return
    }
    labelRef.current.style.display = 'inline-flex'
    const scale = THREE.MathUtils.clamp(1.06 - (dist / 16) * 0.36, 0.68, 1.06)
    const opacity = isSelected ? 1 : hovered ? 1 : THREE.MathUtils.clamp(1.15 - (dist / 18) * 0.42, 0.7, 0.95)
    labelRef.current.style.transform = `translate(8px, -50%) scale(${scale})`
    labelRef.current.style.opacity = `${opacity}`
  })

  const trailLine = useMemo(() => {
    const r = Math.hypot(...pos)
    const points: THREE.Vector3[] = []
    const inc = (sat.inclinationDeg * Math.PI) / 180
    for (let a = 0; a <= Math.PI * 2; a += Math.PI / 64) {
      const x = r * Math.cos(a)
      const z = r * Math.sin(a) * Math.cos(inc)
      const y = r * Math.sin(a) * Math.sin(inc)
      points.push(new THREE.Vector3(x, y, z))
    }
    const g = new THREE.BufferGeometry().setFromPoints(points)
    const mat = new THREE.LineBasicMaterial({
      color: isSelected ? '#00f0ff' : sat.color,
      transparent: true,
      opacity: isSelected ? 0.9 : 0.35,
    })
    return new THREE.Line(g, mat)
  }, [pos, sat.inclinationDeg, sat.color, isSelected])

  return (
    <group>
      <primitive object={trailLine} />
      <group position={pos}>
        <mesh
          onClick={(e) => {
            e.stopPropagation()
            onSelect()
          }}
          onPointerOver={(e) => {
            e.stopPropagation()
            setHovered(true)
            document.body.style.cursor = 'pointer'
          }}
          onPointerOut={() => {
            setHovered(false)
            document.body.style.cursor = 'crosshair'
          }}
        >
          <sphereGeometry args={[0.22, 12, 12]} />
          <meshBasicMaterial visible={false} />
        </mesh>
        {isSelected && (
          <mesh ref={reticleRef}>
            <ringGeometry args={[0.048, 0.06, 24]} />
            <meshBasicMaterial color="#00f0ff" side={THREE.DoubleSide} transparent opacity={0.9} />
          </mesh>
        )}
        <mesh>
          <sphereGeometry args={[isSelected ? 0.024 : hovered ? 0.02 : 0.015, 16, 16]} />
          <meshBasicMaterial color={isSelected ? '#00f0ff' : hovered ? '#ffffff' : sat.color} />
        </mesh>
        {isDebris ? (
          <mesh castShadow>
            <tetrahedronGeometry args={[0.022]} />
            <meshStandardMaterial color="#ff4444" emissive="#ff2222" emissiveIntensity={0.5} roughness={0.4} metalness={0.7} />
          </mesh>
        ) : isStation ? (
          <group>
            <mesh castShadow>
              <boxGeometry args={[0.024, 0.024, 0.045]} />
              <meshStandardMaterial color="#ffffff" emissive="#00f0ff" emissiveIntensity={0.4} />
            </mesh>
            <mesh position={[0.04, 0, 0]}>
              <boxGeometry args={[0.04, 0.002, 0.022]} />
              <meshStandardMaterial color="#00f0ff" roughness={0.2} metalness={0.9} />
            </mesh>
            <mesh position={[-0.04, 0, 0]}>
              <boxGeometry args={[0.04, 0.002, 0.022]} />
              <meshStandardMaterial color="#00f0ff" roughness={0.2} metalness={0.9} />
            </mesh>
          </group>
        ) : (
          <group>
            <mesh castShadow>
              <octahedronGeometry args={[0.025]} />
              <meshStandardMaterial color="#ffffff" emissive={sat.color} emissiveIntensity={isSelected ? 0.8 : 0.3} roughness={0.3} metalness={0.8} />
            </mesh>
            <mesh position={[0.032, 0, 0]}>
              <boxGeometry args={[0.03, 0.002, 0.016]} />
              <meshStandardMaterial color="#00b4d8" metalness={0.85} roughness={0.25} />
            </mesh>
            <mesh position={[-0.032, 0, 0]}>
              <boxGeometry args={[0.03, 0.002, 0.016]} />
              <meshStandardMaterial color="#00b4d8" metalness={0.85} roughness={0.25} />
            </mesh>
          </group>
        )}
        <pointLight color={isSelected ? '#00f0ff' : sat.color} intensity={isSelected ? 0.8 : 0.2} distance={0.5} />
        <Html position={[0, 0, 0]} center={false} style={{ pointerEvents: 'auto' }}>
          <div
            ref={labelRef}
            className={`sat-zoom-label hud-text ${isSelected ? 'sat-zoom-label--selected' : hovered ? 'sat-zoom-label--hovered' : ''}`}
            onClick={(e) => {
              e.stopPropagation()
              onSelect()
            }}
            onPointerOver={(e) => {
              e.stopPropagation()
              setHovered(true)
            }}
            onPointerOut={() => setHovered(false)}
            title={`Click to inspect ${sat.name}`}
          >
            <span className="sat-zoom-label__dot" style={{ background: sat.color }} />
            <span className="sat-zoom-label__name">{sat.name}</span>
          </div>
        </Html>
      </group>
    </group>
  )
}
