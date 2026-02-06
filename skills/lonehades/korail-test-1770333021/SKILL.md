---

name: korail-manager
version: 0.1.0
description: "Korail(KTX/SRT) reservation automation skill. Search, reserve, and watch for tickets."
tools:

- name: korail_search
  description: "Search for trains between two stations."
  parameters:
  type: object
  properties:
  dep: { type: string, description: "Departure station (e.g. 서울, 대전)" }
  arr: { type: string, description: "Arrival station (e.g. 부산, 동대구)" }
  date: { type: string, description: "YYYYMMDD format (default: today)" }
  time: { type: string, description: "HHMMSS format (default: now)" }
  required: [dep, arr]
  command: ["python3", "scripts/search.py"]
- name: korail_watch
  description: "Watch for available seats and reserve automatically. Sends Telegram alert on success."
  parameters:
  type: object
  properties:
  dep: { type: string, description: "Departure station" }
  arr: { type: string, description: "Arrival station" }
  date: { type: string, description: "YYYYMMDD" }
  start_time: { type: number, description: "Start hour (0-23)" }
  end_time: { type: number, description: "End hour (0-23)" }
  interval: { type: number, description: "Check interval in seconds (default: 300)" }
  required: [dep, arr, date]
  command: ["python3", "scripts/watch.py"]

- name: korail_cancel
  description: "Cancel a reservation."
  parameters:
  type: object
  properties:
  train_no: { type: string, description: "Optional: Specific train number to cancel. If omitted, cancels all." }
  command: ["python3", "scripts/cancel.py"]

dependencies:
python: - requests - pycryptodome
