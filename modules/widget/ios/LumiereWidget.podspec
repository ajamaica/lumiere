require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'LumiereWidget'
  s.version        = package['version']
  s.summary        = 'Lumiere Widget module for Expo'
  s.description    = 'iOS Home Screen Widget for Lumiere app'
  s.author         = ''
  s.homepage       = 'https://github.com/ajamaica/lumiere'
  s.license        = { type: 'MIT' }
  s.platforms      = { :ios => '17.0' }
  s.source         = { :path => '.' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = '*.swift'
end
