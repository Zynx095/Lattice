import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    open: false,
    host: true,
  },
  build: {
    // The 3D scene is lazy-loaded. Its libraries go into one cacheable chunk
    // that the application shell never waits for.
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // React must have its own chunk, or Rollup folds it into "three"
          // and the shell would have to download the 3D libraries to start.
          if (id.includes('vite/preload-helper')) return 'vendor'
          if (/node_modules\/(react|react-dom|scheduler|react-router|react-router-dom|@remix-run)\//.test(id)) return 'vendor'
          if (/node_modules\/(three|@react-three|three-stdlib)\//.test(id)) return 'three'
          return undefined
        },
      },
    },
  },
})
