import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwind from '@tailwindcss/vite'

export default defineConfig(() => {
  const port = 5173
  return {
    plugins: [react(), tailwind()],
    build: {
      sourcemap: true,
    },
    server: {
      port,
      strictPort: false,
      open: true,
    },
    preview: {
      port: 10000,
      strictPort: false,
      open: true,
      allowedHosts: ['food-plan-steel.vercel.app'],
    },
  }
})
