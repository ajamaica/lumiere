import ExpoModulesCore
import Foundation
import CoreSpotlight

/// Expo native module that bridges user-created triggers to iOS Apple Shortcuts
/// via the AppIntents framework (iOS 16+) and donates user activities for
/// Siri Suggestions.
///
/// JS calls `syncTriggers` whenever the trigger list changes. The module stores
/// the data in UserDefaults so that `TriggerEntityQuery` can read it when the
/// Shortcuts app requests available options.
///
/// When a shortcut runs, `RunTriggerIntent` writes the selected trigger slug to
/// UserDefaults. The module detects this on app activation and emits an event
/// so the JS layer can execute the trigger (switch server/session and auto-send).
///
/// Siri Suggestions: The module donates `NSUserActivity` objects when the user
/// opens a chat, allowing iOS to learn usage patterns and proactively suggest
/// the action in Spotlight, the lock screen, and the Siri Suggestions widget.
public class AppleShortcutsModule: Module {
  static let triggersKey = "apple_shortcuts_triggers"
  static let pendingTriggerKey = "apple_shortcuts_pending_trigger"
  static let serversKey = "apple_shortcuts_servers"
  static let pendingActivityKey = "apple_shortcuts_pending_activity"

  static let openChatActivityType = "bot.lumiere.app.openChat"
  static let newChatActivityType = "bot.lumiere.app.newChat"

  /// Holds a strong reference to the current NSUserActivity so it isn't deallocated.
  private var currentActivity: NSUserActivity?

  public func definition() -> ModuleDefinition {
    Name("AppleShortcuts")

    Events("onShortcutTrigger", "onContinueActivity")

    /// Returns true when AppIntents are available (iOS 16+).
    Function("isAvailable") { () -> Bool in
      if #available(iOS 16.0, *) { return true }
      return false
    }

    /// Persist the current triggers list so AppIntents can read them.
    /// `triggersJson` is a JSON array of {id, name, serverName} objects.
    AsyncFunction("syncTriggers") { (triggersJson: String) in
      UserDefaults.standard.set(triggersJson, forKey: Self.triggersKey)

      if #available(iOS 16.0, *) {
        LumiereShortcuts.updateAppShortcutParameters()
      }
    }

    /// Persist the server list so AppIntents can present them as options.
    AsyncFunction("syncServers") { (serversJson: String) in
      UserDefaults.standard.set(serversJson, forKey: Self.serversKey)

      if #available(iOS 16.0, *) {
        LumiereShortcuts.updateAppShortcutParameters()
      }
    }

    /// Called once from JS on mount to handle cold-start shortcut launches.
    /// Returns the pending trigger slug (if any) and clears it.
    Function("consumePendingTrigger") { () -> String? in
      guard let slug = UserDefaults.standard.string(forKey: Self.pendingTriggerKey) else {
        return nil
      }
      UserDefaults.standard.removeObject(forKey: Self.pendingTriggerKey)
      return slug
    }

    /// Check for a pending activity from a Siri Suggestion cold start.
    /// Returns a JSON string with { serverId, sessionKey } or null.
    Function("consumePendingActivity") { () -> String? in
      guard let json = UserDefaults.standard.string(forKey: Self.pendingActivityKey) else {
        return nil
      }
      UserDefaults.standard.removeObject(forKey: Self.pendingActivityKey)
      return json
    }

    /// Donate an "open chat" activity to Siri so it can suggest it later.
    AsyncFunction("donateOpenChatActivity") {
      (serverId: String, serverName: String, sessionKey: String, sessionName: String) in

      let activity = NSUserActivity(activityType: Self.openChatActivityType)
      activity.title = serverName
      activity.userInfo = [
        "serverId": serverId,
        "sessionKey": sessionKey,
        "serverName": serverName,
        "sessionName": sessionName,
      ]
      activity.isEligibleForSearch = true
      activity.isEligibleForPrediction = true
      activity.persistentIdentifier = "\(serverId):\(sessionKey)"

      // Spotlight search attributes
      let attributes = CSSearchableItemAttributeSet(contentType: .item)
      attributes.contentDescription = sessionName
      attributes.keywords = [serverName, sessionName, "chat", "AI"]
      activity.contentAttributeSet = attributes

      if #available(iOS 16.0, *) {
        activity.shortcutAvailability = .sleepChat
      }

      activity.becomeCurrent()
      self.currentActivity = activity
    }

    /// Remove all donated Siri Suggestions activities.
    AsyncFunction("deleteAllDonatedActivities") {
      NSUserActivity.deleteAllSavedUserActivities {}
    }

    // When the app returns to the foreground, check whether a shortcut placed
    // a pending trigger while the app was in the background.
    OnAppBecomesActive {
      self.checkPendingTrigger()
      self.checkPendingActivity()
    }

    // Also observe in-process notifications posted by RunTriggerIntent when the
    // shortcut fires while the app is already in the foreground.
    OnCreate {
      NotificationCenter.default.addObserver(
        forName: .appleShortcutTriggerPending,
        object: nil,
        queue: .main
      ) { [weak self] _ in
        self?.checkPendingTrigger()
      }

      NotificationCenter.default.addObserver(
        forName: .appleShortcutActivityPending,
        object: nil,
        queue: .main
      ) { [weak self] _ in
        self?.checkPendingActivity()
      }
    }

    OnDestroy {
      NotificationCenter.default.removeObserver(self)
      currentActivity?.invalidate()
      currentActivity = nil
    }
  }

  /// Read and clear the pending trigger slug, then emit an event to JS.
  private func checkPendingTrigger() {
    guard let slug = UserDefaults.standard.string(forKey: Self.pendingTriggerKey) else {
      return
    }
    UserDefaults.standard.removeObject(forKey: Self.pendingTriggerKey)
    sendEvent("onShortcutTrigger", ["slug": slug])
  }

  /// Read and clear a pending Siri Suggestion activity, then emit an event to JS.
  private func checkPendingActivity() {
    guard let json = UserDefaults.standard.string(forKey: Self.pendingActivityKey),
          let data = json.data(using: .utf8),
          let dict = try? JSONSerialization.jsonObject(with: data) as? [String: String] else {
      return
    }
    UserDefaults.standard.removeObject(forKey: Self.pendingActivityKey)
    sendEvent("onContinueActivity", dict)
  }
}

// MARK: - Notification names shared with intents

extension Notification.Name {
  static let appleShortcutTriggerPending = Notification.Name("AppleShortcutTriggerPending")
  static let appleShortcutActivityPending = Notification.Name("AppleShortcutActivityPending")
}
