import { requireOptionalNativeModule } from 'expo'

interface EventSubscription {
  remove(): void
}

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

const nativeModule =
  requireOptionalNativeModule<SpeechTranscriptionNativeModule>('SpeechTranscription')

const noopSubscription: EventSubscription = { remove: () => {} }

export default {
  async isAvailable(): Promise<boolean> {
    if (!nativeModule) return false
    return nativeModule.isAvailable()
  },

  async requestPermissions(): Promise<boolean> {
    if (!nativeModule) return false
    return nativeModule.requestPermissions()
  },

  async startTranscription(): Promise<void> {
    if (!nativeModule) return
    return nativeModule.startTranscription()
  },

  async stopTranscription(): Promise<string> {
    if (!nativeModule) return ''
    return nativeModule.stopTranscription()
  },

  async cancelTranscription(): Promise<void> {
    if (!nativeModule) return
    return nativeModule.cancelTranscription()
  },

  addTranscriptionListener(callback: (event: TranscriptionEvent) => void): EventSubscription {
    if (!nativeModule) return noopSubscription
    return nativeModule.addListener('onTranscription', callback)
  },

  addErrorListener(callback: (event: ErrorEvent) => void): EventSubscription {
    if (!nativeModule) return noopSubscription
    return nativeModule.addListener('onError', callback)
  },
}
