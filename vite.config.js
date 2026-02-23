import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwind from '@tailwindcss/vite'

export default defineConfig(() => {
  const port = 5178
  return {
    plugins: [react(), tailwind()],
    server: {
      port,
      strictPort: true,
      open: true,
    },
    preview: {
      port,
      strictPort: true,
      open: true,
    },
  }
})
