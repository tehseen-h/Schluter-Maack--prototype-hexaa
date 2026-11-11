/**
 * Merge this `colors` block into the project's tailwind.config.js under
 * theme.extend. Every colour resolves through a CSS variable (see
 * tokens.template.css) so Tailwind's opacity modifiers (e.g. `bg-accent/40`)
 * keep working, and dark mode requires zero component changes.
 */
export const colorsSnippet = {
  bg: 'rgb(var(--bg) / <alpha-value>)',
  surface: 'rgb(var(--surface) / <alpha-value>)',
  'surface-2': 'rgb(var(--surface-2) / <alpha-value>)',
  line: 'rgb(var(--line) / <alpha-value>)',
  'line-strong': 'rgb(var(--line-strong) / <alpha-value>)',
  ink: 'rgb(var(--ink) / <alpha-value>)',
  'ink-2': 'rgb(var(--ink-2) / <alpha-value>)',
  'ink-3': 'rgb(var(--ink-3) / <alpha-value>)',
  accent: 'rgb(var(--accent) / <alpha-value>)',
  'accent-soft': 'rgb(var(--accent-soft) / <alpha-value>)',
  'accent-ink': 'rgb(var(--accent-ink) / <alpha-value>)',
  high: 'rgb(var(--high) / <alpha-value>)',
  'high-soft': 'rgb(var(--high-soft) / <alpha-value>)',
  medium: 'rgb(var(--medium) / <alpha-value>)',
  'medium-soft': 'rgb(var(--medium-soft) / <alpha-value>)',
  low: 'rgb(var(--low) / <alpha-value>)',
  'low-soft': 'rgb(var(--low-soft) / <alpha-value>)',
  ok: 'rgb(var(--ok) / <alpha-value>)',
  'ok-soft': 'rgb(var(--ok-soft) / <alpha-value>)',
  // rename/add per real lane count — these two are examples from a 3-lane setup
  theirs: 'rgb(var(--theirs) / <alpha-value>)',
  'theirs-soft': 'rgb(var(--theirs-soft) / <alpha-value>)',
  human: 'rgb(var(--human) / <alpha-value>)',
  'human-soft': 'rgb(var(--human-soft) / <alpha-value>)',
};

/**
 * Also required in theme.extend, if not already present:
 *
 * darkMode: 'class',   // top-level config, not under extend
 *
 *   borderRadius: { card: '10px' },
 *   boxShadow: {
 *     panel: '0 1px 2px rgb(var(--shadow) / 0.06), 0 2px 6px -2px rgb(var(--shadow) / 0.08)',
 *     pop:   '0 8px 24px -6px rgb(var(--shadow) / 0.18), 0 2px 6px rgb(var(--shadow) / 0.06)',
 *   },
 *   transitionTimingFunction: {
 *     smooth: 'cubic-bezier(0.22, 0.61, 0.36, 1)',
 *   },
 *   keyframes: {
 *     'fade-up':    { from: { opacity: '0', transform: 'translateY(6px)' },   to: { opacity: '1', transform: 'none' } },
 *     // children reveal along X, because the tree grows rightward
 *     'fade-right': { from: { opacity: '0', transform: 'translateX(-10px)' }, to: { opacity: '1', transform: 'none' } },
 *     'slide-in':   { from: { opacity: '0', transform: 'translateX(16px)' },  to: { opacity: '1', transform: 'none' } },
 *     'fade-in':    { from: { opacity: '0' }, to: { opacity: '1' } },
 *   },
 *   animation: {
 *     'fade-up':    'fade-up 0.28s cubic-bezier(0.22,0.61,0.36,1) both',
 *     'fade-right': 'fade-right 0.3s cubic-bezier(0.22,0.61,0.36,1) both',
 *     'slide-in':   'slide-in 0.24s cubic-bezier(0.22,0.61,0.36,1) both',
 *     'fade-in':    'fade-in 0.2s ease both',
 *   },
 *
 * Plus a `--shadow` RGB triple in the token file for the shadow colours above,
 * and the `.theme-t` / `.num` helper classes (see tokens.template.css).
 */
