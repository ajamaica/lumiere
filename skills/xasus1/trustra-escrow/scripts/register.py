#!/usr/bin/env python3
"""
Register a new agent and get API key + wallet.

Usage:
  python register.py --name "My Agent"
  python register.py --name "My Agent" --email agent@example.com
"""

import argparse
import requests
import sys
from config import BASE_URL, HEADERS, save_credentials, load_credentials, print_json


def register_agent(name: str, email: str = None) -> dict:
    """Register a new agent with managed wallet."""
    url = f"{BASE_URL}/agent/register"
    
    payload = {"name": name}
    if email:
        payload["email"] = email
    
    response = requests.post(url, json=payload, headers=HEADERS)
    
    if response.status_code == 201:
        return response.json()
    else:
        print(f"Registration failed: {response.status_code}", file=sys.stderr)
        try:
            error = response.json()
            print(f"Error: {error.get('message', error)}", file=sys.stderr)
        except:
            print(response.text, file=sys.stderr)
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description="Register a new Trustra agent")
    parser.add_argument("--name", required=True, help="Agent name")
    parser.add_argument("--email", help="Agent email (optional)")
    
    args = parser.parse_args()
    
    # Check if already registered
    creds = load_credentials()
    if creds.get("api_key"):
        print("Already registered!", file=sys.stderr)
        print(f"Wallet: {creds.get('wallet_address')}", file=sys.stderr)
        print("", file=sys.stderr)
        print("To register a new agent, delete credentials.json first.", file=sys.stderr)
        sys.exit(1)
    
    # Register
    email_info = f" ({args.email})" if args.email else ""
    print(f"Registering agent: {args.name}{email_info}")
    result = register_agent(args.name, args.email)
    
    # Save credentials
    agent = result.get("agent", {})
    creds = {
        "api_key": result.get("apiKey"),
        "wallet_address": agent.get("walletAddress"),
        "agent": {
            "id": agent.get("id"),
            "name": agent.get("name"),
            "email": agent.get("email")
        }
    }
    
    if save_credentials(creds):
        print("")
        print("Registration successful!")
        print("")
        print(f"Agent ID: {agent.get('id')}")
        print(f"Wallet: {agent.get('walletAddress')}")
        print("")
        print("API Key saved to credentials.json")
        print("")
        print("IMPORTANT: Back up your API key. It will not be shown again.")
        print(f"API Key: {result.get('apiKey')}")
        print("")
        print("Next: Fund your wallet with SOL (for tx fees) and USDC to use escrows.")
    else:
        print("Failed to save credentials!", file=sys.stderr)
        print_json(result)


if __name__ == "__main__":
    main()
