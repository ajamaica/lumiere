package expo.modules.gemininano

import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.flow.collect
import org.json.JSONArray
import org.json.JSONObject

// Import Google AI Edge SDK (Gemini Nano) when available
// Note: You'll need to add the dependency in your app's build.gradle:
// implementation 'com.google.ai.edge:generativeai:0.1.0'
// For now, we'll use conditional compilation/reflection to handle when SDK is not available

/**
 * Expo native module that exposes Gemini Nano (on-device AI for Android)
 * to React Native. Requires Android 14+ and a device with Gemini Nano support.
 */
class GeminiNanoModule : Module() {
  private val moduleScope = CoroutineScope(Dispatchers.Main)

  override fun definition() = ModuleDefinition {
    Name("GeminiNano")

    Events("onStreamingDelta", "onStreamingComplete", "onStreamingError")

    Function("isAvailable") {
      return@Function checkAvailability()
    }

    AsyncFunction("generateResponse") { systemPrompt: String, messagesJson: String ->
      return@AsyncFunction doGenerateResponse(systemPrompt, messagesJson)
    }

    AsyncFunction("startStreaming") { systemPrompt: String, messagesJson: String, requestId: String ->
      doStartStreaming(systemPrompt, messagesJson, requestId)
    }
  }

  // MARK: - Availability Check

  private fun checkAvailability(): Boolean {
    // Check if Android version supports Gemini Nano (Android 14+)
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      return false
    }

    try {
      // Check if Gemini Nano SDK is available via reflection
      // This allows the app to build even without the SDK
      val generativeModelClass = Class.forName("com.google.ai.edge.GenerativeModel")

      // Additional runtime checks for device capability could be added here
      // For example, checking AICore availability on the device
      return true
    } catch (e: ClassNotFoundException) {
      return false
    } catch (e: Exception) {
      return false
    }
  }

  // MARK: - Non-Streaming Response

  private suspend fun doGenerateResponse(systemPrompt: String, messagesJson: String): String {
    if (!checkAvailability()) {
      throw GeminiNanoException.Unavailable()
    }

    try {
      val messages = parseMessages(messagesJson)

      // Initialize Gemini Nano model
      // Note: This is pseudo-code - actual implementation depends on Google AI Edge SDK
      // val model = GenerativeModel(
      //   modelName = "gemini-nano",
      //   systemInstruction = systemPrompt
      // )

      // Build the conversation prompt from messages
      val conversationText = buildConversationPrompt(systemPrompt, messages)

      // Generate response
      // val response = model.generateContent(conversationText)
      // return response.text ?: ""

      // Placeholder implementation until SDK is integrated
      return generatePlaceholderResponse(messages)
    } catch (e: Exception) {
      throw GeminiNanoException.GenerationFailed(e.message ?: "Unknown error")
    }
  }

  // MARK: - Streaming Response

  private fun doStartStreaming(systemPrompt: String, messagesJson: String, requestId: String) {
    if (!checkAvailability()) {
      sendEvent("onStreamingError", mapOf(
        "error" to "Gemini Nano is not available",
        "requestId" to requestId
      ))
      return
    }

    moduleScope.launch {
      try {
        val messages = parseMessages(messagesJson)

        // Initialize Gemini Nano model
        // val model = GenerativeModel(
        //   modelName = "gemini-nano",
        //   systemInstruction = systemPrompt
        // )

        // Build the conversation prompt
        val conversationText = buildConversationPrompt(systemPrompt, messages)

        // Stream the response
        // val responseFlow = model.generateContentStream(conversationText)
        // var accumulatedText = ""

        // responseFlow.collect { chunk ->
        //   accumulatedText += chunk.text ?: ""
        //   sendEvent("onStreamingDelta", mapOf(
        //     "delta" to accumulatedText,
        //     "requestId" to requestId
        //   ))
        // }

        // Placeholder streaming implementation
        streamPlaceholderResponse(messages, requestId)

        sendEvent("onStreamingComplete", mapOf("requestId" to requestId))
      } catch (e: Exception) {
        sendEvent("onStreamingError", mapOf(
          "error" to (e.message ?: "Failed to generate streaming response"),
          "requestId" to requestId
        ))
      }
    }
  }

  // MARK: - Helpers

  private data class ChatMessage(
    val role: String,
    val content: String
  )

  private fun parseMessages(json: String): List<ChatMessage> {
    try {
      val jsonArray = JSONArray(json)
      val messages = mutableListOf<ChatMessage>()

      for (i in 0 until jsonArray.length()) {
        val obj = jsonArray.getJSONObject(i)
        messages.add(
          ChatMessage(
            role = obj.getString("role"),
            content = obj.getString("content")
          )
        )
      }

      return messages
    } catch (e: Exception) {
      throw GeminiNanoException.InvalidMessages()
    }
  }

  private fun buildConversationPrompt(systemPrompt: String, messages: List<ChatMessage>): String {
    val builder = StringBuilder()
    builder.append("System: $systemPrompt\n\n")

    for (message in messages) {
      val prefix = if (message.role == "user") "User" else "Assistant"
      builder.append("$prefix: ${message.content}\n\n")
    }

    return builder.toString()
  }

  // MARK: - Placeholder Implementation
  // These methods provide a working implementation until the actual Gemini Nano SDK is integrated

  private fun generatePlaceholderResponse(messages: List<ChatMessage>): String {
    val lastUserMessage = messages.lastOrNull { it.role == "user" }?.content ?: ""
    return "This is a placeholder response from Gemini Nano module. " +
           "You said: '$lastUserMessage'. " +
           "Please integrate the Google AI Edge SDK (Gemini Nano) to enable actual on-device inference."
  }

  private suspend fun streamPlaceholderResponse(messages: List<ChatMessage>, requestId: String) {
    val response = generatePlaceholderResponse(messages)
    val words = response.split(" ")
    var accumulated = ""

    for (word in words) {
      accumulated += "$word "
      sendEvent("onStreamingDelta", mapOf(
        "delta" to accumulated.trim(),
        "requestId" to requestId
      ))
      // Simulate streaming delay
      kotlinx.coroutines.delay(50)
    }
  }
}

// MARK: - Exceptions

sealed class GeminiNanoException(message: String) : Exception(message) {
  class Unavailable : GeminiNanoException(
    "Gemini Nano is not available on this device. Requires Android 14+ with Gemini Nano support."
  )

  class InvalidMessages : GeminiNanoException(
    "Failed to parse messages JSON."
  )

  class GenerationFailed(reason: String) : GeminiNanoException(
    "Failed to generate response: $reason"
  )
}
