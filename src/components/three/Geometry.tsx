import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Edges, Float } from '@react-three/drei'
import * as THREE from 'three'

type Kind = 'icosahedron' | 'octahedron' | 'dodecahedron' | 'tetrahedron' | 'torus'

interface Shape {
  kind: Kind
  /** Offset from the cluster anchor. Negative z pushes it into the fog. */
  position: [number, number, number]
  scale: number
  /** Radians per second around its own axis. */
  spin: number
  /** Solid shapes get a dark faceted body under their edges. */
  solid: boolean
}

// Foreground, middle and far layers. All low-poly: under 400 triangles in total.
const SHAPES: Shape[] = [
  { kind: 'icosahedron', position: [0, 0, 0], scale: 1.3, spin: 0.05, solid: true },
  { kind: 'octahedron', position: [-2.1, -1.2, 0.8], scale: 0.5, spin: -0.09, solid: true },
  { kind: 'torus', position: [1.9, 1.5, -1.5], scale: 0.7, spin: 0.07, solid: false },
  { kind: 'dodecahedron', position: [2.4, -2.2, -3.5], scale: 0.9, spin: -0.04, solid: true },
  { kind: 'tetrahedron', position: [-4.6, 2.4, -5], scale: 0.9, spin: 0.06, solid: false },
  { kind: 'icosahedron', position: [-8.5, -2.6, -9], scale: 1.6, spin: 0.03, solid: false },
  { kind: 'octahedron', position: [-13, 3.2, -12], scale: 1.4, spin: -0.03, solid: false },
]

function ShapeGeometry({ kind }: { kind: Kind }) {
  switch (kind) {
    case 'icosahedron':
      return <icosahedronGeometry args={[1, 0]} />
    case 'octahedron':
      return <octahedronGeometry args={[1, 0]} />
    case 'dodecahedron':
      return <dodecahedronGeometry args={[1, 0]} />
    case 'tetrahedron':
      return <tetrahedronGeometry args={[1, 0]} />
    case 'torus':
      return <torusGeometry args={[1, 0.34, 6, 14]} />
  }
}

function ShapeMesh({ shape, accent, animate }: { shape: Shape; accent: THREE.Color; animate: boolean }) {
  const mesh = useRef<THREE.Mesh>(null)
  useFrame((_, delta) => {
    if (!animate || !mesh.current) return
    mesh.current.rotation.x += shape.spin * delta
    mesh.current.rotation.y += shape.spin * 1.3 * delta
  })

  return (
    <Float
      position={shape.position}
      speed={animate ? 0.6 : 0}
      rotationIntensity={0.15}
      floatIntensity={0.5}
      floatingRange={[-0.12, 0.12]}
    >
      <mesh ref={mesh} scale={shape.scale} rotation={[shape.position[0] * 0.4, shape.position[1] * 0.7, 0]}>
        <ShapeGeometry kind={shape.kind} />
        {shape.solid ? (
          <meshStandardMaterial color="#2c2c35" roughness={0.72} metalness={0.12} flatShading />
        ) : (
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        )}
        <Edges threshold={1} color={accent} transparent opacity={shape.solid ? 0.55 : 0.22} />
      </mesh>
    </Float>
  )
}

export interface GeometryClusterProps {
  accent: string
  animate: boolean
  /** Changes to this value ease the cluster to a new orientation (used for page changes). */
  routeKey: string
}

function hash(text: string): number {
  let h = 0
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0
  return h
}

export function GeometryCluster({ accent, animate, routeKey }: GeometryClusterProps) {
  const group = useRef<THREE.Group>(null)
  const viewport = useThree((s) => s.viewport)
  const color = useMemo(() => new THREE.Color(accent), [accent])

  // Each route maps to a stable, slightly different orientation.
  const target = useMemo(() => {
    const h = hash(routeKey)
    return { x: ((h % 7) / 7) * 0.35, y: (((h >> 3) % 11) / 11) * 0.9 }
  }, [routeKey])

  useFrame((_, delta) => {
    const g = group.current
    if (!g) return
    if (!animate) {
      g.rotation.set(target.x, target.y, 0)
      return
    }
    const k = 1 - Math.exp(-delta * 1.4)
    g.rotation.x += (target.x - g.rotation.x) * k
    g.rotation.y += (target.y - g.rotation.y) * k
  })

  // Anchor the cluster to the upper right, where page headers leave room.
  // On narrow viewports it moves towards the centre and shrinks.
  const narrow = viewport.width < 9
  const anchor: [number, number, number] = narrow ? [viewport.width * 0.3, viewport.height * 0.34, -2] : [viewport.width * 0.33, viewport.height * 0.27, 0]

  return (
    <group position={anchor} scale={narrow ? 0.55 : 1}>
      <group ref={group}>
        {SHAPES.map((shape, i) => (
          <ShapeMesh key={i} shape={shape} accent={color} animate={animate} />
        ))}
      </group>
    </group>
  )
}
