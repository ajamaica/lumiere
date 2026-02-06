#!/usr/bin/env python3
"""
Mock test for Tado CLI
Tests the CLI interface without actual Tado API calls
"""

import json
import sys
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))


def create_mock_tado():
    """Create a mock Tado client with realistic responses"""
    mock = Mock()
    
    # Mock zones
    mock.get_zones.return_value = [
        {"id": 1, "name": "Woonkamer", "type": "HEATING"},
        {"id": 2, "name": "Slaapkamer", "type": "HEATING"},
        {"id": 3, "name": "Badkamer", "type": "HOT_WATER"},
    ]
    
    # Mock state for zone 1 (heating on)
    mock.get_state.return_value = {
        "sensorDataPoints": {
            "insideTemperature": {"celsius": 20.5},
            "humidity": {"percentage": 55},
        },
        "setting": {
            "temperature": {"celsius": 21.0},
        },
        "activityDataPoints": {
            "heatingPower": {"percentage": 45},
        },
        "overlayType": "MANUAL",
        "overlay": {"type": "MANUAL"},
    }
    
    # Mock mobile devices (presence)
    mock.get_devices.return_value = [
        {
            "name": "Sander's iPhone",
            "deviceType": "GW03",
            "location": {"atHome": True},
        },
        {
            "name": "Partner's iPhone",
            "deviceType": "GW03",
            "location": {"atHome": False},
        },
    ]
    
    # Mock temperature setting
    mock.set_temperature.return_value = None
    mock.end_manual_control.return_value = None
    
    # Mock home/away modes
    mock.set_home_state.return_value = None
    
    return mock


def test_status_all_zones():
    """Test getting status of all zones"""
    print("\n🧪 Test: Status all zones")
    
    with patch('tado.Tado', return_value=create_mock_tado()):
        # Import after patching
        import tado
        
        client = tado.TadoClient()
        result = client.get_status()
        
        assert "zones" in result
        assert len(result["zones"]) > 0
        
        print("✅ Pass: Got status for all zones")
        print(f"   Found {len(result['zones'])} zones")
        
        # Test formatting
        tado.format_output(result, json_output=False)
        print()


def test_status_single_zone():
    """Test getting status of a single zone"""
    print("\n🧪 Test: Status single zone")
    
    with patch('tado.Tado', return_value=create_mock_tado()):
        import tado
        
        client = tado.TadoClient()
        result = client.get_status(zone_id=1)
        
        assert result["zone_id"] == 1
        assert "current_temp" in result
        assert "target_temp" in result
        assert "heating" in result
        
        print("✅ Pass: Got status for zone 1")
        print(f"   Current: {result['current_temp']}°C")
        print(f"   Target: {result['target_temp']}°C")
        print(f"   Heating: {result['heating']}")
        
        # Test formatting
        tado.format_output(result, json_output=False)
        print()


def test_find_zone_by_name():
    """Test finding zone by name"""
    print("\n🧪 Test: Find zone by name")
    
    with patch('tado.Tado', return_value=create_mock_tado()):
        import tado
        
        client = tado.TadoClient()
        
        # Test finding by name
        zone_id = client.find_zone_id("Woonkamer")
        assert zone_id == 1
        print("✅ Pass: Found 'Woonkamer' as zone 1")
        
        # Test case-insensitive
        zone_id = client.find_zone_id("woonkamer")
        assert zone_id == 1
        print("✅ Pass: Case-insensitive search works")
        
        # Test non-existent zone
        zone_id = client.find_zone_id("NonExistent")
        assert zone_id is None
        print("✅ Pass: Non-existent zone returns None")
        print()


def test_set_temperature():
    """Test setting temperature"""
    print("\n🧪 Test: Set temperature")
    
    with patch('tado.Tado', return_value=create_mock_tado()):
        import tado
        
        client = tado.TadoClient()
        
        # Test without duration
        result = client.set_temperature(1, 21.0)
        assert result["success"] == True
        assert result["temperature"] == 21.0
        assert result["duration"] is None
        print("✅ Pass: Set temperature without timer")
        
        # Test with duration
        result = client.set_temperature(1, 22.0, duration=60)
        assert result["success"] == True
        assert result["temperature"] == 22.0
        assert result["duration"] == 60
        print("✅ Pass: Set temperature with 60 min timer")
        
        # Test formatting
        tado.format_output(result, json_output=False)
        print()


