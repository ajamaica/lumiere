import ExpoModulesCore
import WidgetKit

public class LumiereWidgetModule: Module {
  public func definition() -> ModuleDefinition {
    Name("LumiereWidget")

    Function("isAvailable") { () -> Bool in
      if #available(iOS 14.0, *) {
        return true
      }
      return false
    }

    Function("reloadAllTimelines") { () in
      if #available(iOS 14.0, *) {
        WidgetCenter.shared.reloadAllTimelines()
      }
    }
  }
}
