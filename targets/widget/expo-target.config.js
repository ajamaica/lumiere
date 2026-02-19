/** @type {import('@bacons/apple-targets').Config} */
module.exports = {
  type: 'widget',
  name: 'LumiereWidget',
  bundleIdentifier: 'bot.lumiere.app.widget',
  deploymentTarget: '17.0',
  entitlements: {
    'com.apple.security.application-groups': ['group.bot.lumiere.app'],
  },
}
