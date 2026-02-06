# Sphero Mini Control Library

Save these files to use with Sphero Mini:

## Main Library Files

You need to download these two files from the [Sphero_mini GitHub repo](https://github.com/MProx/Sphero_mini):

1. **sphero_mini.py** - Main control library
2. **sphero_constants.py** - Protocol constants

```bash
# Download the library files
curl -O https://raw.githubusercontent.com/MProx/Sphero_mini/master/sphero_mini.py
curl -O https://raw.githubusercontent.com/MProx/Sphero_mini/master/sphero_constants.py
```

## Example: Roll Forward

`example_roll.py`:

```python
#!/usr/bin/env python3
from sphero_mini import sphero_mini
import sys

if len(sys.argv) < 2:
    print("Usage: python3 example_roll.py [MAC_ADDRESS]")
    sys.exit(1)

MAC = sys.argv[1]

# Connect
sphero = sphero_mini(MAC)

# Wake up
sphero.wake()
sphero.wait(2)

# Roll forward at speed 100
print("Rolling forward...")
sphero.roll(100, 0)
sphero.wait(3)

# Stop
print("Stopping...")
sphero.roll(0, 0)
sphero.wait(1)

# Disconnect
sphero.disconnect()
print("Done!")
```

## Example: Color Cycling

`example_color.py`:

```python
#!/usr/bin/env python3
from sphero_mini import sphero_mini
import sys

if len(sys.argv) < 2:
    print("Usage: python3 example_color.py [MAC_ADDRESS]")
    sys.exit(1)

MAC = sys.argv[1]

sphero = sphero_mini(MAC)
sphero.wake()
sphero.wait(2)

colors = [
    (255, 0, 0),    # Red
    (0, 255, 0),    # Green
    (0, 0, 255),    # Blue
    (255, 255, 0),  # Yellow
    (255, 0, 255),  # Magenta
    (0, 255, 255),  # Cyan
    (255, 255, 255) # White
]

for r, g, b in colors:
    print(f"Color: RGB({r}, {g}, {b})")
    sphero.setLEDColor(r, g, b)
    sphero.wait(1)

sphero.disconnect()
```

## Example: Read Sensors

`example_sensors.py`:

```python
#!/usr/bin/env python3
from sphero_mini import sphero_mini
import sys

if len(sys.argv) < 2:
    print("Usage: python3 example_sensors.py [MAC_ADDRESS]")
    sys.exit(1)

MAC = sys.argv[1]

sphero = sphero_mini(MAC)
sphero.wake()
sphero.wait(2)

# Enable sensor streaming
sphero.configureSensorMask()
sphero.wait(2)

# Read sensors for 10 seconds
print("Reading sensors (10 seconds)...")
for i in range(10):
    print(f"\n--- Second {i+1} ---")
    print(f"IMU Pitch: {sphero.IMU_pitch:.2f}°")
    print(f"IMU Roll:  {sphero.IMU_roll:.2f}°")
    print(f"IMU Yaw:   {sphero.IMU_yaw:.2f}°")
    print(f"Accel X:   {sphero.IMU_acc_x:.2f}")
    print(f"Accel Y:   {sphero.IMU_acc_y:.2f}")
    print(f"Accel Z:   {sphero.IMU_acc_z:.2f}")
    sphero.wait(1)

sphero.disconnect()
```

## Usage

```bash
# Make executable
chmod +x example_roll.py

# Run (replace XX:XX:XX:XX:XX:XX with your Sphero's MAC)
python3 example_roll.py XX:XX:XX:XX:XX:XX
```
