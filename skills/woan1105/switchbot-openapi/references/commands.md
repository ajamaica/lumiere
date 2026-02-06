# SwitchBot Commands (Common)

General schema (POST /v1.1/devices/{deviceId}/commands):

{
  "commandType": "command",
  "command": "<string>",
  "parameter": "<string> or default"
}

Common commands by device type:

- Bot
  - press (parameter: default)
  - turnOn / turnOff (for toggle mode)

- Plug/Plug Mini
  - turnOn / turnOff

- Curtain
  - setPosition (parameter: 0-100)
  - open / close / pause

- Lock
  - lock / unlock (parameter: default)

- Air Conditioner (IR / Hub)
  - setAll (JSON encoded), or setTemperature (parameter: e.g., 24)
  - setMode (auto, cool, heat, dry, fan)
  - setFanSpeed (1-4)

- Light (IR / Hub)
  - turnOn / turnOff
  - setBrightness (0-100)

- Robot Vacuum Cleaner K10+ Pro Combo
  - startClean (parameter JSON): {"action":"sweep|mop","param":{"fanLevel":1-4,"times":1-2639999}}
  - pause (parameter: default)
  - dock (parameter: default) — return to charging dock
  - setVolume (parameter: 0-100)
  - changeParam (parameter JSON): {"fanLevel":1-4,"times":1-2639999}

Check official docs for device-specific parameter formats.
