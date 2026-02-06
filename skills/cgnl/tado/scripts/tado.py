#!/usr/bin/env python3
"""
Tado Smart Thermostat CLI
Manage your Tado thermostat via OpenClaw
"""

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Optional, Dict, Any

try:
    from libtado.api import Tado
except ImportError:
    print("ERROR: libtado not installed. Run: pip3 install libtado", file=sys.stderr)
    sys.exit(1)


TOKEN_FILE = Path.home() / ".tado_auth.json"


class TadoClient:
    """Wrapper for Tado API with OAuth2 token management"""
    
    def __init__(self, token_path: Path = TOKEN_FILE):
        self.token_path = token_path
        self.tado = None
        self._load_and_connect()
    
    def _load_and_connect(self):
        """Connect to Tado API using OAuth2 token"""
        try:
            # Check if token file exists
            if not self.token_path.exists():
                raise ValueError(
                    f"❌ Tado OAuth2 token not found!\n\n"
                    f"libtado 4.1.1+ requires OAuth2 authentication.\n"
                    f"Run this command to authenticate (one-time setup):\n\n"
                    f"  python3 -m libtado -f {self.token_path} zones\n\n"
                    f"This will:\n"
                    f"  1. Generate a login URL\n"
                    f"  2. Open your browser for Tado login\n"
                    f"  3. Save OAuth2 tokens to {self.token_path}\n\n"
                    f"After setup, this script will work automatically!"
                )
            
            # Connect using OAuth2 token file
            # libtado 4.1.1+ requires token_file_path parameter
            self.tado = Tado(token_file_path=str(self.token_path))
            
        except ValueError as e:
            print(f"ERROR: {e}", file=sys.stderr)
            sys.exit(1)
        except Exception as e:
            print(f"ERROR: Failed to connect to Tado: {e}", file=sys.stderr)
            print("\nTroubleshooting:", file=sys.stderr)
            print(f"  - Verify {self.token_path} exists and is valid", file=sys.stderr)
            print("  - Try re-authenticating:", file=sys.stderr)
            print(f"    python3 -m libtado -f {self.token_path} zones", file=sys.stderr)
            print("  - Verify internet connection", file=sys.stderr)
            print("  - Check Tado service status", file=sys.stderr)
            sys.exit(1)
    
    def get_zones(self) -> list:
        """Get list of all zones"""
        try:
            zones = self.tado.get_zones()
            return zones
        except Exception as e:
            print(f"ERROR: Failed to get zones: {e}", file=sys.stderr)
            sys.exit(1)
    
    def find_zone_id(self, zone_identifier: str) -> Optional[int]:
        """Find zone ID by number or name"""
        # If it's a number, return it directly
        try:
            return int(zone_identifier)
        except ValueError:
            pass
        
        # Search by name
        zones = self.get_zones()
        for zone in zones:
            if zone.get("name", "").lower() == zone_identifier.lower():
                return zone.get("id")
        
        return None
    
    def get_status(self, zone_id: Optional[int] = None) -> Dict[str, Any]:
        """Get status for one or all zones"""
        try:
            if zone_id:
                state = self.tado.get_state(zone_id)
                return {
                    "zone_id": zone_id,
                    "zone_name": self._get_zone_name(zone_id),
                    "current_temp": state.get("sensorDataPoints", {}).get("insideTemperature", {}).get("celsius"),
                    "current_humidity": state.get("sensorDataPoints", {}).get("humidity", {}).get("percentage"),
                    "target_temp": state.get("setting", {}).get("temperature", {}).get("celsius"),
                    "heating": state.get("activityDataPoints", {}).get("heatingPower", {}).get("percentage", 0) > 0,
                    "heating_power": state.get("activityDataPoints", {}).get("heatingPower", {}).get("percentage", 0),
                    "mode": state.get("overlayType"),
                    "overlay": state.get("overlay") is not None,
                }
            else:
                # All zones
                zones = self.get_zones()
                statuses = []
                for zone in zones:
                    zone_id = zone.get("id")
                    statuses.append(self.get_status(zone_id))
                return {"zones": statuses}
        except Exception as e:
            print(f"ERROR: Failed to get status: {e}", file=sys.stderr)
            sys.exit(1)
    
    def _get_zone_name(self, zone_id: int) -> str:
        """Get zone name by ID"""
        zones = self.get_zones()
        for zone in zones:
            if zone.get("id") == zone_id:
                return zone.get("name", f"Zone {zone_id}")
        return f"Zone {zone_id}"
    
    def set_temperature(self, zone_id: int, temperature: float, duration: Optional[int] = None):
        """Set temperature for a zone"""
        try:
            if duration:
                # Temporary override with timer (duration in seconds for API)
                self.tado.set_temperature(zone_id, temperature, duration * 60)
            else:
                # Permanent override (until next schedule change)
                self.tado.set_temperature(zone_id, temperature)
            
            return {
                "success": True,
                "zone_id": zone_id,
                "zone_name": self._get_zone_name(zone_id),
                "temperature": temperature,
                "duration": duration,
            }
        except Exception as e:
            print(f"ERROR: Failed to set temperature: {e}", file=sys.stderr)
            sys.exit(1)
    
    def reset_zone(self, zone_id: int):
        """Reset zone to automatic schedule"""
        try:
            self.tado.end_manual_control(zone_id)
            return {
                "success": True,
                "zone_id": zone_id,
                "zone_name": self._get_zone_name(zone_id),
                "mode": "auto",
            }
        except Exception as e:
            print(f"ERROR: Failed to reset zone: {e}", file=sys.stderr)
            sys.exit(1)
    
    def set_home_mode(self, mode: str):
        """Set home/away mode"""
        try:
            if mode == "home":
                self.tado.set_home_state("HOME")
            elif mode == "away":
                self.tado.set_home_state("AWAY")
            elif mode == "auto":
                # Reset to auto mode (geolocation-based)
                self.tado.set_home_state("AUTO")
            else:
                raise ValueError(f"Invalid mode: {mode}. Use: home, away, or auto")
            
            return {
                "success": True,
                "mode": mode,
            }
        except Exception as e:
            print(f"ERROR: Failed to set mode: {e}", file=sys.stderr)
            sys.exit(1)
    
    def get_presence(self) -> Dict[str, Any]:
        """Get presence information (who is home)"""
        try:
            devices = self.tado.get_devices()
            presence = {
                "devices": [],
                "anyone_home": False,
            }
            
            for device in devices:
                # Filter for mobile devices only
                if device.get("deviceType") == "GW03":  # Mobile device
                    is_home = device.get("location", {}).get("atHome", False)
                    presence["devices"].append({
                        "name": device.get("name"),
                        "home": is_home,
                    })
                    if is_home:
                        presence["anyone_home"] = True
            
            return presence
        except Exception as e:
            print(f"ERROR: Failed to get presence: {e}", file=sys.stderr)
            sys.exit(1)


