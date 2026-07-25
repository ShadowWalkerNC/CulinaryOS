import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@culinaryos/ui': path.resolve(__dirname, '../../packages/ui/src/index.ts'),
      '@culinaryos/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
      'react': path.resolve(__dirname, './node_modules/react'),
      '@supabase/supabase-js': path.resolve(__dirname, './node_modules/@supabase/supabase-js'),
    },
  },
  server: {
    port: 5172,
    host: '0.0.0.0',
  },
});
