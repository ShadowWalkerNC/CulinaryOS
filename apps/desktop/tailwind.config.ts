import type { Config } from 'tailwindcss';
import uiPreset from '../../packages/ui/tailwind.preset.js';

export default {
<<<<<<< Updated upstream
  presets: [uiPreset],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
=======
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}', '../../packages/ui/src/**/*.{js,ts,jsx,tsx}'],
>>>>>>> Stashed changes
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config;
