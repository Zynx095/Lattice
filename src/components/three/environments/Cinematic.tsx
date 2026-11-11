import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Edges, Environment, Lightformer } from '@react-three/drei'
import * as THREE from 'three'
import { ParticleField } from '../ParticleField'
import { ease, makeBeamTexture, makeRadialTexture, mulberry32, routeOrientation, type EnvironmentProps } from '../shared'

/**
 * DARK THEME ENVIRONMENT: "Cinematic".
 *
 * Composition, front to back:
 *   foreground  one large dark shard at the lower right edge, mostly off-screen
 *   focal       the Core: a faceted metal body inside a wire shell, held by three gyroscope rings
 *               and a thin orbit of sparks, with a soft halo and one light shaft behind it
 *   mid         slow-turning metal shards scattered around the core
 *   background  a colonnade of monoliths rising out of the fog
 *   everywhere  suspended dust in three depth layers
 *
 * Draw calls stay low: monoliths and shards are instanced, materials are shared,
 * reflections come from a tiny environment map rendered once.
 */

const dummy = new THREE.Object3D()

/* ---------- Focal point ---------- */

function Core({ accent, speed, lighting, routeKey, compact }: { accent: THREE.Color; speed: number; lighting: number; routeKey: string; compact: boolean }) {
  const group = useRef<THREE.Group>(null)
  const body = useRef<THREE.Mesh>(null)
  const shell = useRef<THREE.Mesh>(null)
  const rings = useRef<(THREE.Mesh | null)[]>([])
  const sparks = useRef<THREE.Points>(null)
  const halo = useRef<THREE.Mesh>(null)
  const time = useRef(0)

  const glow = useMemo(() => makeRadialTexture(128, [[0, 'rgba(255,255,255,0.9)'], [0.25, 'rgba(255,255,255,0.35)'], [1, 'rgba(255,255,255,0)']]), [])
  const beam = useMemo(makeBeamTexture, [])
  const dot = useMemo(() => makeRadialTexture(32), [])

  const sparkGeometry = useMemo(() => {
    const random = mulberry32(21)
    const n = compact ? 90 : 200
    const positions = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      const a = random() * Math.PI * 2
      const r = 2.95 + (random() - 0.5) * 0.5
      positions[i * 3] = Math.cos(a) * r
      positions[i * 3 + 1] = (random() - 0.5) * 0.16
      positions[i * 3 + 2] = Math.sin(a) * r
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return g
  }, [compact])

  const target = useMemo(() => routeOrientation(routeKey), [routeKey])

  useFrame((_, delta) => {
    const g = group.current
    if (!g) return
    if (speed === 0) {
      g.rotation.set(target.x, target.y, 0)
      return
    }
    const k = ease(delta, 1.2)
    g.rotation.x += (target.x - g.rotation.x) * k
    g.rotation.y += (target.y - g.rotation.y) * k

    const d = delta * speed
    time.current += d
    const t = time.current
    g.position.y = Math.sin(t * 0.35) * 0.12
    if (body.current) {
      body.current.rotation.y += d * 0.08
      body.current.rotation.x += d * 0.03
    }
    if (shell.current) {
      shell.current.rotation.y -= d * 0.05
      shell.current.rotation.z += d * 0.02
    }
    rings.current.forEach((ring, i) => {
      if (!ring) return
      ring.rotation.x += d * (0.11 - i * 0.03)
      ring.rotation.y += d * (0.05 + i * 0.025)
    })
    if (sparks.current) sparks.current.rotation.y += d * 0.12
    // The halo breathes: a slow, low-amplitude pulse reads as stored energy.
    if (halo.current) (halo.current.material as THREE.MeshBasicMaterial).opacity = (0.2 + Math.sin(t * 0.6) * 0.05) * lighting
  })

  return (
    <group ref={group}>
      {/* Light shaft and halo sit behind the body and never write depth. */}
      <mesh position={[-0.6, 1.6, -2.2]} rotation={[0, 0, 0.42]}>
        <planeGeometry args={[4.2, 17]} />
        <meshBasicMaterial map={beam} color={accent} transparent opacity={0.085 * lighting} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh ref={halo} position={[0, 0, -1.4]}>
        <planeGeometry args={[11, 11]} />
        <meshBasicMaterial map={glow} color={accent} transparent opacity={0.2} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>

      <mesh ref={body}>
        <icosahedronGeometry args={[1.18, 1]} />
        <meshStandardMaterial color="#5a5a66" metalness={1} roughness={0.3} flatShading />
      </mesh>

      <mesh ref={shell} rotation={[0.4, 0.2, 0]}>
        <icosahedronGeometry args={[1.85, 1]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        <Edges threshold={1} color={accent} transparent opacity={0.3} />
      </mesh>

      {[2.15, 2.5, 2.85].map((radius, i) => (
        <mesh key={radius} ref={(el) => (rings.current[i] = el)} rotation={[0.9 + i * 0.7, i * 1.1, i * 0.5]}>
          <torusGeometry args={[radius, i === 1 ? 0.022 : 0.012, 6, compact ? 72 : 128]} />
          <meshStandardMaterial color={accent} metalness={1} roughness={0.22} emissive={accent} emissiveIntensity={0.12} />
        </mesh>
      ))}

      <points ref={sparks} geometry={sparkGeometry} rotation={[0.35, 0, 0.2]}>
        <pointsMaterial map={dot} color={accent} size={0.045} sizeAttenuation transparent opacity={0.8} depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
    </group>
  )
}

/* ---------- Background: colonnade of monoliths ---------- */

function Monoliths({ count }: { count: number }) {
  const mesh = useRef<THREE.InstancedMesh>(null)

  useLayoutEffect(() => {
    const m = mesh.current
    if (!m) return
    const random = mulberry32(5)
    for (let i = 0; i < count; i++) {
      // Two loose rows curving away from the viewer, taller towards the back.
      const along = i / (count - 1)
      const row = i % 2
      const depth = -7 - along * 17 - row * 2.5
      const height = 4 + random() * 6 + along * 6
      const width = 0.5 + random() * 0.9
      dummy.position.set((along - 0.5) * 44 + (random() - 0.5) * 3, -6.5 + height / 2 - random() * 1.5, depth)
      dummy.rotation.set(0, random() * Math.PI, (random() - 0.5) * 0.05)
      dummy.scale.set(width, height, width * (0.6 + random() * 0.8))
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
    }
    m.instanceMatrix.needsUpdate = true
  }, [count])

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#4a4a58" metalness={0.85} roughness={0.4} />
    </instancedMesh>
  )
}

