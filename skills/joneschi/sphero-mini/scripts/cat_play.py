#!/usr/bin/env python3
"""
Make Sphero Mini move randomly to play with cats (逗貓模式)
"""
import asyncio
import random
from sphero_mini_bleak import SpheroMini

SPHERO_MAC = "9F7E302C-EE90-5251-6795-428CCA6FB4CB"

async def cat_play_mode():
    sphero = SpheroMini(SPHERO_MAC)
    
    try:
        print("Connecting...")
        await sphero.connect()
        
        print("Waking up...")
        await sphero.wake()
        await asyncio.sleep(1)
        
        print("🐱 Cat play mode activated! (逗貓模式啟動)")
        print("Random movement for 1 minute...\n")
        
        # Random colors to attract cat attention
        colors = [
            (255, 0, 0),    # Red
            (0, 255, 0),    # Green
            (0, 0, 255),    # Blue
            (255, 255, 0),  # Yellow
            (255, 0, 255),  # Magenta
            (0, 255, 255),  # Cyan
        ]
        
        start_time = asyncio.get_event_loop().time()
        duration = 60  # 1 minute
        
        move_count = 0
        while (asyncio.get_event_loop().time() - start_time) < duration:
            # Random speed (40-120)
            speed = random.randint(40, 120)
            
            # Random heading (0-359)
            heading = random.randint(0, 359)
            
            # Random color
            r, g, b = random.choice(colors)
            
            move_count += 1
            elapsed = int(asyncio.get_event_loop().time() - start_time)
            print(f"[{elapsed}s] Move {move_count}: speed={speed}, heading={heading}°, color=RGB({r},{g},{b})")
            
            # Change color
            await sphero.setLEDColor(r, g, b)
            
            # Move
            await sphero.roll(speed, heading)
            
            # Random duration (0.5-2 seconds)
            move_duration = random.uniform(0.5, 2.0)
            await asyncio.sleep(move_duration)
            
            # Sometimes stop briefly (more unpredictable)
            if random.random() < 0.3:  # 30% chance
                await sphero.roll(0, 0)
                await asyncio.sleep(random.uniform(0.2, 0.5))
        
        print("\n⏰ Time's up!")
        print("Stopping...")
        await sphero.roll(0, 0)
        
        # Set to white so you can find it
        await sphero.setLEDColor(255, 255, 255)
        
        print(f"✓ Cat play mode complete! Made {move_count} random moves 🐱")
        
    finally:
        await sphero.disconnect()

if __name__ == "__main__":
    asyncio.run(cat_play_mode())
