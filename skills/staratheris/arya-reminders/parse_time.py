#!/usr/bin/env python3
import argparse
import re
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

MONTHS = {
  'enero':1,'ene':1,
  'febrero':2,'feb':2,
  'marzo':3,'mar':3,
  'abril':4,'abr':4,
  'mayo':5,'may':5,
  'junio':6,'jun':6,
  'julio':7,'jul':7,
  'agosto':8,'ago':8,
  'septiembre':9,'sep':9,'setiembre':9,'set':9,
  'octubre':10,'oct':10,
  'noviembre':11,'nov':11,
  'diciembre':12,'dic':12,
}

WEEKDAYS = {
  'lunes':0,
  'martes':1,
  'miercoles':2,'miércoles':2,
  'jueves':3,
  'viernes':4,
  'sabado':5,'sábado':5,
  'domingo':6,
}


def next_weekday(now, target_wd):
  days_ahead = (target_wd - now.weekday()) % 7
  if days_ahead == 0:
    days_ahead = 7
  return now + timedelta(days=days_ahead)


def parse_time_of_day(s: str):
  s = s.strip().lower()
  # 15:30
  m = re.match(r'^(\d{1,2}):(\d{2})$', s)
  if m:
    return int(m.group(1)), int(m.group(2))
  # 3pm / 3 pm / 3:30pm
  m = re.match(r'^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$', s)
  if m:
    h = int(m.group(1))
    mi = int(m.group(2) or '0')
    ap = m.group(3)
    if ap == 'pm' and h != 12:
      h += 12
    if ap == 'am' and h == 12:
      h = 0
    return h, mi
  return None


def main():
  ap = argparse.ArgumentParser()
  ap.add_argument('--tz', default='America/Bogota')
  ap.add_argument('--when', required=True)
  args = ap.parse_args()

  tz = ZoneInfo(args.tz)
  now = datetime.now(tz)
  text = args.when.strip().lower()

  # Relative: en 10 minutos/horas/días
  m = re.search(r'\ben\s+(\d+)\s*(minuto|minutos|hora|horas|dia|días|dias)\b', text)
  if m:
    n = int(m.group(1))
    unit = m.group(2)
    if unit.startswith('min'):
      dt = now + timedelta(minutes=n)
    elif unit.startswith('hora'):
      dt = now + timedelta(hours=n)
    else:
      dt = now + timedelta(days=n)
    print(dt.isoformat())
    return

  # Shortcuts
  if text in ('hoy',):
    dt = now.replace(hour=17, minute=0, second=0, microsecond=0)
    print(dt.isoformat()); return
  if text in ('mañana','manana'):
    dt = (now + timedelta(days=1)).replace(hour=9, minute=0, second=0, microsecond=0)
    print(dt.isoformat()); return
  if text in ('esta tarde','hoy en la tarde'):
    dt = now.replace(hour=15, minute=0, second=0, microsecond=0)
    print(dt.isoformat()); return
  if text in ('esta noche','hoy en la noche'):
    dt = now.replace(hour=20, minute=0, second=0, microsecond=0)
    print(dt.isoformat()); return

  # Patterns: "hoy a las 5", "mañana a las 3pm"
  m = re.match(r'^(hoy|mañana|manana)\s*(?:a\s*las\s*)?(.+)$', text)
  if m:
    day = m.group(1)
    tod = m.group(2)
    hm = parse_time_of_day(tod)
    if hm:
      base = now if day == 'hoy' else (now + timedelta(days=1))
      dt = base.replace(hour=hm[0], minute=hm[1], second=0, microsecond=0)
      print(dt.isoformat()); return

  # Weekday: "el lunes a las 3pm" / "lunes 15:00"
  m = re.match(r'^(?:el\s+)?(lunes|martes|miercoles|miércoles|jueves|viernes|sabado|sábado|domingo)\s*(?:a\s*las\s*)?(.+)?$', text)
  if m:
    wd = WEEKDAYS[m.group(1)]
    base = next_weekday(now, wd)
    tod = (m.group(2) or '09:00').strip()
    hm = parse_time_of_day(tod)
    if hm:
      dt = base.replace(hour=hm[0], minute=hm[1], second=0, microsecond=0)
      print(dt.isoformat()); return

  # Date formats: YYYY-MM-DD [HH:MM]
  m = re.match(r'^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{1,2}:\d{2}))?$', text)
  if m:
    y,mo,d = int(m.group(1)), int(m.group(2)), int(m.group(3))
    hm = parse_time_of_day(m.group(4) or '09:00')
    dt = datetime(y,mo,d,hm[0],hm[1],tzinfo=tz)
    print(dt.isoformat()); return

  # Date formats: DD/MM/YYYY [HH:MM]
  m = re.match(r'^(\d{1,2})/(\d{1,2})/(\d{4})(?:\s+(\d{1,2}:\d{2}))?$', text)
  if m:
    d,mo,y = int(m.group(1)), int(m.group(2)), int(m.group(3))
    hm = parse_time_of_day(m.group(4) or '09:00')
    dt = datetime(y,mo,d,hm[0],hm[1],tzinfo=tz)
    print(dt.isoformat()); return

  # "15 de marzo 3pm" / "15 marzo 15:00"
  m = re.match(r'^(\d{1,2})\s+de\s+([a-záéíóú]+)\s*(.+)?$', text)
  if not m:
    m = re.match(r'^(\d{1,2})\s+([a-záéíóú]+)\s*(.+)?$', text)
  if m:
    d = int(m.group(1))
    mon = MONTHS.get(m.group(2))
    if mon:
      tod = (m.group(3) or '09:00').strip()
      hm = parse_time_of_day(tod) or (9,0)
      y = now.year
      dt = datetime(y,mon,d,hm[0],hm[1],tzinfo=tz)
      # if date already passed this year, push to next year
      if dt < now:
        dt = datetime(y+1,mon,d,hm[0],hm[1],tzinfo=tz)
      print(dt.isoformat()); return

  raise SystemExit(f"Could not parse time expression: {args.when}")


if __name__ == '__main__':
  main()
