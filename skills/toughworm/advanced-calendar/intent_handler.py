#!/home/ubuntu/.openclaw/workspace/skills/calendar/venv/bin/python3
"""
Intent handler for calendar events
Integrates with OpenClaw's natural language processing
"""

import re
import sys
from datetime import datetime, timedelta
from pathlib import Path
import subprocess
import json

def detect_calendar_intent(user_input):
    """
    Detect if user wants to create/update/delete calendar events
    """
    user_input_lower = user_input.lower()
    
    # Keywords for calendar intents
    create_keywords = ['创建', '新建', '安排', '添加', '增加', 'set up', 'create', 'make', 'add', 'schedule', 'plan', '安排', '会议', 'event', 'appointment', '提醒我', '记住']
    update_keywords = ['更新', '修改', '更改', 'change', 'update', 'modify', 'edit']
    delete_keywords = ['删除', '取消', 'remove', 'delete', 'cancel']
    list_keywords = ['查看', '显示', '列出', 'list', 'show', 'find', 'search', '查询']
    summary_keywords = ['今天日程', '今天安排', '今天有什么', '今日日程', '日程总结', 'daily summary', 'today schedule', 'what do i have today', '我今天', 'summary', '每日总结', '早上提醒', 'morning reminder', '设置每日提醒', 'schedule daily summary']
    
    intent = None
    confidence = 0
    
    # Check for daily summary intent first (more specific)
    for keyword in summary_keywords:
        if keyword in user_input_lower:
            intent = 'daily_summary'
            confidence = 0.9
            return intent, confidence
    
    # Check for create intent    for keyword in create_keywords:
        if keyword in user_input_lower:
            intent = 'create'
            confidence = 0.8
            break
    
    # Check for update intent
    for keyword in update_keywords:
        if keyword in user_input_lower:
            intent = 'update'
            confidence = 0.8
            break
    
    # Check for delete intent
    for keyword in delete_keywords:
        if keyword in user_input_lower:
            intent = 'delete'
            confidence = 0.8
            break
    
    # Check for list intent
    for keyword in list_keywords:
        if keyword in user_input_lower:
            intent = 'list'
            confidence = 0.7
            break
    
    return intent, confidence

def parse_datetime_from_text(text):
    """
    Simple date/time parser from natural language text
    """
    # Look for date patterns: YYYY-MM-DD, MM/DD, DD/MM, etc.
    date_patterns = [
        r'(\d{4}-\d{2}-\d{2})',  # YYYY-MM-DD
        r'(\d{1,2}/\d{1,2})',   # M/D or MM/DD
        r'(\d{1,2}-\d{1,2})',   # M-D or MM-DD
    ]
    
    time_patterns = [
        r'(\d{1,2}:\d{2}\s*(?:am|pm)?)',  # HH:MM or HH:MM am/pm
        r'(\d{1,2}(?:点|oclock))',        # HH o'clock or HH点
    ]
    
    date_match = None
    time_match = None
    
    for pattern in date_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            date_match = match.group(1)
            break
    
    for pattern in time_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            time_match = match.group(1)
            break
    
    # If no date found, assume today or tomorrow
    if not date_match:
        if 'tomorrow' in text.lower() or '明天' in text:
            date_match = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
        elif 'today' in text.lower() or '今天' in text:
            date_match = datetime.now().strftime('%Y-%m-%d')
        else:
            # Default to next day
            date_match = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
    
    # If no time found, default to 9:00 AM
    if not time_match:
        time_match = "09:00"
    
    # Normalize time format
    if '点' in time_match:
        hour = time_match.replace('点', '')
        time_match = f"{hour.zfill(2)}:00"
    
    return date_match, time_match

def parse_duration_from_text(text):
    """
    Parse duration from text (in minutes)
    """
    # Look for duration patterns
    duration_patterns = [
        r'(\d+)\s*(?:小时|hours?|h)',     # X hours
        r'(\d+)\s*(?:分钟|minutes?|min)', # X minutes
        r'(\d+)\s*(?:小时|hours?)\s*(\d+)\s*(?:分钟|minutes?)', # X hours Y minutes
    ]
    
    for pattern in duration_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            if len(match.groups()) == 2 and match.group(2):  # Hours and minutes
                hours = int(match.group(1))
                mins = int(match.group(2))
                return hours * 60 + mins
            else:  # Just one value
                value = int(match.group(1))
                # If it's less than 25, likely hours; otherwise probably minutes
                if value < 25 and ('小时' in pattern or 'hour' in pattern):
                    return value * 60
                else:
                    return value
    
    return 60  # Default to 60 minutes

