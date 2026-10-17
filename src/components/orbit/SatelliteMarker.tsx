import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { SatelliteItem } from '../../services/satelliteData'
import { clearMarkerLabel, upsertMarkerLabel } from './LabelDeconflict'

const R_EARTH = 2.0
const TRAIL_SEGMENTS = 128
/** DOM labels are suppressed past this camera-to-satellite distance (world units). */
const LABEL_CULL_DIST = 11
/** Camera distance at which marker groups render at their authored size (#6). */
const MARKER_SCALE_BASE = 8.5

// Scratch vectors — shared across marker instances but only ever used
// synchronously inside a single useFrame callback, so reuse is safe.
const _satPos = new THREE.Vector3()
const _camToSat = new THREE.Vector3()
const _dir = new THREE.Vector3()
const _closest = new THREE.Vector3()
const _camForward = new THREE.Vector3()
const _projected = new THREE.Vector3()

// Click/hover occlusion sphere (#1): a hair smaller than the rendered globe so
// markers sitting exactly on the limb stay interactive.
const _earthSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), R_EARTH * 0.995)
const _rayHit = new THREE.Vector3()

/** True when the globe stands between the camera and the event hit point (#1). */
function earthBlocksRay(ray: THREE.Ray, hitDistance: number): boolean {
  const hit = ray.intersectSphere(_earthSphere, _rayHit)
  if (!hit) return false
  return ray.origin.distanceTo(hit) < hitDistance - 0.002
}

/**
 * Shared "glowing square" sprite texture, drawn once and reused by every
 * marker. White so each sprite tints it via spriteMaterial.color (cyan when
 * selected, white on hover, the object's own color otherwise). 256px so the
 * square + halo stay crisp when the camera zooms right in (#15).
 */
let glowSquareTextureCache: THREE.CanvasTexture | null = null
function getGlowSquareTexture(): THREE.CanvasTexture {
  if (glowSquareTextureCache) return glowSquareTextureCache
  const SIZE = 256
  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d')!
  const half = 44
  const x = SIZE / 2 - half
  ctx.fillStyle = '#ffffff'
  // Two halo passes (wide then tight) plus a crisp core: reads as a bright
  // square with a soft glow at any zoom level.
  ctx.shadowColor = 'rgba(255, 255, 255, 0.9)'
  ctx.shadowBlur = 56
  ctx.fillRect(x, x, half * 2, half * 2)
  ctx.shadowBlur = 28
  ctx.fillRect(x, x, half * 2, half * 2)
  ctx.shadowBlur = 0
  ctx.fillRect(x + 2, x + 2, (half - 2) * 2, (half - 2) * 2)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  glowSquareTextureCache = tex
  return tex
}

/**
 * Unit circle in the XY plane, shared by every trail ring (#7). Each marker
 * places it with one basis matrix + radius scale instead of rebuilding a
 * 128-segment vertex buffer on every propagation tick.
 */
