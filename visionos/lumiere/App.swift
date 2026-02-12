import SwiftUI
import React
import React_RCTSwiftExtensions

@main
struct LumiereApp: App {
  @UIApplicationDelegateAdaptor var delegate: AppDelegate

  var body: some Scene {
    RCTMainWindow(moduleName: "main")
  }
}
