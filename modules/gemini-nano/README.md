# Gemini Nano Module

Expo native module for integrating Google's Gemini Nano on-device AI model with React Native on Android.

## Overview

This module provides a bridge between React Native and Google's Gemini Nano AI model, enabling on-device AI inference for Android applications. It follows the same pattern as the Apple Intelligence module for iOS.

## Requirements

- **Android 14+** (API level 34+)
- Device with Gemini Nano support (typically Pixel 8 Pro or later)
- Google AI Edge SDK (Gemini Nano)

## Installation

### 1. Add Google AI Edge SDK Dependency

To enable actual Gemini Nano functionality, you need to add the Google AI Edge SDK to your project:

1. Open `modules/gemini-nano/android/build.gradle`
2. Uncomment the Gemini Nano dependency:
   ```gradle
   implementation 'com.google.ai.edge:generativeai:0.1.0'
   ```
3. Check [Google's AI Edge documentation](https://ai.google.dev/edge) for the latest version

### 2. Update the Native Module

After adding the SDK dependency:

1. Open `modules/gemini-nano/android/src/main/java/expo/modules/gemininano/GeminiNanoModule.kt`
2. Replace the placeholder implementation with actual Google AI Edge SDK calls
3. Update the following methods:
   - `doGenerateResponse()` - Use `GenerativeModel.generateContent()`
   - `doStartStreaming()` - Use `GenerativeModel.generateContentStream()`

### 3. Example Integration

```kotlin
// In doGenerateResponse():
val model = GenerativeModel(
  modelName = "gemini-nano",
  systemInstruction = systemPrompt
)
val response = model.generateContent(conversationText)
return response.text ?: ""

// In doStartStreaming():
val model = GenerativeModel(
  modelName = "gemini-nano",
  systemInstruction = systemPrompt
)
val responseFlow = model.generateContentStream(conversationText)
var accumulatedText = ""

responseFlow.collect { chunk ->
  accumulatedText += chunk.text ?: ""
  sendEvent("onStreamingDelta", mapOf(
    "delta" to accumulatedText,
    "requestId" to requestId
  ))
}
```

## Usage

The module is already integrated into the chat provider system. To use it:

1. Select "Gemini Nano" as your provider in the app settings (Android only)
2. The provider will automatically use the native module for on-device inference

## API

### `isAvailable(): boolean`
Check if Gemini Nano is available on the current device.

### `generateResponse(systemPrompt: string, messages: string): Promise<string>`
Generate a complete response (non-streaming).

### `startStreaming(systemPrompt: string, messages: string, requestId: string): Promise<void>`
Start streaming a response. Emits events:
- `onStreamingDelta` - Incremental text chunks
- `onStreamingComplete` - Generation finished
- `onStreamingError` - Error occurred

## Current Status

⚠️ **Placeholder Implementation**: The current implementation includes placeholder logic that returns mock responses. To enable real Gemini Nano inference:

1. Add the Google AI Edge SDK dependency
2. Implement the actual SDK integration in the Kotlin module
3. Test on a compatible Android device

## Architecture

```
React Native (TypeScript)
    ↓
modules/gemini-nano/src/GeminiNano.ts (TypeScript wrapper)
    ↓
modules/gemini-nano/android/.../GeminiNanoModule.kt (Expo Module)
    ↓
Google AI Edge SDK (Gemini Nano)
    ↓
On-device AI Inference
```

## Testing

To test the module:

1. Build the app for Android: `expo run:android`
2. Select "Gemini Nano" from the provider options
3. Send a message - you should see the placeholder response
4. After integrating the real SDK, verify actual on-device inference

## Troubleshooting

### Module Not Found
- Ensure `expo-module.config.json` is properly configured
- Run `expo prebuild --clean` to regenerate native code
- Check that the package is listed in the main app's dependencies

### Compilation Errors
- Verify Kotlin version compatibility
- Check that Android SDK is properly configured
- Ensure all dependencies are compatible with your target SDK version

### Runtime Errors
- Check device compatibility (Android 14+)
- Verify Gemini Nano is available on the device
- Check logcat for detailed error messages: `adb logcat *:E`

## References

- [Google AI Edge (Gemini Nano) Documentation](https://ai.google.dev/edge)
- [Expo Modules API](https://docs.expo.dev/modules/overview/)
- [Android AI Core Documentation](https://developer.android.com/ai)
