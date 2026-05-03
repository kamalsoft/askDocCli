import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      // Proxy API and Ask calls to the engine server during development
      '/ask': 'http://localhost:5174',
      '/api': 'http://localhost:5174'
    }
  }
})