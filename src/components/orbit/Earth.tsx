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
        <meshBasicMaterial color="#00f0ff" wireframe transparent opacity={0.2} />
      </mesh>
    </group>
  )
}

export function Earth({ stage }: { stage: number }) {
  const base = import.meta.env.BASE_URL
  const textures = useLoader(TextureLoader, [
    `${base}textures/earth-day.jpg`,
    `${base}textures/earth-normal.jpg`,
    `${base}textures/earth-specular.jpg`,
    `${base}textures/earth-clouds.png`,
  ]) as [THREE.Texture, THREE.Texture, THREE.Texture, THREE.Texture]
  const [day, normal, specular, clouds] = textures
  useEffect(() => {
    day.colorSpace = THREE.SRGBColorSpace
    for (const t of [day, normal, specular] as THREE.Texture[]) t.anisotropy = 8
  }, [day, normal, specular])

  const cloudRef = useRef<THREE.Mesh>(null)
  useFrame((_, dt) => {
    if (cloudRef.current) cloudRef.current.rotation.y += dt * 0.007
  })

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
      {stage >= 3 && (
        <mesh ref={cloudRef} scale={1.012} castShadow receiveShadow>
          <sphereGeometry args={[R_EARTH, 64, 64]} />
          <meshStandardMaterial map={clouds} transparent opacity={0.45} blending={THREE.NormalBlending} depthWrite={false} roughness={0.9} />
        </mesh>
      )}
      {stage >= 4 && (
        <mesh scale={1.05} material={atmosMat}>
          <sphereGeometry args={[R_EARTH, 48, 48]} />
        </mesh>
      )}
    </group>
  )
}

export { R_EARTH }
