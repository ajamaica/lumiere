import time
import os
import sys
import random

# Add parent directory to path to import sdk
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'python-sdk')))
from gstd_a2a import GSTDClient

def start_requester_agent():
    # Configuration
    # In a real scenario, this wallet must have GSTD balance
    WALLET = os.getenv("GSTD_WALLET_ADDRESS", "EQ_CONSUMER_WALLET_ADDRESS") 
    
    print("🤖 Starting GSTD Consumer Agent (OpenClaw-style)...")
    client = GSTDClient(wallet_address=WALLET)
    
    # 1. Check Funds (Simulated for demo)
    print("💰 Checking GSTD Balance for outsourcing...")
    # In a real app, we would query the balance here.
    
    # 2. Define complex work to be outsourced
    task_payload = {
        "text": "Summarize the history of distributed computing in 500 words.",
        "model": "llama-3-8b",
        "priority": "high"
    }
    
    print(f"\n🚀 Outsourcing computation to the grid...")
    try:
        # Create the task with a bid of 10 GSTD
        task_info = client.create_task(
            task_type="llm-inference", 
            data_payload=task_payload, 
            bid_gstd=10.0
        )
        task_id = task_info.get("task_id", "simulated_task_id")
        print(f"✅ Task created successfully! ID: {task_id}")
        
    except Exception as e:
        print(f"❌ Failed to create task: {e}")
        return

    # 3. Wait for results
    print("\n⏳ Waiting for a Worker Agent to pick this up...", end="")
    while True:
        status_info = client.check_task_status(task_id)
        status = status_info.get("status", "pending")
        
        if status == "completed":
            print("\n\n🎉 Task Completed by Remote Agent!")
            print(f"Result: {status_info.get('result')}")
            break
            
        print(".", end="", flush=True)
        time.sleep(2)

if __name__ == "__main__":
    start_requester_agent()
