import ExpoModulesCore
import Foundation

/// Expo native module that wraps NSUbiquitousKeyValueStore for iCloud key-value sync.
/// Data is automatically synced across all devices signed into the same iCloud account.
public class ICloudStorageModule: Module {
  private let store = NSUbiquitousKeyValueStore.default

  public func definition() -> ModuleDefinition {
    Name("ICloudStorage")

    Events("onStoreChanged")

    OnCreate {
      NotificationCenter.default.addObserver(
        self,
        selector: #selector(self.storeDidChange(_:)),
        name: NSUbiquitousKeyValueStore.didChangeExternallyNotification,
        object: self.store
      )
      // Trigger an initial sync pull from iCloud
      self.store.synchronize()
    }

    OnDestroy {
      NotificationCenter.default.removeObserver(self)
    }

    Function("isAvailable") { () -> Bool in
      // NSUbiquitousKeyValueStore is always available on iOS,
      // but returns false if no iCloud account is signed in.
      return FileManager.default.ubiquityIdentityToken != nil
    }

    Function("getItem") { (key: String) -> String? in
      return self.store.string(forKey: key)
    }

    Function("setItem") { (key: String, value: String) in
      self.store.set(value, forKey: key)
      self.store.synchronize()
    }

    Function("removeItem") { (key: String) in
      self.store.removeObject(forKey: key)
      self.store.synchronize()
    }

    Function("getAllKeys") { () -> [String] in
      return Array(self.store.dictionaryRepresentation.keys)
    }

    Function("getAll") { () -> [String: String] in
      var result: [String: String] = [:]
      for (key, value) in self.store.dictionaryRepresentation {
        if let stringValue = value as? String {
          result[key] = stringValue
        }
      }
      return result
    }

    Function("clear") { () in
      for key in self.store.dictionaryRepresentation.keys {
        self.store.removeObject(forKey: key)
      }
      self.store.synchronize()
    }

    Function("synchronize") { () -> Bool in
      return self.store.synchronize()
    }
  }

  // MARK: - Change Notification

  @objc
  private func storeDidChange(_ notification: Notification) {
    guard let userInfo = notification.userInfo else { return }

    let reason = userInfo[NSUbiquitousKeyValueStoreChangeReasonKey] as? Int ?? -1
    let changedKeys = userInfo[NSUbiquitousKeyValueStoreChangedKeysKey] as? [String] ?? []

    // Build a dictionary of the changed key-value pairs
    var changedValues: [String: String?] = [:]
    for key in changedKeys {
      changedValues[key] = self.store.string(forKey: key)
    }

    self.sendEvent("onStoreChanged", [
      "reason": reason,
      "changedKeys": changedKeys,
      "changedValues": changedValues,
    ])
  }
}
