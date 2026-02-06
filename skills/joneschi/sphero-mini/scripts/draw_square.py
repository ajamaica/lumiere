#!/usr/bin/env python3
"""
Make Sphero Mini draw a square
"""
import asyncio
from sphero_mini_bleak import SpheroMini

SPHERO_MAC = "9F7E302C-EE90-5251-6795-428CCA6FB4CB"

async def draw_square():
    sphero = SpheroMini(SPHERO_MAC)
    
    try:
        print("Connecting...")
        await sphero.connect()
        
        print("Waking up...")
        await sphero.wake()
        await asyncio.sleep(1)
        
        print("Drawing a square (畫正方形)...")
        
        # Square: 4 sides, 90-degree turns
        # Headings: 0 (forward), 90 (right), 180 (back), 270 (left)
        speed = 80
        duration = 1.5  # seconds per side
        
        for i, heading in enumerate([0, 90, 180, 270]):
            print(f"Side {i+1}: heading {heading}°")
            
            # Roll in direction
            await sphero.roll(speed, heading)
            await asyncio.sleep(duration)
            
            # Brief pause at corner
            await sphero.roll(0, 0)
            await asyncio.sleep(0.3)
        
        print("Stopping...")
        await sphero.roll(0, 0)
        
        print("✓ Square complete!")
        
    finally:
        await sphero.disconnect()

if __name__ == "__main__":
    asyncio.run(draw_square())
