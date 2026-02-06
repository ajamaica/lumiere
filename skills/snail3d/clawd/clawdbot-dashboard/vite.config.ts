import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'framer-motion'],
          markdown: ['react-markdown', 'rehype-prism-plus'],
        },
      },
    },
  },
  server: {
    open: true,
    port: 5173,
  },
})
