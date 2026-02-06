# React Native (bare) iOS checks

## Project layout signals
- `package.json` contains `react-native`
- `ios/` exists with `<App>.xcodeproj` or `<App>.xcworkspace`
- CocoaPods: `ios/Podfile` (and often `Podfile.lock`)

## High-value compliance checks
- `ios/<App>/Info.plist` exists and contains:
  - version/build
  - required `NS…UsageDescription` keys inferred from dependencies
  - no broad ATS exemptions unless justified
- App icon: `ios/<App>/Images.xcassets/AppIcon.appiconset/Contents.json` exists and includes `ios-marketing` (1024×1024)
- Privacy manifest: `PrivacyInfo.xcprivacy` exists (app-level) and the built Xcode privacy report is reviewed
- Hermes/JSC choice is deliberate and release-tested

## Suggested commands (may create artefacts)
- List schemes:
  - `xcodebuild -list -json -workspace ios/<App>.xcworkspace`
- Release build for simulator:
  - `xcodebuild -workspace ios/<App>.xcworkspace -scheme <App> -configuration Release -sdk iphonesimulator -destination 'platform=iOS Simulator,name=iPhone 15' build`

## MUTATING commands (only if asked)
- `bundle exec pod install` (writes Pods/)
- `npm/yarn/pnpm install` (writes node_modules/)
