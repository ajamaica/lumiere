# Home Assistant CLI Examples

## Common Use Cases

### Morning Routine

```bash
# Turn on lights gradually
hass-cli service call light.turn_on --arguments entity_id=light.bedroom,brightness=50
sleep 30
hass-cli service call light.turn_on --arguments entity_id=light.bedroom,brightness=150

# Start coffee maker
hass-cli service call switch.turn_on --arguments entity_id=switch.coffee_maker

# Open blinds
hass-cli service call cover.open_cover --arguments entity_id=cover.bedroom_blinds
```

### Movie Mode

```bash
# Activate movie scene
hass-cli service call scene.turn_on --arguments entity_id=scene.movie_time

# Or manually:
hass-cli service call light.turn_off --arguments entity_id=light.living_room
hass-cli service call media_player.play_media --arguments entity_id=media_player.tv
```

### Check if Anyone is Home

```bash
# Check person entities
hass-cli state list person

# Get specific person
hass-cli state get person.jones
```

### Climate Control

```bash
# Set temperature
hass-cli service call climate.set_temperature --arguments entity_id=climate.living_room,temperature=22

# Set HVAC mode
hass-cli service call climate.set_hvac_mode --arguments entity_id=climate.living_room,hvac_mode=heat

# Turn off AC
hass-cli service call climate.turn_off --arguments entity_id=climate.bedroom
```

### Notifications

```bash
# Send notification
hass-cli service call notify.mobile_app --arguments message="Door is open"

# With title
hass-cli service call notify.mobile_app --arguments title="Alert",message="Motion detected"
```

### Automation Helpers

```bash
# Trigger automation
hass-cli service call automation.trigger --arguments entity_id=automation.morning_lights

# Turn automation on/off
hass-cli service call automation.turn_on --arguments entity_id=automation.security_mode
hass-cli service call automation.turn_off --arguments entity_id=automation.vacation_mode
```

## Scripting Patterns

### Loop Through Multiple Lights

```bash
#!/bin/bash
for light in light.living_room light.kitchen light.bedroom; do
  hass-cli service call light.turn_on --arguments entity_id=$light,brightness=200
done
```

### Conditional Actions Based on State

```bash
#!/bin/bash
STATE=$(hass-cli -o json state get person.jones | jq -r '.state')

if [ "$STATE" == "home" ]; then
  hass-cli service call light.turn_on --arguments entity_id=light.entrance
else
  hass-cli service call alarm_control_panel.alarm_arm_away --arguments entity_id=alarm_control_panel.home
fi
```

### Monitor and React to Events

```bash
# Watch for door opening
hass-cli event watch state_changed | grep 'binary_sensor.front_door' | while read line; do
  echo "Front door state changed!"
  hass-cli service call notify.mobile_app --arguments message="Front door opened"
done
```

## Advanced

### Using JSON for Complex Arguments

```bash
# Color temperature
hass-cli service call light.turn_on --arguments '{
  "entity_id": "light.living_room",
  "brightness": 200,
  "color_temp": 250
}'

# RGB color
hass-cli service call light.turn_on --arguments '{
  "entity_id": "light.bedroom",
  "rgb_color": [255, 0, 0]
}'
```

### Query Sensors

```bash
# Temperature sensor
hass-cli -o json state get sensor.temperature | jq -r '.state'

# Battery level
hass-cli -o json state get sensor.phone_battery | jq -r '.state'
```

### Areas and Zones

```bash
# List areas
hass-cli area list

# List devices in area
hass-cli device list | grep "Living Room"
```
