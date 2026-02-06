#!/usr/bin/env python3
"""
ClawdHub API Client - Fetch skill data from ClawdHub
"""

import os
import json
import sys
from datetime import datetime, timedelta
from typing import List, Dict, Any
from pathlib import Path

try:
    import requests
except ImportError:
    print("❌ requests module not found. Install with: pip install requests", file=sys.stderr)
    sys.exit(1)

class ClawdHubAPI:
    """Interface to ClawdHub API"""
    
    # Note: Replace with actual ClawdHub API endpoint once available
    # For now, we'll create a mock/demo implementation
    BASE_URL = os.getenv("CLAWDHUB_API_URL", "https://hub.clawdbot.com/api/v1")
    API_KEY = os.getenv("CLAWDHUB_API_KEY", "")
    
    # Local mock data directory for testing
    MOCK_DATA_DIR = Path.home() / ".cache" / "clawdhub-mock"
    
    def __init__(self, verbose=False):
        self.verbose = verbose
        self.timeout = 10
        self.session = requests.Session()
        
        if self.API_KEY:
            self.session.headers.update({"Authorization": f"Bearer {self.API_KEY}"})
    
    def log(self, msg):
        """Log debug messages"""
        if self.verbose:
            print(f"🔍 {msg}", file=sys.stderr)
    
    def _fetch(self, endpoint: str, params: Dict[str, Any] = None) -> Dict[str, Any]:
        """Fetch from ClawdHub API with fallback to mock data"""
        try:
            url = f"{self.BASE_URL}/{endpoint}"
            self.log(f"Fetching {url}")
            
            response = self.session.get(url, params=params, timeout=self.timeout)
            response.raise_for_status()
            return response.json()
        
        except requests.exceptions.RequestException as e:
            self.log(f"API error: {e}, using mock data")
            return self._load_mock_data(endpoint)
    
    def _load_mock_data(self, endpoint: str) -> Dict[str, Any]:
        """Load mock data for testing"""
        mock_file = self.MOCK_DATA_DIR / f"{endpoint.replace('/', '_')}.json"
        
        if mock_file.exists():
            with open(mock_file, 'r') as f:
                return json.load(f)
        
        # Return default empty structure
        return {"skills": []}
    
    def get_new_skills(self, days: int = 7) -> List[Dict[str, Any]]:
        """Fetch new skills released in the last N days"""
        self.log(f"Fetching new skills from last {days} days")
        
        params = {
            "sort": "created",
            "order": "desc",
            "limit": 50,
            "since": (datetime.now() - timedelta(days=days)).isoformat()
        }
        
        result = self._fetch("skills/new", params)
        skills = result.get("skills", [])
        
        # Ensure required fields
        for skill in skills:
            skill.setdefault("id", skill.get("name", "unknown"))
            skill.setdefault("name", "Unknown")
            skill.setdefault("description", "")
            skill.setdefault("author", "")
            skill.setdefault("downloads", 0)
            skill.setdefault("installs", 0)
            skill.setdefault("rating", 0)
            skill.setdefault("category", "uncategorized")
            skill.setdefault("created_at", datetime.now().isoformat())
            skill.setdefault("updated_at", datetime.now().isoformat())
            skill.setdefault("tags", [])
            skill.setdefault("version", "1.0.0")
        
        return skills
    
    def get_trending_skills(self, top: int = 20) -> List[Dict[str, Any]]:
        """Fetch most installed/downloaded trending skills"""
        self.log(f"Fetching top {top} trending skills")
        
        params = {
            "sort": "installs",
            "order": "desc",
            "limit": top
        }
        
        result = self._fetch("skills/trending", params)
        skills = result.get("skills", [])
        
        # Ensure required fields
        for skill in skills:
            skill.setdefault("id", skill.get("name", "unknown"))
            skill.setdefault("name", "Unknown")
            skill.setdefault("description", "")
            skill.setdefault("author", "")
            skill.setdefault("downloads", 0)
            skill.setdefault("installs", 0)
            skill.setdefault("rating", 0)
            skill.setdefault("category", "uncategorized")
            skill.setdefault("created_at", datetime.now().isoformat())
            skill.setdefault("updated_at", datetime.now().isoformat())
            skill.setdefault("tags", [])
            skill.setdefault("version", "1.0.0")
        
        return skills
    
    def get_recently_updated_skills(self, days: int = 7) -> List[Dict[str, Any]]:
        """Fetch skills with recent updates/major version changes"""
        self.log(f"Fetching recently updated skills from last {days} days")
        
        params = {
            "sort": "updated",
            "order": "desc",
            "limit": 50,
            "since": (datetime.now() - timedelta(days=days)).isoformat()
        }
        
        result = self._fetch("skills/updated", params)
        skills = result.get("skills", [])
        
        # Ensure required fields
        for skill in skills:
            skill.setdefault("id", skill.get("name", "unknown"))
            skill.setdefault("name", "Unknown")
            skill.setdefault("description", "")
            skill.setdefault("author", "")
            skill.setdefault("downloads", 0)
            skill.setdefault("installs", 0)
            skill.setdefault("rating", 0)
            skill.setdefault("category", "uncategorized")
            skill.setdefault("created_at", datetime.now().isoformat())
            skill.setdefault("updated_at", datetime.now().isoformat())
            skill.setdefault("tags", [])
            skill.setdefault("version", "1.0.0")
            skill.setdefault("changelog", "")
        
        return skills
    
    def get_skills_by_category(self, category: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Fetch skills in a specific category"""
        self.log(f"Fetching skills in category: {category}")
        
        params = {
            "category": category,
            "sort": "installs",
            "order": "desc",
            "limit": limit
        }
        
        result = self._fetch("skills/category", params)
        skills = result.get("skills", [])
        
        # Ensure required fields
        for skill in skills:
            skill.setdefault("id", skill.get("name", "unknown"))
            skill.setdefault("name", "Unknown")
            skill.setdefault("description", "")
            skill.setdefault("author", "")
            skill.setdefault("downloads", 0)
            skill.setdefault("installs", 0)
            skill.setdefault("rating", 0)
            skill.setdefault("category", category)
            skill.setdefault("created_at", datetime.now().isoformat())
            skill.setdefault("updated_at", datetime.now().isoformat())
            skill.setdefault("tags", [])
            skill.setdefault("version", "1.0.0")
        
        return skills
    
    def get_skill_details(self, skill_id: str) -> Dict[str, Any]:
        """Fetch detailed info about a specific skill"""
        self.log(f"Fetching details for skill: {skill_id}")
        
        result = self._fetch(f"skills/{skill_id}")
        return result.get("skill", {})
    
    def search_skills(self, query: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Search for skills by name or keyword"""
        self.log(f"Searching skills: {query}")
        
        params = {
            "q": query,
            "limit": limit
        }
        
        result = self._fetch("skills/search", params)
        return result.get("skills", [])
    
    def get_categories(self) -> List[Dict[str, str]]:
        """Get list of available categories"""
        self.log("Fetching available categories")
        
        result = self._fetch("categories")
        return result.get("categories", [])