def test_presence():
    """Test presence detection"""
    print("\n🧪 Test: Presence detection")
    
    with patch('tado.Tado', return_value=create_mock_tado()):
        import tado
        
        client = tado.TadoClient()
        result = client.get_presence()
        
        assert "devices" in result
        assert "anyone_home" in result
        assert result["anyone_home"] == True  # Sander's iPhone is home
        assert len(result["devices"]) == 2
        
        print("✅ Pass: Got presence info")
        print(f"   Anyone home: {result['anyone_home']}")
        print(f"   Devices: {len(result['devices'])}")
        
        # Test formatting
        tado.format_output(result, json_output=False)
        print()


def test_modes():
    """Test home/away modes"""
    print("\n🧪 Test: Home/Away modes")
    
    with patch('tado.Tado', return_value=create_mock_tado()):
        import tado
        
        client = tado.TadoClient()
        
        # Test home mode
        result = client.set_home_mode("home")
        assert result["success"] == True
        assert result["mode"] == "home"
        print("✅ Pass: Set home mode")
        
        # Test away mode
        result = client.set_home_mode("away")
        assert result["success"] == True
        assert result["mode"] == "away"
        print("✅ Pass: Set away mode")
        
        # Test auto mode
        result = client.set_home_mode("auto")
        assert result["success"] == True
        assert result["mode"] == "auto"
        print("✅ Pass: Set auto mode")
        print()


def test_json_output():
    """Test JSON output formatting"""
    print("\n🧪 Test: JSON output")
    
    with patch('tado.Tado', return_value=create_mock_tado()):
        import tado
        
        client = tado.TadoClient()
        result = client.get_status(zone_id=1)
        
        # Test JSON formatting
        print("JSON output:")
        tado.format_output(result, json_output=True)
        
        # Verify it's valid JSON
        json_str = json.dumps(result)
        parsed = json.loads(json_str)
        assert parsed["zone_id"] == 1
        
        print("\n✅ Pass: JSON output is valid")
        print()


def test_reset_zone():
    """Test resetting zone to auto"""
    print("\n🧪 Test: Reset zone to auto")
    
    with patch('tado.Tado', return_value=create_mock_tado()):
        import tado
        
        client = tado.TadoClient()
        result = client.reset_zone(1)
        
        assert result["success"] == True
        assert result["mode"] == "auto"
        
        print("✅ Pass: Reset zone to auto schedule")
        
        # Test formatting
        tado.format_output(result, json_output=False)
        print()


def main():
    """Run all tests"""
    print("\n" + "="*60)
    print("🧪 Tado CLI Mock Tests")
    print("="*60)
    
    # Create mock credentials
    mock_creds = {
        "username": "test@example.com",
        "password": "test123",
    }
    
    with patch.dict('os.environ', {
        'TADO_USERNAME': mock_creds['username'],
        'TADO_PASSWORD': mock_creds['password'],
    }):
        try:
            test_status_all_zones()
            test_status_single_zone()
            test_find_zone_by_name()
            test_set_temperature()
            test_presence()
            test_modes()
            test_json_output()
            test_reset_zone()
            
            print("="*60)
            print("✅ All tests passed!")
            print("="*60)
            print("\nThe Tado CLI is working correctly with mock data.")
            print("To use with real Tado device, configure credentials:")
            print("  - Create ~/.tado_credentials.json, or")
            print("  - Set TADO_USERNAME and TADO_PASSWORD env vars")
            print()
            
        except Exception as e:
            print(f"\n❌ Test failed: {e}")
            import traceback
            traceback.print_exc()
            sys.exit(1)


if __name__ == "__main__":
    main()
