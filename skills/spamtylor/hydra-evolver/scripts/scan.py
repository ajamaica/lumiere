#!/usr/bin/env python3
import socket
import subprocess
import json
import concurrent.futures

# Subnet to scan (Hydra Mesh defaults)
SUBNET = "192.168.0."
# Known ranges or full sweep
TARGET_IPS = [f"{SUBNET}{i}" for i in [200, 233, 223, 198, 168, 101, 102]] 

def check_node(ip):
    try:
        # Simple TCP connect to SSH (22) as a proxy for "alive node"
        # Can also check 18789 (OpenClaw)
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(1)
        result = sock.connect_ex((ip, 22))
        sock.close()
        if result == 0:
            return {"ip": ip, "status": "online", "service": "ssh"}
        
        # Try OpenClaw port
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(1)
        result = sock.connect_ex((ip, 18789))
        sock.close()
        if result == 0:
            return {"ip": ip, "status": "online", "service": "openclaw-gateway"}
            
    except:
        pass
    return None

def scan_mesh():
    active_nodes = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        futures = {executor.submit(check_node, ip): ip for ip in TARGET_IPS}
        for future in concurrent.futures.as_completed(futures):
            data = future.result()
            if data:
                active_nodes.append(data)
    
    return active_nodes

if __name__ == "__main__":
    results = scan_mesh()
    print(json.dumps(results, indent=2))
