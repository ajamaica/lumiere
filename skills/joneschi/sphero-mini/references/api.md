# Sphero Mini API Reference

Complete API documentation for controlling Sphero Mini.

## SpheroMini Class

### Constructor

```python
sphero = SpheroMini(address)
```

**Parameters:**

- `address` (str): MAC address (Linux) or UUID (macOS/Windows) of your Sphero Mini

**Example:**

```python
sphero = SpheroMini("9F7E302C-EE90-5251-6795-428CCA6FB4CB")
```

---

## Connection Methods

### `async connect()`

Connect to the Sphero Mini via Bluetooth.

**Returns:** `bool` - True if connected successfully

**Example:**

```python
await sphero.connect()
```

**Timeout:** 15 seconds (configurable in source)

---

### `async disconnect()`

Disconnect from Sphero.

**Example:**

```python
await sphero.disconnect()
```

---

## Power Management

### `async wake()`

Wake Sphero from sleep mode.

**Example:**

```python
await sphero.wake()
await asyncio.sleep(2)  # Give it time to wake up
```

**Note:** Always call this after connecting!

---

### `async sleep()`

Put Sphero into sleep mode (BLE still active).

**Example:**

```python
await sphero.sleep()
```

---

### `async getBatteryVoltage()`

Get current battery voltage.

**Returns:** `float` - Voltage (typically 3.6V - 3.9V)

**Example:**

```python
voltage = await sphero.getBatteryVoltage()
print(f"Battery: {voltage}V")
if voltage < 3.6:
    print("Low battery!")
```

---

## LED Control

### `async setLEDColor(red, green, blue)`

Set the main LED color.

**Parameters:**

- `red` (int): Red value (0-255)
- `green` (int): Green value (0-255)
- `blue` (int): Blue value (0-255)

**Examples:**

```python
# Primary colors
await sphero.setLEDColor(255, 0, 0)    # Red
await sphero.setLEDColor(0, 255, 0)    # Green
await sphero.setLEDColor(0, 0, 255)    # Blue

# Mixed colors
await sphero.setLEDColor(255, 255, 0)  # Yellow
await sphero.setLEDColor(255, 0, 255)  # Magenta
await sphero.setLEDColor(0, 255, 255)  # Cyan
await sphero.setLEDColor(255, 255, 255)# White
await sphero.setLEDColor(128, 0, 128)  # Purple
```

---

### `async setBackLED(brightness)`

Set the back LED (tail light) brightness.

**Parameters:**

- `brightness` (int): Brightness (0-255)

**Example:**

```python
await sphero.setBackLED(255)  # Full brightness
await sphero.setBackLED(128)  # Half brightness
await sphero.setBackLED(0)    # Off
```

---

## Movement Control

### `async roll(speed, heading)`

Make Sphero roll in a specified direction.

**Parameters:**

- `speed` (int): Speed (0-255)
  - 0 = Stop
  - 50-100 = Slow/medium
  - 100-200 = Fast
  - 200-255 = Very fast
- `heading` (int): Direction in degrees (0-359)
  - 0° = Forward
  - 90° = Right
  - 180° = Backward
  - 270° = Left

**Examples:**

```python
# Basic movement
await sphero.roll(100, 0)    # Forward at medium speed
await sphero.roll(100, 90)   # Right
await sphero.roll(100, 180)  # Backward
await sphero.roll(100, 270)  # Left

# Stop
await sphero.roll(0, 0)

# Diagonal
await sphero.roll(80, 45)    # Northeast
await sphero.roll(80, 135)   # Southeast

# Variable speed
await sphero.roll(50, 0)     # Slow forward
await sphero.roll(150, 0)    # Fast forward
```

**Note:** Roll commands auto-stop after a few seconds for safety. Keep calling `roll()` for continuous movement.

---

### `async resetHeading()`

Reset the current direction as 0° (forward).

**Example:**

```python
await sphero.resetHeading()
# Now "forward" is the current facing direction
```

---

## Advanced Methods

### `async configureSensorMask()`

Enable sensor data streaming (IMU, accelerometer, gyroscope).

