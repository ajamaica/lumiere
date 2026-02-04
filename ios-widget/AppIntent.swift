import AppIntents
import WidgetKit

/// Represents a single trigger that can be selected in the widget configuration.
struct TriggerDetail: AppEntity {
    static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "Trigger")
    static var defaultQuery = TriggerQuery()

    var id: String
    var message: String
    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(title: "\(message)")
    }
}

/// Query that loads available triggers from the shared App Group container.
struct TriggerQuery: EntityQuery {
    private static let appGroupId = "group.bot.lumiere.app"
    private static let triggersKey = "widget_triggers"

    func entities(for identifiers: [TriggerDetail.ID]) async throws -> [TriggerDetail] {
        let all = loadTriggers()
        return all.filter { identifiers.contains($0.id) }
    }

    func suggestedEntities() async throws -> [TriggerDetail] {
        return loadTriggers()
    }

    func defaultResult() async -> TriggerDetail? {
        return loadTriggers().first
    }

    private func loadTriggers() -> [TriggerDetail] {
        guard let defaults = UserDefaults(suiteName: TriggerQuery.appGroupId),
              let data = defaults.data(forKey: TriggerQuery.triggersKey),
              let triggers = try? JSONDecoder().decode([SharedTrigger].self, from: data)
        else {
            return []
        }
        return triggers.map { TriggerDetail(id: $0.id, message: $0.message) }
    }
}

/// Decodable model matching the JSON written by the React Native app.
struct SharedTrigger: Codable {
    let id: String
    let message: String
    let sessionKey: String
    let serverId: String
}

/// The configuration intent for the trigger widget.
/// Users pick which trigger to display when adding the widget.
struct SelectTriggerIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "Select Trigger"
    static var description: IntentDescription = "Choose which trigger this widget activates."

    @Parameter(title: "Trigger")
    var trigger: TriggerDetail?
}
