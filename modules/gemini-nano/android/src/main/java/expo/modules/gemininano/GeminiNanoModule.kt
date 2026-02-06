package expo.modules.gemininano

import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.collect
import org.json.JSONArray
import com.google.ai.edge.GenerativeModel
import com.google.ai.edge.content

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
      // Try to create a model instance to verify SDK is available
      // This is a lightweight check that doesn't actually load the model
      Class.forName("com.google.ai.edge.GenerativeModel")
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

      // Initialize Gemini Nano model with system instruction
      val model = GenerativeModel(
        modelName = "gemini-nano",
        systemInstruction = content { text(systemPrompt) }
      )

      // Build conversation history from messages
      val conversationHistory = messages.map { message ->
        content(role = message.role) {
          text(message.content)
        }
      }

      // Generate response using the full conversation context
      val response = model.generateContent(*conversationHistory.toTypedArray())

      return response.text ?: ""
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

        // Initialize Gemini Nano model with system instruction
        val model = GenerativeModel(
          modelName = "gemini-nano",
          systemInstruction = content { text(systemPrompt) }
        )

        // Build conversation history from messages
        val conversationHistory = messages.map { message ->
          content(role = message.role) {
            text(message.content)
          }
        }

        // Stream the response
        var accumulatedText = ""

        model.generateContentStream(*conversationHistory.toTypedArray())
          .catch { e ->
            sendEvent("onStreamingError", mapOf(
              "error" to (e.message ?: "Stream error"),
              "requestId" to requestId
            ))
          }
          .collect { chunk ->
            // Accumulate the text from each chunk
            val chunkText = chunk.text ?: ""
            accumulatedText += chunkText

            // Send the accumulated text as delta
            if (accumulatedText.isNotEmpty()) {
              sendEvent("onStreamingDelta", mapOf(
                "delta" to accumulatedText,
                "requestId" to requestId
              ))
            }
          }

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
