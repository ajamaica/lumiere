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
        ZStack {
            LinearGradient(
                colors: [Color(hex: 0x1a5276), Color(hex: 0x2980b9)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )

            VStack(spacing: 8) {
                Image(systemName: "bubble.left.and.bubble.right.fill")
                    .font(.system(size: 32))
                    .foregroundStyle(.white)

                Text("Lumiere")
                    .font(.system(size: 16, weight: .semibold, design: .rounded))
                    .foregroundStyle(.white)
            }
        }
    }
}

struct LumierWidgetMediumView: View {
    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color(hex: 0x1a5276), Color(hex: 0x2980b9)],
                startPoint: .leading,
                endPoint: .trailing
            )

            HStack(spacing: 16) {
                Image(systemName: "bubble.left.and.bubble.right.fill")
                    .font(.system(size: 36))
                    .foregroundStyle(.white)

                VStack(alignment: .leading, spacing: 4) {
                    Text("Lumiere")
                        .font(.system(size: 20, weight: .semibold, design: .rounded))
                        .foregroundStyle(.white)

                    Text("Tap to open chat")
                        .font(.system(size: 13, weight: .regular))
                        .foregroundStyle(.white.opacity(0.8))
                }
            }
            .padding(.horizontal)
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

struct LumiereWidget: Widget {
    let kind: String = "LumiereWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: LumiereProvider()) { entry in
            LumiereWidgetEntryView(entry: entry)
                .containerBackground(.clear, for: .widget)
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
