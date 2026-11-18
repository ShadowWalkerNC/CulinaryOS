import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/**/*.{ts,tsx}',
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#090d16',
          hover: '#182030',
          orange: '#FF6B35',
          red: '#E63946',
        },
        surface: {
          DEFAULT: '#0f0f0f',
          card: 'rgba(255,255,255,0.05)',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #FF6B35, #E63946)',
      },
    },
  },
  plugins: [],
};

export default config;
