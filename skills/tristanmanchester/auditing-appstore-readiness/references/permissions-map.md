# Permissions → Info.plist usage strings (iOS)

Use this mapping when inferring which `NS…UsageDescription` keys are required.

> Rule: if the app code or dependencies can trigger an iOS permission prompt, the corresponding usage string must exist and be human-readable.

## Common mappings

| Capability | Common libs / signals | Required Info.plist keys |
|---|---|---|
| Camera | `expo-camera`, `react-native-camera`, `vision-camera`, `AVCaptureDevice` | `NSCameraUsageDescription` |
| Microphone | `expo-av`, `expo-audio`, `react-native-audio`, `AVAudioSession` | `NSMicrophoneUsageDescription` |
| Photos (read) | `expo-media-library`, `react-native-image-picker`, `PHPhotoLibrary` | `NSPhotoLibraryUsageDescription` |
| Photos (add) | photo saving, media export | `NSPhotoLibraryAddUsageDescription` |
| Location (when in use) | `expo-location`, `@react-native-community/geolocation`, `CLLocationManager` | `NSLocationWhenInUseUsageDescription` |
| Location (always) | background geofencing/tracking | `NSLocationAlwaysAndWhenInUseUsageDescription` (and consider review risk) |
| Contacts | `expo-contacts`, `react-native-contacts`, `CNContactStore` | `NSContactsUsageDescription` |
| Calendars/Reminders | EventKit | `NSCalendarsUsageDescription`, `NSRemindersUsageDescription` |
| Bluetooth | BLE libs, CoreBluetooth | `NSBluetoothAlwaysUsageDescription` |
| Tracking | `expo-tracking-transparency`, `react-native-tracking-transparency`, ad/attribution SDKs | `NSUserTrackingUsageDescription` |
| Face ID | LocalAuthentication | `NSFaceIDUsageDescription` |
| Motion | CoreMotion | `NSMotionUsageDescription` |
| Speech | Speech framework | `NSSpeechRecognitionUsageDescription` |

## Quality bar for the strings

A usage string should:
- be specific (“We use your location to show nearby cafés”), not vague (“Need location”)
- match the actual behaviour in the app
- avoid claiming it is “required to use the app” unless it truly is (review risk)

## ATS (networking)

If `NSAppTransportSecurity.NSAllowsArbitraryLoads` is enabled:
- prefer removing it, or
- use targeted exceptions (`NSExceptionDomains`) with justification.

Broad ATS exemptions are a common review question.
