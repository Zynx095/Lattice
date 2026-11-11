/**
 * Static backdrop. Shown while the 3D scene loads, when WebGL is unavailable,
 * when the GPU context is lost and when the background is switched off.
 * Pure CSS and SVG: no JavaScript cost, no motion. One drawing per theme.
 */
export interface SceneFallbackProps {
  accent: string
  tone: 'dark' | 'light'
  /** Only the ambient wash, without the line drawing (used under the live scene). */
  plain?: boolean
}

export function SceneFallback({ accent, tone, plain = false }: SceneFallbackProps) {
  const light = tone === 'light'
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: 'hsl(var(--background))' }}>
      <div
        className="absolute inset-0"
        style={{
          background: light
            ? `radial-gradient(55% 60% at 80% 12%, rgba(255, 255, 255, 0.95), transparent 70%),
               radial-gradient(45% 45% at 6% 96%, rgba(201, 214, 232, 0.5), transparent 70%),
               radial-gradient(40% 40% at 96% 92%, color-mix(in srgb, ${accent} 16%, transparent), transparent 70%)`
            : `radial-gradient(60% 55% at 82% 8%, color-mix(in srgb, ${accent} 11%, transparent), transparent 70%),
               radial-gradient(50% 50% at 8% 100%, rgba(143, 163, 200, 0.07), transparent 70%)`,
        }}
      />
      {!plain && !light && (
        <svg className="absolute right-[-4%] top-[-6%] h-[78vh] max-h-[720px] w-auto opacity-50" viewBox="0 0 400 400" fill="none" stroke={accent} strokeWidth="0.8" strokeLinejoin="round" aria-hidden="true">
          <g opacity="0.55">
            <path d="M200 60 320 130 320 270 200 340 80 270 80 130Z" />
            <path d="M200 60 258 170 142 170ZM142 170 80 130M258 170 320 130M142 170 80 270M258 170 320 270M142 170 200 270 258 170M200 270 80 270M200 270 320 270M200 270 200 340" />
          </g>
          <g opacity="0.4">
            <ellipse cx="200" cy="200" rx="188" ry="52" transform="rotate(-18 200 200)" />
            <ellipse cx="200" cy="200" rx="170" ry="70" transform="rotate(34 200 200)" />
          </g>
          <g fill={accent} stroke="none" opacity="0.5">
            <circle cx="36" cy="90" r="1.4" />
            <circle cx="118" cy="40" r="1" />
            <circle cx="372" cy="210" r="1.4" />
            <circle cx="300" cy="372" r="1" />
            <circle cx="160" cy="382" r="1.2" />
            <circle cx="20" cy="220" r="1" />
          </g>
        </svg>
      )}
      {!plain && light && (
        <svg className="absolute right-[-2%] top-[-4%] h-[76vh] max-h-[700px] w-auto" viewBox="0 0 400 400" fill="none" strokeLinejoin="round" aria-hidden="true">
          <defs>
            <radialGradient id="fallback-pearl" cx="38%" cy="32%" r="70%">
              <stop offset="0" stopColor="#ffffff" />
              <stop offset="0.6" stopColor="#f1ece2" />
              <stop offset="1" stopColor="#d9d5cc" />
            </radialGradient>
          </defs>
          <circle cx="200" cy="200" r="56" fill="url(#fallback-pearl)" />
          <path d="M200 96 290 148 290 252 200 304 110 252 110 148Z" stroke="#b6bcc8" strokeWidth="0.9" fill="rgba(255,255,255,0.28)" />
          <path d="M200 96 200 304M110 148 290 252M290 148 110 252" stroke="#b6bcc8" strokeWidth="0.6" opacity="0.6" />
          <g stroke={accent} strokeWidth="1" opacity="0.75">
            <ellipse cx="200" cy="200" rx="150" ry="40" transform="rotate(-20 200 200)" />
            <ellipse cx="200" cy="200" rx="186" ry="58" transform="rotate(28 200 200)" />
          </g>
          <circle cx="342" cy="150" r="9" fill="url(#fallback-pearl)" />
          <circle cx="62" cy="268" r="6" fill="url(#fallback-pearl)" />
          <circle cx="330" cy="318" r="4" fill="url(#fallback-pearl)" />
        </svg>
      )}
    </div>
  )
}
