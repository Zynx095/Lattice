import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Edges, Environment, Lightformer } from '@react-three/drei'
import * as THREE from 'three'
import { ParticleField } from '../ParticleField'
import { ease, makeRadialTexture, mulberry32, routeOrientation, type EnvironmentProps } from '../shared'

/**
 * LIGHT THEME ENVIRONMENT: "Aether".
 *
 * A calm orrery in a bright studio, not the dark scene with the lights on.
 *
 *   focal       a pearl inside a faceted glass crystal, circled by two champagne rings
 *               and a handful of small pearls on tilted orbits
 *   mid         tall glass panes standing at different depths, like partitions in a gallery
 *   background  larger, fainter panes and drifting pearls dissolving into the haze
 *   everywhere  fine motes
 *
 * "Glass" here is a clear-coated, iridescent, partly transparent material. It
 * skips real transmission (which costs a second render of the scene) and still
 * reads as glass because of the reflections from the studio environment map.
 */

const dummy = new THREE.Object3D()

function useMaterials(accent: string) {
  const materials = useMemo(
    () => ({
      pearl: new THREE.MeshPhysicalMaterial({
        color: '#e9e0d0',
        roughness: 0.34,
        metalness: 0,
        clearcoat: 1,
        clearcoatRoughness: 0.18,
        sheen: 1,
        sheenRoughness: 0.4,
        sheenColor: new THREE.Color('#ffe7c4'),
        iridescence: 0.35,
        iridescenceIOR: 1.6,
      }),
      glass: new THREE.MeshPhysicalMaterial({
        color: '#d9e3f2',
        roughness: 0.04,
        metalness: 0,
        clearcoat: 1,
        clearcoatRoughness: 0.03,
        iridescence: 1,
        iridescenceIOR: 1.25,
        transparent: true,
        opacity: 0.38,
        depthWrite: false,
        side: THREE.DoubleSide,
        flatShading: true,
      }),
      pane: new THREE.MeshPhysicalMaterial({
        color: '#d5deea',
        roughness: 0.08,
        metalness: 0,
        clearcoat: 1,
        iridescence: 0.6,
        iridescenceIOR: 1.3,
        transparent: true,
        opacity: 0.3,
        depthWrite: false,
      }),
      gold: new THREE.MeshStandardMaterial({ color: accent, metalness: 1, roughness: 0.2 }),
    }),
    [], // eslint-disable-line react-hooks/exhaustive-deps
  )
  useEffect(() => {
    materials.gold.color.set(accent)
  }, [materials, accent])
  useEffect(() => () => Object.values(materials).forEach((m) => m.dispose()), [materials])
  return materials
}

type Materials = ReturnType<typeof useMaterials>

/* ---------- Focal point: the orrery ---------- */

const ORBITS = [
  { radius: 2.35, size: 0.16, tilt: [0.5, 0, 0.3], rate: 0.16, phase: 0 },
  { radius: 2.35, size: 0.08, tilt: [0.5, 0, 0.3], rate: 0.16, phase: 2.6 },
  { radius: 2.95, size: 0.21, tilt: [-0.35, 0.4, -0.2], rate: -0.1, phase: 1.2 },
  { radius: 2.95, size: 0.07, tilt: [-0.35, 0.4, -0.2], rate: -0.1, phase: 4.1 },
  { radius: 3.6, size: 0.12, tilt: [1.1, 0.2, 0.5], rate: 0.07, phase: 3.3 },
] as const

