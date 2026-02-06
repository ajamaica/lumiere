package expo.modules.speechtranscription

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import androidx.core.content.ContextCompat
import expo.modules.interfaces.permissions.Permissions
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.Locale
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

class SpeechTranscriptionModule : Module() {
  private var speechRecognizer: SpeechRecognizer? = null
  private var lastTranscription: String = ""
  private val mainHandler = Handler(Looper.getMainLooper())

  override fun definition() = ModuleDefinition {
    Name("SpeechTranscription")

    Events("onTranscription", "onError")

    AsyncFunction("isAvailable") {
      val context = appContext.reactContext ?: return@AsyncFunction false
      SpeechRecognizer.isRecognitionAvailable(context)
    }

    AsyncFunction("requestPermissions") { promise: Promise ->
      val context = appContext.reactContext ?: run {
        promise.resolve(false)
        return@AsyncFunction
      }

      if (ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO)
          == PackageManager.PERMISSION_GRANTED) {
        promise.resolve(true)
        return@AsyncFunction
      }

      if (appContext.permissions != null) {
        Permissions.askForPermissionsWithPermissionsManager(
          appContext.permissions,
          promise,
          Manifest.permission.RECORD_AUDIO
        )
      } else {
        promise.resolve(false)
      }
    }

    AsyncFunction("startTranscription") {
      startRecognition()
    }

    AsyncFunction("stopTranscription") {
      stopRecognitionSync()
      lastTranscription
    }

    AsyncFunction("cancelTranscription") {
      lastTranscription = ""
      stopRecognition()
    }

    OnDestroy {
      stopRecognition()
    }
  }

  private fun startRecognition() {
    stopRecognition()

    val context = appContext.reactContext ?: run {
      sendEvent("onError", mapOf("message" to "Context not available"))
      return
    }

    if (!SpeechRecognizer.isRecognitionAvailable(context)) {
      sendEvent("onError", mapOf("message" to "Speech recognition is not available"))
      return
    }

    mainHandler.post {
      val recognizer = SpeechRecognizer.createSpeechRecognizer(context)
      speechRecognizer = recognizer

      recognizer.setRecognitionListener(object : RecognitionListener {
        override fun onReadyForSpeech(params: Bundle?) {}
        override fun onBeginningOfSpeech() {}
        override fun onRmsChanged(rmsdB: Float) {}
        override fun onBufferReceived(buffer: ByteArray?) {}
        override fun onEndOfSpeech() {}

        override fun onError(error: Int) {
          val message = when (error) {
            SpeechRecognizer.ERROR_AUDIO -> "Audio recording error"
            SpeechRecognizer.ERROR_CLIENT -> "Client error"
            SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "Insufficient permissions"
            SpeechRecognizer.ERROR_NETWORK -> "Network error"
            SpeechRecognizer.ERROR_NETWORK_TIMEOUT -> "Network timeout"
            SpeechRecognizer.ERROR_NO_MATCH -> "No speech detected"
            SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> "Recognition service busy"
            SpeechRecognizer.ERROR_SERVER -> "Server error"
            SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "No speech input"
            else -> "Unknown error"
          }
          sendEvent("onError", mapOf("message" to message))
        }

        override fun onResults(results: Bundle?) {
          val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
          val text = matches?.firstOrNull() ?: ""
          if (text.isNotEmpty()) {
            lastTranscription = text
            sendEvent("onTranscription", mapOf(
              "text" to text,
              "isFinal" to true
            ))
          }
        }

        override fun onPartialResults(partialResults: Bundle?) {
          val matches = partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
          val text = matches?.firstOrNull() ?: ""
          if (text.isNotEmpty()) {
            lastTranscription = text
            sendEvent("onTranscription", mapOf(
              "text" to text,
              "isFinal" to false
            ))
          }
        }

        override fun onEvent(eventType: Int, params: Bundle?) {}
      })

      val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
        putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
        putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale.getDefault())
        putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
        putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
      }

      recognizer.startListening(intent)
    }
  }

  private fun stopRecognitionSync() {
    val latch = CountDownLatch(1)
    mainHandler.post {
      speechRecognizer?.apply {
        stopListening()
        destroy()
      }
      speechRecognizer = null
      latch.countDown()
    }
    latch.await(2, TimeUnit.SECONDS)
  }

  private fun stopRecognition() {
    mainHandler.post {
      speechRecognizer?.apply {
        stopListening()
        destroy()
      }
      speechRecognizer = null
    }
  }
}
