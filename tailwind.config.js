/** @type {import('tailwindcss').Config} */
const token = (name) => `hsl(var(--${name}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Instrument Sans Variable"', 'system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
        mono: ['"Cascadia Mono"', 'Consolas', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
        xs: ['0.75rem', { lineHeight: '1.125rem' }],
        sm: ['0.8125rem', { lineHeight: '1.25rem' }],
        base: ['0.875rem', { lineHeight: '1.375rem' }],
        md: ['1rem', { lineHeight: '1.5rem' }],
        lg: ['1.25rem', { lineHeight: '1.75rem' }],
        xl: ['1.75rem', { lineHeight: '2.125rem' }],
        '2xl': ['2.25rem', { lineHeight: '2.5rem' }],
      },
      colors: {
        background: token('background'),
        foreground: token('foreground'),
        card: { DEFAULT: token('surface'), foreground: token('foreground') },
        raised: token('raised'),
        overlay: token('overlay'),
        border: token('border'),
        'border-strong': token('border-strong'),
        input: token('border-strong'),
        ring: token('primary'),
        primary: { DEFAULT: token('primary'), foreground: token('primary-foreground') },
        secondary: { DEFAULT: token('raised'), foreground: token('foreground') },
        muted: { DEFAULT: token('raised'), foreground: token('muted-foreground') },
        subtle: token('subtle'),
        destructive: { DEFAULT: token('danger'), foreground: token('background') },
        success: token('success'),
        warning: token('warning'),
        danger: token('danger'),
        info: token('info'),
      },
      borderRadius: { sm: '4px', md: '6px', lg: '10px', xl: '14px' },
      boxShadow: {
        pop: 'var(--shadow-pop)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'rise-in': {
          from: { opacity: '0', transform: 'translateY(6px) scale(0.985)' },
          to: { opacity: '1', transform: 'none' },
        },
        'slide-in': { from: { transform: 'translateX(-100%)' }, to: { transform: 'none' } },
        pulse3: { '0%, 80%, 100%': { opacity: '0.25' }, '40%': { opacity: '1' } },
        eq: { '0%, 100%': { transform: 'scaleY(0.35)' }, '50%': { transform: 'scaleY(1)' } },
      },
      animation: {
        'fade-in': 'fade-in 160ms ease-out',
        'rise-in': 'rise-in 180ms cubic-bezier(0.2, 0.8, 0.2, 1)',
        'slide-in': 'slide-in 220ms cubic-bezier(0.2, 0.8, 0.2, 1)',
        pulse3: 'pulse3 1.2s ease-in-out infinite',
        eq: 'eq 1.05s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