let unitCircleGeometryCache: THREE.BufferGeometry | null = null
function getUnitCircleGeometry(): THREE.BufferGeometry {
  if (unitCircleGeometryCache) return unitCircleGeometryCache
  const positions = new Float32Array((TRAIL_SEGMENTS + 1) * 3)
  for (let s = 0; s <= TRAIL_SEGMENTS; s++) {
    const a = (s / TRAIL_SEGMENTS) * Math.PI * 2
    positions[s * 3] = Math.cos(a)
    positions[s * 3 + 1] = Math.sin(a)
    positions[s * 3 + 2] = 0
  }
  const geom = new THREE.BufferGeometry()
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  unitCircleGeometryCache = geom
  return geom
}

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
  labelsMode = 'all',
}: {
  sat: SatelliteItem
  isSelected: boolean
  onSelect: () => void
  labelsMode?: 'all' | 'selected'
}) {
  const pos = sat.pos3D
  const groupRef = useRef<THREE.Group>(null)
  const haloRef = useRef<THREE.Sprite>(null)
  const reticleRef = useRef<THREE.Mesh>(null)
  const labelRef = useRef<HTMLDivElement>(null)
  const [hovered, setHovered] = useState(false)
  // Labels render for every marker by default; LOW-tier callers pass 'selected'
  // so only the hovered/selected marker mounts a DOM label (mobile + weak GPU relief)
  const showLabel = labelsMode === 'all' || isSelected || hovered

  // Module-level singleton — same texture object for every marker
  const glowSquareTexture = getGlowSquareTexture()

  // Direction of travel (ascending vs descending) resolved from ECI orbit velocity
  const isAscending = sat.isAscending ?? true

  // Trail ring placement (#7): a shared unit-circle geometry is positioned by
  // one orthonormal basis + radius scale per tick — no vertex rebuilds. The
  // basis maps the parametric circle (cos a, sin a, 0) onto the ring points
  //   (r·cosα·cos a + r·sinα·cosI·sin a, -r·sinI·sin a, -r·sinα·cos a + r·cosI·cosα·sin a)
  const trailMatrix = useMemo(() => {
    const r = Math.hypot(...pos)
    const { alpha, sinI, cosI } = computeOrbitBasis(sat.lat, sat.lng, sat.inclinationDeg, isAscending)
    const cosNode = Math.cos(alpha)
    const sinNode = Math.sin(alpha)
    const u = new THREE.Vector3(cosNode, 0, -sinNode)
    const v = new THREE.Vector3(sinNode * cosI, -sinI, cosI * cosNode)
    const n = new THREE.Vector3().crossVectors(u, v)
    return new THREE.Matrix4().makeBasis(u, v, n).scale(new THREE.Vector3(r, r, r))
  }, [pos, sat.lat, sat.lng, sat.inclinationDeg, isAscending])

  const trailMaterial = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: isSelected ? '#00f0ff' : sat.color,
        transparent: true,
        opacity: isSelected ? 0.9 : 0.35,
      }),
    [isSelected, sat.color],
  )

  const trailLine = useMemo(() => {
    const line = new THREE.Line(getUnitCircleGeometry(), trailMaterial)
    line.matrixAutoUpdate = false
    return line
  }, [trailMaterial])

  useLayoutEffect(() => {
    trailLine.matrix.copy(trailMatrix)
    trailLine.matrixWorldNeedsUpdate = true
  }, [trailLine, trailMatrix])

  // The unit-circle geometry is a shared singleton — never dispose it here;
  // only the per-marker material belongs to this component.
  useEffect(() => {
    return () => {
      trailMaterial.dispose()
    }
  }, [trailMaterial])

  // Drop this marker's label from the de-overlap registry on unmount (#2)
  useEffect(() => {
    return () => clearMarkerLabel(sat.id)
  }, [sat.id])

  useFrame((_, dt) => {
    if (reticleRef.current && isSelected) reticleRef.current.rotation.z += dt * 2.2
  })

  // Distance compensation (#6) + occlusion/distance label logic — zero
  // allocations per frame.
  useFrame(({ camera, size }) => {
    _satPos.set(...sat.pos3D)
    _camToSat.copy(_satPos).sub(camera.position)
    const dist = _camToSat.length()

    // #6: scale the whole marker group with camera distance so squares stay
    // clickable at wide framing and don't balloon when the camera closes in.
    if (groupRef.current) {
      const comp = THREE.MathUtils.clamp(dist / MARKER_SCALE_BASE, 0.9, 2.2)
      groupRef.current.scale.setScalar(comp)
    }

    // Temper the additive halo with camera distance: at wide framing it
    // carries the glow against the glare of the Earth limb, but at pass
    // framing a full-opacity additive square reads as a smeared blob — fade
    // it down so the crisp normal-blended core square carries the close-up.
    // Zero allocation; r3f only reapplies the opacity prop when isSelected/
    // hovered flips (wide≈1 there, so the hook-in doesn't fight the prop).
    if (haloRef.current) {
      const haloMat = haloRef.current.material as THREE.SpriteMaterial
      const wide = THREE.MathUtils.clamp((dist - 3.4) / 4.6, 0, 1)
      haloMat.opacity = (0.25 + 0.75 * wide) * (isSelected ? 1 : 0.92)
    }

    const label = labelRef.current
    if (!label) {
      clearMarkerLabel(sat.id)
      return
    }

    // Past-plane guard: a satellite behind the camera projects to nonsense —
    // never show its label.
    const behindCamera = _camToSat.dot(camera.getWorldDirection(_camForward)) <= 0.001

    _dir.copy(_camToSat).divideScalar(dist || 1)
    const t = -camera.position.dot(_dir)
    let isBehindEarth = false
    if (t > 0 && t < dist) {
      _closest.copy(_dir).multiplyScalar(t).add(camera.position)
      if (_closest.lengthSq() < (R_EARTH * 1.01) ** 2) isBehindEarth = true
    }
    if (behindCamera || isBehindEarth || dist > LABEL_CULL_DIST) {
      if (label.style.display !== 'none') {
        label.style.display = 'none'
        clearMarkerLabel(sat.id)
      }
      return
    }
    label.style.display = 'inline-flex'
    const scale = THREE.MathUtils.clamp(1.06 - (dist / 16) * 0.36, 0.68, 1.06)
    const opacity = isSelected ? 1 : hovered ? 1 : THREE.MathUtils.clamp(1.15 - (dist / 18) * 0.42, 0.7, 0.95)
    label.style.transform = `translate(8px, -50%) scale(${scale})`
    label.style.opacity = `${opacity}`

    // #2: publish the projected screen anchor so LabelDeconflict can resolve
    // chip collisions in one priority-sorted pass per frame.
    _projected.copy(_satPos).project(camera)
    upsertMarkerLabel(
      sat.id,
      label,
      (_projected.x * 0.5 + 0.5) * size.width,
      (-_projected.y * 0.5 + 0.5) * size.height,
      isSelected ? 3 : hovered ? 2 : 1,
      dist,
    )
  })

  return (
    <group>
      <primitive object={trailLine} />
      <group ref={groupRef} position={pos}>
        <mesh
          onClick={(e) => {
            e.stopPropagation()
            if (earthBlocksRay(e.ray, e.distance)) return
            onSelect()
          }}
          onPointerOver={(e) => {
            e.stopPropagation()
            if (earthBlocksRay(e.ray, e.distance)) return
            setHovered(true)
            document.body.style.cursor = 'pointer'
          }}
          onPointerOut={() => {
            setHovered(false)
            document.body.style.cursor = 'crosshair'
          }}
        >
          <sphereGeometry args={[0.3, 12, 12]} />
          <meshBasicMaterial visible={false} />
        </mesh>
        {isSelected && (
          <mesh ref={reticleRef}>
            <ringGeometry args={[0.065, 0.078, 24]} />
            <meshBasicMaterial color="#00f0ff" side={THREE.DoubleSide} transparent opacity={0.9} />
          </mesh>
        )}
        {/* Glowing square marker — camera-facing sprite, tinted per type/state.
            The additive halo is tempered with camera distance so it stays a
            crisp square at pass framing instead of ballooning into a smear;
            the normal-blended core sprite (below) restores the solid square. */}
        <sprite ref={haloRef} scale={isSelected ? 0.26 : hovered ? 0.2 : 0.16}>
          <spriteMaterial
            map={glowSquareTexture}
            color={isSelected ? '#00f0ff' : hovered ? '#ffffff' : sat.color}
            transparent
            opacity={isSelected ? 1 : 0.92}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </sprite>
        {/* #5: over a bright Earth limb the additive halo clips to white — a
            normally-blended core sprite restores the marker's colour. */}
        {(isSelected || hovered) && (
          <sprite renderOrder={1} scale={isSelected ? 0.15 : 0.115}>
            <spriteMaterial
              map={glowSquareTexture}
              color={isSelected ? '#00f0ff' : '#ffffff'}
              transparent
              opacity={0.95}
              depthWrite={false}
              blending={THREE.NormalBlending}
            />
          </sprite>
        )}
        {isSelected && <pointLight color="#00f0ff" intensity={0.65} distance={1.2} />}
        {showLabel && (
          <Html
            position={[0, 0, 0]}
            center={false}
            zIndexRange={[55, 0]}
            style={{ pointerEvents: 'auto' }}
          >
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
        )}
      </group>
    </group>
  )
}
