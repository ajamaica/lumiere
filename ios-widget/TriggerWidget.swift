import SwiftUI
import WidgetKit

struct TriggerEntry: TimelineEntry {
    let date: Date
    let trigger: TriggerDetail?
}

struct TriggerProvider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> TriggerEntry {
        TriggerEntry(
            date: .now,
            trigger: TriggerDetail(id: "placeholder", message: "Send a message…")
        )
    }

    func snapshot(
        for configuration: SelectTriggerIntent,
        in context: Context
    ) async -> TriggerEntry {
        TriggerEntry(date: .now, trigger: configuration.trigger)
    }

    func timeline(
        for configuration: SelectTriggerIntent,
        in context: Context
    ) async -> Timeline<TriggerEntry> {
        let entry = TriggerEntry(date: .now, trigger: configuration.trigger)
        // Widget content is mostly static; refresh once per hour in case triggers change.
        return Timeline(entries: [entry], policy: .after(.now.addingTimeInterval(3600)))
    }
}

struct TriggerWidgetEntryView: View {
    var entry: TriggerEntry
    @Environment(\.widgetFamily) var family

    var body: some View {
        if let trigger = entry.trigger {
            triggerView(trigger)
        } else {
            placeholderView
        }
    }

    @ViewBuilder
    private func triggerView(_ trigger: TriggerDetail) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 6) {
                Image(systemName: "bolt.fill")
                    .font(.system(size: familyIconSize))
                    .foregroundStyle(.orange)
                Text("Trigger")
                    .font(.caption2)
                    .fontWeight(.semibold)
                    .foregroundStyle(.secondary)
                    .textCase(.uppercase)
            }

            Spacer(minLength: 2)

            Text(trigger.message)
                .font(family == .systemSmall ? .caption : .callout)
                .fontWeight(.medium)
                .lineLimit(family == .systemSmall ? 3 : 4)
                .foregroundStyle(.primary)

            if family != .systemSmall {
                Spacer(minLength: 0)
                HStack {
                    Spacer()
                    Text("Tap to run")
                        .font(.caption2)
                        .foregroundStyle(.tertiary)
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .padding(2)
    }

    private var placeholderView: some View {
        VStack(spacing: 8) {
            Image(systemName: "bolt.trianglebadge.exclamationmark")
                .font(.title2)
                .foregroundStyle(.secondary)
            Text("Select a trigger")
                .font(.caption)
                .foregroundStyle(.secondary)
            Text("Edit widget to configure")
                .font(.caption2)
                .foregroundStyle(.tertiary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var familyIconSize: CGFloat {
        switch family {
        case .systemSmall: return 12
        case .systemMedium: return 14
        default: return 16
        }
    }
}

struct TriggerWidget: Widget {
    let kind = "TriggerWidget"

    var body: some WidgetConfiguration {
        AppIntentConfiguration(
            kind: kind,
            intent: SelectTriggerIntent.self,
            provider: TriggerProvider()
        ) { entry in
            TriggerWidgetEntryView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
                .widgetURL(widgetURL(for: entry))
        }
        .configurationDisplayName("Trigger")
        .description("Tap to fire a trigger and auto-send a message.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }

    private func widgetURL(for entry: TriggerEntry) -> URL? {
        guard let trigger = entry.trigger else { return nil }
        return URL(string: "lumiere://trigger/autotrigger/\(trigger.id)")
    }
}
