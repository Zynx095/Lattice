import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { makeRadialTexture, mulberry32 } from './shared'

interface Layer {
  share: number
  /** z range: [near, far] */
  depth: [number, number]
  size: number
  opacity: number
  /** Radians per second of drift around the vertical axis. */
  drift: number
}

// Three depth layers: sparse and bright in front, dense and faint behind.
const LAYERS: Layer[] = [
  { share: 0.18, depth: [1, 4], size: 0.07, opacity: 0.55, drift: 0.012 },
  { share: 0.34, depth: [-5, 0], size: 0.05, opacity: 0.4, drift: 0.007 },
  { share: 0.48, depth: [-16, -6], size: 0.045, opacity: 0.28, drift: 0.004 },
]

export interface ParticleFieldProps {
  count: number
  /** Colour of the front layer. */
  color: string
  /** Colour of the two layers behind it. */
  baseColor?: string
  /** Motion multiplier. 0 holds still. */
  speed: number
  /** Multiplier on every layer's opacity. */
  opacity?: number
  /** Additive blending makes particles glow on dark backgrounds. Leave off on light ones. */
  additive?: boolean
}

/** Suspended dust in three depth layers. One draw call per layer. */
export function ParticleField({ count, color, baseColor = '#c9c9d1', speed, opacity = 1, additive = false }: ParticleFieldProps) {
  const layers = useRef<(THREE.Points | null)[]>([])
  const time = useRef(0)
  const sprite = useMemo(() => makeRadialTexture(32), [])

  const geometries = useMemo(() => {
    const random = mulberry32(7)
    return LAYERS.map((layer) => {
      const n = Math.max(1, Math.round(count * layer.share))
      const positions = new Float32Array(n * 3)
      for (let i = 0; i < n; i++) {
        positions[i * 3] = (random() - 0.5) * 32
        positions[i * 3 + 1] = (random() - 0.5) * 18
        positions[i * 3 + 2] = layer.depth[0] + random() * (layer.depth[1] - layer.depth[0])
      }
      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      return geometry
    })
  }, [count])

  useFrame((_, delta) => {
    if (speed === 0) return
    time.current += delta * speed
    layers.current.forEach((points, i) => {
      if (!points) return
      points.rotation.y += LAYERS[i].drift * delta * speed
      points.position.y = Math.sin(time.current * 0.08 + i * 2) * 0.3
    })
  })

  if (count <= 0) return null

  return (
    <>
      {LAYERS.map((layer, i) => (
        <points key={i} ref={(el) => (layers.current[i] = el)} geometry={geometries[i]} frustumCulled={false}>
          <pointsMaterial
            map={sprite}
            color={i === 0 ? color : baseColor}
            size={layer.size}
            sizeAttenuation
            transparent
            opacity={Math.min(1, layer.opacity * opacity)}
            depthWrite={false}
            blending={additive ? THREE.AdditiveBlending : THREE.NormalBlending}
          />
        </points>
      ))}
    </>
  )
}