def format_output(data: Any, json_output: bool = False):
    """Format output as JSON or human-readable text"""
    if json_output:
        print(json.dumps(data, indent=2))
    else:
        # Human-readable output
        if isinstance(data, dict):
            if "zones" in data:
                # Multiple zones
                for zone in data["zones"]:
                    print(f"\n🏠 {zone['zone_name']} (Zone {zone['zone_id']})")
                    print(f"  Current: {zone['current_temp']}°C ({zone['current_humidity']}% humidity)")
                    if zone['target_temp']:
                        print(f"  Target:  {zone['target_temp']}°C")
                    print(f"  Heating: {'ON' if zone['heating'] else 'OFF'} ({zone['heating_power']}%)")
                    if zone['overlay']:
                        print(f"  Mode:    Manual override ({zone['mode']})")
                    else:
                        print(f"  Mode:    Auto (following schedule)")
            elif "zone_id" in data and "current_temp" in data:
                # Single zone status
                print(f"\n🏠 {data['zone_name']} (Zone {data['zone_id']})")
                print(f"  Current: {data['current_temp']}°C ({data['current_humidity']}% humidity)")
                if data['target_temp']:
                    print(f"  Target:  {data['target_temp']}°C")
                print(f"  Heating: {'ON' if data['heating'] else 'OFF'} ({data['heating_power']}%)")
                if data['overlay']:
                    print(f"  Mode:    Manual override ({data['mode']})")
                else:
                    print(f"  Mode:    Auto (following schedule)")
            elif "devices" in data:
                # Presence info
                print(f"\n👥 Presence")
                print(f"  Anyone home: {'Yes' if data['anyone_home'] else 'No'}")
                for device in data["devices"]:
                    status = "🏠 Home" if device["home"] else "🚶 Away"
                    print(f"  - {device['name']}: {status}")
            elif "success" in data:
                # Action result
                if "temperature" in data:
                    duration_str = f" for {data['duration']} min" if data.get('duration') else " (permanent)"
                    print(f"✅ Set {data['zone_name']} to {data['temperature']}°C{duration_str}")
                elif "mode" in data and data["mode"] == "auto":
                    print(f"✅ Reset {data['zone_name']} to automatic schedule")
                else:
                    print(f"✅ Set mode to: {data.get('mode', 'unknown')}")
        else:
            print(data)


