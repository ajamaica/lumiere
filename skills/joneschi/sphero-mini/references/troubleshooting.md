# Troubleshooting Sphero Mini

## Connection Issues

### Cannot Connect to Sphero

**Symptoms:**

```
BluetoothError: Failed to connect to peripheral
```

**Solutions:**

1. **Check MAC address**:

   ```bash
   # Linux
   sudo hcitool lescan

   # Look for "SM-XXXX" device
   ```

2. **Reset Sphero**:
   - Connect Sphero to USB power for 5 seconds
   - Disconnect (this resets the microcontroller)

3. **Restart Bluetooth**:

   ```bash
   # macOS
   sudo killall bluetoothd

   # Linux
   sudo systemctl restart bluetooth
   ```

4. **Check Sphero is charged**:
   - Place on charging cradle
   - LED should pulse white when charging

### Connection Drops Mid-Script

**Cause:** Bluetooth interference or unexpected async notifications

**Solution:**

- Run script again (usually works on retry)
- Reduce distance between computer and Sphero
- Avoid using `time.sleep()` - use `sphero.wait()` instead

## Movement Issues

### Sphero Stops After a Few Seconds

**This is normal!** The `roll()` command auto-stops for safety.

**Solution:**

```python
# Continuous rolling - keep calling roll()
while True:
    sphero.roll(100, 0)
    sphero.wait(0.5)
```

### Sphero Rolls in Wrong Direction

**Cause:** Heading not calibrated

**Solution:**

```python
# Reset heading (current direction = 0°)
sphero.resetHeading()
sphero.wait(1)

# Now roll "forward"
sphero.roll(100, 0)
```

### Sphero Won't Move

**Possible causes:**

1. **In sleep mode**:

   ```python
   sphero.wake()
   sphero.wait(2)
   ```

2. **Low battery**:

   ```python
   voltage = sphero.getBatteryVoltage()
   if voltage < 3.6:
       print("Battery low! Charge Sphero.")
   ```

3. **Stabilization disabled**:
   ```python
   sphero.stabilization(True)
   ```

## Sensor Issues

### Sensors Return Zero or NaN

**Cause:** Sensor streaming not enabled or firmware too old

**Solutions:**

1. **Enable sensors**:

   ```python
   sphero.configureSensorMask()
   sphero.wait(2)  # Give sensors time to start
   ```

2. **Update firmware**:
   - Download "Sphero Edu" app (iOS/Android)
   - Connect Sphero
   - Update to latest firmware (0.0.12.0.45.0.0 or newer)

3. **Check firmware version**:
   ```python
   version = sphero.getFirmwareVersion()
   print(f"Firmware: {version}")
   ```

## Collision Detection Issues

### Collisions Not Detected

**Note:** Collision detection is experimental and may not work reliably.

**Try:**

```python
# Increase collision sensitivity (not yet supported in library)
# For now, collisions work best with:
# - Firm hits (not gentle bumps)
# - Moving at speed > 50
```

## LED Issues

### LED Doesn't Change Color

**Cause:** Commands sent too fast

**Solution:**

```python
sphero.setLEDColor(255, 0, 0)
sphero.wait(0.5)  # Give time for command to process
```

### Back LED Not Working

**Check intensity value**:

```python
# Must be 0-255
sphero.setBackLED(255)  # Full brightness
sphero.wait(0.5)
```

## Python/Library Issues

### ModuleNotFoundError: No module named 'bluepy'

**Solution:**

```bash
# Install bluepy
pip3 install bluepy

# Linux: also need system library
sudo apt-get install libglib2.0-dev
```

### Permission Denied (Linux)

**Symptoms:**

```
bluepy.btle.BTLEException: Failed to execute management command 'scanend'
```

**Solution:**

```bash
# Run with sudo
sudo python3 example_roll.py XX:XX:XX:XX:XX:XX

# OR give capabilities to Python
sudo setcap 'cap_net_raw,cap_net_admin+eip' $(which python3)
```

## General Tips

1. **Always call `wait()` not `sleep()`**: Allows async notifications to process
2. **Disconnect properly**: Always call `sphero.disconnect()` when done
3. **One connection at a time**: Don't try to connect multiple scripts simultaneously
4. **Be patient**: Allow 1-2 seconds after wake() before sending commands
5. **Test battery**: Low battery causes erratic behavior

## Getting Help

If issues persist:

- Check library issues: https://github.com/MProx/Sphero_mini/issues
- Test with official Sphero Edu app to verify hardware works
- Try pysphero library as alternative: https://github.com/EnotYoyo/pysphero
