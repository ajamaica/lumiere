import time
import os
import sys
import random

# Add parent directory to path to import sdk
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'python-sdk')))
from gstd_a2a import GSTDClient

def autonomous_loop():
    # Configuration
    WALLET = os.getenv("GSTD_WALLET_ADDRESS", "EQ_DEMO_WALLET_FOR_AUTONOMOUS_WORKER")
    
    print("🤖 Starting GSTD Autonomous Worker Agent...")
    client = GSTDClient(wallet_address=WALLET)
    
    # 1. Registration
    print("📡 Connecting to Grid...")
    try:
        reg = client.register_node(device_name=f"Auto-Worker-{random.randint(1000,9999)}")
        print(f"✅ Registered with Node ID: {reg.get('node_id')}")
    except Exception as e:
        print(f"⚠️ Registration warning (might already be registered): {e}")

    # 2. Work Loop
    while True:
        try:
            print("\n🔍 Scanning for tasks...")
            tasks = client.get_pending_tasks()
            
            if not tasks:
                print("💤 No tasks found. Resting for 10s...")
                client.send_heartbeat(status="idle")
                time.sleep(10)
                continue
                
            print(f"⚡ Found {len(tasks)} tasks!")
            
            for task in tasks:
                task_id = task.get("id") or task.get("task_id")
                print(f"⚙️ Processing Task {task_id}...")
                
                # SIMULATE WORK (CPU/GPU Cycle)
                time.sleep(2) 
                result = {"status": "success", "processed_by": "A2A_Agent", "computation_proof": "0x123..."}
                
                # Submit
                resp = client.submit_result(task_id, result)
                print(f"💰 Task Submitted! Server response: {resp}")
                
        except KeyboardInterrupt:
            print("🛑 Stopping agent.")
            break
        except Exception as e:
            print(f"❌ Error in loop: {e}")
            time.sleep(5)

if __name__ == "__main__":
    autonomous_loop()
