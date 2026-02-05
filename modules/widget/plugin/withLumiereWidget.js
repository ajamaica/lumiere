/* eslint-disable @typescript-eslint/no-require-imports */
const { withXcodeProject } = require('@expo/config-plugins')
const fs = require('fs')
const path = require('path')

const WIDGET_EXTENSION_NAME = 'LumiereWidgetExtension'
const WIDGET_BUNDLE_ID_SUFFIX = '.widget'

/**
 * Creates the widget extension Swift code
 */
function getWidgetSwiftCode() {
  const appUrlScheme = 'lumiere'

  return `import WidgetKit
import SwiftUI

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> SimpleEntry {
        SimpleEntry(date: Date())
    }

    func getSnapshot(in context: Context, completion: @escaping (SimpleEntry) -> ()) {
        let entry = SimpleEntry(date: Date())
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
        let entry = SimpleEntry(date: Date())
        let timeline = Timeline(entries: [entry], policy: .never)
        completion(timeline)
    }
}

struct SimpleEntry: TimelineEntry {
    let date: Date
}

struct LumiereWidgetEntryView: View {
    var entry: Provider.Entry
    @Environment(\\.widgetFamily) var family

    var body: some View {
        ZStack {
            ContainerRelativeShape()
                .fill(Color(red: 0.95, green: 0.94, blue: 0.91))

            VStack(spacing: 8) {
                Image(systemName: "sparkles")
                    .font(.system(size: family == .systemSmall ? 32 : 44))
                    .foregroundColor(.black)

                Text("Lumiere")
                    .font(.system(size: family == .systemSmall ? 14 : 18, weight: .semibold))
                    .foregroundColor(.black)

                if family != .systemSmall {
                    Text("Tap to chat")
                        .font(.system(size: 12))
                        .foregroundColor(.gray)
                }
            }
            .padding()
        }
    }
}

@main
struct LumiereWidget: Widget {
    let kind: String = "LumiereWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            LumiereWidgetEntryView(entry: entry)
                .widgetURL(URL(string: "${appUrlScheme}://"))
        }
        .configurationDisplayName("Lumiere")
        .description("Quick access to Lumiere AI chat.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

#Preview(as: .systemSmall) {
    LumiereWidget()
} timeline: {
    SimpleEntry(date: .now)
}
`
}

/**
 * Creates the widget extension Info.plist content
 */
function getWidgetInfoPlist() {
  return {
    CFBundleDevelopmentRegion: '$(DEVELOPMENT_LANGUAGE)',
    CFBundleDisplayName: 'Lumiere Widget',
    CFBundleExecutable: '$(EXECUTABLE_NAME)',
    CFBundleIdentifier: '$(PRODUCT_BUNDLE_IDENTIFIER)',
    CFBundleInfoDictionaryVersion: '6.0',
    CFBundleName: '$(PRODUCT_NAME)',
    CFBundlePackageType: '$(PRODUCT_BUNDLE_PACKAGE_TYPE)',
    CFBundleShortVersionString: '$(MARKETING_VERSION)',
    CFBundleVersion: '$(CURRENT_PROJECT_VERSION)',
    NSExtension: {
      NSExtensionPointIdentifier: 'com.apple.widgetkit-extension',
    },
  }
}

/**
 * Add widget extension target to Xcode project
 */
