"""OAuth 2.0 Client Credentials authentication for Sharesight API."""

import json
import os
import time
from pathlib import Path
from typing import Optional

import httpx

TOKEN_URL = "https://api.sharesight.com/oauth2/token"
CONFIG_DIR = Path.home() / ".config" / "sharesight-cli"
CONFIG_FILE = CONFIG_DIR / "config.json"


def get_credentials() -> tuple[str, str]:
    """Get client credentials from environment variables."""
    client_id = os.environ.get("SHARESIGHT_CLIENT_ID")
    client_secret = os.environ.get("SHARESIGHT_CLIENT_SECRET")

    if not client_id or not client_secret:
        raise ValueError(
            "Missing credentials. Set SHARESIGHT_CLIENT_ID and SHARESIGHT_CLIENT_SECRET environment variables."
        )

    return client_id, client_secret


def load_config() -> dict:
    """Load saved configuration from disk."""
    if CONFIG_FILE.exists():
        with open(CONFIG_FILE) as f:
            return json.load(f)
    return {}


def save_config(config: dict) -> None:
    """Save configuration to disk."""
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    with open(CONFIG_FILE, "w") as f:
        json.dump(config, f, indent=2)
    # Set restrictive permissions
    CONFIG_FILE.chmod(0o600)


def get_token(force_refresh: bool = False) -> str:
    """Get a valid access token, refreshing if necessary.

    Args:
        force_refresh: Force a new token request even if cached token is valid.

    Returns:
        A valid access token.
    """
    config = load_config()

    # Check if we have a valid cached token
    if not force_refresh and config.get("access_token"):
        expires_at = config.get("expires_at", 0)
        # Add 60 second buffer before expiry
        if time.time() < expires_at - 60:
            return config["access_token"]

    # Request new token using client credentials
    client_id, client_secret = get_credentials()

    response = httpx.post(
        TOKEN_URL,
        data={
            "grant_type": "client_credentials",
            "client_id": client_id,
            "client_secret": client_secret,
        },
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )

    if response.status_code != 200:
        raise ValueError(f"Failed to get access token: {response.status_code} - {response.text}")

    token_data = response.json()
    access_token = token_data["access_token"]
    expires_in = token_data.get("expires_in", 1800)  # Default 30 minutes

    # Save token with expiry time
    config["access_token"] = access_token
    config["expires_at"] = time.time() + expires_in
    config["token_type"] = token_data.get("token_type", "Bearer")
    save_config(config)

    return access_token


def clear_token() -> None:
    """Clear saved token from config."""
    config = load_config()
    config.pop("access_token", None)
    config.pop("expires_at", None)
    config.pop("token_type", None)
    save_config(config)


def is_authenticated() -> bool:
    """Check if we have valid credentials and a token."""
    try:
        get_credentials()
        config = load_config()
        if config.get("access_token"):
            expires_at = config.get("expires_at", 0)
            return time.time() < expires_at - 60
        return False
    except ValueError:
        return False
