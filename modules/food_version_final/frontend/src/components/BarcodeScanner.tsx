import { useEffect, useRef, useState } from 'react'
import { X, Camera, AlertCircle } from 'lucide-react'

interface BarcodeScannerProps {
  onDetected: (barcode: string) => void
  onClose: () => void
}

export default function BarcodeScanner({ onDetected, onClose }: BarcodeScannerProps) {
  const videoRef    = useRef<HTMLVideoElement>(null)
  const streamRef   = useRef<MediaStream | null>(null)
  const detectorRef = useRef<any>(null)
  const rafRef      = useRef<number>(0)
  const detectedRef = useRef(false)
  const [error, setError] = useState('')

  useEffect(() => {
    startCamera()
    return () => stopCamera()
  }, [])

  const stopCamera = () => {
    cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
  }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
        videoRef.current.onloadedmetadata = () => initDetector()
      }
    } catch {
      setError('No se pudo acceder a la cámara. Verifica los permisos.')
    }
  }

  const initDetector = async () => {
    if ('BarcodeDetector' in window) {
      detectorRef.current = new (window as any).BarcodeDetector({
        formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39'],
      })
      scanFrame()
    } else {
      try {
        const { BrowserMultiFormatReader } = await import('@zxing/browser')
        const reader = new BrowserMultiFormatReader()
        if (videoRef.current) {
          reader.decodeFromVideoElement(videoRef.current, (result) => {
            if (result && !detectedRef.current) {
              detectedRef.current = true
              stopCamera()
              onDetected(result.getText())
            }
          })
        }
      } catch {
        setError('Tu navegador no soporta el lector. Usa Chrome en Android.')
      }
    }
  }

  const scanFrame = async () => {
    if (!videoRef.current || !detectorRef.current || detectedRef.current) return
    try {
      const barcodes = await detectorRef.current.detect(videoRef.current)
      if (barcodes.length > 0) {
        detectedRef.current = true
        stopCamera()
        onDetected(barcodes[0].rawValue)
        return
      }
    } catch {}
    rafRef.current = requestAnimationFrame(scanFrame)
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <div className="flex items-center justify-between p-4 bg-black/80">
        <div className="flex items-center gap-2 text-white">
          <Camera size={20} />
          <span className="font-semibold">Escanear código de barras</span>
        </div>
        <button onClick={() => { stopCamera(); onClose() }} className="text-white p-2 hover:bg-white/10 rounded-full">
          <X size={22} />
        </button>
      </div>

      <div className="flex-1 relative flex items-center justify-center bg-black">
        <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />

        {!error && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative w-64 h-48">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-green-400 rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-green-400 rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-green-400 rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-green-400 rounded-br-lg" />
              <div className="absolute inset-x-0 h-0.5 bg-green-400 animate-bounce top-1/2 opacity-80" />
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div className="bg-white rounded-2xl p-6 text-center max-w-xs">
              <AlertCircle size={40} className="text-red-400 mx-auto mb-3" />
              <p className="text-gray-700 text-sm">{error}</p>
              <button onClick={() => { stopCamera(); onClose() }}
                className="mt-4 px-4 py-2 bg-gray-100 rounded-xl text-sm font-medium">
                Cerrar
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-black/80 text-center">
        <p className="text-white/70 text-sm">Apunta al código de barras del producto</p>
      </div>
    </div>
  )
}