def parse_reminder_from_text(text):
    """
    Parse reminder time from text (in minutes before event)
    """
    # Look for reminder patterns
    reminder_patterns = [
        r'(?:提前|before|in advance)\s*(\d+)\s*(?:分钟|minutes?|mins?)',
        r'(?:提前|before|in advance)\s*(\d+)\s*(?:小时|hours?|hrs?)',
        r'(?:提前|before|in advance)\s*(\d+)\s*(?:天|days?)',
    ]
    
    for pattern in reminder_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            value = int(match.group(1))
            if '小时' in pattern or 'hour' in pattern:
                return value * 60  # Convert hours to minutes
            elif '天' in pattern or 'day' in pattern:
                return value * 24 * 60  # Convert days to minutes
            else:
                return value  # Minutes
    
    # Default to asking user
    return None

def extract_location_from_text(text):
    """
    Extract location from text
    """
    location_patterns = [
        r'(?:在|at|in|location:)\s*([^.!,;]+?)(?:\.|!|,|;|$)',
        r'(?:去|to)\s*([^.!,;]+?)(?:\.|!|,|;|$)',
    ]
    
    for pattern in location_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            location = match.group(1).strip()
            # Remove common words that aren't locations
            if location.lower() not in ['the', 'a', 'an']:
                return location
    
    return ""

def get_daily_summary():
    """
    Get daily summary of today's events
    """
    cmd = [
        "/home/ubuntu/.openclaw/workspace/skills/calendar/scripts/calendar.sh",
        "daily-summary"
    ]
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode == 0:
            return {
                "success": True,
                "summary": result.stdout
            }
        else:
            return {
                "success": False,
                "error": result.stderr
            }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

def handle_calendar_intent(user_input, intent_type):
    """
    Handle calendar intents based on detected intent
    """
    if intent_type == 'daily_summary':
        # Get daily summary
        return get_daily_summary()
    
    elif intent_type == 'create':
        # Extract information from text
        date, time = parse_datetime_from_text(user_input)
        duration = parse_duration_from_text(user_input)
        reminder = parse_reminder_from_text(user_input)
        location = extract_location_from_text(user_input)
        
        # Use the rest of the text as title/description
        # Remove date, time, duration, location from text to get title
        title_candidates = [word.strip() for word in re.split(r'在|at|on|上午|下午|\d+:\d+|\d+[小时|分钟|天]', user_input) if len(word.strip()) > 2]
        title = title_candidates[0] if title_candidates else user_input[:50]
        
        # If we couldn't parse a reasonable title, use the whole input
        if not title or len(title.strip()) < 3:
            title = user_input[:50]
        
        # If no reminder was specified, return a query for it
        if reminder is None:
            return {
                "action": "request_reminder",
                "title": title,
                "date": date,
                "time": time,
                "duration": duration,
                "location": location,
                "description": user_input
            }
        else:
            # Create the event
            result = create_calendar_event(title, date, time, duration, location, user_input, reminder)
            return result
    
    elif intent_type == 'list':
        # List upcoming events
        return list_calendar_events()
    
    else:
        return {"error": f"Intent {intent_type} not fully implemented yet"}

def create_calendar_event(title, date, time, duration, location, description, reminder):
    """
    Create a calendar event using the existing script
    """
    cmd = [
        "/home/ubuntu/.openclaw/workspace/skills/calendar/scripts/calendar.sh",
        "create",
        "--title", title,
        "--date", date,
        "--time", time,
        "--duration", str(duration),
        "--reminder", str(reminder)
    ]
    
    if location:
        cmd.extend(["--location", location])
    
    cmd.extend(["--description", description])
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode == 0:
            return {
                "success": True,
                "message": f"已创建事件：{title}",
                "details": f"时间：{date} {time}，持续：{duration}分钟，提醒：{reminder}分钟前"
            }
        else:
            return {
                "success": False,
                "error": result.stderr
            }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

def list_calendar_events():
    """
    List upcoming calendar events
    """
    cmd = [
        "/home/ubuntu/.openclaw/workspace/skills/calendar/scripts/calendar.sh",
        "list",
        "--days", "7"
    ]
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode == 0:
            return {
                "success": True,
                "events": result.stdout
            }
        else:
            return {
                "success": False,
                "error": result.stderr
            }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

def main():
    """
    Main function to handle calendar intent processing
    """
    if len(sys.argv) < 2:
        print("Usage: intent_handler.py \"user input text\"")
        return
    
    user_input = sys.argv[1]
    
    # Detect intent
    intent, confidence = detect_calendar_intent(user_input)
    
    if intent and confidence > 0.6:
        result = handle_calendar_intent(user_input, intent)
        print(json.dumps(result, ensure_ascii=False))
    else:
        print(json.dumps({"error": "No calendar intent detected"}))

if __name__ == "__main__":
    main()