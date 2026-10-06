import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import * as satellite from 'satellite.js'
import { useSatellites } from '../context/SatelliteContext'
import { geodeticToVector3 } from '../services/satelliteData'
import { fetchIssTrack, type IssTrackPoint } from '../services/issTrack'
import {
  CONSTELLATION_GROUPS,
  CONSTELLATION_LABELS,
  fetchConstellations,
  type ConstellationGroup,
  type ConstellationSat,
} from '../services/constellations'
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

// ISS ground-track trail — real WhereTheISS.at positions, ±36 minutes, one request/minute.
function IssTrackTrail() {
  const [track, setTrack] = useState<IssTrackPoint[]>([])
  useEffect(() => {
    let alive = true
    const load = () => {
      fetchIssTrack()
        .then((pts) => {
          if (alive && pts.length > 0) setTrack(pts)
        })
        .catch(() => {})
    }
    load()
    const id = setInterval(load, 60_000)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [])
  const line = useMemo(() => {
    const geo = new THREE.BufferGeometry().setFromPoints(
      track.map((p) => new THREE.Vector3(...geodeticToVector3(p.lat, p.lng, p.altKm))),
    )
    const mat = new THREE.LineBasicMaterial({ color: '#00f0ff', transparent: true, opacity: 0.35 })
    return new THREE.Line(geo, mat)
  }, [track])
  useEffect(
    () => () => {
      line.geometry.dispose()
      ;(line.material as THREE.Material).dispose()
    },
    [line],
  )
  if (track.length === 0) return null
  return <primitive object={line} />
}

// ---- Constellation lens (item 5) -------------------------------------------
// Operator constellations as a dimmed context layer: NavIC/IRNSS, GPS, Galileo,
// BeiDou. Points propagate from their own satrecs on a local 1.5 s interval —
// deliberately not through SatelliteContext: lens satellites are never catalog
// entries and never selectable.

const CONSTELLATION_COLORS: Record<ConstellationGroup, string> = {
  irnss: '#ff6b1a', // orange — ISRO command color (v2 identity)
  'gps-ops': '#ffd23f', // amber
  galileo: '#4da3ff', // instrument blue
  beidou: '#ff5fa2', // magenta
}

function rgba(hex: string, alpha: number): string {
  const n = Number.parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}

// One instanced mesh per active group; positions are written straight to the
// instance matrices on the 1.5 s tick — zero React state per update.
function ConstellationGroupPoints({ group, sats }: { group: ConstellationGroup; sats: ConstellationSat[] }) {
  const meshRef = useRef<THREE.InstancedMesh>(null)

  const geometry = useMemo(() => new THREE.SphereGeometry(0.008, 8, 6), [])
  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: CONSTELLATION_COLORS[group],
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
      }),
    [group],
  )
  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )

  // Parsing a TLE is expensive — parse each element set once and reuse the satrec.
  const satrecs = useMemo(() => {
    const map = new Map<number, ReturnType<typeof satellite.twoline2satrec>>()
    for (const sat of sats) {
      try {
        map.set(sat.noradId, satellite.twoline2satrec(sat.tle1, sat.tle2))
      } catch {
        // malformed element set — leave it out of the lens
      }
    }
    return map
  }, [sats])

  useEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return
    const hidden = new THREE.Matrix4().makeScale(0, 0, 0)
    const placed = new THREE.Matrix4()
    const update = () => {
      const now = new Date()
      let i = 0
      for (const sat of sats) {
        const rec = satrecs.get(sat.noradId)
        let visible = false
        if (rec && !rec.error) {
          try {
            const pv = satellite.propagate(rec, now)
            if (pv && pv.position && typeof pv.position !== 'boolean') {
              const gmst = satellite.gstime(now)
              const gd = satellite.eciToGeodetic(pv.position, gmst)
              const [x, y, z] = geodeticToVector3(
                satellite.degreesLat(gd.latitude),
                satellite.degreesLong(gd.longitude),
                gd.height,
              )
              if ([x, y, z].every(Number.isFinite)) {
                placed.setPosition(x, y, z)
                mesh.setMatrixAt(i, placed)
                visible = true
              }
            }
          } catch {
            // propagation failure this tick — hide the point
          }
        }
        if (!visible) mesh.setMatrixAt(i, hidden)
        i++
      }
      mesh.instanceMatrix.needsUpdate = true
    }
    update()
    const id = setInterval(update, 1500)
    return () => clearInterval(id)
  }, [sats, satrecs])

  if (sats.length === 0) return null
  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, sats.length]}
      geometry={geometry}
      material={material}
      frustumCulled={false}
    />
  )
}

