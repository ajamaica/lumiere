#!/usr/bin/env python3
"""
WHOOP Morning Check
Automated script to check sleep quality and adjust assistant behavior
Can be run via cron or OpenClaw cron jobs
"""

import sys
import os
import json
from datetime import datetime

# Add the scripts directory to path to import whoop_client
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from whoop_client import WhoopClient

def create_behavior_context(summary: dict) -> dict:
    """Create behavior context based on sleep summary"""
    context = {
        'sleep_status': summary['status'],
        'sleep_performance': summary['sleep_performance'],
        'recovery_score': summary['recovery_score'],
        'behavior_mode': 'normal',
        'communication_style': 'normal',
        'energy_level': 'medium',
        'task_complexity': 'normal',
        'recommendations': []
    }
    
    performance = summary['sleep_performance'] or 0
    recovery = summary['recovery_score'] or 50
    
    if performance >= 90 and recovery >= 80:
        context.update({
            'behavior_mode': 'high_energy',
            'communication_style': 'enthusiastic',
            'energy_level': 'high',
            'task_complexity': 'advanced',
            'recommendations': [
                'Perfect time for challenging projects!',
                'Consider tackling complex tasks today',
                'High productivity window detected'
            ]
        })
    elif performance >= 80:
        context.update({
            'behavior_mode': 'optimistic',
            'communication_style': 'positive',
            'energy_level': 'good',
            'task_complexity': 'normal',
            'recommendations': [
                'Good energy for regular tasks',
                'Balanced approach recommended'
            ]
        })
    elif performance >= 70:
        context.update({
            'behavior_mode': 'steady',
            'communication_style': 'supportive',
            'energy_level': 'moderate',
            'task_complexity': 'light',
            'recommendations': [
                'Take it easy with lighter tasks',
                'Focus on routine activities'
            ]
        })
    else:
        context.update({
            'behavior_mode': 'gentle',
            'communication_style': 'caring',
            'energy_level': 'low',
            'task_complexity': 'minimal',
            'recommendations': [
                'Prioritize rest and recovery',
                'Light tasks only',
                'Consider postponing complex work'
            ]
        })
    
    return context

def save_daily_context(context: dict, summary: dict):
    """Save behavior context for the day"""
    today = datetime.now().strftime('%Y-%m-%d')
    
    # Save to workspace memory
    memory_dir = os.path.expanduser('~/.openclaw/workspace/memory')
    os.makedirs(memory_dir, exist_ok=True)
    
    daily_file = f"{memory_dir}/{today}.md"
    
    # Append or create daily memory entry
    whoop_entry = f"""
## 🏃‍♀️ WHOOP Morning Check ({datetime.now().strftime('%H:%M')})

**Sleep Performance:** {summary['sleep_performance']}% ({summary['status'].upper()})
**Recovery Score:** {summary['recovery_score']}
**Sleep Duration:** {summary['sleep_duration_hours']}h
**Message:** {summary['message']}

**Behavior Mode:** `{context['behavior_mode']}`
**Communication:** {context['communication_style']}
**Energy Level:** {context['energy_level']}

**Today's Recommendations:**
{chr(10).join(f"- {rec}" for rec in context['recommendations'])}

---
"""
    
    # Read existing content if file exists
    existing_content = ""
    if os.path.exists(daily_file):
        with open(daily_file, 'r') as f:
            existing_content = f.read()
    
    # Write updated content
    with open(daily_file, 'w') as f:
        if existing_content:
            f.write(existing_content)
        else:
            f.write(f"# {today} — Daily Memory\n")
        f.write(whoop_entry)
    
    # Also save behavior context as JSON for programmatic access
    context_file = f"{memory_dir}/whoop_context.json"
    context_data = {
        'date': today,
        'timestamp': datetime.now().isoformat(),
        'summary': summary,
        'behavior': context
    }
    
    with open(context_file, 'w') as f:
        json.dump(context_data, f, indent=2)
    
    print(f"✅ Daily context saved to {daily_file}")
    print(f"✅ Behavior context saved to {context_file}")

def load_behavior_context() -> dict:
    """Load current behavior context (for other scripts to use)"""
    context_file = os.path.expanduser('~/.openclaw/workspace/memory/whoop_context.json')
    
    try:
        with open(context_file, 'r') as f:
            data = json.load(f)
            
        # Check if context is from today
        today = datetime.now().strftime('%Y-%m-%d')
        if data.get('date') == today:
            return data.get('behavior', {})
        else:
            return {}  # Stale context
    except FileNotFoundError:
        return {}
    except json.JSONDecodeError:
        return {}

def main():
    """Main morning check routine"""
    print(f"🌅 WHOOP Morning Check - {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print("=" * 50)
    
    # Initialize client and get data
    client = WhoopClient()
    summary = client.get_sleep_performance_summary()
    
    if summary['sleep_performance'] is None:
        print("❌ No recent sleep data available")
        return False
    
    # Display summary
    print(f"\n📊 Sleep Summary:")
    print(f"Performance: {summary['sleep_performance']}% ({summary['status'].upper()})")
    print(f"Duration: {summary['sleep_duration_hours']}h")
    print(f"Recovery: {summary['recovery_score']}")
    print(f"Message: {summary['message']}")
    
    # Create behavior context
    context = create_behavior_context(summary)
    
    print(f"\n🤖 Behavior Adjustments:")
    print(f"Mode: {context['behavior_mode']}")
    print(f"Communication: {context['communication_style']}")
    print(f"Energy: {context['energy_level']}")
    print(f"Task Complexity: {context['task_complexity']}")
    
    if context['recommendations']:
        print(f"\n💡 Recommendations:")
        for rec in context['recommendations']:
            print(f"- {rec}")
    
    # Save context for the day
    save_daily_context(context, summary)
    
    return True

if __name__ == "__main__":
    success = main()
    
    if success:
        print(f"\n✅ Morning check complete!")
    else:
        print(f"\n❌ Morning check failed!")
        sys.exit(1)