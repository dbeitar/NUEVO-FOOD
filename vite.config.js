import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwind from '@tailwindcss/vite'

export default defineConfig(() => {
  const port = 5175
  return {
    plugins: [react(), tailwind()],
    build: {
      sourcemap: true,
      chunkSizeWarningLimit: 700,
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (!id.includes('node_modules')) return undefined;
            if (id.includes('react-dom') || id.includes('/react/') || id.includes('scheduler')) {
              return 'vendor-react';
            }
            if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('canvg') || id.includes('dompurify')) {
              // jspdf y sus deps. Como en el código sólo se importa con
              // `import('jspdf')` dinámico, rollup lo marca como chunk
              // asíncrono: NO se descarga al iniciar la app, solo al
              // pedir exportar PDF.
              return 'vendor-pdf';
            }
            if (id.includes('axios')) return 'vendor-axios';
            if (id.includes('lucide-react')) return 'vendor-icons';
            if (id.includes('react-router')) return 'vendor-router';
            if (id.includes('@zxing') || id.includes('jsqr') || id.includes('quagga')) {
              return 'vendor-barcode';
            }
            return 'vendor';
          },
        },
      },
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
