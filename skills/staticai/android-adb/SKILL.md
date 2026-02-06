---
name: android-automation
description: Control Android devices via ADB with support for UI layout analysis (uiautomator) and visual feedback (screencap). Use when you need to interact with Android apps, perform UI automation, take screenshots, or run complex ADB command sequences.
---

# Android Automation

Control and automate Android devices using ADB, uiautomator, and screencap.

## Connecting Devices

### USB Connection
1. Enable **Developer Options** and **USB Debugging** on the device.
2. Connect via USB and verify with `adb devices`.

### Wireless Connection (Android 11+)
1. Enable **Wireless Debugging** in Developer Options.
2. **Pairing**: Find the IP, port, and pairing code in the "Pair device with pairing code" popup.
   `adb pair <ip>:<pairing_port> <pairing_code>`
3. **Connecting**: Use the IP and port shown on the main Wireless Debugging screen.
   `adb connect <ip>:<connection_port>`
4. Verify with `adb devices`.

## Common Workflows

### Launching an App
Use the monkey tool to launch apps by package name:
`adb shell monkey -p <package_name> -c android.intent.category.LAUNCHER 1`

### Analyzing the UI
Dump and pull the UI hierarchy to find coordinates:
`adb shell uiautomator dump /sdcard/view.xml && adb pull /sdcard/view.xml ./view.xml`

Then grep for text or resource IDs to find `bounds="[x1,y1][x2,y2]"`.

### Interacting with Elements
- **Tap**: `adb shell input tap <x> <y>`
- **Text**: `adb shell input text "<text>"` (Note: Use `%\s` for spaces in some environments or handle quoting carefully)
- **Keyevent**: `adb shell input keyevent <keycode>` (Home: 3, Back: 4, Power: 26, Search: 84, Enter: 66)
- **Swipe**: `adb shell input swipe <x1> <y1> <x2> <y2> <duration_ms>`

### Visual Verification
Take a screenshot to verify the state:
`adb shell screencap -p /sdcard/screen.png && adb pull /sdcard/screen.png ./screen.png`

## Tips
- **Search**: Use `input keyevent 84` to trigger search in many apps.
- **Wait**: Use `sleep <seconds>` between commands to allow the UI to update.
- **Coordinates**: Calculate the center of `[x1,y1][x2,y2]` for reliable taps.
