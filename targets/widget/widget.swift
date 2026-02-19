import WidgetKit
import SwiftUI

// MARK: - Timeline Entry

struct LumiereEntry: TimelineEntry {
    let date: Date
}

// MARK: - Timeline Provider

struct LumiereProvider: TimelineProvider {
    func placeholder(in context: Context) -> LumiereEntry {
        LumiereEntry(date: .now)
    }

    func getSnapshot(in context: Context, completion: @escaping (LumiereEntry) -> Void) {
        completion(LumiereEntry(date: .now))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<LumiereEntry>) -> Void) {
        let entry = LumiereEntry(date: .now)
        // Static widget — refresh once per day
        let nextUpdate = Calendar.current.date(byAdding: .hour, value: 24, to: .now)!
        completion(Timeline(entries: [entry], policy: .after(nextUpdate)))
    }
}

// MARK: - Widget Views

struct LumiereWidgetSmallView: View {
    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: "bubble.left.and.bubble.right.fill")
                .font(.system(size: 32))
                .foregroundStyle(.white)

            Text("Chat with Lumiere")
                .font(.system(size: 14, weight: .semibold, design: .rounded))
                .foregroundStyle(.white)
                .multilineTextAlignment(.center)
        }
    }
}

struct LumierWidgetMediumView: View {
    var body: some View {
        HStack(spacing: 16) {
            Image(systemName: "bubble.left.and.bubble.right.fill")
                .font(.system(size: 36))
                .foregroundStyle(.white)

            Text("Chat with Lumiere")
                .font(.system(size: 20, weight: .semibold, design: .rounded))
                .foregroundStyle(.white)
        }
    }
}

struct LumiereWidgetEntryView: View {
    @Environment(\.widgetFamily) var family
    var entry: LumiereEntry

    var body: some View {
        switch family {
        case .systemMedium:
            LumierWidgetMediumView()
        default:
            LumiereWidgetSmallView()
        }
    }
}

// MARK: - Widget Configuration

@main
struct LumiereWidget: Widget {
    let kind: String = "LumiereWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: LumiereProvider()) { entry in
            LumiereWidgetEntryView(entry: entry)
                .containerBackground(
                    LinearGradient(
                        colors: [Color(hex: 0x06B6D4), Color(hex: 0x22D3EE)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ), for: .widget
                )
                .widgetURL(URL(string: "lumiere://")!)
        }
        .configurationDisplayName("Lumiere")
        .description("Open Lumiere AI chat")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

// MARK: - Color Extension

extension Color {
    init(hex: UInt, alpha: Double = 1.0) {
        self.init(
            .sRGB,
            red: Double((hex >> 16) & 0xFF) / 255.0,
            green: Double((hex >> 8) & 0xFF) / 255.0,
            blue: Double(hex & 0xFF) / 255.0,
            opacity: alpha
        )
    }
}
