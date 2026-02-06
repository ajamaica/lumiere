package expo.modules.gemininano

import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.collect
import org.json.JSONArray
import com.google.ai.edge.aicore.GenerativeModel
import com.google.ai.edge.aicore.DownloadConfig
import com.google.ai.edge.aicore.DownloadCallback
import com.google.ai.edge.aicore.GenerativeAIException
import com.google.ai.edge.aicore.generationConfig

/**
 * Expo native module that exposes Gemini Nano (on-device AI for Android)
 * to React Native. Requires Android 14+ and a device with Gemini Nano support.
 */
class GeminiNanoModule : Module() {
  private val moduleScope = CoroutineScope(Dispatchers.Main)
  private var generativeModel: GenerativeModel? = null

  override fun definition() = ModuleDefinition {
    Name("GeminiNano")

    Events("onStreamingDelta", "onStreamingComplete", "onStreamingError")

    Function("isAvailable") {
      return@Function checkAvailability()
    }

    AsyncFunction("generateResponse") { systemPrompt: String, messagesJson: String, promise: Promise ->
      moduleScope.launch {
        try {
          val result = doGenerateResponse(systemPrompt, messagesJson)
          promise.resolve(result)
        } catch (e: Exception) {
          promise.reject("ERR_GEMINI_NANO", e.message, e)
        }
      }
    }

    AsyncFunction("startStreaming") { systemPrompt: String, messagesJson: String, requestId: String ->
      doStartStreaming(systemPrompt, messagesJson, requestId)
    }

    OnDestroy {
      generativeModel?.close()
      generativeModel = null
    }
  }

  // MARK: - Availability Check

  private fun checkAvailability(): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      return false
    }

    try {
      Class.forName("com.google.ai.edge.aicore.GenerativeModel")
      return true
    } catch (e: ClassNotFoundException) {
      return false
    } catch (e: Exception) {
      return false
    }
  }

  // MARK: - Model Initialization

  private fun getOrCreateModel(): GenerativeModel {
    generativeModel?.let { return it }

    val context = appContext.reactContext
      ?: throw GeminiNanoException.Unavailable()

    val config = generationConfig {
      this.context = context
      this.temperature = 0.7f
      this.maxOutputTokens = 1024
      this.topK = 40
      this.candidateCount = 1
    }

    val downloadConfig = DownloadConfig(object : DownloadCallback {
      override fun onDownloadStarted(bytesToDownload: Long) {}
      override fun onDownloadFailed(failureStatus: String, e: GenerativeAIException) {}
      override fun onDownloadProgress(totalBytesDownloaded: Long) {}
      override fun onDownloadCompleted() {}
    })

    val model = GenerativeModel(config, downloadConfig)
    generativeModel = model
    return model
  }

  // MARK: - Build Prompt

  private fun buildPrompt(systemPrompt: String, messages: List<ChatMessage>): String {
    val sb = StringBuilder()
    if (systemPrompt.isNotEmpty()) {
      sb.appendLine("System: $systemPrompt")
      sb.appendLine()
    }
    for (message in messages) {
      val role = if (message.role == "user") "User" else "Assistant"
      sb.appendLine("$role: ${message.content}")
    }
    sb.appendLine("Assistant:")
    return sb.toString()
  }

  // MARK: - Non-Streaming Response

  private suspend fun doGenerateResponse(systemPrompt: String, messagesJson: String): String {
    if (!checkAvailability()) {
      throw GeminiNanoException.Unavailable()
    }

    try {
      val messages = parseMessages(messagesJson)
      val prompt = buildPrompt(systemPrompt, messages)
      val model = getOrCreateModel()
      val response = model.generateContent(prompt)
      return response.text ?: ""
    } catch (e: GeminiNanoException) {
      throw e
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
        val prompt = buildPrompt(systemPrompt, messages)
        val model = getOrCreateModel()

        var accumulatedText = ""

        model.generateContentStream(prompt)
          .catch { e ->
            sendEvent("onStreamingError", mapOf(
              "error" to (e.message ?: "Stream error"),
              "requestId" to requestId
            ))
          }
          .collect { chunk ->
            val chunkText = chunk.text ?: ""
            accumulatedText += chunkText

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
