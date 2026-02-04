import Foundation
import React

/// Native module that exposes App Group UserDefaults to JavaScript
/// so the React Native app can write data that the widget reads.
@objc(SharedUserDefaults)
class SharedUserDefaultsModule: NSObject {

    @objc static func requiresMainQueueSetup() -> Bool { false }

    @objc func setItem(
        _ key: String,
        value: String,
        suiteName: String,
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        guard let defaults = UserDefaults(suiteName: suiteName) else {
            reject("ERR_SUITE", "Could not open UserDefaults suite: \(suiteName)", nil)
            return
        }
        defaults.set(value, forKey: key)
        resolve(nil)
    }

    @objc func getItem(
        _ key: String,
        suiteName: String,
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        guard let defaults = UserDefaults(suiteName: suiteName) else {
            reject("ERR_SUITE", "Could not open UserDefaults suite: \(suiteName)", nil)
            return
        }
        resolve(defaults.string(forKey: key))
    }
}
