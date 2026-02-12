/**
 * Expo config plugin that injects the static shortcuts meta-data
 * into the main activity of the Android manifest.
 *
 * This enables Android to discover shortcuts.xml at install time
 * so static shortcuts appear when the user long-presses the app icon.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { withAndroidManifest } = require('@expo/config-plugins')

function withAndroidShortcuts(config) {
  return withAndroidManifest(config, (modConfig) => {
    const manifest = modConfig.modResults
    const application = manifest.manifest.application?.[0]
    if (!application) return modConfig

    const activities = application.activity
    if (!activities) return modConfig

    // Find the main launcher activity
    const mainActivity = activities.find((activity) => {
      const intentFilters = activity['intent-filter']
      if (!intentFilters) return false
      return intentFilters.some((filter) => {
        const actions = filter.action || []
        const categories = filter.category || []
        return (
          actions.some((a) => a.$?.['android:name'] === 'android.intent.action.MAIN') &&
          categories.some((c) => c.$?.['android:name'] === 'android.intent.category.LAUNCHER')
        )
      })
    })

    if (!mainActivity) return modConfig

    // Add meta-data for shortcuts.xml if not already present
    if (!mainActivity['meta-data']) {
      mainActivity['meta-data'] = []
    }

    const alreadyHasShortcuts = mainActivity['meta-data'].some(
      (m) => m.$?.['android:name'] === 'android.app.shortcuts',
    )

    if (!alreadyHasShortcuts) {
      mainActivity['meta-data'].push({
        $: {
          'android:name': 'android.app.shortcuts',
          'android:resource': '@xml/shortcuts',
        },
      })
    }

    return modConfig
  })
}

module.exports = withAndroidShortcuts
