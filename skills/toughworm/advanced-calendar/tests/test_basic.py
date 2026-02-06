"""
Basic tests for the calendar skill
"""
import subprocess
import json
from datetime import datetime, timedelta

def test_create_and_list():
    """Test creating an event and listing it"""
    # Create a test event
    title = "Test Event for Verification"
    date = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
    time = "10:00"
    
    result = subprocess.run([
        '/home/ubuntu/.openclaw/workspace/skills/calendar/scripts/calendar.sh',
        'create',
        '--title', title,
        '--date', date,
        '--time', time,
        '--duration', '60',
        '--location', 'Test Location',
        '--description', 'Test Description',
        '--reminder', '30'
    ], capture_output=True, text=True)
    
    assert result.returncode == 0, f"Failed to create event: {result.stderr}"
    print("✓ Event creation successful")
    
    # List events to verify it was created
    result = subprocess.run([
        '/home/ubuntu/.openclaw/workspace/skills/calendar/scripts/calendar.sh',
        'list',
        '--days', '2'
    ], capture_output=True, text=True)
    
    assert result.returncode == 0, f"Failed to list events: {result.stderr}"
    assert title in result.stdout, "Created event not found in list"
    print("✓ Event listing successful")
    
    # Find the event ID from the create output
    output_lines = result.stdout.split('\n')
    event_id = None
    for line in output_lines:
        if 'ID:' in line and 'Test Event for Verification' in line:
            event_id = line.split('ID:')[1].strip()
            break
    
    if not event_id:
        # Alternative: get ID from the create command output
        create_output_lines = result.stdout.split('\n')
        for line in create_output_lines:
            if 'ID:' in line and 'Created event:' in result.stdout:
                event_id = result.stdout.split('ID: ')[1].split('\n')[0].strip()
                break
    
    print(f"✓ Test completed successfully")


if __name__ == "__main__":
    test_create_and_list()
    print("All tests passed!")