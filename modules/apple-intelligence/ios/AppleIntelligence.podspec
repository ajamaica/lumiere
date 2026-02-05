require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'AppleIntelligence'
  s.version        = package['version']
  s.summary        = 'Apple Intelligence module for Expo'
  s.description    = 'Native Apple Intelligence integration'
  s.author         = ''
  s.homepage       = 'https://github.com/ajamaica/lumiere'
  s.license        = { type: 'MIT' }
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = '**/*.swift'
end
