#!/usr/bin/env python3
"""
Trakt API client for OpenClaw
Handles authentication and API requests to Trakt.tv
"""

import os
import json
import requests
from pathlib import Path
from typing import Optional, Dict, List, Any

# Configuration
TRAKT_API_BASE = "https://api.trakt.tv"
CONFIG_FILE = Path.home() / ".openclaw" / "trakt_config.json"


class TraktClient:
    """Trakt.tv API client with PIN authentication"""
    
    def __init__(self):
        self.client_id = None
        self.client_secret = None
        self.access_token = None
        self.refresh_token = None
        
        # Load config from file (required)
        self.load_auth()
    
    def load_auth(self) -> bool:
        """Load configuration from config file"""
        if not CONFIG_FILE.exists():
            print(f"Config file not found: {CONFIG_FILE}")
            print("Please create it with your Trakt credentials:")
            print(json.dumps({
                "client_id": "YOUR_CLIENT_ID",
                "client_secret": "YOUR_CLIENT_SECRET",
                "access_token": "",
                "refresh_token": ""
            }, indent=2))
            return False
        
        try:
            with open(CONFIG_FILE, 'r') as f:
                config = json.load(f)
                self.client_id = config.get('client_id')
                self.client_secret = config.get('client_secret')
                self.access_token = config.get('access_token')
                self.refresh_token = config.get('refresh_token')
            
            if not self.client_id or not self.client_secret:
                print("Error: client_id and client_secret must be set in config file")
                return False
            
            return True
        except Exception as e:
            print(f"Error loading config: {e}")
            return False
    
    def save_auth(self):
        """Save authentication to config file"""
        CONFIG_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(CONFIG_FILE, 'w') as f:
            json.dump({
                'client_id': self.client_id,
                'client_secret': self.client_secret,
                'access_token': self.access_token,
                'refresh_token': self.refresh_token
            }, f, indent=2)
    
    def get_device_code(self) -> Optional[Dict]:
        """Generate device code for authentication"""
        if not self.client_id:
            raise ValueError("CLIENT_ID not set")
        
        url = f"{TRAKT_API_BASE}/oauth/device/code"
        payload = {"client_id": self.client_id}
        
        response = requests.post(url, json=payload, headers=self._get_headers())
        
        if response.status_code == 200:
            return response.json()
        else:
            print(f"Failed to get device code: {response.status_code} - {response.text}")
            return None
    
    def get_pin_url(self) -> str:
        """Get the PIN authentication URL"""
        if not self.client_id:
            raise ValueError("CLIENT_ID not set")
        return f"https://trakt.tv/pin/{self.client_id}"
    
    def authenticate_with_device_code(self, device_code: str) -> bool:
        """Authenticate using device code"""
        if not self.client_id or not self.client_secret:
            raise ValueError("CLIENT_ID and CLIENT_SECRET must be set")
        
        url = f"{TRAKT_API_BASE}/oauth/device/token"
        payload = {
            "code": device_code,
            "client_id": self.client_id,
            "client_secret": self.client_secret
        }
        
        response = requests.post(url, json=payload, headers=self._get_headers())
        
        if response.status_code == 200:
            data = response.json()
            self.access_token = data['access_token']
            self.refresh_token = data['refresh_token']
            self.save_auth()
            return True
        else:
            print(f"Auth failed: {response.status_code} - {response.text}")
            return False
    
    def authenticate_with_pin(self, pin: str) -> bool:
        """Authenticate using PIN (legacy method, use authenticate_with_device_code)"""
        return self.authenticate_with_device_code(pin)
    
    def _get_headers(self, include_auth: bool = False) -> Dict[str, str]:
        """Get request headers"""
        headers = {
            "Content-Type": "application/json",
            "trakt-api-version": "2",
            "trakt-api-key": self.client_id
        }
        if include_auth and self.access_token:
            headers["Authorization"] = f"Bearer {self.access_token}"
        return headers
    
    def _request(self, method: str, endpoint: str, **kwargs) -> Optional[Dict]:
        """Make an authenticated API request"""
        url = f"{TRAKT_API_BASE}{endpoint}"
        headers = self._get_headers(include_auth=True)
        
        response = requests.request(method, url, headers=headers, **kwargs)
        
        if response.status_code == 200 or response.status_code == 201:
            return response.json() if response.text else {}
        elif response.status_code == 204:
            return {}
        else:
            print(f"Request failed: {response.status_code} - {response.text}")
            return None
    
    def get_watch_history(self, media_type: str = "shows", limit: int = 10) -> List[Dict]:
        """Get user's watch history
        
        Args:
            media_type: 'shows', 'movies', or 'episodes'
            limit: Number of items to return
        """
        endpoint = f"/sync/history/{media_type}"
        params = {"limit": limit}
        result = self._request("GET", endpoint, params=params)
        return result if result else []
    
    def get_watchlist(self, media_type: str = "shows") -> List[Dict]:
        """Get user's watchlist
        
        Args:
            media_type: 'shows' or 'movies'
        """
        endpoint = f"/sync/watchlist/{media_type}"
        result = self._request("GET", endpoint)
        return result if result else []
    
    def get_recommendations(self, media_type: str = "shows", limit: int = 10) -> List[Dict]:
        """Get personalized recommendations
        
        Args:
            media_type: 'shows' or 'movies'
            limit: Number of recommendations
        """
        endpoint = f"/recommendations/{media_type}"
        params = {"limit": limit}
        result = self._request("GET", endpoint, params=params)
        return result if result else []
    
    def get_trending(self, media_type: str = "shows", limit: int = 10) -> List[Dict]:
        """Get trending content
        
        Args:
            media_type: 'shows' or 'movies'
            limit: Number of items
        """
        endpoint = f"/{media_type}/trending"
        params = {"limit": limit}
        result = self._request("GET", endpoint, params=params)
        return result if result else []
    
    def search(self, query: str, media_type: str = "show,movie") -> List[Dict]:
        """Search for shows and movies
        
        Args:
            query: Search query
            media_type: Comma-separated list: 'show', 'movie', 'person', etc.
        """
        endpoint = "/search/" + media_type
        params = {"query": query}
        result = self._request("GET", endpoint, params=params)
        return result if result else []
    
    def add_to_history(self, items: Dict) -> bool:
        """Add items to watch history
        
        Args:
            items: Dict with 'movies' or 'shows' or 'episodes' arrays
                   Format: {"shows": [{"ids": {"trakt": 123}}], "watched_at": "2026-02-04T00:00:00.000Z"}
        
        Returns:
            True if successful
        """
        endpoint = "/sync/history"
        result = self._request("POST", endpoint, json=items)
        return result is not None
    
    def mark_show_watched(self, trakt_id: int) -> bool:
        """Mark an entire show as watched
        
        Args:
            trakt_id: Trakt ID of the show
        """
        payload = {
            "shows": [
                {"ids": {"trakt": trakt_id}}
            ]
        }
        return self.add_to_history(payload)
    
    def mark_episode_watched(self, show_trakt_id: int, season: int, episode: int) -> bool:
        """Mark a specific episode as watched
        
        Args:
            show_trakt_id: Trakt ID of the show
            season: Season number
            episode: Episode number
        """
        payload = {
            "shows": [
                {
                    "ids": {"trakt": show_trakt_id},
                    "seasons": [
                        {
                            "number": season,
                            "episodes": [{"number": episode}]
                        }
                    ]
                }
            ]
        }
        return self.add_to_history(payload)


