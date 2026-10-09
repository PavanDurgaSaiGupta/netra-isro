import { useEffect, useMemo, useRef, useState } from 'react'
import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { SatelliteItem } from '../../services/satelliteData'

const R_EARTH = 2.0
const TRAIL_SEGMENTS = 128

// Scratch vectors — shared across marker instances but only ever used
// synchronously inside a single useFrame callback, so reuse is safe.
const _satPos = new THREE.Vector3()
const _camToSat = new THREE.Vector3()
const _dir = new THREE.Vector3()
const _closest = new THREE.Vector3()

/**
 * Orbital-plane basis estimated from the satellite's current geodetic position
 * + inclination, so the drawn ring lies in the satellite's actual orbital plane
 * and passes through its marker. The satrec RAAN is not carried on the item
 * (contract §4), so the ascending-node longitude is recovered assuming a
 * circular orbit:
 *
 *   sin(u) = -sin(lat) / sin(incl)          (argument of latitude)
 *   α      = atan2(B·P - A·Q, A·P + B·Q)    with A = cos u, B = sin u·cos i
 *                                            P = cos lat·cos lng, Q = -cos lat·sin lng
 *
 * Both mirror solutions contain the marker; the true plane is picked by the
 * motion tangent's north sign (prograde orbits travel east, retrograde west)
 * matched against the observed ascending/descending state. Returns the node
 * rotation α plus the (possibly relaxed) plane inclination components so the
 * ring geometry and the solver always agree.
 */
function computeOrbitBasis(latDeg: number, lngDeg: number, incDeg: number, ascending: boolean) {
  const lat = (latDeg * Math.PI) / 180
  const lng = (lngDeg * Math.PI) / 180
  const inc = (incDeg * Math.PI) / 180
  const sinInc = Math.sin(inc)

  // Near-equatorial orbit: the node is undefined — the ring is simply the
  // equatorial circle (rotation about Y is a no-op on it).
  if (Math.abs(sinInc) < 1e-4) return { alpha: 0, sinI: sinInc, cosI: Math.cos(inc) }

  let sinU = -Math.sin(lat) / sinInc
  let sinI = sinInc
  let cosI = Math.cos(inc)
  if (Math.abs(sinU) > 1) {
    // Marker latitude outside the inclination envelope (rounding or a
    // near-equatorial element set): relax the plane through the marker itself
    // instead of clamping, so the trail still passes through it exactly.
    sinU = Math.sign(sinU)
    sinI = -Math.sin(lat) / sinU
    cosI = Math.sign(cosI || 1) * Math.sqrt(Math.max(0, 1 - sinI * sinI))
  }

  const beta = Math.asin(sinU)
  const p = Math.cos(lat) * Math.cos(lng)
  const q = -Math.cos(lat) * Math.sin(lng)
  const motionEastward = inc < Math.PI / 2 // prograde orbits travel east, retrograde west

  for (const u of [beta, Math.PI - beta]) {
    const cu = Math.cos(u)
    const alpha = Math.atan2(sinU * cosI * p - cu * q, cu * p + sinU * cosI * q)
    // Ring tangent at the marker (scene coords)
    const tx = -sinU * Math.cos(alpha) + cu * cosI * Math.sin(alpha)
    const ty = -cu * sinI
    const tz = sinU * Math.sin(alpha) + cu * cosI * Math.cos(alpha)
    // East component of the tangent; the marker's east unit vector is (-sin lng, 0, -cos lng)
    const east = -tx * Math.sin(lng) - tz * Math.cos(lng)
    // North sign of the motion-consistent tangent disambiguates the mirror planes
    const motionTangentNorth = (east > 0) === motionEastward ? ty : -ty
    if ((motionTangentNorth > 0) === ascending) return { alpha, sinI, cosI }
  }
  return { alpha: 0, sinI, cosI }
}

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

  // Direction of travel (ascending vs descending) resolved from ECI orbit velocity
  const isAscending = sat.isAscending ?? true

  // Rebuild the trail ring in the satellite's orbital plane each propagation tick
  const trailGeometry = useMemo(() => {
    const r = Math.hypot(...pos)
    const { alpha, sinI, cosI } = computeOrbitBasis(sat.lat, sat.lng, sat.inclinationDeg, isAscending)

    const cosNode = Math.cos(alpha)
    const sinNode = Math.sin(alpha)
    const positions = new Float32Array((TRAIL_SEGMENTS + 1) * 3)
    let k = 0
    for (let s = 0; s <= TRAIL_SEGMENTS; s++) {
      const a = (s / TRAIL_SEGMENTS) * Math.PI * 2
      const x1 = r * Math.cos(a)
      const y1 = -r * Math.sin(a) * sinI
      const z1 = r * Math.sin(a) * cosI
      positions[k++] = x1 * cosNode + z1 * sinNode
      positions[k++] = y1
      positions[k++] = -x1 * sinNode + z1 * cosNode
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return g
  }, [pos, sat.lat, sat.lng, sat.inclinationDeg, isAscending])

  const trailMaterial = useMemo(() => {
    return new THREE.LineBasicMaterial({
      color: isSelected ? '#00f0ff' : sat.color,
      transparent: true,
      opacity: isSelected ? 0.9 : 0.35,
    })
  }, [isSelected, sat.color])

  const trailLine = useMemo(() => {
    return new THREE.Line(trailGeometry, trailMaterial)
  }, [trailGeometry, trailMaterial])

  // Dispose buffer geometry and material when replaced or on unmount
  useEffect(() => {
    return () => {
      trailGeometry.dispose()
      trailMaterial.dispose()
    }
  }, [trailGeometry, trailMaterial])

  useFrame((_, dt) => {
    if (reticleRef.current && isSelected) reticleRef.current.rotation.z += dt * 2.2
  })

  // Occlusion + distance scaling for the floating label — zero allocations per frame
  useFrame(({ camera }) => {
    if (!labelRef.current) return
    _satPos.set(...sat.pos3D)
    _camToSat.copy(_satPos).sub(camera.position)
    const dist = _camToSat.length()
    _dir.copy(_camToSat).divideScalar(dist || 1)
    const t = -camera.position.dot(_dir)
    let isBehindEarth = false
    if (t > 0 && t < dist) {
      _closest.copy(_dir).multiplyScalar(t).add(camera.position)
      if (_closest.lengthSq() < (R_EARTH * 1.01) ** 2) isBehindEarth = true
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
        {isSelected && <pointLight color="#00f0ff" intensity={0.65} distance={1.2} />}
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