function ConstellationPoints({
  activeGroups,
  groups,
}: {
  activeGroups: ReadonlySet<ConstellationGroup>
  groups: Record<ConstellationGroup, ConstellationSat[]>
}) {
  return (
    <>
      {CONSTELLATION_GROUPS.map((group) =>
        activeGroups.has(group) && groups[group].length > 0 ? (
          <ConstellationGroupPoints key={group} group={group} sats={groups[group]} />
        ) : null,
      )}
    </>
  )
}

const LENS_STYLE: CSSProperties = {
  position: 'absolute',
  top: 12,
  right: 12,
  zIndex: 30,
  display: 'flex',
  flexWrap: 'wrap',
  justifyContent: 'flex-end',
  gap: 6,
  maxWidth: 'calc(100% - 24px)',
}

const PILL_BASE: CSSProperties = {
  minHeight: 24, // WCAG 2.5.8 AA hit area (border-box is global)
  padding: '3px 10px',
  display: 'inline-flex',
  alignItems: 'center',
  borderRadius: 3,
  border: '1px solid rgba(255, 255, 255, 0.16)',
  background: 'rgba(5, 7, 10, 0.72)',
  color: '#9ca3af',
  cursor: 'pointer',
}

// Keyboard-accessible by construction: native buttons (Enter/Space free), visible
// text as accessible name, aria-pressed as the toggle state. Focus ring comes from
// the global :focus-visible rule. Inline styles guarantee layout/contrast even
// before any stylesheet lands; classes remain as CSS hooks.
function ConstellationLens({
  activeGroups,
  onToggle,
}: {
  activeGroups: ReadonlySet<ConstellationGroup>
  onToggle: (group: ConstellationGroup) => void
}) {
  return (
    <div className="constellation-lens" role="group" aria-label="Constellation lens" style={LENS_STYLE}>
      {CONSTELLATION_GROUPS.map((group) => {
        const active = activeGroups.has(group)
        const accent = CONSTELLATION_COLORS[group]
        return (
          <button
            key={group}
            type="button"
            className="constellation-lens__pill hud-text"
            aria-pressed={active}
            onClick={() => onToggle(group)}
            style={
              active
                ? { ...PILL_BASE, borderColor: rgba(accent, 0.55), color: accent, background: rgba(accent, 0.14) }
                : PILL_BASE
            }
          >
            {CONSTELLATION_LABELS[group]}
          </button>
        )
      })}
    </div>
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

  // Constellation lens — data + which groups are toggled on (lens-only state,
  // never SatelliteContext). One fetch on mount; the service caches for 24 h.
  const [constellations, setConstellations] = useState<Record<ConstellationGroup, ConstellationSat[]> | null>(null)
  const [activeGroups, setActiveGroups] = useState<ReadonlySet<ConstellationGroup>>(() => new Set())

  useEffect(() => {
    let alive = true
    fetchConstellations()
      .then((groups) => {
        if (alive) setConstellations(groups)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  const toggleConstellation = useCallback((group: ConstellationGroup) => {
    setActiveGroups((prev) => {
      const next = new Set(prev)
      if (next.has(group)) next.delete(group)
      else next.add(group)
      return next
    })
  }, [])

  return (
    <div className="orbit-canvas-container">
      {/* role="img" lives on the Canvas wrapper (R3F spreads props onto its div), not on
          the container — the lens buttons below must not sit inside a role="img" subtree,
          which removes descendants from the accessibility tree (WCAG 4.1.2). */}
      <Canvas role="img" aria-label="Interactive 3D globe showing Bharat's satellites and debris in orbit — use mouse to rotate, scroll to zoom, click a satellite to inspect" shadows="soft" dpr={[1, mobile ? 1.25 : 1.75]} camera={{ position: [0, 0, 8.5], fov: 45 }} gl={{ antialias: true, alpha: true }}>
        <ambientLight color="#1e2e47" intensity={0.65} />
        <directionalLight position={[8, 3.5, 6]} intensity={2.8} color="#fff8eb" castShadow shadow-mapSize={[2048, 2048]} />
        <pointLight position={[-6, -3, -4]} intensity={0.45} color="#00f0ff" />
        <Suspense fallback={<EarthFallback />}>
          <Earth stage={loadingStage} />
          <GroundStationBeam />
          <IssTrackTrail />
          <Starfield3D count={mobile ? 600 : 1200} />
          <OrbitPlanes />
          {constellations && <ConstellationPoints activeGroups={activeGroups} groups={constellations} />}
          {filteredSatellites.map((sat) => (
            <SatelliteMarker key={sat.id} sat={sat} isSelected={selectedSat?.id === sat.id} onSelect={() => setSelectedSat(sat)} />
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
      <ConstellationLens activeGroups={activeGroups} onToggle={toggleConstellation} />
      <span className="sr-only">3D orbital surveillance cockpit — {filteredSatellites.length} objects rendered. Select a satellite from the list or click in the 3D view.</span>
    </div>
  )
}
