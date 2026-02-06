#!/usr/bin/env python3
"""
Scan for Sphero Mini devices
"""
import asyncio
from bleak import BleakScanner

async def scan_for_sphero():
    print("Scanning for Sphero Mini (10 seconds)...")
    print("Make sure your Sphero is powered on and not connected to another device.\n")
    
    devices = await BleakScanner.discover(timeout=10.0)
    
    sphero_devices = []
    for device in devices:
        # Sphero Mini devices typically have names starting with "SM-"
        if device.name and (device.name.startswith("SM-") or "Sphero" in device.name):
            sphero_devices.append(device)
            print(f"✓ Found: {device.name}")
            print(f"  Address: {device.address}\n")
    
    if not sphero_devices:
        print("❌ No Sphero Mini devices found.")
        print("\nTroubleshooting:")
        print("1. Make sure Sphero Mini is turned on (shake it to wake)")
        print("2. Ensure it's not connected to the Sphero Edu app")
        print("3. Try moving it closer to your computer")
    else:
        print(f"\n✓ Found {len(sphero_devices)} Sphero device(s)!")
        print("\nUse the address above to connect.")
    
    return sphero_devices

if __name__ == "__main__":
    asyncio.run(scan_for_sphero())
