import { Video } from 'react-native-compressor'

import { logger } from './logger'

const videoLogger = logger.create('VideoCompression')

interface CompressedVideo {
  uri: string
}

/**
 * Compress a video using hardware-accelerated encoding via react-native-compressor.
 *
 * Uses automatic compression which analyses the video and applies optimal settings.
 * Falls back to the original URI if compression fails.
 */
export async function compressVideo(
  uri: string,
  onProgress?: (progress: number) => void,
): Promise<CompressedVideo> {
  try {
    videoLogger.info('Starting video compression')
    const compressedUri = await Video.compress(uri, { compressionMethod: 'auto', maxSize: 480 }, onProgress)
    videoLogger.info('Video compression complete')
    return { uri: compressedUri }
  } catch (err) {
    videoLogger.logError('Video compression failed, using original', err)
    return { uri }
  }
}