function Orrery({ materials, speed, routeKey, compact }: { materials: Materials; speed: number; routeKey: string; compact: boolean }) {
  const group = useRef<THREE.Group>(null)
  const crystal = useRef<THREE.Mesh>(null)
  const rings = useRef<(THREE.Mesh | null)[]>([])
  const moons = useRef<(THREE.Group | null)[]>([])
  const time = useRef(0)
  const shadow = useMemo(() => makeRadialTexture(64, [[0, 'rgba(40,42,52,0.55)'], [0.5, 'rgba(40,42,52,0.18)'], [1, 'rgba(40,42,52,0)']]), [])
  const target = useMemo(() => routeOrientation(routeKey, 0.7), [routeKey])

  useFrame((_, delta) => {
    const g = group.current
    if (!g) return
    if (speed === 0) {
      g.rotation.set(target.x, target.y, 0)
      return
    }
    const k = ease(delta, 1.1)
    g.rotation.x += (target.x - g.rotation.x) * k
    g.rotation.y += (target.y - g.rotation.y) * k

    const d = delta * speed
    time.current += d
    g.position.y = Math.sin(time.current * 0.3) * 0.1
    if (crystal.current) {
      crystal.current.rotation.y += d * 0.06
      crystal.current.rotation.x += d * 0.025
    }
    rings.current.forEach((ring, i) => ring && (ring.rotation.z += d * (i === 0 ? 0.05 : -0.035)))
    moons.current.forEach((moon, i) => moon && (moon.rotation.y += d * ORBITS[i].rate))
  })

  return (
    <group ref={group}>
      {/* A soft shadow under the group stands in for real shadow maps. */}
      <mesh position={[0.3, -2.9, -0.5]} rotation={[-Math.PI / 2.4, 0, 0]}>
        <planeGeometry args={[7.5, 3.4]} />
        <meshBasicMaterial map={shadow} transparent opacity={0.34} depthWrite={false} />
      </mesh>

      <mesh material={materials.pearl}>
        <sphereGeometry args={[0.92, compact ? 32 : 48, compact ? 20 : 32]} />
      </mesh>

      <mesh ref={crystal} material={materials.glass} rotation={[0.3, 0.5, 0]}>
        <icosahedronGeometry args={[1.72, 0]} />
        <Edges threshold={1} color="#7f8794" transparent opacity={0.6} />
      </mesh>

      <mesh ref={(el) => (rings.current[0] = el)} material={materials.gold} rotation={[Math.PI / 2 + 0.5, 0.3, 0]}>
        <torusGeometry args={[2.35, 0.016, 8, compact ? 80 : 144]} />
      </mesh>
      <mesh ref={(el) => (rings.current[1] = el)} material={materials.gold} rotation={[Math.PI / 2 - 0.35, -0.2, 0.4]}>
        <torusGeometry args={[2.95, 0.01, 8, compact ? 80 : 144]} />
      </mesh>

      {ORBITS.map((orbit, i) => (
        <group key={i} rotation={orbit.tilt as unknown as [number, number, number]}>
          <group ref={(el) => (moons.current[i] = el)} rotation={[0, orbit.phase, 0]}>
            <mesh material={materials.pearl} position={[orbit.radius, 0, 0]}>
              <sphereGeometry args={[orbit.size, 24, 16]} />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  )
}

/* ---------- Glass panes ---------- */

const PANES = [
  // x and y are fractions of the visible width and height at z = 0.
  { x: -0.34, y: -0.08, z: -3.5, w: 2.1, h: 6.4, turn: 0.5, lean: 0.03 },
  { x: -0.12, y: 0.2, z: -7.5, w: 3.2, h: 8.5, turn: -0.3, lean: -0.02 },
  { x: 0.5, y: -0.3, z: -5, w: 2.4, h: 6, turn: -0.7, lean: 0.04 },
  { x: 0.08, y: -0.36, z: -10.5, w: 4.2, h: 10, turn: 0.2, lean: 0 },
  { x: -0.62, y: 0.26, z: -12, w: 5, h: 12, turn: 0.6, lean: -0.03 },
  { x: 0.78, y: 0.3, z: -13, w: 5, h: 12, turn: -0.5, lean: 0.02 },
]

function Panes({ materials, speed, compact }: { materials: Materials; speed: number; compact: boolean }) {
  const viewport = useThree((s) => s.viewport)
  const refs = useRef<(THREE.Mesh | null)[]>([])
  const time = useRef(0)
  const panes = compact ? PANES.slice(0, 4) : PANES

  useFrame((_, delta) => {
    if (speed === 0) return
    time.current += delta * speed
    refs.current.forEach((mesh, i) => {
      if (!mesh) return
      mesh.position.y = panes[i].y * viewport.height + Math.sin(time.current * 0.22 + i * 1.7) * 0.22
      mesh.rotation.y = panes[i].turn + Math.sin(time.current * 0.1 + i) * 0.06
    })
  })

  return (
    <>
      {panes.map((p, i) => (
        <mesh
          key={i}
          ref={(el) => (refs.current[i] = el)}
          material={materials.pane}
          position={[p.x * viewport.width, p.y * viewport.height, p.z]}
          rotation={[0, p.turn, p.lean]}
        >
          <boxGeometry args={[p.w, p.h, 0.05]} />
          <Edges color="#99a1ae" transparent opacity={0.55} />
        </mesh>
      ))}
    </>
  )
}

/* ---------- Drifting pearls ---------- */

function Pearls({ materials, count, speed }: { materials: Materials; count: number; speed: number }) {
  const mesh = useRef<THREE.InstancedMesh>(null)
  const time = useRef(0)
  const pearls = useMemo(() => {
    const random = mulberry32(31)
    return Array.from({ length: count }, () => ({
      x: (random() - 0.5) * 30,
      y: (random() - 0.5) * 13,
      z: -3 - random() * 13,
      size: 0.08 + random() * 0.3,
      phase: random() * Math.PI * 2,
      rate: 0.12 + random() * 0.2,
    }))
  }, [count])

  const place = (t: number) => {
    const m = mesh.current
    if (!m) return
    pearls.forEach((p, i) => {
      dummy.position.set(p.x + Math.cos(t * p.rate * 0.6 + p.phase) * 0.3, p.y + Math.sin(t * p.rate + p.phase) * 0.45, p.z)
      dummy.rotation.set(0, 0, 0)
      dummy.scale.setScalar(p.size)
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
    })
    m.instanceMatrix.needsUpdate = true
  }

  useLayoutEffect(() => place(0), [pearls]) // eslint-disable-line react-hooks/exhaustive-deps
  useFrame((_, delta) => {
    if (speed === 0) return
    time.current += delta * speed
    place(time.current)
  })

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]} material={materials.pearl} frustumCulled={false}>
      <sphereGeometry args={[1, 20, 14]} />
    </instancedMesh>
  )
}

