import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    container: {
      center: true,
      padding: { DEFAULT: '1rem', sm: '1.25rem', lg: '2rem' },
    },
    extend: {
      colors: {
        // ── Brand ──────────────────────────────────────────────
        'celo-green': {
          DEFAULT: '#35D07F',
          dark: '#1A7C4C',
          light: '#51E07C',
          50: '#E8F8EF',
        },
        'accent-orange': '#FCB045',
        'accent-pink': '#FD1D75',
        // ── Soft-glass semantic (CSS vars) ─────────────────────
        background: 'hsl(var(--background) / <alpha-value>)',
        foreground: 'hsl(var(--foreground) / <alpha-value>)',
        card: {
          DEFAULT: 'hsl(var(--card) / <alpha-value>)',
          foreground: 'hsl(var(--card-foreground) / <alpha-value>)',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted) / <alpha-value>)',
          foreground: 'hsl(var(--muted-foreground) / <alpha-value>)',
        },
        border: 'hsl(var(--border) / <alpha-value>)',
        primary: {
          DEFAULT: 'hsl(var(--primary) / <alpha-value>)',
          foreground: 'hsl(var(--primary-foreground) / <alpha-value>)',
        },
        // ── Compatibility layer ────────────────────────────────
        // Kept so existing components don't silently lose styling
        // before the Phase 3/4 restyle migrates them onto glass
        // classes. Values aligned to the new gradient palette.
        accent: {
          DEFAULT: 'hsl(var(--accent) / <alpha-value>)',
          foreground: 'hsl(var(--accent-foreground) / <alpha-value>)',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive) / <alpha-value>)',
          foreground: 'hsl(var(--destructive-foreground) / <alpha-value>)',
        },
        input: 'hsl(var(--input) / <alpha-value>)',
        ring: 'hsl(var(--ring) / <alpha-value>)',
        // existing `celo` token (~38 usages: text-celo, bg-celo/10,
        // border-celo/*) — mapped to Celo green for both modes.
        celo: {
          DEFAULT: 'hsl(var(--celo) / <alpha-value>)',
          foreground: 'hsl(var(--celo-foreground) / <alpha-value>)',
        },
      },
      backgroundImage: {
        'accent-gradient': 'linear-gradient(90deg, #FCB045 0%, #FD1D75 100%)',
        'progress-gradient': 'linear-gradient(90deg, #FCB045 0%, #FD1D75 100%)',
        'progress-gradient-green': 'linear-gradient(90deg, #35D07F 0%, #1A7C4C 100%)',
      },
      backdropBlur: {
        nav: '24px',
        card: '40px',
      },
      fontFamily: {
        sans: ['Manrope', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '20px',
        '2xl': '24px',
        '3xl': '28px',
      },
      boxShadow: {
        'glow-celo': '0 3px 12px rgba(53, 208, 127, 0.4)',
        'glow-accent': '0 8px 24px rgba(253, 29, 117, 0.35)',
        'glass-card': '0 16px 40px rgba(45, 27, 63, 0.08)',
        'glass-card-dark': '0 16px 40px rgba(0, 0, 0, 0.4)',
        // kept: existing components use shadow-soft-panel (7×)
        'soft-panel': '0 18px 60px rgba(0, 0, 0, 0.26)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out',
      },
    },
  },
  plugins: [],
}

export default config
