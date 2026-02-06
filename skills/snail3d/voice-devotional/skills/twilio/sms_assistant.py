#!/usr/bin/env python3
"""Smart SMS assistant - parses messages and takes actions on Eric's behalf."""

import json
import os
import re
import subprocess
import sys
from datetime import datetime, timedelta
from pathlib import Path

# Configuration
ALLOWED_SENDERS = ["+19153097085"]  # Magda's number
DELEGATION_MODE = "confirm"  # "confirm" = ask Eric first, "auto" = just do it
ADMIN_NUMBER = "+19157308926"  # Eric's number for confirmations

# Load credentials from environment
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_PHONE = os.getenv("TWILIO_PHONE_NUMBER", "+19152237302")


def send_sms(to_number, message):
    """Send SMS via Twilio."""
    from twilio.rest import Client
    client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    
    try:
        msg = client.messages.create(
            body=message,
            to=to_number,
            from_=TWILIO_PHONE
        )
        return msg.sid
    except Exception as e:
        print(f"Error sending SMS: {e}")
        return None


def parse_date(date_str):
    """Parse various date formats."""
    today = datetime.now()
    
    # Handle "tomorrow"
    if "tomorrow" in date_str.lower():
        return (today + timedelta(days=1)).strftime("%Y-%m-%d")
    
    # Handle "today"
    if "today" in date_str.lower():
        return today.strftime("%Y-%m-%d")
    
    # Handle "next week"
    if "next week" in date_str.lower():
        return (today + timedelta(days=7)).strftime("%Y-%m-%d")
    
    # Handle "Monday", "Tuesday", etc.
    days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
    for i, day in enumerate(days):
        if day in date_str.lower():
            target_day = i
            current_day = today.weekday()
            days_ahead = (target_day - current_day) % 7
            if days_ahead == 0:
                days_ahead = 7  # Next week if today
            return (today + timedelta(days=days_ahead)).strftime("%Y-%m-%d")
    
    return None


def parse_time(time_str):
    """Parse time from string."""
    # Try 3:00 PM, 3pm, 15:00 formats
    patterns = [
        r'(\d{1,2}):(\d{2})\s*(am|pm)',
        r'(\d{1,2})\s*(am|pm)',
        r'(\d{1,2}):(\d{2})',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, time_str, re.IGNORECASE)
        if match:
            groups = match.groups()
            if len(groups) == 3:  # HH:MM AM/PM
                hour, minute, period = groups
                hour = int(hour)
                minute = int(minute)
                if period.lower() == 'pm' and hour != 12:
                    hour += 12
                elif period.lower() == 'am' and hour == 12:
                    hour = 0
                return f"{hour:02d}:{minute:02d}"
            elif len(groups) == 2 and groups[1].lower() in ['am', 'pm']:  # H AM/PM
                hour, period = groups
                hour = int(hour)
                if period.lower() == 'pm' and hour != 12:
                    hour += 12
                elif period.lower() == 'am' and hour == 12:
                    hour = 0
                return f"{hour:02d}:00"
            elif len(groups) == 2:  # HH:MM 24hr
                return f"{groups[0]}:{groups[1]}"
    
    return None


