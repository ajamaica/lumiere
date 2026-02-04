/**
 * Expo config plugin that adds an iOS WidgetKit extension target for trigger widgets.
 *
 * This plugin:
 * 1. Adds App Group entitlement to the main app target
 * 2. Creates a new WidgetKit extension target
 * 3. Copies Swift source files into the extension
 * 4. Links WidgetKit and SwiftUI frameworks
 */
const { withXcodeProject, withEntitlementsPlist, withInfoPlist } = require('expo/config-plugins')
const fs = require('fs')
const path = require('path')

const APP_GROUP_ID = 'group.bot.lumiere.app'
const WIDGET_TARGET_NAME = 'TriggerWidgetExtension'
const WIDGET_BUNDLE_SUFFIX = '.TriggerWidget'

function withIOSWidget(config) {
  // Step 1: Add App Group to main app entitlements
  config = withEntitlementsPlist(config, (config) => {
    config.modResults['com.apple.security.application-groups'] = [APP_GROUP_ID]
    return config
  })

  // Step 2: Add App Group and widget background mode to Info.plist
  config = withInfoPlist(config, (config) => {
    return config
  })

  // Step 3: Modify the Xcode project to add the widget extension target
  config = withXcodeProject(config, (config) => {
    const xcodeProject = config.modResults
    const mainBundleId = config.ios?.bundleIdentifier || 'bot.lumiere.app'
    const widgetBundleId = mainBundleId + WIDGET_BUNDLE_SUFFIX

    const projectRoot = config.modRequest.projectRoot
    const iosDir = path.join(projectRoot, 'ios')
    const widgetDir = path.join(iosDir, WIDGET_TARGET_NAME)
    const appName = config.modRequest.projectName || 'lumiere'
    const mainAppDir = path.join(iosDir, appName)

    // Create the widget extension directory
    if (!fs.existsSync(widgetDir)) {
      fs.mkdirSync(widgetDir, { recursive: true })
    }

    // Copy Swift source files from ios-widget/ to the extension directory
    const sourceDir = path.join(projectRoot, 'ios-widget')
    const swiftFiles = ['TriggerWidgetBundle.swift', 'TriggerWidget.swift', 'AppIntent.swift']

    for (const file of swiftFiles) {
      const src = path.join(sourceDir, file)
      const dest = path.join(widgetDir, file)
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest)
      }
    }

    // Copy the SharedUserDefaults native module into the main app target
    // so the RN app can write to the App Group UserDefaults.
    const nativeModuleFiles = ['SharedUserDefaultsModule.swift', 'SharedUserDefaultsModule.m']
    for (const file of nativeModuleFiles) {
      const src = path.join(sourceDir, file)
      const dest = path.join(mainAppDir, file)
      if (fs.existsSync(src) && fs.existsSync(mainAppDir)) {
        fs.copyFileSync(src, dest)
      }
    }

    // Add native module files to the main app target
    const mainTarget = xcodeProject.getFirstTarget()
    if (mainTarget) {
      for (const file of nativeModuleFiles) {
        xcodeProject.addSourceFile(
          `${appName}/${file}`,
          { target: mainTarget.firstTarget.uuid },
          mainTarget.firstTarget.uuid,
        )
      }
    }

    // Create widget entitlements file
    const entitlementsContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>com.apple.security.application-groups</key>
	<array>
		<string>${APP_GROUP_ID}</string>
	</array>
</dict>
</plist>`

    const entitlementsPath = path.join(widgetDir, `${WIDGET_TARGET_NAME}.entitlements`)
    fs.writeFileSync(entitlementsPath, entitlementsContent)

    // Create Info.plist for the widget extension
    const infoPlistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>CFBundleDevelopmentRegion</key>
	<string>$(DEVELOPMENT_LANGUAGE)</string>
	<key>CFBundleDisplayName</key>
	<string>Lumiere Trigger</string>
	<key>CFBundleExecutable</key>
	<string>$(EXECUTABLE_NAME)</string>
	<key>CFBundleIdentifier</key>
	<string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
	<key>CFBundleInfoDictionaryVersion</key>
	<string>6.0</string>
	<key>CFBundleName</key>
	<string>$(PRODUCT_NAME)</string>
	<key>CFBundlePackageType</key>
	<string>$(PRODUCT_BUNDLE_PACKAGE_TYPE)</string>
	<key>CFBundleShortVersionString</key>
	<string>$(MARKETING_VERSION)</string>
	<key>CFBundleVersion</key>
	<string>$(CURRENT_PROJECT_VERSION)</string>
	<key>NSExtension</key>
	<dict>
		<key>NSExtensionPointIdentifier</key>
		<string>com.apple.widgetkit-extension</string>
	</dict>
</dict>
</plist>`

    const infoPlistPath = path.join(widgetDir, 'Info.plist')
    fs.writeFileSync(infoPlistPath, infoPlistContent)

    // Add widget extension target to the Xcode project
    const widgetGroup = xcodeProject.addPbxGroup(
      [...swiftFiles, 'Info.plist', `${WIDGET_TARGET_NAME}.entitlements`],
      WIDGET_TARGET_NAME,
      WIDGET_TARGET_NAME,
    )

    // Add the group to the main project group
    const mainGroupId = xcodeProject.getFirstProject().firstProject.mainGroup
    xcodeProject.addToPbxGroup(widgetGroup.uuid, mainGroupId)

    // Create the native target for the widget extension
    const target = xcodeProject.addTarget(
      WIDGET_TARGET_NAME,
      'app_extension',
      WIDGET_TARGET_NAME,
      widgetBundleId,
    )

    // Add build phases
    xcodeProject.addBuildPhase([], 'PBXSourcesBuildPhase', 'Sources', target.uuid)

    // Add each Swift file to the sources build phase
    for (const file of swiftFiles) {
      xcodeProject.addSourceFile(
        `${WIDGET_TARGET_NAME}/${file}`,
        { target: target.uuid },
        widgetGroup.uuid,
      )
    }

    // Frameworks build phase
    xcodeProject.addBuildPhase([], 'PBXFrameworksBuildPhase', 'Frameworks', target.uuid)

    xcodeProject.addFramework('WidgetKit.framework', {
      target: target.uuid,
      link: true,
    })
    xcodeProject.addFramework('SwiftUI.framework', {
      target: target.uuid,
      link: true,
    })

    // Set build settings for the widget target
    const configurations = xcodeProject.pbxXCBuildConfigurationSection()
    for (const key in configurations) {
      const config = configurations[key]
      if (
        typeof config === 'object' &&
        config.buildSettings &&
        config.buildSettings.PRODUCT_NAME === `"${WIDGET_TARGET_NAME}"`
      ) {
        config.buildSettings.SWIFT_VERSION = '5.0'
        config.buildSettings.TARGETED_DEVICE_FAMILY = '"1,2"'
        config.buildSettings.IPHONEOS_DEPLOYMENT_TARGET = '17.0'
        config.buildSettings.CODE_SIGN_ENTITLEMENTS = `${WIDGET_TARGET_NAME}/${WIDGET_TARGET_NAME}.entitlements`
        config.buildSettings.PRODUCT_BUNDLE_IDENTIFIER = `"${widgetBundleId}"`
        config.buildSettings.MARKETING_VERSION = '1.0'
        config.buildSettings.CURRENT_PROJECT_VERSION = '1'
        config.buildSettings.GENERATE_INFOPLIST_FILE = 'YES'
        config.buildSettings.INFOPLIST_FILE = `${WIDGET_TARGET_NAME}/Info.plist`
        config.buildSettings.ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME = 'AccentColor'
        config.buildSettings.ASSETCATALOG_COMPILER_WIDGET_BACKGROUND_COLOR_NAME = 'WidgetBackground'
        config.buildSettings.SWIFT_EMIT_LOC_STRINGS = 'YES'
        config.buildSettings.LD_RUNPATH_SEARCH_PATHS =
          '"$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks"'
        config.buildSettings.SKIP_INSTALL = 'YES'
      }
    }

    // Add the widget extension to the main target's embed phase
    const embedTarget = xcodeProject.getFirstTarget()
    if (embedTarget) {
      xcodeProject.addBuildPhase(
        [`${WIDGET_TARGET_NAME}.appex`],
        'PBXCopyFilesBuildPhase',
        'Embed App Extensions',
        embedTarget.firstTarget.uuid,
        'app_extension',
      )
    }

    return config
  })

  return config
}

module.exports = withIOSWidget
