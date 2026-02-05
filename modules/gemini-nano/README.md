# Gemini Nano Module

Expo native module for integrating Google's Gemini Nano on-device AI model with React Native on Android.

## Overview

This module provides a bridge between React Native and Google's Gemini Nano AI model, enabling on-device AI inference for Android applications. It follows the same pattern as the Apple Intelligence module for iOS.

## Requirements

- **Android 14+** (API level 34+)
- Device with Gemini Nano support (typically Pixel 8 Pro or later)
- Google AI Edge SDK (Gemini Nano) - **Already integrated!**

## ✅ SDK Integration Status

The Google AI Edge SDK (version 0.2.2) has been integrated and the module is fully functional:

- ✅ SDK dependency added to `build.gradle`
- ✅ Native implementation using real Gemini Nano API
- ✅ Streaming support with `generateContentStream()`
- ✅ Non-streaming support with `generateContent()`
- ✅ Conversation history and system instructions
- ✅ Error handling and availability checks

## Installation

The module is already configured and ready to use. When you build the Android app:

1. The Google AI Edge SDK will be downloaded automatically via Gradle
2. The native module will be compiled and linked
3. The module will be available to React Native via the TypeScript wrapper

To build the app:

```bash
expo run:android
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

✅ **Fully Integrated**: The module is complete and uses the real Google AI Edge SDK for Gemini Nano inference.

- Real on-device AI powered by Gemini Nano
- No placeholder responses - actual model inference
- Full conversation context support
- Streaming and non-streaming modes
- Ready for production use on compatible devices

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
