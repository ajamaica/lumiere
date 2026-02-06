# Native iOS (Swift/Obj‑C) checks

## Project layout signals
- One `.xcodeproj` or `.xcworkspace` near the repo root
- `Info.plist` for the main target (often `Sources/.../Info.plist` or `Config/...`)

## High-value compliance checks
- Versioning:
  - `CFBundleShortVersionString` (marketing version)
  - `CFBundleVersion` (build number)
- Signing & capabilities:
  - Entitlements file exists and matches enabled capabilities
  - Push notifications, iCloud, associated domains configured intentionally
- Privacy:
  - `PrivacyInfo.xcprivacy` present and reviewed (Xcode privacy report)
  - Permission usage strings present for any used capabilities
- App icon + launch screen present and correct
- ATS exemptions avoided or tightly scoped

## Suggested commands (may create artefacts)
- List schemes:
  - `xcodebuild -list -json -workspace <App>.xcworkspace` (or `-project`)
- Release build for simulator:
  - `xcodebuild -workspace <...> -scheme <...> -configuration Release -sdk iphonesimulator -destination 'platform=iOS Simulator,name=iPhone 15' build`
