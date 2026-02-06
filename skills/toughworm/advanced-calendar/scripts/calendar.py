#!/home/ubuntu/.openclaw/workspace/skills/calendar/venv/bin/python3
"""
Simple Calendar Skill for OpenClaw
Manages calendar events and reminders without external dependencies
"""

import json
import os
import sys
import argparse
from datetime import datetime, timedelta
from pathlib import Path

# Define storage location
CALENDAR_DIR = Path(os.path.expanduser("~/.openclaw/calendar"))
EVENTS_FILE = CALENDAR_DIR / "events.json"

def ensure_storage():
    """Ensure calendar storage directory and file exist"""
    CALENDAR_DIR.mkdir(parents=True, exist_ok=True)
    
    if not EVENTS_FILE.exists():
        with EVENTS_FILE.open('w') as f:
            json.dump([], f)

def load_events():
    """Load events from storage"""
    ensure_storage()
    with EVENTS_FILE.open('r') as f:
        return json.load(f)

def save_events(events):
    """Save events to storage"""
    with EVENTS_FILE.open('w') as f:
        json.dump(events, f, indent=2)

def generate_event_id():
    """Generate a simple unique ID for events"""
    return str(int(datetime.now().timestamp() * 1000))

def create_event(title, date_str, time_str, duration=None, location=None, description=None, reminder=None):
    """Create a new calendar event"""
    event_id = generate_event_id()
    
    # Parse date and time
    dt = datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H:%M")
    
    event = {
        "id": event_id,
        "title": title,
        "datetime": dt.isoformat(),
        "date": date_str,
        "time": time_str,
        "duration": duration,
        "location": location,
        "description": description,
        "reminder_minutes": reminder
    }
    
    events = load_events()
    events.append(event)
    save_events(events)
    
    print(f"Created event: {event['title']}")
    print(f"ID: {event['id']}")
    print(f"When: {event['date']} at {event['time']}")
    if location:
        print(f"Location: {location}")
    if reminder:
        print(f"Reminder: {reminder} minutes before")
    
    return event

def list_events(days=7, from_date=None, to_date=None):
    """List upcoming events"""
    events = load_events()
    
    # Filter events
    now = datetime.now()
    filtered_events = []
    
    for event in events:
        event_dt = datetime.fromisoformat(event['datetime'])
        
        # If from_date and to_date are specified, filter within range
        if from_date and to_date:
            from_dt = datetime.strptime(from_date, "%Y-%m-%d")
            to_dt = datetime.strptime(to_date, "%Y-%m-%d") + timedelta(days=1)  # Include end date
            
            if not (from_dt <= event_dt < to_dt):
                continue
        elif days:
            # Otherwise, show events within specified days
            if event_dt < now or event_dt > now + timedelta(days=days):
                continue
        
        filtered_events.append(event)
    
    # Sort by date/time
    filtered_events.sort(key=lambda x: x['datetime'])
    
    if not filtered_events:
        print("No events found.")
        return
    
    print(f"Found {len(filtered_events)} upcoming event(s):")
    print("-" * 50)
    
    for i, event in enumerate(filtered_events, 1):
        event_dt = datetime.fromisoformat(event['datetime'])
        formatted_time = event_dt.strftime("%a, %b %d, %Y at %I:%M %p")
        
        print(f"{i}. {event['title']}")
        print(f"   When: {formatted_time}")
        if event.get('location'):
            print(f"   Location: {event['location']}")
        if event.get('description'):
            print(f"   Description: {event['description'][:50]}{'...' if len(event['description']) > 50 else ''}")
        if event.get('reminder_minutes'):
            print(f"   Reminder: {event['reminder_minutes']} min before")
        print(f"   ID: {event['id']}")
        print()

def get_event(event_id):
    """Get details of a specific event"""
    events = load_events()
    
    for event in events:
        if event['id'] == event_id:
            event_dt = datetime.fromisoformat(event['datetime'])
            formatted_time = event_dt.strftime("%a, %b %d, %Y at %I:%M %p")
            
            print(f"Title: {event['title']}")
            print(f"When: {formatted_time}")
            if event.get('duration'):
                print(f"Duration: {event['duration']} minutes")
            if event.get('location'):
                print(f"Location: {event['location']}")
            if event.get('description'):
                print(f"Description: {event['description']}")
            if event.get('reminder_minutes'):
                print(f"Reminder: {event['reminder_minutes']} minutes before")
            print(f"ID: {event['id']}")
            return event
    
    print(f"Event with ID {event_id} not found.")
    return None

def update_event(event_id, **updates):
    """Update an existing event"""
    events = load_events()
    
    for i, event in enumerate(events):
        if event['id'] == event_id:
            # Update the event with provided values
            for key, value in updates.items():
                if value is not None:  # Only update if a value was provided
                    event[key] = value
            
            # If date or time changed, update the datetime field
            if 'date' in updates or 'time' in updates:
                date = updates.get('date', event['date'])
                time = updates.get('time', event['time'])
                dt = datetime.strptime(f"{date} {time}", "%Y-%m-%d %H:%M")
                event['datetime'] = dt.isoformat()
            
            save_events(events)
            print(f"Updated event: {event['title']}")
            return event
    
    print(f"Event with ID {event_id} not found.")
    return None

