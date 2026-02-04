import { EventEmitter, requireNativeModule } from 'expo-modules-core'

interface SpeechTranscriptionEvents {
  onTranscription: { text: string; isFinal: boolean }
  onError: { message: string }
}

const nativeModule = requireNativeModule('SpeechTranscription')
const emitter = new EventEmitter(nativeModule)

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

  addTranscriptionListener(
    callback: (event: SpeechTranscriptionEvents['onTranscription']) => void,
  ) {
    return emitter.addListener('onTranscription', callback)
  },

  addErrorListener(callback: (event: SpeechTranscriptionEvents['onError']) => void) {
    return emitter.addListener('onError', callback)
  },
}
