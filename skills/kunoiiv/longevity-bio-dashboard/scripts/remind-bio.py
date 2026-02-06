#!/usr/bin/env python3
import sys
import json
from datetime import datetime

def remind(event):
    now = datetime.now()
    hour = now.hour
    reminders = {
        'nmn': {'msg': '🧬 NMN dose: 350mg liposomal (NAD+ boost)', 'time': '08:00-10:00'},
        'fasting': {'msg': '🧬 Fasting window: 16:8 | Water only till 18:00', 'time': '16:00-20:00'},
        'senolytics': {'msg': '🧬 D+Q pulse: Alzheimer biomarkers ↓ (weekly Mon)', 'time': '09:00 Mon'},
        'plasma': {'msg': '🧬 Plasma dilution due? Heterochronic zombie cell clear (Q3)', 'time': 'Monthly Q3'}
    }
    if event in reminders:
        r = reminders[event]
        status = 'NOW!' if r['time'].startswith(str(hour)) else 'Scheduled'
        return f"{r['msg']} | {status} | {now.strftime('%H:%M London')} 👻 | TTS-ready"
    return 'All green—stack sats for longevity! 🧬'

def usage():
    print("Usage: python remind-bio.py [nmn|fasting|senolytics|plasma|help|daily]")
    print("Events: nmn, fasting, senolytics, plasma")
    sys.exit(1)

if __name__ == '__main__':
    try:
        event = sys.argv[1] if len(sys.argv)>1 else 'daily'
        if event == 'help':
            usage()
        print(remind(event))
    except Exception as e:
        print(f"❌ Error: {e}. Run 'python remind-bio.py help'")
