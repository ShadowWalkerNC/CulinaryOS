import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f5f0ff',
          100: '#ede0ff',
          200: '#d8bfff',
          300: '#bb93ff',
          400: '#9b5fff',
          500: '#7c3aed',
          600: '#6d28d9',
          700: '#5b21b6',
          800: '#4c1d95',
          900: '#3b1578',
        },
        surface: {
          DEFAULT: '#0f0f11',
          card:    '#18181b',
          border:  '#27272a',
          muted:   '#3f3f46',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config;