def delete_event(event_id):
    """Delete an event"""
    events = load_events()
    original_count = len(events)
    
    events = [event for event in events if event['id'] != event_id]
    
    if len(events) == original_count:
        print(f"Event with ID {event_id} not found.")
        return False
    
    save_events(events)
    print(f"Deleted event with ID: {event_id}")
    return True

def daily_summary():
    """Generate daily summary of today's events"""
    today = datetime.now()
    today_str = today.strftime("%Y-%m-%d")
    weekday_names = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]
    weekday = weekday_names[today.weekday()]
    
    events = load_events()
    today_events = [e for e in events if e.get('date') == today_str]
    today_events.sort(key=lambda x: x.get('time', '00:00'))
    
    # Format date in Chinese
    formatted_date = today.strftime("%Y年%m月%d日")
    
    if not today_events:
        return {
            "date": formatted_date,
            "weekday": weekday,
            "count": 0,
            "events": [],
            "message": f"📅 {formatted_date} {weekday}\n\n今天没有安排任何日程，祝您有愉快的一天！"
        }
    
    event_list = []
    for event in today_events:
        event_info = {
            "title": event.get('title', '未命名'),
            "time": event.get('time', '全天'),
            "location": event.get('location', ''),
            "description": event.get('description', '')
        }
        event_list.append(event_info)
    
    # Build message
    message = f"📅 {formatted_date} {weekday}\n"
    message += f"\n今日共有 {len(today_events)} 个日程：\n"
    
    for i, event in enumerate(today_events, 1):
        time = event.get('time', '全天')
        title = event.get('title', '未命名')
        location = event.get('location', '')
        description = event.get('description', '')
        
        message += f"\n{i}. {title}"
        message += f"\n   ⏰ {time}"
        if location:
            message += f"\n   📍 {location}"
        if description and description != title:
            desc = description[:50] + '...' if len(description) > 50 else description
            message += f"\n   📝 {desc}"
    
    message += "\n\n祝您今天顺利！"
    
    return {
        "date": formatted_date,
        "weekday": weekday,
        "count": len(today_events),
        "events": event_list,
        "message": message
    }

def main():
    parser = argparse.ArgumentParser(description='Calendar management tool')
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # List command
    list_parser = subparsers.add_parser('list', help='List upcoming events')
    list_parser.add_argument('--days', type=int, default=7, help='Number of days to look ahead (default: 7)')
    list_parser.add_argument('--from-date', dest='from_date', help='Start date (YYYY-MM-DD)')
    list_parser.add_argument('--to-date', dest='to_date', help='End date (YYYY-MM-DD)')
    
    # Create command
    create_parser = subparsers.add_parser('create', help='Create a new event')
    create_parser.add_argument('--title', required=True, help='Event title')
    create_parser.add_argument('--date', required=True, help='Event date (YYYY-MM-DD)')
    create_parser.add_argument('--time', required=True, help='Event time (HH:MM)')
    create_parser.add_argument('--duration', type=int, help='Event duration in minutes')
    create_parser.add_argument('--location', help='Event location')
    create_parser.add_argument('--description', help='Event description')
    create_parser.add_argument('--reminder', type=int, help='Reminder minutes before event')
    
    # Get command
    get_parser = subparsers.add_parser('get', help='Get event details')
    get_parser.add_argument('--id', required=True, help='Event ID')
    
    # Update command
    update_parser = subparsers.add_parser('update', help='Update an event')
    update_parser.add_argument('--id', required=True, help='Event ID')
    update_parser.add_argument('--title', help='New title')
    update_parser.add_argument('--date', help='New date (YYYY-MM-DD)')
    update_parser.add_argument('--time', help='New time (HH:MM)')
    update_parser.add_argument('--duration', type=int, help='New duration in minutes')
    update_parser.add_argument('--location', help='New location')
    update_parser.add_argument('--description', help='New description')
    update_parser.add_argument('--reminder', type=int, help='New reminder minutes')
    
    # Delete command
    delete_parser = subparsers.add_parser('delete', help='Delete an event')
    delete_parser.add_argument('--id', required=True, help='Event ID')
    
    # Daily summary command
    summary_parser = subparsers.add_parser('daily-summary', help='Show daily summary of today\'s events')
    
    args = parser.parse_args()
    
    if args.command == 'list':
        list_events(args.days, args.from_date, args.to_date)
    elif args.command == 'create':
        create_event(
            title=args.title,
            date_str=args.date,
            time_str=args.time,
            duration=args.duration,
            location=args.location,
            description=args.description,
            reminder=args.reminder
        )
    elif args.command == 'get':
        get_event(args.id)
    elif args.command == 'update':
        update_event(
            event_id=args.id,
            title=args.title,
            date=args.date,
            time=args.time,
            duration=args.duration,
            location=args.location,
            description=args.description,
            reminder=args.reminder
        )
    elif args.command == 'delete':
        delete_event(args.id)
    elif args.command == 'daily-summary':
        result = daily_summary()
        print(result['message'])
    else:
        parser.print_help()

if __name__ == "__main__":
    main()