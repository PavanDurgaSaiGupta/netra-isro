import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'
import { Html, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { TextureLoader } from 'three'
import gsap from 'gsap'
import { geodeticToVector3, type SatelliteItem } from '../services/satelliteData'
import { useSatellites } from '../context/SatelliteContext'
import { playLockSound } from '../utils/audio'

const R_EARTH = 2.0

/* ---------- Bengaluru ISTRAC Ground Station Base Marker ---------- */

function GroundStationBeam() {
  const pos = useMemo(() => geodeticToVector3(12.9716, 77.5946, 0), [])
  const labelRef = useRef<HTMLDivElement>(null)
  const stationWorldPos = useMemo(() => new THREE.Vector3(...pos), [pos])

  useFrame(({ camera }) => {
    if (!labelRef.current) return
    const camPos = camera.position
    const normal = stationWorldPos.clone().normalize()
    const camToStation = stationWorldPos.clone().sub(camPos).normalize()
    const isFacingCamera = normal.dot(camToStation) < 0

    if (!isFacingCamera) {
      labelRef.current.style.display = 'none'
      return
    }

    labelRef.current.style.display = 'inline-flex'
    const dist = camera.position.distanceTo(stationWorldPos)
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

/* ---------- Centered 3D Earth Globe with Photorealistic Atmosphere ---------- */

function Earth({ stage }: { stage: number }) {
  const [day, normal, specular, clouds] = useLoader(TextureLoader, [
    '/textures/earth-day.jpg',
    '/textures/earth-normal.jpg',
    '/textures/earth-specular.jpg',
    '/textures/earth-clouds.png',
  ])
  day.colorSpace = THREE.SRGBColorSpace
  for (const t of [day, normal, specular]) t.anisotropy = 8

  const cloudRef = useRef<THREE.Mesh>(null)
  useFrame((_, dt) => {
    if (cloudRef.current) cloudRef.current.rotation.y += dt * 0.007
  })

  // Atmospheric Fresnel Glow Shader (Subtle & Photorealistic)
  const atmosMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: /* glsl */ `
          varying vec3 vN;
          void main() {
            vN = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: /* glsl */ `
          varying vec3 vN;
          void main() {
            float i = pow(0.72 - dot(vN, vec3(0.0, 0.0, 1.0)), 3.2);
            gl_FragColor = vec4(0.15, 0.55, 1.0, 0.8) * max(i, 0.0);
          }`,
        side: THREE.BackSide,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [],
  )

  return (
    <group>
      {/* Centered Earth Sphere */}
      <mesh receiveShadow>
        <sphereGeometry args={[R_EARTH, 64, 64]} />
        <meshStandardMaterial
          map={stage >= 2 ? day : undefined}
          normalMap={stage >= 2 ? normal : undefined}
          roughness={0.58}
          metalness={0.08}
          color={stage >= 2 ? '#ffffff' : '#0c1a2e'}
        />
      </mesh>

      {/* Rotating Cloud Sphere Layer */}
      {stage >= 3 && (
        <mesh ref={cloudRef} scale={1.012} castShadow receiveShadow>
          <sphereGeometry args={[R_EARTH, 64, 64]} />
          <meshStandardMaterial
            map={clouds}
            transparent
            opacity={0.45}
            blending={THREE.NormalBlending}
            depthWrite={false}
            roughness={0.9}
          />
        </mesh>
      )}

      {/* Subtle Atmospheric Corona */}
      {stage >= 4 && (
        <mesh scale={1.05} material={atmosMat}>
          <sphereGeometry args={[R_EARTH, 48, 48]} />
        </mesh>
      )}
    </group>
  )
}

/* ---------- Starfield & Orbital Plane Rings ---------- */

function Starfield3D({ count }: { count: number }) {
  const geo = useMemo(() => {
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
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
    [2.35, [0.35, 0.12, 0.2]], // LEO band
    [3.4, [1.25, 0.3, -0.4]], // MEO band
    [4.9, [0.06, 0.05, 0]], // GEO belt
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

/* ---------- Small-Scale Photorealistic Satellite & Orbit Trail ---------- */

function Satellite3DMarker({
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

  // Rotating targeting reticle when selected
  useFrame((_, dt) => {
    if (reticleRef.current && isSelected) {
      reticleRef.current.rotation.z += dt * 2.2
    }
  })

  // Sync small satellite label smoothly with camera zoom, hide when behind Earth
  useFrame(({ camera }) => {
    if (!labelRef.current) return
    satWorldPos.set(...sat.pos3D)

    // Raycast occlusion test against Earth sphere (center 0,0,0, radius 2.0)
    const camPos = camera.position
    const camToSat = satWorldPos.clone().sub(camPos)
    const dist = camToSat.length()
    const dir = camToSat.clone().normalize()
    const t = -camPos.dot(dir)

    let isBehindEarth = false
    if (t > 0 && t < dist) {
      const closestSq = camPos.clone().add(dir.clone().multiplyScalar(t)).lengthSq()
      if (closestSq < (R_EARTH * 1.01) ** 2) {
        isBehindEarth = true
      }
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

  // Compute live elliptical orbit trail
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
      {/* Orbital Trail Line */}
      <primitive object={trailLine} />

      {/* Satellite Node in 3D */}
      <group position={pos}>
        {/* Invisible enlarged hit target for effortless clicking */}
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

        {/* Selected Targeting Reticle */}
        {isSelected && (
          <mesh ref={reticleRef}>
            <ringGeometry args={[0.048, 0.06, 24]} />
            <meshBasicMaterial color="#00f0ff" side={THREE.DoubleSide} transparent opacity={0.9} />
          </mesh>
        )}

        {/* Small Delicate Center Core Beacon */}
        <mesh>
          <sphereGeometry args={[isSelected ? 0.024 : hovered ? 0.02 : 0.015, 16, 16]} />
          <meshBasicMaterial color={isSelected ? '#00f0ff' : hovered ? '#ffffff' : sat.color} />
        </mesh>

        {/* Small-Scale Physical Satellite Body */}
        {isDebris ? (
          <mesh castShadow>
            <tetrahedronGeometry args={[0.022]} />
            <meshStandardMaterial
              color="#ff4444"
              emissive="#ff2222"
              emissiveIntensity={0.5}
              roughness={0.4}
              metalness={0.7}
            />
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
              <meshStandardMaterial
                color="#ffffff"
                emissive={sat.color}
                emissiveIntensity={isSelected ? 0.8 : 0.3}
                roughness={0.3}
                metalness={0.8}
              />
            </mesh>
            {/* Small Solar Panels */}
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

        {/* Subtle Local Point Light */}
        <pointLight color={isSelected ? '#00f0ff' : sat.color} intensity={isSelected ? 0.8 : 0.2} distance={0.5} />

        {/* Small Satellite Label Synced with Camera Zoom & Clickable */}
        <Html position={[0, 0, 0]} center={false} style={{ pointerEvents: 'auto' }}>
          <div
            ref={labelRef}
            className={`sat-zoom-label hud-text ${
              isSelected ? 'sat-zoom-label--selected' : hovered ? 'sat-zoom-label--hovered' : ''
            }`}
            onClick={(e) => {
              e.stopPropagation()
              onSelect()
            }}
            onPointerOver={(e) => {
              e.stopPropagation()
              setHovered(true)
            }}
            onPointerOut={() => {
              setHovered(false)
            }}
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

/* ---------- Camera Fly-To & Follow Controller (Fluid Multi-Satellite Gliding) ---------- */

function CameraFlyToController({
  controlsRef,
  selectedSat,
  recenterTrigger,
  resetViewTrigger,
}: {
  controlsRef: React.RefObject<any>
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

  // Detach following if user manually drags/pans controls
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

  // Fly smoothly to satellite on selection change or explicit recenter
  useEffect(() => {
    if (!selectedSat || !controlsRef.current) return
    const satId = selectedSat.id
    const isNewSat = satId !== lastTargetIdRef.current
    const isExplicitRecenter = recenterTrigger !== lastRecenterRef.current

    if (!isNewSat && !isExplicitRecenter) return
    lastTargetIdRef.current = satId
    lastRecenterRef.current = recenterTrigger

    // Reset following and kill active flight tween
    isFollowingRef.current = false
    if (activeTweenRef.current) {
      activeTweenRef.current.kill()
      activeTweenRef.current = null
    }

    const ctrl = controlsRef.current
    const targetPos = new THREE.Vector3(...selectedSat.pos3D)

    // Camera destination: radial offset + slight elevation
    const radial = targetPos.clone().normalize()
    const targetCam = targetPos
      .clone()
      .add(radial.multiplyScalar(0.75))
      .add(new THREE.Vector3(0.2, 0.22, 0.18))

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
      duration: 1.2,
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

  // Reset view to centered Earth globe
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
      duration: 1.2,
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

  // Follow satellite smoothly as it orbits in real time
  useFrame(() => {
    if (
      isFollowingRef.current &&
      selectedSat &&
      controlsRef.current &&
      !isUserDraggingRef.current &&
      !activeTweenRef.current
    ) {
      const livePos = new THREE.Vector3(...selectedSat.pos3D)
      controlsRef.current.target.lerp(livePos, 0.08)
      controlsRef.current.update()
    }
  })

  return null
}

/* ---------- Main OrbitScene Component ---------- */

export default function OrbitScene() {
  const controlsRef = useRef<any>(null)
  const { filteredSatellites, selectedSat, setSelectedSat, recenterTrigger, resetViewTrigger } = useSatellites()

  const [loadingStage, setLoadingStage] = useState(1)
  const [autoRotate, setAutoRotate] = useState(true)
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

  // Auto-rotate interaction handler: pauses immediately on interaction, resumes after 6s idle
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
    <div className="orbit-canvas-container">
      <Canvas
        shadows="soft"
        dpr={[1, mobile ? 1.25 : 1.75]}
        camera={{ position: [0, 0, 8.5], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
      >
        {/* Physical Lighting */}
        <ambientLight color="#1e2e47" intensity={0.65} />
        <directionalLight
          position={[8, 3.5, 6]}
          intensity={2.8}
          color="#fff8eb"
          castShadow
          shadow-mapSize={[2048, 2048]}
        />
        <pointLight position={[-6, -3, -4]} intensity={0.45} color="#00f0ff" />

        <Suspense fallback={null}>
          {/* Centered Earth Globe */}
          <Earth stage={loadingStage} />

          {/* Bengaluru ISTRAC Ground Station Marker */}
          <GroundStationBeam />

          {/* 3D Starfield */}
          <Starfield3D count={mobile ? 600 : 1200} />

          {/* Orbit Regime Bands */}
          <OrbitPlanes />

          {/* Unified Real-Time Satellites Rendered in 3D */}
          {filteredSatellites.map((sat) => (
            <Satellite3DMarker
              key={sat.id}
              sat={sat}
              isSelected={selectedSat?.id === sat.id}
              onSelect={() => {
                playLockSound()
                setSelectedSat(sat)
              }}
            />
          ))}
        </Suspense>

        {/* Centered OrbitControls */}
        <OrbitControls
          ref={controlsRef}
          target={[0, 0, 0]}
          enableZoom={true}
          minDistance={2.4}
          maxDistance={18}
          zoomSpeed={0.85}
          enablePan={true}
          panSpeed={0.45}
          autoRotate={autoRotate && !selectedSat}
          autoRotateSpeed={0.35}
          enableDamping={true}
          dampingFactor={0.06}
          minPolarAngle={Math.PI * 0.12}
          maxPolarAngle={Math.PI * 0.88}
          onStart={handleControlsStart}
          onEnd={handleControlsEnd}
        />

        {/* Camera Fly-To & Follow Controller */}
        <CameraFlyToController
          controlsRef={controlsRef}
          selectedSat={selectedSat}
          recenterTrigger={recenterTrigger}
          resetViewTrigger={resetViewTrigger}
        />
      </Canvas>
    </div>
  )
}
