/**
 * electron-builder configuration for Lumiere desktop builds.
 *
 * The build wraps the Expo web export (dist/) inside an Electron shell.
 * Run `pnpm build:desktop` to produce platform-specific installers.
 */
module.exports = {
  appId: 'bot.lumiere.app',
  productName: 'Lumiere',
  directories: {
    output: 'desktop-dist',
  },
  files: ['desktop/**/*', 'dist/**/*', 'assets/icon.png'],
  extraMetadata: {
    main: 'desktop/main.js',
  },
  mac: {
    category: 'public.app-category.productivity',
    icon: 'assets/icon.png',
    target: [
      { target: 'dmg', arch: ['x64', 'arm64'] },
      { target: 'zip', arch: ['x64', 'arm64'] },
    ],
  },
  win: {
    icon: 'assets/icon.png',
    target: [
      { target: 'nsis', arch: ['x64'] },
      { target: 'portable', arch: ['x64'] },
    ],
  },
  linux: {
    icon: 'assets/icon.png',
    category: 'Utility',
    target: [
      { target: 'AppImage', arch: ['x64'] },
      { target: 'deb', arch: ['x64'] },
    ],
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
  },
}
