import ExpoModulesCore
import Speech
import AVFoundation

public class SpeechTranscriptionModule: Module {
  private var audioEngine: AVAudioEngine?
  private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
  private var recognitionTask: SFSpeechRecognitionTask?
  private var speechRecognizer: SFSpeechRecognizer?
  private var lastTranscription: String = ""

  public func definition() -> ModuleDefinition {
    Name("SpeechTranscription")

    Events("onTranscription", "onError")

    AsyncFunction("isAvailable") { () -> Bool in
      guard let recognizer = SFSpeechRecognizer() else { return false }
      return recognizer.isAvailable
    }

    AsyncFunction("requestPermissions") { (promise: Promise) in
      SFSpeechRecognizer.requestAuthorization { authStatus in
        switch authStatus {
        case .authorized:
          if #available(iOS 17.0, *) {
            AVAudioApplication.requestRecordPermission { granted in
              promise.resolve(granted)
            }
          } else {
            AVAudioSession.sharedInstance().requestRecordPermission { granted in
              promise.resolve(granted)
            }
          }
        default:
          promise.resolve(false)
        }
      }
    }

    AsyncFunction("startTranscription") { () in
      try self.startRecognition()
    }

    AsyncFunction("stopTranscription") { () -> String in
      let result = self.lastTranscription
      self.stopRecognition()
      return result
    }

    AsyncFunction("cancelTranscription") { () in
      self.lastTranscription = ""
      self.stopRecognition()
    }
  }

  private func startRecognition() throws {
    stopRecognition()

    speechRecognizer = SFSpeechRecognizer()
    guard let speechRecognizer = speechRecognizer, speechRecognizer.isAvailable else {
      sendEvent("onError", ["message": "Speech recognizer is not available"])
      return
    }

    let audioSession = AVAudioSession.sharedInstance()
    try audioSession.setCategory(.record, mode: .measurement, options: .duckOthers)
    try audioSession.setActive(true, options: .notifyOthersOnDeactivation)

    recognitionRequest = SFSpeechAudioBufferRecognitionRequest()
    guard let recognitionRequest = recognitionRequest else {
      sendEvent("onError", ["message": "Unable to create recognition request"])
      return
    }
    recognitionRequest.shouldReportPartialResults = true

    audioEngine = AVAudioEngine()
    guard let audioEngine = audioEngine else {
      sendEvent("onError", ["message": "Unable to create audio engine"])
      return
    }

    let inputNode = audioEngine.inputNode
    let recordingFormat = inputNode.outputFormat(forBus: 0)

    inputNode.installTap(onBus: 0, bufferSize: 1024, format: recordingFormat) { buffer, _ in
      recognitionRequest.append(buffer)
    }

    recognitionTask = speechRecognizer.recognitionTask(with: recognitionRequest) { [weak self] result, error in
      guard let self = self else { return }

      if let result = result {
        let text = result.bestTranscription.formattedString
        self.lastTranscription = text
        self.sendEvent("onTranscription", [
          "text": text,
          "isFinal": result.isFinal
        ])
      }

      if let error = error {
        self.sendEvent("onError", ["message": error.localizedDescription])
        self.stopRecognition()
      }
    }

    audioEngine.prepare()
    try audioEngine.start()
  }

  private func stopRecognition() {
    audioEngine?.stop()
    audioEngine?.inputNode.removeTap(onBus: 0)
    recognitionRequest?.endAudio()
    recognitionTask?.cancel()

    audioEngine = nil
    recognitionRequest = nil
    recognitionTask = nil
    speechRecognizer = nil
  }
}
