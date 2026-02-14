const { withXcodeProject, withDangerousMod } = require('@expo/config-plugins')
const path = require('path')
const fs = require('fs')

const WATCH_TARGET_NAME = 'LumiereWatch'
const WATCH_BUNDLE_ID = 'bot.lumiere.app.watchkitapp'
const WATCHOS_DEPLOYMENT_TARGET = '10.0'

const withWatchApp = (config) => {
  // Step 1: Copy watch app source files into the ios/ directory during prebuild
  config = withDangerousMod(config, [
    'ios',
    (config) => {
      const projectRoot = config.modRequest.projectRoot
      const iosPath = path.join(projectRoot, 'ios')
      const destPath = path.join(iosPath, WATCH_TARGET_NAME)
      const srcPath = path.join(projectRoot, 'targets', 'watch')

      if (fs.existsSync(srcPath)) {
        fs.cpSync(srcPath, destPath, { recursive: true })
      }

      return config
    },
  ])

  // Step 2: Modify the Xcode project to add the watchOS target
  config = withXcodeProject(config, (config) => {
    const proj = config.modResults

    // --- Project navigator group ---
    const watchGroup = proj.addPbxGroup(
      ['LumiereWatchApp.swift', 'ContentView.swift', 'Assets.xcassets', 'Info.plist'],
      WATCH_TARGET_NAME,
      WATCH_TARGET_NAME,
    )

    const mainGroupId = proj.getFirstProject().firstProject.mainGroup
    proj.addToPbxGroup(watchGroup.uuid, mainGroupId)

    // --- Watch app native target ---
    const target = proj.addTarget(
      WATCH_TARGET_NAME,
      'watch2_app',
      WATCH_TARGET_NAME,
      WATCH_BUNDLE_ID,
    )

    // Map file names → file reference UUIDs from the group
    const fileRefByName = {}
    for (const child of watchGroup.pbxGroup.children) {
      fileRefByName[child.comment] = child.value
    }

    // Helper: create a PBXBuildFile that references an existing file ref
    const createBuildFile = (fileName, phaseName) => {
      const uuid = proj.generateUuid()
      proj.hash.project.objects.PBXBuildFile[uuid] = {
        isa: 'PBXBuildFile',
        fileRef: fileRefByName[fileName],
        fileRef_comment: fileName,
      }
      proj.hash.project.objects.PBXBuildFile[`${uuid}_comment`] = `${fileName} in ${phaseName}`
      return { value: uuid, comment: `${fileName} in ${phaseName}` }
    }

    // --- Sources build phase ---
    const sourcePhaseUuid = proj.generateUuid()
    proj.hash.project.objects.PBXSourcesBuildPhase =
      proj.hash.project.objects.PBXSourcesBuildPhase || {}
    proj.hash.project.objects.PBXSourcesBuildPhase[sourcePhaseUuid] = {
      isa: 'PBXSourcesBuildPhase',
      buildActionMask: 2147483647,
      files: [
        createBuildFile('LumiereWatchApp.swift', 'Sources'),
        createBuildFile('ContentView.swift', 'Sources'),
      ],
      runOnlyForDeploymentPostprocessing: 0,
    }
    proj.hash.project.objects.PBXSourcesBuildPhase[`${sourcePhaseUuid}_comment`] = 'Sources'

    // --- Resources build phase ---
    const resourcePhaseUuid = proj.generateUuid()
    proj.hash.project.objects.PBXResourcesBuildPhase =
      proj.hash.project.objects.PBXResourcesBuildPhase || {}
    proj.hash.project.objects.PBXResourcesBuildPhase[resourcePhaseUuid] = {
      isa: 'PBXResourcesBuildPhase',
      buildActionMask: 2147483647,
      files: [createBuildFile('Assets.xcassets', 'Resources')],
      runOnlyForDeploymentPostprocessing: 0,
    }
    proj.hash.project.objects.PBXResourcesBuildPhase[`${resourcePhaseUuid}_comment`] = 'Resources'

    // --- Frameworks build phase (empty, required by Xcode) ---
    const frameworksPhaseUuid = proj.generateUuid()
    proj.hash.project.objects.PBXFrameworksBuildPhase =
      proj.hash.project.objects.PBXFrameworksBuildPhase || {}
    proj.hash.project.objects.PBXFrameworksBuildPhase[frameworksPhaseUuid] = {
      isa: 'PBXFrameworksBuildPhase',
      buildActionMask: 2147483647,
      files: [],
      runOnlyForDeploymentPostprocessing: 0,
    }
    proj.hash.project.objects.PBXFrameworksBuildPhase[`${frameworksPhaseUuid}_comment`] =
      'Frameworks'

    // Wire build phases onto the watch target
    const watchTarget = proj.hash.project.objects.PBXNativeTarget[target.uuid]
    watchTarget.buildPhases = [
      { value: sourcePhaseUuid, comment: 'Sources' },
      { value: frameworksPhaseUuid, comment: 'Frameworks' },
      { value: resourcePhaseUuid, comment: 'Resources' },
    ]

    // --- watchOS build settings ---
    const configList = proj.pbxXCConfigurationList()[watchTarget.buildConfigurationList]
    if (configList) {
      const buildConfigs = proj.pbxXCBuildConfigurationSection()
      for (const { value: configUuid } of configList.buildConfigurations) {
        const bc = buildConfigs[configUuid]
        if (!bc?.buildSettings) continue
        Object.assign(bc.buildSettings, {
          ASSETCATALOG_COMPILER_APPICON_NAME: '"AppIcon"',
          ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME: '"AccentColor"',
          CODE_SIGN_STYLE: '"Automatic"',
          CURRENT_PROJECT_VERSION: '"1"',
          GENERATE_INFOPLIST_FILE: 'YES',
          INFOPLIST_FILE: `"${WATCH_TARGET_NAME}/Info.plist"`,
          INFOPLIST_KEY_CFBundleDisplayName: '"Lumiere"',
          INFOPLIST_KEY_UISupportedInterfaceOrientations:
            '"UIInterfaceOrientationPortrait UIInterfaceOrientationPortraitUpsideDown"',
          INFOPLIST_KEY_WKCompanionAppBundleIdentifier: '"bot.lumiere.app"',
          LD_RUNPATH_SEARCH_PATHS: '"$(inherited) @executable_path/Frameworks"',
          MARKETING_VERSION: '"1.0"',
          PRODUCT_BUNDLE_IDENTIFIER: `"${WATCH_BUNDLE_ID}"`,
          SDKROOT: 'watchos',
          SWIFT_EMIT_LOC_STRINGS: 'YES',
          SWIFT_VERSION: '5.0',
          TARGETED_DEVICE_FAMILY: '"4"',
          WATCHOS_DEPLOYMENT_TARGET: WATCHOS_DEPLOYMENT_TARGET,
        })
        // Remove iOS-only settings that addTarget may have inherited
        delete bc.buildSettings.IPHONEOS_DEPLOYMENT_TARGET
      }
    }

    // --- Embed Watch Content in main app ---
    const mainTarget = proj.getFirstTarget()
    const productRef = target.pbxNativeTarget.productReference

    // PBXBuildFile for the watch .app product
    const embedBuildFileUuid = proj.generateUuid()
    proj.hash.project.objects.PBXBuildFile[embedBuildFileUuid] = {
      isa: 'PBXBuildFile',
      fileRef: productRef,
      fileRef_comment: `${WATCH_TARGET_NAME}.app`,
      settings: { ATTRIBUTES: ['RemoveHeadersOnCopy'] },
    }
    proj.hash.project.objects.PBXBuildFile[`${embedBuildFileUuid}_comment`] =
      `${WATCH_TARGET_NAME}.app in Embed Watch Content`

    // Copy Files build phase → Products Directory / Watch
    const embedPhaseUuid = proj.generateUuid()
    proj.hash.project.objects.PBXCopyFilesBuildPhase =
      proj.hash.project.objects.PBXCopyFilesBuildPhase || {}
    proj.hash.project.objects.PBXCopyFilesBuildPhase[embedPhaseUuid] = {
      isa: 'PBXCopyFilesBuildPhase',
      buildActionMask: 2147483647,
      dstPath: '"$(CONTENTS_FOLDER_PATH)/Watch"',
      dstSubfolderSpec: 16,
      files: [
        {
          value: embedBuildFileUuid,
          comment: `${WATCH_TARGET_NAME}.app in Embed Watch Content`,
        },
      ],
      name: '"Embed Watch Content"',
      runOnlyForDeploymentPostprocessing: 0,
    }
    proj.hash.project.objects.PBXCopyFilesBuildPhase[`${embedPhaseUuid}_comment`] =
      'Embed Watch Content'

    // Attach the embed phase to the main iOS target
    const mainTargetObj = proj.hash.project.objects.PBXNativeTarget[mainTarget.uuid]
    mainTargetObj.buildPhases.push({
      value: embedPhaseUuid,
      comment: 'Embed Watch Content',
    })

    // Main target depends on the watch target (build order)
    proj.addTargetDependency(mainTarget.uuid, [target.uuid])

    return config
  })

  return config
}

module.exports = withWatchApp
