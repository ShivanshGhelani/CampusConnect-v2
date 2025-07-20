import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 3000,
    host: '127.0.0.1', // Force Vite to use 127.0.0.1 instead of localhost
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      'jaguar-giving-awfully.ngrok-free.app'
    ],
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000', // Use 127.0.0.1 for consistency
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
