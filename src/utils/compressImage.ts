import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'

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
 * On native platforms this uses `expo-image-manipulator`.
 * On web it draws onto an off-screen canvas and exports as JPEG.
 */
export async function compressImageToJpeg(uri: string): Promise<CompressedImage> {
  if (isWeb) {
    return compressOnWeb(uri)
  }
  return compressOnNative(uri)
}

// ---------------------------------------------------------------------------
// Native implementation (iOS / Android)
// ---------------------------------------------------------------------------

async function compressOnNative(uri: string): Promise<CompressedImage> {
  try {
    const context = ImageManipulator.manipulate(uri)
    const imageRef = await context.renderAsync()

    // Down-scale if either dimension exceeds the limit.
    const { width, height } = imageRef
    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
      const scale = MAX_DIMENSION / Math.max(width, height)
      const resizeContext = ImageManipulator.manipulate(uri)
      resizeContext.resize({
        width: Math.round(width * scale),
        height: Math.round(height * scale),
      })
      const resizedRef = await resizeContext.renderAsync()
      const result = await resizedRef.saveAsync({
        format: SaveFormat.JPEG,
        compress: JPEG_QUALITY,
        base64: true,
      })
      return {
        uri: result.uri,
        base64: result.base64 ?? '',
        mimeType: 'image/jpeg',
      }
    }

    // No resize needed — just convert format and compress.
    const result = await imageRef.saveAsync({
      format: SaveFormat.JPEG,
      compress: JPEG_QUALITY,
      base64: true,
    })
    return {
      uri: result.uri,
      base64: result.base64 ?? '',
      mimeType: 'image/jpeg',
    }
  } catch (err) {
    imageLogger.logError('Native image compression failed', err)
    throw err
  }
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
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}