const withWidgetExtension = (config) => {
  return withXcodeProject(config, async (config) => {
    const xcodeProject = config.modResults
    const targetName = WIDGET_EXTENSION_NAME
    const bundleIdentifier = `${config.ios.bundleIdentifier}${WIDGET_BUNDLE_ID_SUFFIX}`

    const platformProjectRoot = config.modRequest.platformProjectRoot
    const widgetDir = path.join(platformProjectRoot, targetName)

    // Create widget extension directory
    if (!fs.existsSync(widgetDir)) {
      fs.mkdirSync(widgetDir, { recursive: true })
    }

    // Write widget Swift file
    const widgetSwiftPath = path.join(widgetDir, 'LumiereWidget.swift')
    fs.writeFileSync(widgetSwiftPath, getWidgetSwiftCode())

    // Write widget Info.plist
    const infoPlistPath = path.join(widgetDir, 'Info.plist')
    const plist = require('@expo/plist')
    fs.writeFileSync(infoPlistPath, plist.build(getWidgetInfoPlist()))

    // Get the main app target
    const mainTarget = xcodeProject.getFirstTarget()
    const mainTargetUuid = mainTarget.uuid

    // Add the widget extension target
    const widgetTarget = xcodeProject.addTarget(
      targetName,
      'app_extension',
      targetName,
      bundleIdentifier,
    )

    // Create a PBXGroup for the widget files
    const widgetGroup = xcodeProject.addPbxGroup(
      ['LumiereWidget.swift', 'Info.plist'],
      targetName,
      targetName,
    )

    // Add the group to the main project group
    const mainGroupKey = xcodeProject.getFirstProject().firstProject.mainGroup
    xcodeProject.addToPbxGroup(widgetGroup.uuid, mainGroupKey)

    // Add source files to the widget target
    xcodeProject.addSourceFile(
      `${targetName}/LumiereWidget.swift`,
      { target: widgetTarget.uuid },
      widgetGroup.uuid,
    )

    // Add build settings for the widget target
    const configurations = xcodeProject.pbxXCBuildConfigurationSection()

    for (const key in configurations) {
      if (
        typeof configurations[key] === 'object' &&
        configurations[key].buildSettings &&
        configurations[key].name
      ) {
        const buildSettings = configurations[key].buildSettings

        // Check if this is the widget target's configuration
        if (
          buildSettings.PRODUCT_NAME === `"${targetName}"` ||
          buildSettings.PRODUCT_BUNDLE_IDENTIFIER === `"${bundleIdentifier}"`
        ) {
          Object.assign(buildSettings, {
            ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME: 'AccentColor',
            ASSETCATALOG_COMPILER_WIDGET_BACKGROUND_COLOR_NAME: 'WidgetBackground',
            CLANG_ANALYZER_NONNULL: 'YES',
            CLANG_ANALYZER_NUMBER_OBJECT_CONVERSION: 'YES_AGGRESSIVE',
            CLANG_CXX_LANGUAGE_STANDARD: '"gnu++20"',
            CLANG_ENABLE_OBJC_WEAK: 'YES',
            CLANG_WARN_DOCUMENTATION_COMMENTS: 'YES',
            CLANG_WARN_UNGUARDED_AVAILABILITY: 'YES_AGGRESSIVE',
            CODE_SIGN_STYLE: 'Automatic',
            CURRENT_PROJECT_VERSION: '1',
            GCC_C_LANGUAGE_STANDARD: 'gnu17',
            GENERATE_INFOPLIST_FILE: 'YES',
            INFOPLIST_FILE: `${targetName}/Info.plist`,
            INFOPLIST_KEY_CFBundleDisplayName: 'Lumiere Widget',
            INFOPLIST_KEY_NSHumanReadableCopyright: '""',
            IPHONEOS_DEPLOYMENT_TARGET: '17.0',
            LD_RUNPATH_SEARCH_PATHS:
              '"$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks"',
            MARKETING_VERSION: '1.0',
            PRODUCT_BUNDLE_IDENTIFIER: `"${bundleIdentifier}"`,
            PRODUCT_NAME: '"$(TARGET_NAME)"',
            SKIP_INSTALL: 'YES',
            SWIFT_EMIT_LOC_STRINGS: 'YES',
            SWIFT_VERSION: '5.0',
            TARGETED_DEVICE_FAMILY: '"1,2"',
          })
        }
      }
    }

    // Add the widget extension to the main app's embed frameworks build phase
    const embedExtensionsBuildPhase = xcodeProject.addBuildPhase(
      [],
      'PBXCopyFilesBuildPhase',
      'Embed Foundation Extensions',
      mainTargetUuid,
      'app_extension',
    )

    if (embedExtensionsBuildPhase) {
      embedExtensionsBuildPhase.buildPhase.dstSubfolderSpec = 13 // PlugIns folder
      embedExtensionsBuildPhase.buildPhase.dstPath = ''

      // Add the widget product to embed phase
      xcodeProject.addToPbxBuildFileSection({
        uuid: xcodeProject.generateUuid(),
        fileRef: widgetTarget.productReference,
        settings: { ATTRIBUTES: ['RemoveHeadersOnCopy'] },
      })
    }

    return config
  })
}

/**
 * Main config plugin export
 */
module.exports = function withLumiereWidget(config) {
  config = withWidgetExtension(config)
  return config
}