/* ---------- Environment ---------- */

export function AetherEnvironment({ accent, background, speed, lighting, routeKey, particleCount }: EnvironmentProps) {
  const viewport = useThree((s) => s.viewport)
  const scene = useThree((s) => s.scene)
  const compact = viewport.width < 9
  const materials = useMaterials(accent)
  const key = useRef<THREE.DirectionalLight>(null)
  const time = useRef(0)

  useEffect(() => {
    scene.environmentIntensity = 0.7 * lighting
  }, [scene, lighting])

  // The key light wanders a little, so highlights travel slowly across the glass.
  useFrame((_, delta) => {
    if (speed === 0 || !key.current) return
    time.current += delta * speed
    const t = time.current * 0.12
    key.current.position.set(-5 + Math.sin(t) * 3, 8 + Math.cos(t * 0.7) * 1.2, 6)
    key.current.intensity = (2.1 + Math.sin(t * 1.3) * 0.25) * lighting
  })

  const anchor: [number, number, number] = compact ? [viewport.width * 0.2, viewport.height * 0.3, -3.5] : [viewport.width * 0.27, viewport.height * 0.17, 0]

  return (
    <>
      <fog attach="fog" args={[background, 9, 27]} />

      {/* A bright, even studio: broad soft boxes, one warm strip, one cool strip. */}
      <Environment resolution={64} frames={1}>
        <color attach="background" args={['#b9b6b0']} />
        <Lightformer form="rect" intensity={2.6} color="#ffffff" position={[0, 7, 0]} rotation-x={Math.PI / 2} scale={[16, 10, 1]} />
        <Lightformer form="rect" intensity={1.6} color="#fff3df" position={[-8, 1, 2]} rotation-y={Math.PI / 2} scale={[8, 6, 1]} />
        <Lightformer form="rect" intensity={1.3} color="#d6e4fb" position={[8, 0, 2]} rotation-y={-Math.PI / 2} scale={[8, 6, 1]} />
        <Lightformer form="rect" intensity={1.8} color="#e8cf9c" position={[2, -5, 4]} rotation-x={-Math.PI / 2} scale={[7, 1.2, 1]} />
        <Lightformer form="ring" intensity={1.2} color="#ffffff" position={[0, 1, 9]} scale={4} />
      </Environment>

      <ambientLight intensity={0.42 * lighting} color="#fffaf2" />
      <directionalLight ref={key} position={[-5, 8, 6]} intensity={2.1 * lighting} color="#fff4e2" />
      <directionalLight position={[7, -2, 4]} intensity={0.5 * lighting} color="#b9d0ff" />

      <group position={anchor} scale={compact ? 0.6 : 1}>
        <Orrery materials={materials} speed={speed} routeKey={routeKey} compact={compact} />
      </group>

      <Panes materials={materials} speed={speed} compact={compact} />
      <Pearls materials={materials} count={compact ? 8 : 16} speed={speed} />

      <ParticleField count={Math.round(particleCount * 0.55)} color={accent} baseColor="#6f7480" speed={speed} opacity={0.9} />
    </>
  )
}
