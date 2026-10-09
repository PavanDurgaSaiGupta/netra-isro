import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import { TextureLoader } from 'three'

const R_EARTH = 2.0

export function EarthFallback() {
  return (
    <group>
      <mesh>
        <sphereGeometry args={[R_EARTH, 32, 32]} />
        <meshStandardMaterial color="#0c1a2e" roughness={0.7} />
      </mesh>
      <mesh>
        <sphereGeometry args={[R_EARTH * 1.002, 24, 24]} />
        <meshBasicMaterial color="#00f0ff" wireframe transparent opacity={0.25} />
      </mesh>
    </group>
  )
}

export function Earth({ segments = 64 }: { stage?: number; segments?: number }) {
  const base = import.meta.env.BASE_URL
  const textures = useLoader(TextureLoader, [
    `${base}textures/earth-day.jpg`,
    `${base}textures/earth-normal.jpg`,
    `${base}textures/earth-specular.jpg`,
    `${base}textures/earth-clouds.png`,
  ]) as [THREE.Texture, THREE.Texture, THREE.Texture, THREE.Texture]
  const [day, normal, specular, clouds] = textures

  // Configure color space & texture filtering once on load (Three.js imperative texture properties)
  useEffect(() => {
    day.colorSpace = THREE.SRGBColorSpace
    clouds.colorSpace = THREE.SRGBColorSpace
    for (const t of [day, normal, specular, clouds]) {
      t.anisotropy = 8
      t.needsUpdate = true
    }
  }, [day, normal, specular, clouds])

  const cloudRef = useRef<THREE.Mesh>(null)
  useFrame((_, dt) => {
    if (cloudRef.current) cloudRef.current.rotation.y += dt * 0.007
  })

  // Atmospheric Fresnel limb scattering shader
  const atmosMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: /* glsl */ `
          varying vec3 vNormal;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: /* glsl */ `
          varying vec3 vNormal;
          void main() {
            // View-aligned Fresnel intensity: highest along the silhouette horizon
            float intensity = pow(0.68 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.6);
            gl_FragColor = vec4(0.05, 0.68, 1.0, 0.8) * max(intensity, 0.0);
          }`,
        side: THREE.BackSide,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [],
  )

  useEffect(() => () => atmosMat.dispose(), [atmosMat])

  const normalScale = useMemo(() => new THREE.Vector2(0.85, 0.85), [])
  const specularColor = useMemo(() => new THREE.Color('#386494'), [])

  return (
    <group>
      {/* Planetary Surface Globe with Specular Ocean Glint & Normal Topography */}
      <mesh receiveShadow>
        <sphereGeometry args={[R_EARTH, segments, segments]} />
        <meshPhongMaterial
          map={day}
          normalMap={normal}
          normalScale={normalScale}
          specularMap={specular}
          specular={specularColor}
          shininess={20}
        />
      </mesh>

      {/* Cloud Deck with Additive Blending to preserve ocean clarity */}
      <mesh ref={cloudRef} scale={1.014}>
        <sphereGeometry args={[R_EARTH, segments, segments]} />
        <meshStandardMaterial
          map={clouds}
          transparent
          opacity={0.38}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          roughness={1.0}
        />
      </mesh>

      {/* Atmospheric Ionosphere Limb Glow */}
      <mesh scale={1.072} material={atmosMat}>
        <sphereGeometry args={[R_EARTH, Math.min(segments, 48), Math.min(segments, 48)]} />
      </mesh>
    </group>
  )
}

export { R_EARTH }
