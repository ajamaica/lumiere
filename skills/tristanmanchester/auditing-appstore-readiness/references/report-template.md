# App Store Readiness Report

## Summary
- **Verdict:** PASS | WARN | FAIL
- **Project flavour:** Native iOS | React Native (bare) | Expo
- **iOS bundle id:** `<bundle id>`
- **Version / build:** `<CFBundleShortVersionString>` / `<CFBundleVersion>`
- **Audit scope:** static | static + build

## Evidence snapshot
- Repo: `<path>`
- Git: `<branch>` @ `<short sha>` (dirty: yes/no)
- iOS project: `<.xcodeproj/.xcworkspace or expo config>`

## Failures (must fix)
> Include: what failed, where, why it matters, exact fix.

- **[FAIL] <check id> — <title>**
  - Evidence: `<file/path + key/value or command output excerpt>`
  - Fix: `<actionable steps>`

## Warnings (risk / likely review issues)
- **[WARN] <check id> — <title>**
  - Evidence: …
  - Mitigation: …

## Info (good to know)
- **[INFO] <check id> — <title>**
  - Evidence: …
  - Notes: …

## Publish checklist (tick‑off)
### Code + build
- [ ] Release build succeeds (simulator + device/archive)
- [ ] Version/build bumped and matches release notes
- [ ] Crash reporting and analytics behave as intended in Release
- [ ] No debug menus, staging endpoints, or test accounts shipped

### Privacy + compliance
- [ ] Privacy manifest present and Xcode privacy report reviewed
- [ ] All permission prompts have clear usage descriptions
- [ ] App Tracking Transparency handled correctly (if applicable)
- [ ] Privacy Nutrition Labels updated to match behaviour
- [ ] Export compliance (encryption) answered correctly

### Store listing + operational
- [ ] App name, subtitle, description, keywords final
- [ ] Screenshots and preview videos exported for required devices
- [ ] Support URL + Privacy Policy URL live
- [ ] Age rating and content warnings correct
- [ ] App Review notes prepared (test login, special hardware, etc.)

## Recommendation
- **Go/No‑Go:** `<one sentence>`
- **Next actions:** `<ordered list of top fixes>`
