import type { Config } from 'tailwindcss';
import uiPreset from '../../packages/ui/tailwind.preset.js';

const config: Config = {
  presets: [uiPreset],
  darkMode: 'class',
  content: [
    './src/**/*.{ts,tsx}',
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          orange: '#FF6B35',
          red: '#E63946',
        },
        surface: {
          DEFAULT: '#0f0f0f',
          card: 'rgba(255,255,255,0.05)',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #FF6B35, #E63946)',
      },
    },
  },
  plugins: [],
};

export default config;
