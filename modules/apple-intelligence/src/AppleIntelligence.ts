/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * TypeScript wrapper for the AppleIntelligence native Expo module.
 *
 * At build time the native module is linked automatically by Expo.
 * We use `require` + runtime guard so the app doesn't crash on
 * platforms where the module doesn't exist (Android, older iOS).
 */

interface AppleIntelligenceNativeModule {
  isAvailable(): boolean
  generateResponse(systemPrompt: string, messages: string): Promise<string>
  startStreaming(systemPrompt: string, messages: string, requestId: string): Promise<void>
  addListener(eventName: string): void
  removeListeners(count: number): void
}

interface StreamingDeltaEvent {
  delta: string
  requestId: string
}

interface StreamingCompleteEvent {
  requestId: string
}

interface StreamingErrorEvent {
  error: string
  requestId: string
}

let nativeModule: AppleIntelligenceNativeModule | null = null

function getModule(): AppleIntelligenceNativeModule {
  if (!nativeModule) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { requireNativeModule } = require('expo')
    nativeModule = requireNativeModule('AppleIntelligence') as AppleIntelligenceNativeModule
  }
  return nativeModule
}

function createEventEmitter(mod: AppleIntelligenceNativeModule) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { EventEmitter } = require('expo')
  return new EventEmitter(mod)
}

/**
 * Check if Apple Foundation Models are available on this device.
 * Returns false on Android, simulators without Apple Intelligence, or older iOS versions.
 */
export function isAvailable(): boolean {
  try {
    return getModule().isAvailable()
  } catch {
    return false
  }
}

/**
 * Generate a non-streaming response using Apple Foundation Models.
 * @param systemPrompt - System instructions for the model
 * @param messages - JSON-encoded array of {role, content} messages
 * @returns The complete response text
 */
export async function generateResponse(systemPrompt: string, messages: string): Promise<string> {
  return getModule().generateResponse(systemPrompt, messages)
}

/**
 * Generate a streaming response using Apple Foundation Models.
 * Emits 'onStreamingDelta' events with incremental text chunks,
 * followed by 'onStreamingComplete' when done.
 *
 * @param systemPrompt - System instructions for the model
 * @param messages - JSON-encoded array of {role, content} messages
 * @param requestId - Unique ID to correlate events with this request
 * @param onDelta - Callback for each text chunk
 * @param onComplete - Callback when generation finishes
 * @param onError - Callback on error
 * @returns Cleanup function to remove event listeners
 */
export function generateStreamingResponse(
  systemPrompt: string,
  messages: string,
  requestId: string,
  onDelta: (delta: string) => void,
  onComplete: () => void,
  onError: (error: string) => void,
): () => void {
  const mod = getModule()
  const emitter = createEventEmitter(mod)

  const deltaSubscription = emitter.addListener(
    'onStreamingDelta',
    (event: StreamingDeltaEvent) => {
      if (event.requestId === requestId) {
        onDelta(event.delta)
      }
    },
  )

  const completeSubscription = emitter.addListener(
    'onStreamingComplete',
    (event: StreamingCompleteEvent) => {
      if (event.requestId === requestId) {
        onComplete()
        cleanup()
      }
    },
  )

  const errorSubscription = emitter.addListener(
    'onStreamingError',
    (event: StreamingErrorEvent) => {
      if (event.requestId === requestId) {
        onError(event.error)
        cleanup()
      }
    },
  )

  function cleanup() {
    deltaSubscription.remove()
    completeSubscription.remove()
    errorSubscription.remove()
  }

  // Start streaming on the native side
  mod.startStreaming(systemPrompt, messages, requestId).catch((error: any) => {
    onError(error?.message || 'Failed to start streaming')
    cleanup()
  })

  return cleanup
}
