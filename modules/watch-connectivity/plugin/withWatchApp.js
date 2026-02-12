/**
 * Expo config plugin that injects a watchOS companion app target into the
 * Xcode project at prebuild time.
 *
 * This plugin:
 * 1. Adds a new watchOS app target named "LumiereWatch"
 * 2. Sets bundle ID to bot.lumiere.app.watchkitapp
 * 3. Sets watchOS deployment target to 10.0
 * 4. Adds WatchConnectivity.framework to both targets
 * 5. Copies SwiftUI source files into the Watch target
 * 6. Embeds the Watch app in the main iOS app
 */
/* eslint-disable @typescript-eslint/no-require-imports */
const { withXcodeProject } = require('@expo/config-plugins')
const path = require('path')
const fs = require('fs')
/* eslint-enable @typescript-eslint/no-require-imports */

const WATCH_TARGET_NAME = 'LumiereWatch'
const WATCH_BUNDLE_ID = 'bot.lumiere.app.watchkitapp'
const WATCH_DEPLOYMENT_TARGET = '10.0'
const WATCH_SOURCE_DIR = path.resolve(__dirname, '..', 'ios', 'watch')

/**
 * Add WatchConnectivity.framework to the main iOS app target.
 */
function withWatchConnectivityFramework(config) {
  return withXcodeProject(config, async (config) => {
    const project = config.modResults

    // Add WatchConnectivity.framework to the main app target
    project.addFramework('WatchConnectivity.framework', {
      link: true,
      embed: false,
    })

    return config
  })
}

/**
 * Add the watchOS app target and all its source files to the Xcode project.
 */
