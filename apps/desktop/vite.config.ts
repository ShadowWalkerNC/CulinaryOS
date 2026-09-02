import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  css: {
    postcss: false,
  },
  server: {
    port: 5180,
    host: '0.0.0.0',
  },
});
