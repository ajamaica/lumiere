#!/usr/bin/env python3
"""
Make Sphero Mini draw a star (五角星)
"""
import asyncio
from sphero_mini_bleak import SpheroMini

SPHERO_MAC = "9F7E302C-EE90-5251-6795-428CCA6FB4CB"

async def draw_star():
    sphero = SpheroMini(SPHERO_MAC)
    
    try:
        print("Connecting...")
        await sphero.connect()
        
        print("Waking up...")
        await sphero.wake()
        await asyncio.sleep(1)
        
        print("Drawing a 5-pointed star (畫五角星)...")
        
        # 5-pointed star: 5 points, turn 144° each time
        # (exterior angle of a star is 144°, not 72°)
        speed = 80
        duration = 1.8  # seconds per line
        
        # Starting heading
        heading = 0
        
        for i in range(5):
            print(f"Point {i+1}: heading {heading}°")
            
            # Roll in direction
            await sphero.roll(speed, heading)
            await asyncio.sleep(duration)
            
            # Brief pause at corner
            await sphero.roll(0, 0)
            await asyncio.sleep(0.3)
            
            # Turn 144° for next point
            heading = (heading + 144) % 360
        
        print("Stopping...")
        await sphero.roll(0, 0)
        
        print("✓ Star complete! ⭐")
        
    finally:
        await sphero.disconnect()

if __name__ == "__main__":
    asyncio.run(draw_star())
