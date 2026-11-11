import { useEffect, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { PerformanceMonitor } from '@react-three/drei'
import { AetherEnvironment } from './environments/Aether'
import { CinematicEnvironment } from './environments/Cinematic'
import { GeometryCluster } from './Geometry'
import { ParticleField } from './ParticleField'
import { ease, hash, type EnvironmentProps } from './shared'

export type SceneVariant = 'cinematic' | 'aether' | 'classic'

export interface SceneProps {
  /** Which environment to render. */
  variant: SceneVariant
  /** Any CSS colour. Tints edges, lights and highlights. */
  accent: string
  /** Fog colour. Match the page background. */
  background: string
  /** When true, one still frame is rendered and nothing moves. */
  reducedMotion: boolean
  /** Changing this eases the composition and camera to a new position. */
  routeKey: string
  particleCount: number
  /** Motion multiplier, 0 to 2. */
  speed: number
  /** Lighting multiplier, around 1. */
  lighting: number
  /** Camera follows the pointer slightly. */
  parallax: boolean
  onReady?: () => void
  /** Called when the GPU context is lost, so the host can show the fallback. */
  onContextLost?: () => void
}

/**
 * Camera behaviour shared by every environment:
 *  - a short dolly-in when the scene first appears,
 *  - a small sideways move per route (each page frames the scene a little differently),
 *  - a slow autonomous drift,
 *  - pointer parallax (listens on window, because the canvas ignores pointer events).
 */
function CameraRig({ animate, parallax, speed, routeKey }: { animate: boolean; parallax: boolean; speed: number; routeKey: string }) {
  const pointer = useRef({ x: 0, y: 0 })
  const time = useRef(0)
  const dolly = useRef(1.6)
  const shift = ((hash(routeKey) % 9) / 8 - 0.5) * 0.9

  useEffect(() => {
    if (!animate || !parallax) {
      pointer.current = { x: 0, y: 0 }
      return
    }
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [animate, parallax])

  useFrame((state, delta) => {
    const cam = state.camera
    if (!animate) {
      cam.position.set(shift, 0, 10)
      cam.lookAt(0, 0, 0)
      return
    }
    time.current += delta * speed
    dolly.current += (0 - dolly.current) * ease(delta, 0.9)
    const t = time.current
    const targetX = shift + pointer.current.x * 0.6 + Math.sin(t * 0.11) * 0.25
    const targetY = -pointer.current.y * 0.38 + Math.cos(t * 0.09) * 0.14
    const k = ease(delta, 1.8)
    cam.position.x += (targetX - cam.position.x) * k
    cam.position.y += (targetY - cam.position.y) * k
    cam.position.z = 10 + dolly.current
    cam.lookAt(0, 0, 0)
  })
  return null
}

/** The original v1 scene, kept selectable as "Classic". */
function ClassicEnvironment({ accent, background, speed, lighting, routeKey, particleCount }: EnvironmentProps) {
  return (
    <>
      <fog attach="fog" args={[background, 9, 26]} />
      <ambientLight intensity={0.5 * lighting} />
      <directionalLight position={[-6, 8, 6]} intensity={1.6 * lighting} color="#e9ecff" />
      <pointLight position={[7, 3, 5]} intensity={60 * lighting} distance={18} color={accent} />
      <pointLight position={[-2, -5, 3]} intensity={14 * lighting} distance={14} color="#8fa3c8" />
      <GeometryCluster accent={accent} animate={speed > 0} routeKey={routeKey} />
      <ParticleField count={particleCount} color={accent} speed={speed} />
    </>
  )
}

const ENVIRONMENTS = { cinematic: CinematicEnvironment, aether: AetherEnvironment, classic: ClassicEnvironment }

/** Pauses rendering while the tab is hidden. */
function useTabVisible() {
  const [visible, setVisible] = useState(() => !document.hidden)
  useEffect(() => {
    const onChange = () => setVisible(!document.hidden)
    document.addEventListener('visibilitychange', onChange)
    return () => document.removeEventListener('visibilitychange', onChange)
  }, [])
  return visible
}

export default function Scene({ variant, accent, background, reducedMotion, routeKey, particleCount, speed, lighting, parallax, onReady, onContextLost }: SceneProps) {
  const visible = useTabVisible()
  // Start at a modest pixel ratio; drop to 1 if the frame rate dips.
  const [dpr, setDpr] = useState(() => Math.min(window.devicePixelRatio, 1.5))
  const animate = !reducedMotion && speed > 0
  const Environment = ENVIRONMENTS[variant]

  return (
    <Canvas
      dpr={dpr}
      frameloop={animate ? (visible ? 'always' : 'never') : 'demand'}
      camera={{ position: [0, 0, 11.6], fov: 40, near: 0.1, far: 60 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'low-power', stencil: false }}
      style={{ pointerEvents: 'none' }}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener('webglcontextlost', (e) => {
          e.preventDefault()
          onContextLost?.()
        })
        onReady?.()
      }}
    >
      <PerformanceMonitor onDecline={() => setDpr(1)} />
      <Environment
        key={variant}
        accent={accent}
        background={background}
        speed={animate ? speed : 0}
        lighting={lighting}
        routeKey={routeKey}
        particleCount={particleCount}
      />
      <CameraRig animate={animate} parallax={parallax} speed={speed} routeKey={routeKey} />
    </Canvas>
  )
}
