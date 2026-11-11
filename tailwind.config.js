/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── Brand navy (sidebar, primary actions, "ours" lane) ───────────
        navy: {
          950: '#0E1B31',
          900: '#13233D',
          800: '#1B2E4C',
          700: '#274069',
          600: '#33538A',
          500: '#456AA6',
        },
        // ── Warm light surfaces (never beige-heavy, never pure-cool) ─────
        bg: '#F2F4F7', // page ground, cool steel grey
        surface: {
          DEFAULT: '#FFFFFF', // cards — pure white, pops off the warm ground
          muted: '#F3F5F8',
          sunken: '#E7EBF0',
          2: '#EEF1F5', // skill token: recessed surface
        },
        line: {
          DEFAULT: '#E1E6ED',
          strong: '#C8D0DB',
        },
        // ── Ink (warm-navy text scale + skill's semantic names) ──────────
        ink: {
          DEFAULT: '#1B2A44',
          2: '#55617A',
          3: '#7B8494',
          400: '#9AA2AF',
          500: '#6E7685',
          600: '#55617A',
          700: '#3C4762',
          800: '#263654',
          900: '#1B2A44',
          950: '#0E1B31',
        },
        // ── Accent = hexaa amber/gold (via CSS var so it can re-brand) ───
        accent: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          600: '#C68A22',
          soft: '#FBF0D9',
          ink: '#8A5A12',
        },
        'on-accent': '#12203B', // navy text/icons sit on solid amber
        brand: {
          navy: '#1B2A44',
          gold: '#E0A43B',
        },
        // ── Ownership lanes (process flow) — all dark enough for white ───
        theirs: {
          DEFAULT: '#5D6B82', // "your existing systems" — steel
          soft: '#EBEEF3',
        },
        human: {
          DEFAULT: '#8A5C86', // "your people" — muted plum
          soft: '#F2E9F1',
        },
        // ── Status / severity ────────────────────────────────────────────
        high: { DEFAULT: '#C0392B', soft: '#F8E7E4' },
        medium: { DEFAULT: '#B4741C', soft: '#F8ECD6' },
        low: { DEFAULT: '#5B6472', soft: '#EEF1F5' },
        ok: { DEFAULT: '#2F8A67', soft: '#E4F3EC' },
        sev: {
          critical: '#BC3B2E',
          high: '#C4711C',
          medium: '#B08908',
          low: '#3E7C93',
        },
        // "assumption / guess" flag
        assume: { DEFAULT: '#B4741C', soft: '#F8ECD6' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['"Instrument Serif"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', '"SFMono-Regular"', 'Menlo', 'Consolas', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(27,42,68,0.05), 0 2px 8px -2px rgba(27,42,68,0.08)',
        cardhover: '0 8px 26px -6px rgba(27,42,68,0.14)',
        panel: '0 1px 2px rgba(27,42,68,0.05), 0 2px 6px -2px rgba(27,42,68,0.09)',
        pop: '0 12px 40px -8px rgba(27,42,68,0.20), 0 3px 8px rgba(27,42,68,0.08)',
      },
      borderRadius: {
        xl2: '1.1rem',
        card: '0.75rem',
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.22, 0.61, 0.36, 1)',
      },
      keyframes: {
        'fade-up': { from: { opacity: 0, transform: 'translateY(6px)' }, to: { opacity: 1, transform: 'none' } },
        'fade-right': { from: { opacity: 0, transform: 'translateX(-10px)' }, to: { opacity: 1, transform: 'none' } },
        'slide-in': { from: { opacity: 0, transform: 'translateX(16px)' }, to: { opacity: 1, transform: 'none' } },
        'fade-in': { from: { opacity: 0 }, to: { opacity: 1 } },
        loginIn: { from: { opacity: 0, transform: 'translateY(10px) scale(0.985)' }, to: { opacity: 1, transform: 'none' } },
        loginShake: { '0%,100%': { transform: 'translateX(0)' }, '20%,60%': { transform: 'translateX(-6px)' }, '40%,80%': { transform: 'translateX(6px)' } },
      },
      animation: {
        'fade-up': 'fade-up 0.28s cubic-bezier(0.22,0.61,0.36,1) both',
        'fade-right': 'fade-right 0.3s cubic-bezier(0.22,0.61,0.36,1) both',
        'slide-in': 'slide-in 0.24s cubic-bezier(0.22,0.61,0.36,1) both',
        'fade-in': 'fade-in 0.2s ease both',
      },
    },
  },
  plugins: [],
}
