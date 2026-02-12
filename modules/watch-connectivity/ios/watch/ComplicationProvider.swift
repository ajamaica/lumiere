import SwiftUI
import WidgetKit

/// A simple WidgetKit complication for the Lumiere watchOS app.
/// Shows an "Ask Lumiere" tap target that opens the app.
struct LumiereComplication: Widget {
    let kind: String = "LumiereComplication"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: LumiereTimelineProvider()) { entry in
            ComplicationEntryView(entry: entry)
        }
        .configurationDisplayName(String(localized: "watch.complication.title"))
        .description(String(localized: "watch.dictate.button"))
        .supportedFamilies([
            .accessoryCircular,
            .accessoryCorner,
            .accessoryInline,
            .accessoryRectangular,
        ])
    }
}

struct LumiereTimelineEntry: TimelineEntry {
    let date: Date
}

struct LumiereTimelineProvider: TimelineProvider {
    func placeholder(in context: Context) -> LumiereTimelineEntry {
        LumiereTimelineEntry(date: Date())
    }

    func getSnapshot(in context: Context, completion: @escaping (LumiereTimelineEntry) -> Void) {
        completion(LumiereTimelineEntry(date: Date()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<LumiereTimelineEntry>) -> Void) {
        let entry = LumiereTimelineEntry(date: Date())
        // Refresh once per hour — the complication is static
        let nextUpdate = Calendar.current.date(byAdding: .hour, value: 1, to: Date()) ?? Date()
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }
}

struct ComplicationEntryView: View {
    var entry: LumiereTimelineEntry

    @Environment(\.widgetFamily) var family

    var body: some View {
        switch family {
        case .accessoryCircular:
            ZStack {
                AccessoryWidgetBackground()
                Image(systemName: "sparkles")
                    .font(.title3)
            }
        case .accessoryCorner:
            Image(systemName: "sparkles")
                .font(.title3)
                .widgetLabel {
                    Text("watch.complication.title")
                }
        case .accessoryInline:
            Label(String(localized: "watch.complication.title"), systemImage: "sparkles")
        case .accessoryRectangular:
            VStack(alignment: .leading) {
                Label(String(localized: "watch.complication.title"), systemImage: "sparkles")
                    .font(.headline)
                Text("watch.dictate.button")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        @unknown default:
            Image(systemName: "sparkles")
        }
    }
}
