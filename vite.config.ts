import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Enable minification for production
    minify: 'esbuild',
    // Enable CSS minification
    cssMinify: true,
    // Keep source maps for debugging
    sourcemap: true,
    // Optimize chunk splitting
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          lucide: ['lucide-react'],
          supabase: ['@supabase/supabase-js']
        }
      }
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000
  },
  // Ensure proper base path for deployment
  base: './',
  // Define environment variables for build
  define: {
    'process.env.NODE_ENV': JSON.stringify('production')
  }
});