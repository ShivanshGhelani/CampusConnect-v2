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
    host: true,
    allowedHosts: [
      'localhost',
      'jaguar-giving-awfully.ngrok-free.app',
      'dominant-patient-zebra.ngrok-free.app',
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:8000','dominant-patient-zebra.ngrok-free.app':'jaguar-giving-awfully.ngrok-free.app',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
