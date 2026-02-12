import ExpoModulesCore
import Foundation

/// Minimal Expo module that exposes whether the current process is
/// running as an iOS App Clip.  The check is based on the bundle
/// identifier ending with ".Clip".
public class AppClipInfoModule: Module {
  public func definition() -> ModuleDefinition {
    Name("AppClipInfo")

    Constants([
      "isAppClip": Bundle.main.bundleIdentifier?.hasSuffix(".Clip") ?? false
    ])
  }
}
