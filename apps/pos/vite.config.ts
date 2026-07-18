import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'react': path.resolve(__dirname, './node_modules/react'),
      '@supabase/supabase-js': path.resolve(__dirname, './node_modules/@supabase/supabase-js'),
    },
  },
  server: {
    port: 5172,
  },
});
