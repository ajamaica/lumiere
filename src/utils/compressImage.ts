import { File as ExpoFile } from 'expo-file-system'
import { Image } from 'react-native-compressor'

import { logger } from './logger'
import { isWeb } from './platform'

const imageLogger = logger.create('ImageCompression')

/** Maximum dimension (width or height) for compressed images. */
const MAX_DIMENSION = 1536

/** JPEG compression quality (0–1). */
const JPEG_QUALITY = 0.8

interface CompressedImage {
  uri: string
  base64: string
  mimeType: string
}

/**
 * Compress an image and convert it to JPEG format.
 *
 * On native platforms this uses `react-native-compressor`.
 * On web it draws onto an off-screen canvas and exports as JPEG.
 */
export async function compressImageToJpeg(uri: string): Promise<CompressedImage> {
  if (isWeb) {
    return compressOnWeb(uri)
  }
  return compressOnNative(uri)
}

// ---------------------------------------------------------------------------
// Native implementation (iOS / Android) — react-native-compressor
// ---------------------------------------------------------------------------

async function compressOnNative(uri: string): Promise<CompressedImage> {
  try {
    const compressedUri = await Image.compress(uri, {
      compressionMethod: 'manual',
      maxWidth: MAX_DIMENSION,
      maxHeight: MAX_DIMENSION,
      quality: JPEG_QUALITY,
      output: 'jpg',
    })

    const base64 = await readFileAsBase64(compressedUri)

    return {
      uri: compressedUri,
      base64,
      mimeType: 'image/jpeg',
    }
  } catch (err) {
    imageLogger.logError('Native image compression failed', err)
    throw err
  }
}

async function readFileAsBase64(uri: string): Promise<string> {
  const file = new ExpoFile(uri)
  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

// ---------------------------------------------------------------------------
// Web implementation
// ---------------------------------------------------------------------------

async function compressOnWeb(uri: string): Promise<CompressedImage> {
  try {
    const img = await loadImage(uri)

    let { width, height } = img
    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
      const scale = MAX_DIMENSION / Math.max(width, height)
      width = Math.round(width * scale)
      height = Math.round(height * scale)
    }

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Failed to get canvas 2d context')

    ctx.drawImage(img, 0, 0, width, height)

    const dataUrl: string = canvas.toDataURL('image/jpeg', JPEG_QUALITY)
    const base64 = dataUrl.split(',')[1]

    return {
      uri: dataUrl,
      base64,
      mimeType: 'image/jpeg',
    }
  } catch (err) {
    imageLogger.logError('Web image compression failed', err)
    throw err
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}
