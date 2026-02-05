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
 * Find an existing native target by name
 */
function findTargetByName(xcodeProject, targetName) {
  const nativeTargets = xcodeProject.pbxNativeTargetSection()
  for (const key in nativeTargets) {
    if (typeof nativeTargets[key] === 'object' && nativeTargets[key].name === targetName) {
      return { uuid: key, target: nativeTargets[key] }
    }
  }
  return null
}

/**
 * Find an existing PBXGroup by name
 */
function findGroupByName(xcodeProject, groupName) {
  const groups = xcodeProject.pbxGroupByName(groupName)
  return groups || null
}

/**
 * Find an existing build phase by name for a target
 */
function findBuildPhaseByName(xcodeProject, targetUuid, phaseName) {
  const target = xcodeProject.pbxNativeTargetSection()[targetUuid]
  if (!target || !target.buildPhases) return null

  const copyFilesPhases = xcodeProject.pbxCopyfilesBuildPhaseSection()
  for (const phaseRef of target.buildPhases) {
    const phase = copyFilesPhases[phaseRef.value]
    if (phase && phase.name === `"${phaseName}"`) {
      return { uuid: phaseRef.value, phase }
    }
  }
  return null
}

/**
 * Find embed extensions build phase in main target
 */
function findEmbedExtensionsPhase(xcodeProject, mainTargetUuid) {
  const nativeTargets = xcodeProject.pbxNativeTargetSection()
  const mainTarget = nativeTargets[mainTargetUuid]
  if (!mainTarget || !mainTarget.buildPhases) return null

  const copyFilesPhases = xcodeProject.pbxCopyfilesBuildPhaseSection()
  for (const phaseRef of mainTarget.buildPhases) {
    const phase = copyFilesPhases[phaseRef.value]
    if (
      phase &&
      (phase.name === '"Embed Foundation Extensions"' ||
        phase.name === 'Embed Foundation Extensions')
    ) {
      return { uuid: phaseRef.value, phase }
    }
  }
  return null
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

    // Write widget Swift file (only if it doesn't exist or content changed)
    const widgetSwiftPath = path.join(widgetDir, 'LumiereWidget.swift')
    const swiftCode = getWidgetSwiftCode()
    if (!fs.existsSync(widgetSwiftPath) || fs.readFileSync(widgetSwiftPath, 'utf8') !== swiftCode) {
      fs.writeFileSync(widgetSwiftPath, swiftCode)
    }

    // Write widget Info.plist (only if it doesn't exist or content changed)
    const infoPlistPath = path.join(widgetDir, 'Info.plist')
    const plist = require('@expo/plist')
    const plistContent = plist.build(getWidgetInfoPlist())
    if (!fs.existsSync(infoPlistPath) || fs.readFileSync(infoPlistPath, 'utf8') !== plistContent) {
      fs.writeFileSync(infoPlistPath, plistContent)
    }

    // Get the main app target
    const mainTarget = xcodeProject.getFirstTarget()
    const mainTargetUuid = mainTarget.uuid

    // Check if widget target already exists
    let widgetTarget = findTargetByName(xcodeProject, targetName)
    let widgetTargetUuid
    let productReference

    if (widgetTarget) {
      // Reuse existing target
      widgetTargetUuid = widgetTarget.uuid
      productReference = widgetTarget.target.productReference
    } else {
      // Add the widget extension target
      const newTarget = xcodeProject.addTarget(
        targetName,
        'app_extension',
        targetName,
        bundleIdentifier,
      )
      widgetTargetUuid = newTarget.uuid
      productReference = newTarget.productReference
    }

    // Check if widget group already exists
    let widgetGroup = findGroupByName(xcodeProject, targetName)

    if (!widgetGroup) {
      // Create a PBXGroup for the widget files
      widgetGroup = xcodeProject.addPbxGroup(
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
        { target: widgetTargetUuid },
        widgetGroup.uuid,
      )
    }

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
            GENERATE_INFOPLIST_FILE: 'NO',
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

    // Check if embed extensions build phase already exists
    let embedPhase = findEmbedExtensionsPhase(xcodeProject, mainTargetUuid)

    if (!embedPhase) {
      // Add the widget extension to the main app's embed frameworks build phase
      const newPhase = xcodeProject.addBuildPhase(
        [],
        'PBXCopyFilesBuildPhase',
        'Embed Foundation Extensions',
        mainTargetUuid,
        'app_extension',
      )

      if (newPhase) {
        newPhase.buildPhase.dstSubfolderSpec = 13 // PlugIns folder
        newPhase.buildPhase.dstPath = ''
        embedPhase = { uuid: newPhase.uuid, phase: newPhase.buildPhase }
      }
    }

    // Ensure the widget product is in the embed phase
    if (embedPhase && productReference) {
      // Check if widget is already in the embed phase
      const existingFiles = embedPhase.phase.files || []
      const buildFileSection = xcodeProject.pbxBuildFileSection()

      let widgetAlreadyEmbedded = false
      for (const fileEntry of existingFiles) {
        const buildFile = buildFileSection[fileEntry.value]
        if (buildFile && buildFile.fileRef === productReference) {
          widgetAlreadyEmbedded = true
          break
        }
      }

      if (!widgetAlreadyEmbedded) {
        // Create a PBXBuildFile for the widget product
        const buildFileUuid = xcodeProject.generateUuid()
        const buildFileCommentKey = `${buildFileUuid}_comment`

        // Add to PBXBuildFile section
        buildFileSection[buildFileUuid] = {
          isa: 'PBXBuildFile',
          fileRef: productReference,
          settings: { ATTRIBUTES: ['RemoveHeadersOnCopy'] },
        }
        buildFileSection[buildFileCommentKey] = `${targetName}.appex in Embed Foundation Extensions`

        // Add to the embed phase's files array
        if (!embedPhase.phase.files) {
          embedPhase.phase.files = []
        }
        embedPhase.phase.files.push({
          value: buildFileUuid,
          comment: `${targetName}.appex in Embed Foundation Extensions`,
        })
      }
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