**Example:**

```python
await sphero.configureSensorMask()
await asyncio.sleep(2)

# Access sensor data
print(f"Pitch: {sphero.IMU_pitch}")
print(f"Roll: {sphero.IMU_roll}")
print(f"Yaw: {sphero.IMU_yaw}")
```

**Note:** Sensor data is experimental and may not work on all firmware versions.

---

## Helper Methods

### `async wait(seconds)`

Async wait (better than `asyncio.sleep` for processing notifications).

**Parameters:**

- `seconds` (float): Delay in seconds

**Example:**

```python
await sphero.wait(2.5)
```

**Why use this?** Processes async notifications (like collision detection) during wait.

---

## Movement Patterns

### Draw a Square

```python
async def draw_square():
    for heading in [0, 90, 180, 270]:
        await sphero.roll(80, heading)
        await asyncio.sleep(1.5)
        await sphero.roll(0, 0)
        await asyncio.sleep(0.3)
```

### Draw a Star

```python
async def draw_star():
    heading = 0
    for i in range(5):
        await sphero.roll(80, heading)
        await asyncio.sleep(1.8)
        await sphero.roll(0, 0)
        await asyncio.sleep(0.3)
        heading = (heading + 144) % 360
```

### Spin in Place

```python
async def spin():
    for heading in range(0, 360, 10):
        await sphero.roll(50, heading)
        await asyncio.sleep(0.1)
    await sphero.roll(0, 0)
```

### Random Movement (Cat Play)

```python
async def random_play():
    import random
    for _ in range(30):
        speed = random.randint(50, 120)
        heading = random.randint(0, 359)
        r, g, b = random.randint(0, 255), random.randint(0, 255), random.randint(0, 255)

        await sphero.setLEDColor(r, g, b)
        await sphero.roll(speed, heading)
        await asyncio.sleep(random.uniform(0.5, 2.0))
```

---

## Color Presets

Common RGB values:

```python
COLORS = {
    'red': (255, 0, 0),
    'green': (0, 255, 0),
    'blue': (0, 0, 255),
    'yellow': (255, 255, 0),
    'magenta': (255, 0, 255),
    'cyan': (0, 255, 255),
    'white': (255, 255, 255),
    'purple': (128, 0, 128),
    'orange': (255, 127, 0),
    'pink': (255, 192, 203),
}

# Usage
r, g, b = COLORS['purple']
await sphero.setLEDColor(r, g, b)
```

---

## Error Handling

```python
async def safe_control():
    sphero = SpheroMini(MAC_ADDRESS)

    try:
        await sphero.connect()
        await sphero.wake()
        await asyncio.sleep(1)

        # Your commands here
        await sphero.setLEDColor(255, 0, 0)

    except TimeoutError:
        print("Connection timeout - shake Sphero and try again")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        await sphero.disconnect()
```

---

## Best Practices

1. **Always wake after connect:**

   ```python
   await sphero.connect()
   await sphero.wake()
   await asyncio.sleep(2)  # Give it time
   ```

2. **Always disconnect:**

   ```python
   try:
       # ... your code
   finally:
       await sphero.disconnect()
   ```

3. **Use delays between commands:**

   ```python
   await sphero.setLEDColor(255, 0, 0)
   await asyncio.sleep(0.5)  # Let command process
   ```

4. **Check battery regularly:**

   ```python
   voltage = await sphero.getBatteryVoltage()
   if voltage < 3.6:
       print("Low battery - charge soon!")
   ```

5. **Set white at end for visibility:**
   ```python
   await sphero.setLEDColor(255, 255, 255)
   # Easy to find Sphero afterwards
   ```

---

## Firmware Requirements

- Tested on firmware v0.0.12.0.45.0.0+
- Update via Sphero Edu app if features don't work
- Sensor features require newer firmware

---

## Platform Notes

**macOS:**

- Uses UUID instead of MAC address
- No special permissions needed (uses CoreBluetooth)

**Windows:**

- Uses UUID
- Bluetooth must be enabled

**Linux:**

- Uses MAC address
- May need `sudo` or capabilities for BLE access
