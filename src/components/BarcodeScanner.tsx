import { useEffect, useRef, useState } from 'react'
import { BarcodeDetector } from 'barcode-detector/ponyfill'

type BarcodeScannerProps = {
  onDetected: (code: string) => void
  onClose: () => void
}

export function BarcodeScanner({ onDetected, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const onDetectedRef = useRef(onDetected)
  const [error, setError] = useState('')

  useEffect(() => {
    onDetectedRef.current = onDetected
  })

  useEffect(() => {
    let stream: MediaStream | null = null
    let timerId = 0
    let isActive = true

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Камера недоступна: нужен HTTPS или localhost')
        return
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        })

        if (!isActive) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        const video = videoRef.current
        if (!video) return

        video.srcObject = stream
        await video.play()

        const detector = new BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'],
        })

        const scan = async () => {
          if (!isActive) return

          try {
            const codes = await detector.detect(video)

            if (codes.length > 0) {
              onDetectedRef.current(codes[0].rawValue)
              return
            }
          } catch {
            // пропускаем кадр
          }

          timerId = window.setTimeout(scan, 250)
        }

        void scan()
      } catch (cameraError) {
        console.error('Ошибка камеры:', cameraError)
        setError('Не удалось открыть камеру. Проверь разрешение в браузере.')
      }
    }

    void start()

    return () => {
      isActive = false
      window.clearTimeout(timerId)
      stream?.getTracks().forEach((track) => track.stop())
    }
  }, [])

  return (
    <div className="nutrition-scanner">
      <video
        ref={videoRef}
        className="nutrition-scanner-video"
        playsInline
        muted
      />

      <p className="nutrition-lookup-message">
        {error || 'Наведи камеру на штрихкод'}
      </p>

      <button className="nutrition-secondary" type="button" onClick={onClose}>
        Закрыть камеру
      </button>
    </div>
  )
}