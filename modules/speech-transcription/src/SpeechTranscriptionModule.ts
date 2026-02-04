import type { EventSubscription } from 'expo-modules-core'
import { requireNativeModule } from 'expo-modules-core'

interface TranscriptionEvent {
  text: string
  isFinal: boolean
}

interface ErrorEvent {
  message: string
}

interface SpeechTranscriptionNativeModule {
  isAvailable(): Promise<boolean>
  requestPermissions(): Promise<boolean>
  startTranscription(): Promise<void>
  stopTranscription(): Promise<string>
  cancelTranscription(): Promise<void>
  addListener(
    eventName: 'onTranscription',
    listener: (event: TranscriptionEvent) => void,
  ): EventSubscription
  addListener(eventName: 'onError', listener: (event: ErrorEvent) => void): EventSubscription
}

const nativeModule = requireNativeModule<SpeechTranscriptionNativeModule>('SpeechTranscription')

export default {
  async isAvailable(): Promise<boolean> {
    return nativeModule.isAvailable()
  },

  async requestPermissions(): Promise<boolean> {
    return nativeModule.requestPermissions()
  },

  async startTranscription(): Promise<void> {
    return nativeModule.startTranscription()
  },

  async stopTranscription(): Promise<string> {
    return nativeModule.stopTranscription()
  },

  async cancelTranscription(): Promise<void> {
    return nativeModule.cancelTranscription()
  },

  addTranscriptionListener(callback: (event: TranscriptionEvent) => void): EventSubscription {
    return nativeModule.addListener('onTranscription', callback)
  },

  addErrorListener(callback: (event: ErrorEvent) => void): EventSubscription {
    return nativeModule.addListener('onError', callback)
  },
}
