# Sphero Mini Control Skill for OpenClaw

Control your Sphero Mini robot ball via Bluetooth Low Energy with Python.

## 🎮 What Can It Do?

- **🎨 Change Colors** — RGB LED control
- **🎯 Precise Movement** — Roll in any direction
- **🐱 Cat Play Mode** — Random movement to entertain cats
- **📐 Draw Shapes** — Squares, stars, and custom patterns
- **🔋 Power Management** — Wake, sleep, battery check
- **🖥️ Cross-platform** — Works on macOS, Windows, and Linux

## 🚀 Quick Start

### 1. Install

```bash
pip3 install bleak
```

### 2. Find Your Sphero

```bash
python3 scripts/scan_sphero.py
```

### 3. Play!

**Cat Play Mode:**

```bash
python3 scripts/cat_play.py
```

**Draw Shapes:**

```bash
python3 scripts/draw_square.py
python3 scripts/draw_star.py
```

## 🐱 Cat Play Mode

Perfect for entertaining cats! Sphero will:

- Move randomly for 1 minute
- Change colors constantly (red, green, blue, yellow, magenta, cyan)
- Stop unpredictably to keep it interesting
- End with white color so you can find it

Tested with real cats — they love it! 😻

## 📦 What's Included

- **sphero_mini_bleak.py** — Main control library (bleak-based, cross-platform)
- **scan_sphero.py** — Find your Sphero's MAC/UUID address
- **cat_play.py** — Random movement mode for playing with cats
- **draw_square.py** — Make Sphero draw a square
- **draw_star.py** — Make Sphero draw a 5-pointed star
- **SKILL.md** — Complete usage guide

## 🔧 Example: Change Color

```python
import asyncio
from scripts.sphero_mini_bleak import SpheroMini

async def purple():
    sphero = SpheroMini("YOUR-MAC-ADDRESS")
    await sphero.connect()
    await sphero.wake()
    await sphero.setLEDColor(128, 0, 128)  # Purple
    await asyncio.sleep(3)
    await sphero.disconnect()

asyncio.run(purple())
```

## 🎯 Example: Draw a Circle

```python
import asyncio
from scripts.sphero_mini_bleak import SpheroMini

async def circle():
    sphero = SpheroMini("YOUR-MAC-ADDRESS")
    await sphero.connect()
    await sphero.wake()

    # Spin in a circle
    for heading in range(0, 360, 10):
        await sphero.roll(60, heading)
        await asyncio.sleep(0.1)

    await sphero.roll(0, 0)
    await sphero.disconnect()

asyncio.run(circle())
```

## ⚠️ Important Notes

- **Wake Sphero first**: Shake it to wake from deep sleep
- **One Sphero Mini only**: This library is specifically for Sphero Mini
- **For other models** (BB8, SPRK+, Bolt): Use [pysphero](https://github.com/EnotYoyo/pysphero) instead
- **Connection timeout**: If it fails, shake Sphero and try again

## 🔗 Credits

- Based on [sphero_mini_win](https://github.com/trflorian/sphero_mini_win) by trflorian
- Uses [bleak](https://github.com/hbldh/bleak) for Bluetooth LE

## 📖 Documentation

See **SKILL.md** for complete API reference and advanced examples.

## 🎉 Tested Features

✅ Connecting/disconnecting  
✅ Color changes (red, green, blue, purple, custom RGB)  
✅ Movement control (roll, stop)  
✅ Drawing shapes (square, star)  
✅ Cat play mode (1 minute random movement)  
✅ Cross-platform support (macOS confirmed, Windows/Linux compatible)

## 📝 License

MIT