function withWatchTarget(config) {
  return withXcodeProject(config, async (config) => {
    const project = config.modResults
    const projectRoot = config.modRequest.projectRoot
    const iosDir = path.join(projectRoot, 'ios')
    const watchDir = path.join(iosDir, WATCH_TARGET_NAME)

    // Create the Watch app directory in the ios/ build output
    if (!fs.existsSync(watchDir)) {
      fs.mkdirSync(watchDir, { recursive: true })
    }

    // Copy all Swift source files and resources from the module
    const sourceFiles = fs.readdirSync(WATCH_SOURCE_DIR)
    for (const file of sourceFiles) {
      const src = path.join(WATCH_SOURCE_DIR, file)
      const dest = path.join(watchDir, file)
      fs.copyFileSync(src, dest)
    }

    // Create the Watch app Info.plist
    const watchInfoPlist = {
      CFBundleDevelopmentRegion: '$(DEVELOPMENT_LANGUAGE)',
      CFBundleDisplayName: 'Lumiere',
      CFBundleExecutable: '$(EXECUTABLE_NAME)',
      CFBundleIdentifier: WATCH_BUNDLE_ID,
      CFBundleInfoDictionaryVersion: '6.0',
      CFBundleName: '$(PRODUCT_NAME)',
      CFBundlePackageType: '$(PRODUCT_TYPE_PACKAGE_TYPE)',
      CFBundleShortVersionString: config.ios?.buildNumber || '1.0',
      CFBundleVersion: '1',
      UISupportedInterfaceOrientations: [
        'UIInterfaceOrientationPortrait',
        'UIInterfaceOrientationPortraitUpsideDown',
      ],
      WKApplication: true,
      WKCompanionAppBundleIdentifier: 'bot.lumiere.app',
    }

    fs.writeFileSync(path.join(watchDir, 'Info.plist'), generatePlistXml(watchInfoPlist))

    // Add the Watch target to the Xcode project
    const watchTarget = project.addTarget(
      WATCH_TARGET_NAME,
      'watch2_app',
      WATCH_TARGET_NAME,
      WATCH_BUNDLE_ID,
    )

    if (watchTarget) {
      // Separate Swift sources from resource files
      const swiftFiles = sourceFiles.filter((f) => f.endsWith('.swift'))
      const resourceFiles = sourceFiles.filter(
        (f) => f.endsWith('.xcstrings') || f.endsWith('.plist'),
      )

      // Create a PBX group containing all files
      const watchGroupKey = project.addPbxGroup(sourceFiles, WATCH_TARGET_NAME, WATCH_TARGET_NAME)

      if (watchGroupKey) {
        // Add the group to the main project group
        const mainGroupId = project.getFirstProject().firstProject.mainGroup
        project.addToPbxGroup(watchGroupKey.uuid, mainGroupId)
      }

      // Add Swift files to the Watch target's sources build phase
      for (const file of swiftFiles) {
        project.addSourceFile(
          `${WATCH_TARGET_NAME}/${file}`,
          { target: watchTarget.uuid },
          watchGroupKey?.uuid,
        )
      }

      // Manually add resource files to the Watch target's resources build phase.
      // We cannot use project.addResourceFile() because it calls correctForResourcesPath()
      // which expects a "Resources" group to exist — and our new Watch target doesn't have one.
      if (resourceFiles.length > 0 && watchGroupKey) {
        // Find the PBXResourcesBuildPhase for the Watch target
        const nativeTarget = project.pbxNativeTargetSection()[watchTarget.uuid]
        let resourcesPhaseUuid = null

        if (nativeTarget && nativeTarget.buildPhases) {
          for (const phase of nativeTarget.buildPhases) {
            const phaseObj = project.hash.project.objects['PBXResourcesBuildPhase'][phase.value]
            if (phaseObj) {
              resourcesPhaseUuid = phase.value
              break
            }
          }
        }

        // If no resources phase exists, create one
        if (!resourcesPhaseUuid) {
          resourcesPhaseUuid = project.generateUuid()
          project.hash.project.objects['PBXResourcesBuildPhase'][resourcesPhaseUuid] = {
            isa: 'PBXResourcesBuildPhase',
            buildActionMask: 2147483647,
            files: [],
            runOnlyForDeploymentPostprocessing: 0,
          }
          project.hash.project.objects['PBXResourcesBuildPhase'][resourcesPhaseUuid + '_comment'] =
            'Resources'

          if (nativeTarget && nativeTarget.buildPhases) {
            nativeTarget.buildPhases.push({
              value: resourcesPhaseUuid,
              comment: 'Resources',
            })
          }
        }

        const resourcesPhase =
          project.hash.project.objects['PBXResourcesBuildPhase'][resourcesPhaseUuid]

        for (const file of resourceFiles) {
          // Find the file reference that addPbxGroup created
          const groupChildren = watchGroupKey.pbxGroup ? watchGroupKey.pbxGroup.children : []
          const fileRefEntry = groupChildren.find((child) => child.comment === file)
          if (!fileRefEntry) continue

          // Create a PBXBuildFile entry linking the file reference
          const buildFileUuid = project.generateUuid()
          const buildFileSection = project.pbxBuildFileSection()
          buildFileSection[buildFileUuid] = {
            isa: 'PBXBuildFile',
            fileRef: fileRefEntry.value,
            fileRef_comment: file,
          }
          buildFileSection[buildFileUuid + '_comment'] = `${file} in Resources`

          // Add to the resources build phase
          if (resourcesPhase && resourcesPhase.files) {
            resourcesPhase.files.push({
              value: buildFileUuid,
              comment: `${file} in Resources`,
            })
          }
        }
      }

      // Set build settings for the Watch target
      const watchBuildConfigs = project.pbxXCBuildConfigurationSection()
      for (const key in watchBuildConfigs) {
        const buildConfig = watchBuildConfigs[key]
        if (buildConfig.buildSettings && buildConfig.baseConfigurationReference === undefined) {
          // Check if this config belongs to the Watch target
          const configList = project.pbxXCConfigurationList()[watchTarget.buildConfigurationList]
          if (configList && configList.buildConfigurations.some((c) => c.value === key)) {
            buildConfig.buildSettings.WATCHOS_DEPLOYMENT_TARGET = WATCH_DEPLOYMENT_TARGET
            buildConfig.buildSettings.PRODUCT_BUNDLE_IDENTIFIER = WATCH_BUNDLE_ID
            buildConfig.buildSettings.SWIFT_VERSION = '5.0'
            buildConfig.buildSettings.SDKROOT = 'watchos'
            buildConfig.buildSettings.TARGETED_DEVICE_FAMILY = '4' // watchOS
            buildConfig.buildSettings.ASSETCATALOG_COMPILER_APPICON_NAME = 'AppIcon'
            buildConfig.buildSettings.INFOPLIST_FILE = `${WATCH_TARGET_NAME}/Info.plist`
            buildConfig.buildSettings.CODE_SIGN_ENTITLEMENTS = ''
            buildConfig.buildSettings.LD_RUNPATH_SEARCH_PATHS =
              '$(inherited) @executable_path/Frameworks'
          }
        }
      }

      // Embed the Watch app in the main iOS app target
      const mainTarget = project.getFirstTarget()
      if (mainTarget) {
        project.addBuildPhase(
          [`${WATCH_TARGET_NAME}.app`],
          'PBXCopyFilesBuildPhase',
          'Embed Watch Content',
          mainTarget.firstTarget.uuid,
          'watch_app',
        )
      }
    }

    return config
  })
}

/**
 * Generate a simple XML plist string from a JS object.
 */
function generatePlistXml(obj) {
  let xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n' +
    '<plist version="1.0">\n<dict>\n'

  for (const [key, value] of Object.entries(obj)) {
    xml += `\t<key>${key}</key>\n`
    if (typeof value === 'string') {
      xml += `\t<string>${value}</string>\n`
    } else if (typeof value === 'boolean') {
      xml += `\t<${value}/>\n`
    } else if (Array.isArray(value)) {
      xml += '\t<array>\n'
      for (const item of value) {
        xml += `\t\t<string>${item}</string>\n`
      }
      xml += '\t</array>\n'
    }
  }

  xml += '</dict>\n</plist>\n'
  return xml
}

/**
 * Main plugin entry point.
 * Composes the WatchConnectivity framework addition and Watch target creation.
 */
function withWatchApp(config) {
  config = withWatchConnectivityFramework(config)
  config = withWatchTarget(config)
  return config
}

module.exports = withWatchApp
