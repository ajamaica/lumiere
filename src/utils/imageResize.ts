import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'
import { Platform } from 'react-native'

import { logger } from './logger'

const imageResizeLogger = logger.create('ImageResize')

/** Maximum pixel dimension (width or height) for uploaded images. */
const MAX_IMAGE_DIMENSION = 1024

/** JPEG compression quality for resized images (0–1). */
const RESIZE_COMPRESS_QUALITY = 0.8

/**
 * Resize an image so its longest side is at most {@link MAX_IMAGE_DIMENSION}
 * pixels. Returns a new URI and base64 string. If the image is already within
 * bounds, the original values are returned unchanged.
 */
export async function resizeImageForUpload(
  uri: string,
  width: number | undefined,
  height: number | undefined,
): Promise<{ uri: string; base64: string | undefined; width: number; height: number }> {
  // If we don't know the dimensions we can't decide whether to resize, so
  // fall back to the legacy manipulateAsync path that always re-encodes.
  if (!width || !height) {
    return resizeWithManipulate(uri)
  }

  const longestSide = Math.max(width, height)
  if (longestSide <= MAX_IMAGE_DIMENSION) {
    // Already within limits — just re-encode to get base64 without resizing.
    return reencodeForBase64(uri, width, height)
  }

  return resizeWithManipulate(uri, width, height)
}

/**
 * Resize a web `File` image to fit within {@link MAX_IMAGE_DIMENSION} on the
 * longest side. Returns a data-URL (with embedded base64) and the raw base64
 * payload.
 *
 * On native platforms this is a no-op — use {@link resizeImageForUpload}
 * instead.
 */
export async function resizeWebImage(
  dataUrl: string,
): Promise<{ uri: string; base64: string; width: number; height: number }> {
  if (Platform.OS !== 'web') {
    throw new Error('resizeWebImage is only available on web')
  }

  // Load the image to read its natural dimensions.
  const img = await loadImageElement(dataUrl)
  const { naturalWidth, naturalHeight } = img

  const longestSide = Math.max(naturalWidth, naturalHeight)
  if (longestSide <= MAX_IMAGE_DIMENSION) {
    // Already within bounds — return as-is.
    const base64 = dataUrl.split(',')[1]
    return { uri: dataUrl, base64, width: naturalWidth, height: naturalHeight }
  }

  const scale = MAX_IMAGE_DIMENSION / longestSide
  const targetWidth = Math.round(naturalWidth * scale)
  const targetHeight = Math.round(naturalHeight * scale)

  const canvas = document.createElement('canvas')
  canvas.width = targetWidth
  canvas.height = targetHeight

  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight)

  const resizedDataUrl = canvas.toDataURL('image/jpeg', RESIZE_COMPRESS_QUALITY)
  const base64 = resizedDataUrl.split(',')[1]

  imageResizeLogger.info(
    `Web image resized from ${naturalWidth}x${naturalHeight} to ${targetWidth}x${targetHeight}`,
  )

  return { uri: resizedDataUrl, base64, width: targetWidth, height: targetHeight }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function resizeWithManipulate(
  uri: string,
  originalWidth?: number,
  originalHeight?: number,
): Promise<{ uri: string; base64: string | undefined; width: number; height: number }> {
  try {
    const context = ImageManipulator.manipulate(uri)

    if (originalWidth && originalHeight) {
      const longestSide = Math.max(originalWidth, originalHeight)
      if (longestSide > MAX_IMAGE_DIMENSION) {
        if (originalWidth >= originalHeight) {
          context.resize({ width: MAX_IMAGE_DIMENSION })
        } else {
          context.resize({ height: MAX_IMAGE_DIMENSION })
        }
      }
    } else {
      // Unknown dimensions — resize to max on width as a safe default.
      context.resize({ width: MAX_IMAGE_DIMENSION })
    }

    const imageRef = await context.renderAsync()
    const result = await imageRef.saveAsync({
      format: SaveFormat.JPEG,
      compress: RESIZE_COMPRESS_QUALITY,
      base64: true,
    })

    imageResizeLogger.info(`Image resized to ${result.width}x${result.height}`)

    return {
      uri: result.uri,
      base64: result.base64,
      width: result.width,
      height: result.height,
    }
  } catch (err) {
    imageResizeLogger.logError('Failed to resize image, using original', err)
    return {
      uri,
      base64: undefined,
      width: originalWidth ?? 0,
      height: originalHeight ?? 0,
    }
  }
}

async function reencodeForBase64(
  uri: string,
  width: number,
  height: number,
): Promise<{ uri: string; base64: string | undefined; width: number; height: number }> {
  try {
    const context = ImageManipulator.manipulate(uri)
    const imageRef = await context.renderAsync()
    const result = await imageRef.saveAsync({
      format: SaveFormat.JPEG,
      compress: RESIZE_COMPRESS_QUALITY,
      base64: true,
    })
    return { uri: result.uri, base64: result.base64, width: result.width, height: result.height }
  } catch {
    return { uri, base64: undefined, width, height }
  }
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}
