import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  base: '/', // Ensure proper base path for deployment
  build: {
    // CRITICAL: Code splitting optimization
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunk for React core
          'react-vendor': ['react', 'react-dom'],
          // Router chunk
          'react-router': ['react-router-dom'],
          // UI library chunk
          'ui-components': ['@heroicons/react', 'lucide-react', 'framer-motion'],
          // Heavy features chunk - PDF handling
          'pdf-renderer': ['@react-pdf/renderer'],
          // Monaco Editor - separate chunk due to size
          'code-editor': ['@monaco-editor/react'],
          // Image processing
          'image-processing': ['react-image-crop', '@yudiel/react-qr-scanner'],
          // API and networking
          'api-networking': ['axios', '@supabase/supabase-js'],
          // Forms and validation
          'forms': ['react-hook-form', '@hookform/resolvers'],
          // Charts and visualization
          'data-viz': ['recharts'],
          // QR Code libraries
          'qr-codes': ['qrcode', 'react-qr-code']
        }
      }
    },
    // Increase chunk size warning limit since we have legitimate large chunks
    chunkSizeWarningLimit: 2000,
    // Enable source map for production debugging (set to false for smaller builds)
    sourcemap: false,
    // Minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.warn']
      }
    },
    // Ensure proper asset handling
    assetsDir: 'assets',
    outDir: 'dist'
  },
  server: {
    port: 3000,
    host: true, // Allow external connections
    open: true, // Automatically open browser
    cors: true, // Enable CORS
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            
          });
        }
      }
    }
  },
  preview: {
    port: 3000,
    host: true
  }
})
