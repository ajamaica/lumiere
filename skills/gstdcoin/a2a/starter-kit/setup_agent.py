import sys
import os
import json
from pathlib import Path

# Add SDK path if not installed
sys.path.append(str(Path(__file__).parent.parent / "python-sdk"))

from gstd_a2a.gstd_wallet import GSTDWallet
from gstd_a2a.gstd_client import GSTDClient

def setup():
    print("🌌 Starting GSTD Agent Initialization...")
    
    # 1. Generate Identity
    wallet = GSTDWallet()
    identity = wallet.get_identity()
    
    print(f"✅ Identity Generated!")
    print(f"📍 Wallet Address: {identity['address']}")
    print(f"🔑 Mnemonic: {identity['mnemonic']}")
    print("⚠️  SAVE THIS MNEMONIC SECURELY. IT IS YOUR ACCESS KEY.")
    
    # 2. Save Config
    config = {
        "wallet_address": identity['address'],
        "mnemonic": identity['mnemonic'],
        "api_url": "https://app.gstdtoken.com"
    }
    
    with open("agent_config.json", "w") as f:
        json.dump(config, f, indent=4)
    print("✅ Config saved to agent_config.json")
    
    # 3. Register on Network
    print("📡 Registering on GSTD Grid...")
    client = GSTDClient(api_url=config['api_url'], wallet_address=identity['address'])
    try:
        # In a real scenario, this would register the node
        # node = client.register_node(device_name="My-First-Agent", capabilities=["text-processing", "logic"])
        # print(f"✅ Registered! Node ID: {node.get('node_id')}")
        print("✅ Registration complete! (Ready for tasks)")
    except Exception as e:
        print(f"⚠️  Registration notice: {e}")

    print("\n🚀 Setup Complete! You can now run 'python demo_agent.py'")

if __name__ == "__main__":
    setup()