def main():
    parser = argparse.ArgumentParser(
        description="Tado Smart Thermostat CLI",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Get status of all zones
  %(prog)s status
  
  # Get status of specific zone
  %(prog)s status --zone 1
  %(prog)s status --zone "Woonkamer"
  
  # Set temperature
  %(prog)s set --zone 1 --temperature 21
  %(prog)s set --zone "Woonkamer" --temperature 22 --duration 60
  
  # Reset zone to auto schedule
  %(prog)s reset --zone 1
  
  # Set home/away mode
  %(prog)s mode home
  %(prog)s mode away
  %(prog)s mode auto
  
  # Check who is home
  %(prog)s presence
        """
    )
    
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    
    subparsers = parser.add_subparsers(dest="command", help="Command to execute")
    
    # Status command
    status_parser = subparsers.add_parser("status", help="Get zone status")
    status_parser.add_argument("--zone", help="Zone ID or name (default: all zones)")
    
    # Set temperature command
    set_parser = subparsers.add_parser("set", help="Set temperature")
    set_parser.add_argument("--zone", required=True, help="Zone ID or name")
    set_parser.add_argument("--temperature", "-t", type=float, required=True, help="Target temperature (°C)")
    set_parser.add_argument("--duration", "-d", type=int, help="Duration in minutes (optional)")
    
    # Reset command
    reset_parser = subparsers.add_parser("reset", help="Reset zone to auto schedule")
    reset_parser.add_argument("--zone", required=True, help="Zone ID or name")
    
    # Mode command
    mode_parser = subparsers.add_parser("mode", help="Set home/away mode")
    mode_parser.add_argument("mode", choices=["home", "away", "auto"], help="Mode to set")
    
    # Presence command
    subparsers.add_parser("presence", help="Check who is home")
    
    # Zones list command
    subparsers.add_parser("zones", help="List all zones")
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        sys.exit(1)
    
    # Initialize Tado client
    client = TadoClient()
    
    # Execute command
    if args.command == "status":
        zone_id = None
        if args.zone:
            zone_id = client.find_zone_id(args.zone)
            if zone_id is None:
                print(f"ERROR: Zone '{args.zone}' not found", file=sys.stderr)
                sys.exit(1)
        
        result = client.get_status(zone_id)
        format_output(result, args.json)
    
    elif args.command == "set":
        zone_id = client.find_zone_id(args.zone)
        if zone_id is None:
            print(f"ERROR: Zone '{args.zone}' not found", file=sys.stderr)
            sys.exit(1)
        
        result = client.set_temperature(zone_id, args.temperature, args.duration)
        format_output(result, args.json)
    
    elif args.command == "reset":
        zone_id = client.find_zone_id(args.zone)
        if zone_id is None:
            print(f"ERROR: Zone '{args.zone}' not found", file=sys.stderr)
            sys.exit(1)
        
        result = client.reset_zone(zone_id)
        format_output(result, args.json)
    
    elif args.command == "mode":
        result = client.set_home_mode(args.mode)
        format_output(result, args.json)
    
    elif args.command == "presence":
        result = client.get_presence()
        format_output(result, args.json)
    
    elif args.command == "zones":
        zones = client.get_zones()
        if args.json:
            print(json.dumps(zones, indent=2))
        else:
            print("\n📍 Available Zones:")
            for zone in zones:
                print(f"  {zone['id']}: {zone['name']} ({zone['type']})")


if __name__ == "__main__":
    main()
