const { getDefaultConfig } = require('expo/metro-config')
const { getPlatformResolver } = require('@callstack/out-of-tree-platforms')

const config = getDefaultConfig(__dirname)

const { transformer, resolver } = config

config.transformer = {
  ...transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer'),
}
config.resolver = {
  ...resolver,
  assetExts: resolver.assetExts.filter((ext) => ext !== 'svg'),
  sourceExts: [...resolver.sourceExts, 'svg'],
  resolveRequest: getPlatformResolver({
    platformNameMap: { visionos: '@callstack/react-native-visionos' },
  }),
}

module.exports = config
