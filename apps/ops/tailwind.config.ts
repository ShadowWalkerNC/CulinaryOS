import type { Config } from 'tailwindcss';
import uiPreset from '../../packages/ui/tailwind.preset.js';

export default {
  presets: [uiPreset],
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  darkMode: 'class',
  theme: { extend: {} },
  plugins: [],
} satisfies Config;
