import ExpoModulesCore
import Foundation

#if canImport(FoundationModels)
import FoundationModels
#endif

/// Expo native module that exposes Apple Foundation Models (on-device AI)
/// to React Native. Requires iOS 26+ and a device with Apple Intelligence support.
public class AppleIntelligenceModule: Module {
  public func definition() -> ModuleDefinition {
    Name("AppleIntelligence")

    Events("onStreamingDelta", "onStreamingComplete", "onStreamingError")

    Function("isAvailable") { () -> Bool in
      return self.checkAvailability()
    }

    AsyncFunction("generateResponse") { (systemPrompt: String, messagesJson: String) -> String in
      return try await self.doGenerateResponse(systemPrompt: systemPrompt, messagesJson: messagesJson)
    }

    AsyncFunction("startStreaming") { (systemPrompt: String, messagesJson: String, requestId: String) in
      try await self.doStartStreaming(systemPrompt: systemPrompt, messagesJson: messagesJson, requestId: requestId)
    }
  }

  // MARK: - Availability Check

  private func checkAvailability() -> Bool {
    #if canImport(FoundationModels)
    if #available(iOS 26.0, *) {
      return LanguageModelSession.isAvailable
    }
    #endif
    return false
  }

  // MARK: - Non-Streaming Response

  private func doGenerateResponse(systemPrompt: String, messagesJson: String) async throws -> String {
    #if canImport(FoundationModels)
    guard #available(iOS 26.0, *) else {
      throw AppleIntelligenceError.unavailable
    }

    guard LanguageModelSession.isAvailable else {
      throw AppleIntelligenceError.unavailable
    }

    let instructions = Instructions(systemPrompt)
    let session = LanguageModelSession(instructions: instructions)
    let messages = try parseMessages(messagesJson)

    // Build the conversation by sending each message in sequence.
    // The last user message is the one we want a response to.
    var lastResponse = ""
    for message in messages {
      if message.role == "user" {
        let response = try await session.respond(to: message.content)
        lastResponse = response.content
      }
    }

    return lastResponse
    #else
    throw AppleIntelligenceError.unavailable
    #endif
  }

  // MARK: - Streaming Response

  private func doStartStreaming(systemPrompt: String, messagesJson: String, requestId: String) async throws {
    #if canImport(FoundationModels)
    guard #available(iOS 26.0, *) else {
      throw AppleIntelligenceError.unavailable
    }

    guard LanguageModelSession.isAvailable else {
      throw AppleIntelligenceError.unavailable
    }

    let instructions = Instructions(systemPrompt)
    let session = LanguageModelSession(instructions: instructions)
    let messages = try parseMessages(messagesJson)

    // Feed prior conversation turns to establish context
    if messages.count > 1 {
      for message in messages.dropLast() {
        if message.role == "user" {
          _ = try await session.respond(to: message.content)
        }
      }
    }

    // Stream the response to the last user message
    guard let lastMessage = messages.last, lastMessage.role == "user" else {
      self.sendEvent("onStreamingComplete", ["requestId": requestId])
      return
    }

    let stream = session.streamResponse(to: lastMessage.content)

    do {
      for try await partialResponse in stream {
        let text = partialResponse.content
        if !text.isEmpty {
          self.sendEvent("onStreamingDelta", [
            "delta": text,
            "requestId": requestId,
          ])
        }
      }
      self.sendEvent("onStreamingComplete", ["requestId": requestId])
    } catch {
      self.sendEvent("onStreamingError", [
        "error": error.localizedDescription,
        "requestId": requestId,
      ])
    }
    #else
    throw AppleIntelligenceError.unavailable
    #endif
  }

  // MARK: - Helpers

  private struct ChatMessage: Codable {
    let role: String
    let content: String
  }

  private func parseMessages(_ json: String) throws -> [ChatMessage] {
    guard let data = json.data(using: .utf8) else {
      throw AppleIntelligenceError.invalidMessages
    }
    return try JSONDecoder().decode([ChatMessage].self, from: data)
  }
}

// MARK: - Errors

enum AppleIntelligenceError: Error, LocalizedError {
  case unavailable
  case invalidMessages

  var errorDescription: String? {
    switch self {
    case .unavailable:
      return "Apple Intelligence is not available on this device. Requires iOS 26+ with Apple Intelligence support."
    case .invalidMessages:
      return "Failed to parse messages JSON."
    }
  }
}
