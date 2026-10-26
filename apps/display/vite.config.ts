import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt'],
      manifest: {
        name: 'CulinaryOS Display Platform',
        short_name: 'Display',
        description: 'CulinaryOS & Cheezies Android TV Display Platform',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        orientation: 'landscape',
        start_url: '/',
      },
    }),
  ],
  resolve: {
    alias: {
      '@culinaryos/ui': path.resolve(__dirname, '../../packages/ui/src/index.ts'),
      '@culinaryos/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
      '@culinaryos/display': path.resolve(__dirname, '../../packages/display/src/index.ts'),
    },
  },
  server: {
    port: 5178,
    host: '0.0.0.0',
    proxy: {
      '/v1': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
