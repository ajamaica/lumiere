"""Authentication module for Klutch API."""

import json
import os
import subprocess
from pathlib import Path
from typing import Optional, Tuple

import requests

TOKEN_PATH = Path.home() / ".config" / "klutch" / "token.json"


def get_credentials() -> Tuple[str, str]:
    """Get API credentials from 1Password or environment.
    
    Checks in order:
    1. KLUTCH_CLIENT_ID and KLUTCH_SECRET_KEY env vars
    2. KLUTCH_API_KEY and KLUTCH_API_SECRET env vars
    3. 1Password item specified by KLUTCH_1PASSWORD_ITEM
    
    Returns:
        Tuple of (client_id, secret_key)
        
    Raises:
        ValueError: If credentials not found
    """
    client_id = os.environ.get("KLUTCH_CLIENT_ID") or os.environ.get("KLUTCH_API_KEY")
    secret_key = os.environ.get("KLUTCH_SECRET_KEY") or os.environ.get("KLUTCH_API_SECRET")
    
    if client_id and secret_key:
        return client_id, secret_key

    # Try 1Password fallback
    item_name = os.environ.get("KLUTCH_1PASSWORD_ITEM")
    if item_name:
        try:
            # Try to get Client ID
            res_id = subprocess.run(
                ["op", "read", f"op://Clawd/{item_name}/api key"],
                capture_output=True, text=True, check=False
            )
            if res_id.returncode == 0:
                client_id = res_id.stdout.strip()
            
            # Try to get Secret Key
            res_sec = subprocess.run(
                ["op", "read", f"op://Clawd/{item_name}/api secret"],
                capture_output=True, text=True, check=False
            )
            if res_sec.returncode == 0:
                secret_key = res_sec.stdout.strip()
                
            if client_id and secret_key:
                return client_id, secret_key
        except Exception:
            pass
    
    raise ValueError(
        "Klutch API credentials not found. Set KLUTCH_CLIENT_ID and KLUTCH_SECRET_KEY "
        "environment variables or KLUTCH_1PASSWORD_ITEM."
    )


def get_session_token(endpoint: str, client_id: str, secret_key: str, force_refresh: bool = False) -> str:
    """Get or create a session token for Klutch API.
    
    Args:
        endpoint: GraphQL endpoint URL
        client_id: API client ID
        secret_key: API secret key
        force_refresh: Force creation of new token
        
    Returns:
        Session token string
    """
    if not force_refresh and TOKEN_PATH.exists():
        try:
            data = json.loads(TOKEN_PATH.read_text())
            token = data.get("token")
            if token:
                return token
        except (json.JSONDecodeError, IOError):
            pass
    
    query = """
    mutation($clientId: String, $secretKey: String) {
        createSessionToken(clientId: $clientId, secretKey: $secretKey)
    }
    """
    
    try:
        response = requests.post(
            endpoint,
            json={"query": query, "variables": {"clientId": client_id, "secretKey": secret_key}},
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        response.raise_for_status()
        
        result = response.json()
        if "errors" in result:
            raise ValueError(f"GraphQL error: {result['errors']}")
        
        token = result.get("data", {}).get("createSessionToken")
        if not token:
            raise ValueError("Failed to create session token - empty response")
        
        TOKEN_PATH.parent.mkdir(parents=True, exist_ok=True)
        TOKEN_PATH.write_text(json.dumps({"token": token}))
        TOKEN_PATH.chmod(0o600)  # Restrict permissions
        
        return token
    except requests.RequestException as e:
        raise ValueError(f"Authentication request failed: {e}")


def clear_token() -> None:
    """Clear cached token."""
    if TOKEN_PATH.exists():
        TOKEN_PATH.unlink()


def get_token(endpoint: str, force_refresh: bool = False) -> str:
    """Get valid session token (cached or new)."""
    client_id, secret_key = get_credentials()
    return get_session_token(endpoint, client_id, secret_key, force_refresh)
