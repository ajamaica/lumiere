import ExpoModulesCore
import Foundation

/// Expo native module that bridges user-created triggers to iOS Apple Shortcuts
/// via the AppIntents framework (iOS 16+).
///
/// JS calls `syncTriggers` whenever the trigger list changes. The module stores
/// the data in UserDefaults so that `TriggerEntityQuery` can read it when the
/// Shortcuts app requests available options.
///
/// When a shortcut runs, `RunTriggerIntent` writes the selected trigger slug to
/// UserDefaults. The module detects this on app activation and emits an event
/// so the JS layer can execute the trigger (switch server/session and auto-send).
public class AppleShortcutsModule: Module {
  static let triggersKey = "apple_shortcuts_triggers"
  static let pendingTriggerKey = "apple_shortcuts_pending_trigger"

  public func definition() -> ModuleDefinition {
    Name("AppleShortcuts")

    Events("onShortcutTrigger")

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

    /// Called once from JS on mount to handle cold-start shortcut launches.
    /// Returns the pending trigger slug (if any) and clears it.
    Function("consumePendingTrigger") { () -> String? in
      guard let slug = UserDefaults.standard.string(forKey: Self.pendingTriggerKey) else {
        return nil
      }
      UserDefaults.standard.removeObject(forKey: Self.pendingTriggerKey)
      return slug
    }

    // When the app returns to the foreground, check whether a shortcut placed
    // a pending trigger while the app was in the background.
    OnAppBecomesActive {
      self.checkPendingTrigger()
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
    }

    OnDestroy {
      NotificationCenter.default.removeObserver(self)
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
}

// MARK: - Notification name shared with RunTriggerIntent

extension Notification.Name {
  static let appleShortcutTriggerPending = Notification.Name("AppleShortcutTriggerPending")
}