def main():
    """CLI for testing the Trakt client"""
    import sys
    
    client = TraktClient()
    
    if len(sys.argv) < 2:
        print("Usage:")
        print("  trakt_client.py auth <device_code>      # Authenticate")
        print("  trakt_client.py history                 # Get watch history")
        print("  trakt_client.py watchlist               # Get watchlist")
        print("  trakt_client.py recommend               # Get recommendations")
        print("  trakt_client.py trending                # Get trending")
        print("  trakt_client.py search <query>          # Search")
        print("  trakt_client.py mark-watched <trakt_id> # Mark show as watched")
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == "auth":
        if len(sys.argv) < 3:
            # Generate device code
            device_data = client.get_device_code()
            if device_data:
                print(f"Go to: https://trakt.tv/activate")
                print(f"Enter this code: {device_data['user_code']}")
                print(f"\nDevice code: {device_data['device_code']}")
                print("Then run: trakt_client.py auth <DEVICE_CODE>")
            else:
                print("✗ Failed to generate device code")
        else:
            code = sys.argv[2]
            if client.authenticate_with_device_code(code):
                print("✓ Authentication successful!")
            else:
                print("✗ Authentication failed")
    
    elif command == "history":
        history = client.get_watch_history(limit=5)
        print(json.dumps(history, indent=2))
    
    elif command == "watchlist":
        watchlist = client.get_watchlist()
        print(json.dumps(watchlist, indent=2))
    
    elif command == "recommend":
        recs = client.get_recommendations(limit=5)
        print(json.dumps(recs, indent=2))
    
    elif command == "trending":
        trending = client.get_trending(limit=5)
        print(json.dumps(trending, indent=2))
    
    elif command == "search":
        if len(sys.argv) < 3:
            print("Usage: trakt_client.py search <query>")
            sys.exit(1)
        query = " ".join(sys.argv[2:])
        results = client.search(query)
        print(json.dumps(results, indent=2))
    
    elif command == "mark-watched":
        if len(sys.argv) < 3:
            print("Usage: trakt_client.py mark-watched <trakt_id>")
            sys.exit(1)
        trakt_id = int(sys.argv[2])
        if client.mark_show_watched(trakt_id):
            print("✓ Marked as watched!")
        else:
            print("✗ Failed to mark as watched")
    
    else:
        print(f"Unknown command: {command}")
        sys.exit(1)


if __name__ == "__main__":
    main()
