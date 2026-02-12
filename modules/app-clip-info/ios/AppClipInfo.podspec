require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'AppClipInfo'
  s.version        = package['version']
  s.summary        = 'App Clip detection module for Expo'
  s.description    = 'Detects whether the app is running as an iOS App Clip'
  s.author         = ''
  s.homepage       = 'https://github.com/ajamaica/lumiere'
  s.license        = { type: 'MIT' }
  s.platforms      = { :ios => '16.0' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = '**/*.swift'
end