/* ---------- Mid-ground: drifting metal shards ---------- */

function Shards({ count, speed }: { count: number; speed: number }) {
  const mesh = useRef<THREE.InstancedMesh>(null)
  const time = useRef(0)

  const shards = useMemo(() => {
    const random = mulberry32(13)
    return Array.from({ length: count }, () => {
      // Keep the middle of the frame clear, where the core and the content sit.
      const side = random() < 0.5 ? -1 : 1
      return {
        x: side * (3.5 + random() * 11),
        y: (random() - 0.5) * 11,
        z: -2 - random() * 12,
        scale: 0.18 + random() * 0.55,
        stretch: 1 + random() * 2.2,
        spin: (random() - 0.5) * 0.25,
        phase: random() * Math.PI * 2,
        tilt: random() * Math.PI,
      }
    })
  }, [count])

  const place = (t: number) => {
    const m = mesh.current
    if (!m) return
    shards.forEach((s, i) => {
      dummy.position.set(s.x, s.y + Math.sin(t * 0.25 + s.phase) * 0.35, s.z)
      dummy.rotation.set(s.tilt + t * s.spin, s.phase + t * s.spin * 0.7, 0)
      dummy.scale.set(s.scale, s.scale * s.stretch, s.scale)
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
    })
    m.instanceMatrix.needsUpdate = true
  }

  useLayoutEffect(() => place(0), [shards]) // eslint-disable-line react-hooks/exhaustive-deps
  useFrame((_, delta) => {
    if (speed === 0) return
    time.current += delta * speed
    place(time.current)
  })

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]} frustumCulled={false}>
      <octahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color="#4c4c58" metalness={1} roughness={0.35} flatShading />
    </instancedMesh>
  )
}

/* ---------- Environment ---------- */

export function CinematicEnvironment({ accent, background, speed, lighting, routeKey, particleCount }: EnvironmentProps) {
  const viewport = useThree((s) => s.viewport)
  const scene = useThree((s) => s.scene)
  const compact = viewport.width < 9
  const accentColor = useMemo(() => new THREE.Color(accent), [accent])

  // Reflection strength follows the lighting control without re-rendering the environment map.
  useEffect(() => {
    scene.environmentIntensity = 0.9 * lighting
  }, [scene, lighting])

  // The core sits right of centre and above the middle, where page headers leave room.
  const anchor: [number, number, number] = compact ? [viewport.width * 0.24, viewport.height * 0.31, -3] : [viewport.width * 0.27, viewport.height * 0.2, 0]

  return (
    <>
      <fog attach="fog" args={[background, 9, 38]} />

      {/* A small studio rendered once into a cube map gives the metal something to reflect. */}
      <Environment key={accent} resolution={64} frames={1}>
        <Lightformer form="rect" intensity={3} color="#dfe6ff" position={[0, 6, 2]} rotation-x={Math.PI / 2} scale={[14, 3, 1]} />
        <Lightformer form="rect" intensity={2.2} color={accent} position={[7, 1, 3]} rotation-y={-Math.PI / 2} scale={[6, 3, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#7f95c9" position={[-7, -2, 2]} rotation-y={Math.PI / 2} scale={[5, 4, 1]} />
        <Lightformer form="ring" intensity={1.5} color="#ffffff" position={[0, 0, 8]} scale={3} />
      </Environment>

      <ambientLight intensity={0.22 * lighting} />
      <directionalLight position={[-6, 9, 6]} intensity={1.3 * lighting} color="#e3e8ff" />
      <pointLight position={[anchor[0] + 3, anchor[1] + 1, 4]} intensity={70 * lighting} distance={16} color={accent} />
      <pointLight position={[anchor[0] - 4, anchor[1] - 3, -3]} intensity={36 * lighting} distance={18} color="#6f86c4" />

      <group position={anchor} scale={compact ? 0.62 : 1}>
        <Core accent={accentColor} speed={speed} lighting={lighting} routeKey={routeKey} compact={compact} />
      </group>

      <Shards count={compact ? 12 : 26} speed={speed} />
      <Monoliths count={compact ? 18 : 40} />

      {/* Foreground silhouette for depth. Unlit by design: it should stay a shape, not a detail. */}
      {!compact && (
        <mesh position={[viewport.width * 0.52, -viewport.height * 0.52, 4.2]} rotation={[0.5, 0.7, 0.3]} scale={[1.5, 2.6, 1.5]}>
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#16161b" metalness={0.8} roughness={0.6} flatShading />
        </mesh>
      )}

      <ParticleField count={particleCount} color={accent} baseColor="#b9bdd0" speed={speed} additive />
    </>
  )
}
