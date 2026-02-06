"""
Trustra Escrow API Configuration & Credentials
"""

import sys
import json
import os
import shutil

# Prevent future __pycache__ and clean up existing
sys.dont_write_bytecode = True
_pycache = os.path.join(os.path.dirname(__file__), "__pycache__")
if os.path.exists(_pycache):
    shutil.rmtree(_pycache, ignore_errors=True)

# Paths
SKILL_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CREDS_FILE = os.path.join(SKILL_DIR, "credentials.json")

# API URL
BASE_URL = "https://api.trustra.xyz/api/v2"

# Solana RPC
RPC_URL = "https://api.mainnet-beta.solana.com"  # Production

# Request headers
HEADERS = {
    "Content-Type": "application/json",
}


def load_credentials() -> dict:
    """Load credentials from credentials.json file."""
    if not os.path.exists(CREDS_FILE):
        return {}
    
    try:
        with open(CREDS_FILE, "r") as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        return {}


def save_credentials(creds: dict) -> bool:
    """Save credentials to credentials.json file."""
    try:
        with open(CREDS_FILE, "w") as f:
            json.dump(creds, f, indent=2)
        return True
    except IOError as e:
        print(f"Failed to save credentials: {e}", file=sys.stderr)
        return False


def get_api_key(required: bool = True) -> str | None:
    """
    Get API key from credentials.json or environment.
    
    Priority:
    1. TRUSTRA_API_KEY environment variable
    2. credentials.json file
    
    If required=True and no key found, prints error and exits.
    """
    # Check environment first
    api_key = os.getenv("TRUSTRA_API_KEY")
    if api_key:
        return api_key
    
    # Check credentials file
    creds = load_credentials()
    api_key = creds.get("api_key")
    
    if api_key:
        return api_key
    
    if required:
        print("No API key found.", file=sys.stderr)
        print("", file=sys.stderr)
        print("Run this to register:", file=sys.stderr)
        print("  python register.py --name 'My Agent' --email agent@example.com", file=sys.stderr)
        sys.exit(1)
    
    return None


def get_headers(api_key: str | None = None) -> dict:
    """Get request headers with optional API key."""
    headers = HEADERS.copy()
    if api_key:
        headers["x-api-key"] = api_key
    return headers


def get_wallet_address(required: bool = True) -> str | None:
    """
    Get wallet address from credentials.json.
    """
    creds = load_credentials()
    wallet = creds.get("wallet_address")
    
    if wallet:
        return wallet
    
    if required:
        print("No wallet address found.", file=sys.stderr)
        print("Run register.py first to create your wallet.", file=sys.stderr)
        sys.exit(1)
    
    return None


def get_agent_info() -> dict | None:
    """
    Get saved agent info from credentials.json.
    """
    creds = load_credentials()
    return creds.get("agent")


def print_json(data: dict, indent: int = 2):
    """Pretty print JSON data."""
    print(json.dumps(data, indent=indent, default=str))