class CommandParser:
    """Parse natural language into structured commands."""
    
    def __init__(self, message, sender):
        self.message = message.lower()
        self.sender = sender
        self.original = message
    
    def parse(self):
        """Main entry point - returns command dict or None."""
        
        # Calendar commands
        if any(word in self.message for word in ["add to calendar", "schedule", "put on calendar", "remind eric"]):
            return self.parse_calendar_command()
        
        # Task/Things commands
        if any(word in self.message for word in ["add task", "todo", "remind eric to", "tell eric to"]):
            return self.parse_task_command()
        
        # Note/message commands
        if any(word in self.message for word in ["tell eric", "let eric know", "message eric"]):
            return self.parse_note_command()
        
        # Status/check commands
        if any(word in self.message for word in ["where is eric", "what is eric doing", "eric status"]):
            return {"type": "status_check", "message": self.original}
        
        return None
    
    def parse_calendar_command(self):
        """Parse calendar add commands."""
        # Remove command words
        text = self.original
        for phrase in ["add to calendar", "put on calendar", "schedule", "remind eric"]:
            text = text.replace(phrase, "").replace(phrase.title(), "")
        
        # Extract date
        date = parse_date(self.message)
        if not date:
            date = datetime.now().strftime("%Y-%m-%d")  # Default to today
        
        # Extract time
        time = parse_time(self.message)
        if not time:
            time = "09:00"  # Default to 9am
        
        # Clean up the event title
        title = text.strip()
        title = re.sub(r'\s+', ' ', title)  # Normalize whitespace
        title = re.sub(r'\s*(at|on|for)\s+\d{1,2}:\d{2}.*$', '', title, flags=re.IGNORECASE)  # Remove time
        title = re.sub(r'\s*(tomorrow|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday).*$', '', title, flags=re.IGNORECASE)  # Remove date
        title = title.strip()
        
        return {
            "type": "calendar",
            "title": title or "Event from Magda",
            "date": date,
            "time": time,
            "original": self.original
        }
    
    def parse_task_command(self):
        """Parse task/todo commands."""
        text = self.original
        
        # Remove command words
        for phrase in ["add task", "add a task", "todo:", "tell eric to", "remind eric to"]:
            text = text.replace(phrase, "").replace(phrase.title(), "")
        
        # Check for due date
        due_date = parse_date(self.message)
        
        # Clean title
        title = text.strip()
        title = re.sub(r'\s+', ' ', title)
        
        return {
            "type": "task",
            "title": title,
            "due_date": due_date,
            "original": self.original
        }
    
    def parse_note_command(self):
        """Parse note/message commands."""
        text = self.original
        
        # Remove command words
        for phrase in ["tell eric", "let eric know", "message eric", "remind eric"]:
            text = text.replace(phrase, "").replace(phrase.title(), "")
        
        return {
            "type": "note",
            "message": text.strip(),
            "original": self.original
        }


