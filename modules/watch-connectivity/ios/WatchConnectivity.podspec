require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'WatchConnectivity'
  s.version        = package['version']
  s.summary        = 'Watch Connectivity integration for Expo'
  s.description    = 'Bridges WatchConnectivity between the iOS app and watchOS companion app'
  s.author         = ''
  s.homepage       = 'https://github.com/ajamaica/lumiere'
  s.license        = { type: 'MIT' }
  s.platforms      = { :ios => '16.0' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  # Only include the module Swift file, not the watch/ subdirectory
  s.source_files = '*.swift'
end
