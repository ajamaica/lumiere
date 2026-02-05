require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'AppleShortcuts'
  s.version        = package['version']
  s.summary        = 'Apple Shortcuts integration for Expo'
  s.description    = 'Exposes user-created triggers as Apple Shortcuts via AppIntents'
  s.author         = ''
  s.homepage       = 'https://github.com/ajamaica/lumiere'
  s.license        = { type: 'MIT' }
  s.platforms      = { :ios => '16.0' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = '**/*.swift'
end
