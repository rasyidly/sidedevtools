import jsQR from 'jsQR'
import * as OTPAuth from 'otpauth'

export interface ParsedOtpAuth {
  secret: string
  label?: string
  issuer?: string
  algorithm?: 'SHA1' | 'SHA256' | 'SHA512'
  digits?: number
  period?: number
}

/**
 * Scan QR code from ImageData using native BarcodeDetector or jsQR fallback
 */
export async function scanQrFromImageData(imageData: ImageData): Promise<string | null> {
  // 1. Try native BarcodeDetector if available
  if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
    try {
      const barcodeDetector = new (window as any).BarcodeDetector({
        formats: ['qr_code'],
      })
      const barcodes = await barcodeDetector.detect(imageData)
      if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
        return barcodes[0].rawValue
      }
    } catch {
      // Continue to jsQR
    }
  }

  // 2. Fallback to jsQR
  const code = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: 'attemptBoth',
  })
  if (code && code.data) {
    return code.data
  }

  return null
}

/**
 * Scan QR code from HTMLCanvasElement
 */
export async function scanQrFromCanvas(canvas: HTMLCanvasElement): Promise<string | null> {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null

  // Native BarcodeDetector directly on canvas
  if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
    try {
      const barcodeDetector = new (window as any).BarcodeDetector({
        formats: ['qr_code'],
      })
      const barcodes = await barcodeDetector.detect(canvas)
      if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
        return barcodes[0].rawValue
      }
    } catch {
      // Continue to jsQR fallback
    }
  }

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  return scanQrFromImageData(imageData)
}

/**
 * Scan QR code from an image Blob or File
 */
export async function scanQrFromImageBlob(blob: Blob): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(blob)

    img.onload = async () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth || img.width
      canvas.height = img.naturalHeight || img.height
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) {
        resolve(null)
        return
      }
      ctx.drawImage(img, 0, 0)
      const result = await scanQrFromCanvas(canvas)
      resolve(result)
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(null)
    }

    img.src = url
  })
}

/**
 * Capture screen, window, or tab to scan for QR code
 */
export async function scanQrFromScreenCapture(): Promise<string | null> {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
    throw new Error('Screen capture API is not supported in this browser environment.')
  }

  let stream: MediaStream | null = null
  try {
    stream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        displaySurface: 'monitor',
      },
      audio: false,
    })

    const track = stream.getVideoTracks()[0]
    if (!track) {
      throw new Error('No video track available from screen capture.')
    }

    // Capture frame using ImageCapture or Video element
    const video = document.createElement('video')
    video.playsInline = true
    video.muted = true
    video.srcObject = stream

    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => {
        video.play().then(resolve).catch(reject)
      }
      video.onerror = () => reject(new Error('Failed to play captured video stream.'))
    })

    // Brief delay to allow initial frame render
    await new Promise((r) => setTimeout(r, 100))

    const width = video.videoWidth || 1920
    const height = video.videoHeight || 1080

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) {
      throw new Error('Failed to create canvas context.')
    }

    ctx.drawImage(video, 0, 0, width, height)

    // Stop all media tracks immediately
    stream.getTracks().forEach((t) => t.stop())
    stream = null

    const result = await scanQrFromCanvas(canvas)
    return result
  } catch (err: any) {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop())
    }
    if (err.name === 'NotAllowedError') {
      return null // User cancelled permission dialog
    }
    throw err
  }
}

/**
 * Parse an otpauth URI or raw secret string
 */
export function parseOtpAuthUri(input: string): ParsedOtpAuth | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  // If it's an otpauth URI
  if (trimmed.startsWith('otpauth://')) {
    try {
      const parsed = OTPAuth.URI.parse(trimmed)
      if (parsed instanceof OTPAuth.TOTP) {
        return {
          secret: parsed.secret.base32,
          label: parsed.label || '',
          issuer: parsed.issuer || '',
          algorithm: (parsed.algorithm?.toUpperCase() as any) || 'SHA1',
          digits: parsed.digits || 6,
          period: parsed.period || 30,
        }
      }
    } catch {
      // Manual regex fallback for otpauth://totp/...
      try {
        const url = new URL(trimmed)
        const secret = url.searchParams.get('secret')
        if (secret) {
          const issuer = url.searchParams.get('issuer') || ''
          const label = decodeURIComponent(url.pathname.replace(/^\/\/totp\//, ''))
          const algorithm = (url.searchParams.get('algorithm')?.toUpperCase() as any) || 'SHA1'
          const digits = parseInt(url.searchParams.get('digits') || '6', 10)
          const period = parseInt(url.searchParams.get('period') || '30', 10)
          return {
            secret,
            issuer,
            label,
            algorithm,
            digits,
            period,
          }
        }
      } catch {}
    }
  }

  // If raw Base32 secret string (allowing spaces and dashes)
  const cleaned = trimmed.replace(/[\s-]/g, '').toUpperCase()
  if (/^[A-Z2-7]{8,}$/.test(cleaned)) {
    return {
      secret: cleaned,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
    }
  }

  return null
}
