import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwind from '@tailwindcss/vite'

export default defineConfig(() => {
  const port = 5173
  return {
    plugins: [react(), tailwind()],
    server: {
      port,
      strictPort: false,
      open: true,
    },
    preview: {
      port,
      strictPort: false,
      open: true,
    },
  }
})
