import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    '../../packages/viewer/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Primary brand color — reference via theme token, never raw hex
        primary: {
          DEFAULT: 'var(--color-primary)',
          hover:   'var(--color-primary-hover)',
          subtle:  'var(--color-primary-subtle)',
        },
        // Surface tokens (background, card, border)
        surface: {
          base:   'var(--color-surface-base)',
          card:   'var(--color-surface-card)',
          hover:  'var(--color-surface-hover)',
          border: 'var(--color-surface-border)',
        },
        // Text tokens
        text: {
          base:    'var(--color-text-base)',
          muted:   'var(--color-text-muted)',
          inverse: 'var(--color-text-inverse)',
        },
        // Semantic feedback tokens
        danger: {
          DEFAULT: 'var(--color-danger)',
          bg:      'var(--color-danger-bg)',
          border:  'var(--color-danger-border)',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        arabic: ['var(--font-arabic)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: 'var(--radius-card)',
        btn:  'var(--radius-btn)',
      },
    },
  },
  plugins: [],
};
export default config;

