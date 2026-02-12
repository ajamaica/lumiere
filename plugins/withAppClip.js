/**
 * Expo config plugin that adds an iOS App Clip target to the Xcode project.
 *
 * The App Clip shares the same React Native JS bundle as the main app.
 * At runtime the app detects whether it is running as an App Clip
 * (via the `app-clip-info` native module) and renders a minimal UI
 * that goes straight to the Echo chat provider.
 *
 * Usage in app.json:
 *   ["./plugins/withAppClip"]
 */

const { withXcodeProject, withEntitlementsPlist, withInfoPlist } = require('@expo/config-plugins')
const fs = require('fs')
const path = require('path')

const APP_CLIP_TARGET_NAME = 'AppClip'
const APP_CLIP_BUNDLE_ID_SUFFIX = '.Clip'

/**
 * Main plugin entry point.
 */
function withAppClip(config) {
  // 1. Add the parent-app entitlement so the main app knows about its App Clip
  config = withMainAppEntitlements(config)

  // 2. Modify the Xcode project to add the App Clip target
  config = withAppClipTarget(config)

  return config
}

// ---------------------------------------------------------------------------
// Step 1: Main app entitlements
// ---------------------------------------------------------------------------

function withMainAppEntitlements(config) {
  return withEntitlementsPlist(config, (mod) => {
    // The main app does not strictly require an entitlement for App Clips,
    // but some setups benefit from associated-domains being present on both.
    return mod
  })
}

// ---------------------------------------------------------------------------
// Step 2: Xcode project manipulation
// ---------------------------------------------------------------------------

function withAppClipTarget(config) {
  return withXcodeProject(config, async (mod) => {
    const project = mod.modResults
    const bundleId = config.ios?.bundleIdentifier ?? 'bot.lumiere.app'
    const appClipBundleId = bundleId + APP_CLIP_BUNDLE_ID_SUFFIX
    const appVersion = config.version ?? '1.0.0'
    const buildNumber = config.ios?.buildNumber ?? '1'
    const iosPath = mod.modRequest.platformProjectRoot // e.g. ios/

    // Copy App Clip target files into the ios/ directory
    const appClipDir = path.join(iosPath, APP_CLIP_TARGET_NAME)
    if (!fs.existsSync(appClipDir)) {
      fs.mkdirSync(appClipDir, { recursive: true })
    }

    // Copy Info.plist
    const srcInfoPlist = path.join(mod.modRequest.projectRoot, 'targets', 'app-clip', 'Info.plist')
    const destInfoPlist = path.join(appClipDir, 'Info.plist')
    if (fs.existsSync(srcInfoPlist)) {
      fs.copyFileSync(srcInfoPlist, destInfoPlist)
    }

    // Copy entitlements
    const srcEntitlements = path.join(
      mod.modRequest.projectRoot,
      'targets',
      'app-clip',
      'AppClip.entitlements',
    )
    const destEntitlements = path.join(appClipDir, 'AppClip.entitlements')
    if (fs.existsSync(srcEntitlements)) {
      fs.copyFileSync(srcEntitlements, destEntitlements)
    }

    // Check if target already exists to avoid duplicates
    const existingTarget = project.pbxTargetByName(APP_CLIP_TARGET_NAME)
    if (existingTarget) {
      return mod
    }

    // --- Add the App Clip target ---

    // The xcode library does not recognise 'app_clip' as a product type,
    // so we create a regular 'application' target first and then patch
    // the productType to the App Clip variant.
    const appClipTarget = project.addTarget(
      APP_CLIP_TARGET_NAME,
      'application',
      APP_CLIP_TARGET_NAME,
      appClipBundleId,
    )

    if (!appClipTarget) {
      console.warn('[withAppClip] Failed to create App Clip target')
      return mod
    }

    // Convert the regular application target into an App Clip target
    appClipTarget.pbxNativeTarget.productType =
      '"com.apple.product-type.application.on-demand-install-capable"'

    // --- Configure build settings ---

    // Values that contain special characters ($, /, spaces) must be
    // wrapped in escaped double-quotes so the pbxproj serialiser
    // produces valid plist syntax (e.g.  PRODUCT_NAME = "$(TARGET_NAME)"; ).
    const commonBuildSettings = {
      ASSETCATALOG_COMPILER_APPICON_NAME: 'AppIcon',
      CLANG_ENABLE_MODULES: 'YES',
      CODE_SIGN_ENTITLEMENTS: `"${APP_CLIP_TARGET_NAME}/AppClip.entitlements"`,
      CODE_SIGN_STYLE: 'Automatic',
      CURRENT_PROJECT_VERSION: buildNumber,
      INFOPLIST_FILE: `"${APP_CLIP_TARGET_NAME}/Info.plist"`,
      IPHONEOS_DEPLOYMENT_TARGET: '16.0',
      MARKETING_VERSION: appVersion,
      PRODUCT_BUNDLE_IDENTIFIER: `"${appClipBundleId}"`,
      PRODUCT_NAME: '"$(TARGET_NAME)"',
      SUPPORTS_MACCATALYST: 'NO',
      SWIFT_VERSION: '5.0',
      TARGETED_DEVICE_FAMILY: '"1,2"',
    }

    // Apply build settings to all configurations
    const configurations = project.pbxXCBuildConfigurationSection()
    const targetConfigs =
      project.pbxXCConfigurationList()[appClipTarget.pbxNativeTarget.buildConfigurationList]

    if (targetConfigs?.buildConfigurations) {
      for (const configRef of targetConfigs.buildConfigurations) {
        const configObj = configurations[configRef.value]
        if (configObj) {
          configObj.buildSettings = {
            ...configObj.buildSettings,
            ...commonBuildSettings,
          }
        }
      }
    }

    // --- Add the App Clip to the main target's dependencies ---

    // Find the main application target
    const mainTarget = project.getFirstTarget()
    if (mainTarget?.firstTarget) {
      project.addTargetDependency(mainTarget.firstTarget.uuid, [appClipTarget.uuid])
    }

    // --- Add the App Clip Info.plist and entitlements to the project ---

    const appClipGroupKey = project.pbxCreateGroup(APP_CLIP_TARGET_NAME, APP_CLIP_TARGET_NAME)

    // Add files to the group
    if (fs.existsSync(destInfoPlist)) {
      project.addFile('Info.plist', appClipGroupKey, {
        target: appClipTarget.uuid,
        lastKnownFileType: 'text.plist.xml',
      })
    }

    if (fs.existsSync(destEntitlements)) {
      project.addFile('AppClip.entitlements', appClipGroupKey, {
        target: appClipTarget.uuid,
        lastKnownFileType: 'text.plist.entitlements',
      })
    }

    // Add group to main group
    const mainGroupId = project.getFirstProject().firstProject.mainGroup
    project.addToPbxGroup(appClipGroupKey, mainGroupId)

    return mod
  })
}

module.exports = withAppClip