class ActionExecutor:
    """Execute parsed commands."""
    
    def __init__(self):
        self.results = []
    
    def execute(self, command, sender):
        """Execute a command and return result."""
        cmd_type = command.get("type")
        
        if cmd_type == "calendar":
            return self.add_to_calendar(command, sender)
        elif cmd_type == "task":
            return self.add_task(command, sender)
        elif cmd_type == "note":
            return self.send_note(command, sender)
        elif cmd_type == "status_check":
            return self.check_status(command, sender)
        
        return {"success": False, "message": "Unknown command type"}
    
    def add_to_calendar(self, cmd, sender):
        """Add event to Google Calendar via gog."""
        try:
            # Build datetime
            datetime_str = f"{cmd['date']} {cmd['time']}"
            
            # Use gog to create calendar event
            result = subprocess.run(
                ["gog", "calendar", "create", 
                 "--title", cmd['title'],
                 "--start", datetime_str,
                 "--duration", "60"],  # Default 1 hour
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode == 0:
                return {
                    "success": True,
                    "message": f"✅ Added '{cmd['title']}' to Eric's calendar on {cmd['date']} at {cmd['time']}",
                    "details": cmd
                }
            else:
                # Fallback: save to pending actions for Eric to confirm
                self.save_pending_action(cmd, sender)
                return {
                    "success": True,  # We saved it
                    "message": f"⏳ Saved '{cmd['title']}' for Eric to confirm (calendar command failed)",
                    "needs_confirm": True
                }
                
        except Exception as e:
            self.save_pending_action(cmd, sender)
            return {
                "success": True,
                "message": f"⏳ Saved '{cmd['title']}' for Eric to confirm",
                "needs_confirm": True
            }
    
    def add_task(self, cmd, sender):
        """Add task to Things via things CLI."""
        try:
            # Use things CLI if available
            args = ["things", "add", cmd['title']]
            if cmd.get('due_date'):
                args.extend(["--due", cmd['due_date']])
            
            result = subprocess.run(
                args,
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode == 0:
                due_info = f" (due {cmd['due_date']})" if cmd.get('due_date') else ""
                return {
                    "success": True,
                    "message": f"✅ Added task '{cmd['title']}'{due_info} to Eric's Things",
                    "details": cmd
                }
            else:
                # Fallback
                self.save_pending_action(cmd, sender)
                return {
                    "success": True,
                    "message": f"⏳ Saved task '{cmd['title']}' for Eric to confirm",
                    "needs_confirm": True
                }
                
        except Exception as e:
            self.save_pending_action(cmd, sender)
            return {
                "success": True,
                "message": f"⏳ Saved task '{cmd['title']}' for Eric to confirm",
                "needs_confirm": True
            }
    
    def send_note(self, cmd, sender):
        """Send a note/message to Eric via Telegram."""
        try:
            # Use clawdbot message tool to send to Eric
            note = f"📱 Message from Magda:\n\n{cmd['message']}"
            
            # Save to notes file for Eric to see
            notes_file = Path.home() / "clawd" / "skills" / "twilio" / "magda_notes.txt"
            with open(notes_file, "a") as f:
                f.write(f"\n[{datetime.now().strftime('%Y-%m-%d %H:%M')}] {cmd['message']}\n")
            
            return {
                "success": True,
                "message": f"✅ Message saved for Eric: '{cmd['message'][:50]}...'" if len(cmd['message']) > 50 else f"✅ Message saved for Eric: '{cmd['message']}'",
                "details": cmd
            }
            
        except Exception as e:
            return {
                "success": False,
                "message": f"Failed to save note: {e}"
            }
    
    def check_status(self, cmd, sender):
        """Check Eric's status (calendar, location, etc.)."""
        return {
            "success": True,
            "message": "ℹ️ I can't check Eric's real-time status yet, but I'll let him know you asked.",
            "details": cmd
        }
    
    def save_pending_action(self, command, sender):
        """Save action for manual confirmation."""
        pending_file = Path.home() / "clawd" / "skills" / "twilio" / "pending_actions.json"
        
        pending = []
        if pending_file.exists():
            with open(pending_file, "r") as f:
                pending = json.load(f)
        
        pending.append({
            "timestamp": datetime.now().isoformat(),
            "from": sender,
            "command": command
        })
        
        with open(pending_file, "w") as f:
            json.dump(pending, f, indent=2)


def process_sms(sender, body):
    """Main entry point - process an incoming SMS."""
    
    # Check if sender is authorized
    if sender not in ALLOWED_SENDERS:
        return {
            "success": False,
            "reply": "Sorry, I'm not authorized to take actions for you. Please contact Eric to get access."
        }
    
    # Parse the command
    parser = CommandParser(body, sender)
    command = parser.parse()
    
    if not command:
        # No command recognized - could be a regular conversation
        return {
            "success": True,
            "reply": f"Hi! I understood: '{body[:100]}...' but I'm not sure what you'd like me to do. Try:\n\n• 'Add to calendar: Dinner Friday at 7pm'\n• 'Remind Eric to call mom tomorrow'\n• 'Tell Eric the package arrived'",
            "action": None
        }
    
    # Execute the command
    executor = ActionExecutor()
    result = executor.execute(command, sender)
    
    # Build reply
    if result.get("needs_confirm"):
        reply = f"{result['message']}\n\n(Eric will confirm this shortly)"
    else:
        reply = result['message']
    
    return {
        "success": result['success'],
        "reply": reply,
        "action": command
    }


if __name__ == "__main__":
    # Test mode
    if len(sys.argv) > 1:
        test_message = " ".join(sys.argv[1:])
        result = process_sms("+19153097085", test_message)
        print(json.dumps(result, indent=2))
    else:
        # Interactive test
        print("SMS Assistant Test Mode")
        print("Enter messages (or 'quit' to exit):\n")
        while True:
            msg = input("> ")
            if msg.lower() == 'quit':
                break
            result = process_sms("+19153097085", msg)
            print(f"\nReply: {result['reply']}\n")
