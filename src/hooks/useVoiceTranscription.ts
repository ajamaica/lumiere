import { useCallback, useEffect, useRef, useState } from 'react'
import { Platform } from 'react-native'

type TranscriptionStatus = 'idle' | 'requesting' | 'recording' | 'error'

interface UseVoiceTranscriptionResult {
  status: TranscriptionStatus
  transcribedText: string
  isAvailable: boolean
  start: () => Promise<void>
  stop: () => Promise<string>
  cancel: () => Promise<void>
}

export function useVoiceTranscription(): UseVoiceTranscriptionResult {
  const [status, setStatus] = useState<TranscriptionStatus>('idle')
  const [transcribedText, setTranscribedText] = useState('')
  const [isAvailable, setIsAvailable] = useState(false)
  const moduleRef = useRef<
    typeof import('../../modules/speech-transcription').SpeechTranscriptionModule | null
  >(null)

  useEffect(() => {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') return

    let mounted = true

    async function loadModule() {
      try {
        const { SpeechTranscriptionModule } = await import('../../modules/speech-transcription')
        if (!mounted) return
        moduleRef.current = SpeechTranscriptionModule
        const available = await SpeechTranscriptionModule.isAvailable()
        if (mounted) setIsAvailable(available)
      } catch {
        if (mounted) setIsAvailable(false)
      }
    }

    loadModule()
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    const mod = moduleRef.current
    if (!mod || (Platform.OS !== 'ios' && Platform.OS !== 'android')) return

    const transcriptionSub = mod.addTranscriptionListener((event) => {
      setTranscribedText(event.text)
    })

    const errorSub = mod.addErrorListener(() => {
      setStatus('error')
    })

    return () => {
      transcriptionSub.remove()
      errorSub.remove()
    }
  }, [isAvailable])

  const start = useCallback(async () => {
    const mod = moduleRef.current
    if (!mod) return

    setStatus('requesting')
    try {
      const granted = await mod.requestPermissions()
      if (!granted) {
        setStatus('error')
        return
      }
      setTranscribedText('')
      await mod.startTranscription()
      setStatus('recording')
    } catch {
      setStatus('error')
    }
  }, [])

  const stop = useCallback(async (): Promise<string> => {
    const mod = moduleRef.current
    if (!mod) return ''

    try {
      const finalText = await mod.stopTranscription()
      setStatus('idle')
      return finalText
    } catch {
      setStatus('error')
      return transcribedText
    }
  }, [transcribedText])

  const cancel = useCallback(async () => {
    const mod = moduleRef.current
    if (!mod) return

    try {
      await mod.cancelTranscription()
    } finally {
      setTranscribedText('')
      setStatus('idle')
    }
  }, [])

  return { status, transcribedText, isAvailable, start, stop, cancel }
}
