#!/usr/bin/env python3
"""
Sphero Mini Control Script
Wrapper script for easy Sphero Mini control from command line.

Usage:
    python3 sphero_control.py [MAC] wake
    python3 sphero_control.py [MAC] sleep
    python3 sphero_control.py [MAC] color [R] [G] [B]
    python3 sphero_control.py [MAC] roll [speed] [heading]
    python3 sphero_control.py [MAC] battery
    python3 sphero_control.py [MAC] sensors
"""

import sys
from sphero_mini import sphero_mini

def print_usage():
    print(__doc__)
    sys.exit(1)

def main():
    if len(sys.argv) < 3:
        print_usage()
    
    MAC = sys.argv[1]
    command = sys.argv[2].lower()
    
    sphero = sphero_mini(MAC)
    
    try:
        if command == "wake":
            sphero.wake()
            sphero.wait(2)
            print("✓ Sphero awake")
        
        elif command == "sleep":
            sphero.sleep()
            print("✓ Sphero sleeping")
        
        elif command == "color":
            if len(sys.argv) != 6:
                print("Usage: sphero_control.py [MAC] color [R] [G] [B]")
                sys.exit(1)
            r, g, b = int(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5])
            sphero.wake()
            sphero.wait(1)
            sphero.setLEDColor(r, g, b)
            sphero.wait(0.5)
            print(f"✓ Color set to RGB({r}, {g}, {b})")
        
        elif command == "roll":
            if len(sys.argv) != 5:
                print("Usage: sphero_control.py [MAC] roll [speed] [heading]")
                sys.exit(1)
            speed, heading = int(sys.argv[3]), int(sys.argv[4])
            sphero.wake()
            sphero.wait(1)
            sphero.roll(speed, heading)
            print(f"✓ Rolling at speed {speed}, heading {heading}°")
            sphero.wait(3)
            sphero.roll(0, 0)
            print("✓ Stopped")
        
        elif command == "battery":
            sphero.wake()
            sphero.wait(2)
            voltage = sphero.getBatteryVoltage()
            print(f"Battery: {voltage}V")
            if voltage < 3.6:
                print("⚠️  Battery low! Please charge.")
        
        elif command == "sensors":
            sphero.wake()
            sphero.wait(2)
            sphero.configureSensorMask()
            sphero.wait(2)
            print("Sensors:")
            print(f"  IMU Pitch: {sphero.IMU_pitch:.2f}°")
            print(f"  IMU Roll:  {sphero.IMU_roll:.2f}°")
            print(f"  IMU Yaw:   {sphero.IMU_yaw:.2f}°")
        
        else:
            print(f"Unknown command: {command}")
            print_usage()
    
    finally:
        sphero.disconnect()

if __name__ == "__main__":
    main()
