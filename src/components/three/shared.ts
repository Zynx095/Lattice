import * as THREE from 'three'

/** Props every environment receives from Scene. */
export interface EnvironmentProps {
  /** Any CSS colour. Tints edges, key lights and highlights. */
  accent: string
  /** Fog colour. Matches the page background. */
  background: string
  /** Motion multiplier. 0 means hold still. */
  speed: number
  /** Lighting multiplier, around 1. */
  lighting: number
  /** Changing this eases the composition to a new orientation. */
  routeKey: string
  particleCount: number
}

/** Small deterministic PRNG so every load composes the same scene. */
export function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function hash(text: string): number {
  let h = 0
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0
  return Math.abs(h)
}

/** A stable, slightly different orientation per route. */
export function routeOrientation(routeKey: string, spread = 1): { x: number; y: number } {
  const h = hash(routeKey)
  return { x: (((h % 7) / 7) * 0.3 - 0.1) * spread, y: (((h >> 3) % 11) / 11) * 0.9 * spread }
}

/** Soft round sprite on a small canvas: particles, glows and contact shadows all reuse it. */
export function makeRadialTexture(size = 64, stops: [number, string][] = [[0, 'rgba(255,255,255,1)'], [0.45, 'rgba(255,255,255,0.5)'], [1, 'rgba(255,255,255,0)']]): THREE.Texture {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  stops.forEach(([at, colour]) => g.addColorStop(at, colour))
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

/** A vertical light shaft: bright along the middle, fading to both ends and both sides. */
export function makeBeamTexture(): THREE.Texture {
  const w = 32
  const h = 128
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  const vertical = ctx.createLinearGradient(0, 0, 0, h)
  vertical.addColorStop(0, 'rgba(255,255,255,0)')
  vertical.addColorStop(0.3, 'rgba(255,255,255,0.9)')
  vertical.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = vertical
  ctx.fillRect(0, 0, w, h)
  ctx.globalCompositeOperation = 'destination-in'
  const horizontal = ctx.createLinearGradient(0, 0, w, 0)
  horizontal.addColorStop(0, 'rgba(255,255,255,0)')
  horizontal.addColorStop(0.5, 'rgba(255,255,255,1)')
  horizontal.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = horizontal
  ctx.fillRect(0, 0, w, h)
  return new THREE.CanvasTexture(canvas)
}

/** Exponential ease factor that behaves the same at any frame rate. */
export const ease = (delta: number, rate: number) => 1 - Math.exp(-delta * rate)
