import * as Speech from 'expo-speech'
import { useCallback, useEffect, useRef, useState } from 'react'

type SpeechStatus = 'idle' | 'speaking'

interface UseSpeechResult {
  status: SpeechStatus
  speak: (text: string) => void
  stop: () => void
}

export function useSpeech(): UseSpeechResult {
  const [status, setStatus] = useState<SpeechStatus>('idle')
  const currentIdRef = useRef(0)

  useEffect(() => {
    return () => {
      Speech.stop()
    }
  }, [])

  const speak = useCallback((text: string) => {
    const id = ++currentIdRef.current
    Speech.stop()

    // Strip markdown formatting for cleaner speech output
    const cleaned = text
      .replace(/```[\s\S]*?```/g, '') // code blocks
      .replace(/`([^`]+)`/g, '$1') // inline code
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links -> label only
      .replace(/[*_~#>]+/g, '') // bold/italic/strikethrough/headings
      .replace(/!\[[^\]]*\]\([^)]+\)/g, '') // images
      .replace(/\n{2,}/g, '. ') // paragraph breaks -> pause
      .replace(/\n/g, ' ')
      .trim()

    if (!cleaned) return

    setStatus('speaking')
    Speech.speak(cleaned, {
      onDone: () => {
        if (currentIdRef.current === id) setStatus('idle')
      },
      onStopped: () => {
        if (currentIdRef.current === id) setStatus('idle')
      },
      onError: () => {
        if (currentIdRef.current === id) setStatus('idle')
      },
    })
  }, [])

  const stop = useCallback(() => {
    currentIdRef.current++
    Speech.stop()
    setStatus('idle')
  }, [])

  return { status, speak, stop }
}
