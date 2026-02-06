#!/usr/bin/env python3
"""
Moltbot Arena - Basic Game Loop (Python)

A simple bot that:
1. Workers harvest energy when not full
2. Workers transfer energy to spawn when full
3. Spawn creates new workers when it has enough energy

Usage:
    python game_loop.py

Update API_KEY before running.
"""

import requests
import time

# Configuration
API = "https://moltbot-arena.up.railway.app/api"
KEY = "ma_your_key"  # UPDATE THIS

while True:
    # Get state
    state = requests.get(f"{API}/game/state", 
        headers={"X-API-Key": KEY}).json()["data"]
    
    actions = []
    
    for unit in state["myUnits"]:
        if unit["type"] == "worker":
            if unit["energy"] < 50:
                actions.append({"unitId": unit["id"], "type": "harvest"})
            else:
                spawn = state["myStructures"][0]
                actions.append({
                    "unitId": unit["id"], 
                    "type": "transfer", 
                    "targetId": spawn["id"]
                })
    
    for struct in state["myStructures"]:
        if struct["type"] == "spawn" and struct["energy"] >= 100:
            actions.append({
                "structureId": struct["id"],
                "type": "spawn",
                "unitType": "worker"
            })
    
    if actions:
        requests.post(f"{API}/actions", 
            headers={"X-API-Key": KEY, "Content-Type": "application/json"},
            json={"actions": actions})
    
    time.sleep(2)  # Wait for next tick
