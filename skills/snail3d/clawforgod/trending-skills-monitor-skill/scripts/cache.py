#!/usr/bin/env python3
"""
Cache - Simple file-based caching for API responses
"""

import json
import time
from pathlib import Path
from typing import Dict, Any, Optional

class Cache:
    """File-based cache for API responses"""
    
    def __init__(self, cache_dir: Optional[Path] = None, ttl: int = 3600):
        """
        Initialize cache.
        
        Args:
            cache_dir: Directory for cache files (default: ~/.cache/trending-skills-monitor)
            ttl: Time to live in seconds (default: 1 hour)
        """
        if cache_dir is None:
            cache_dir = Path.home() / ".cache" / "trending-skills-monitor"
        
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.ttl = ttl
    
    def get(self, key: str) -> Optional[Dict[str, Any]]:
        """Get cached value if not expired"""
        cache_file = self.cache_dir / f"{key}.json"
        
        if not cache_file.exists():
            return None
        
        # Check if expired
        file_age = time.time() - cache_file.stat().st_mtime
        if file_age > self.ttl:
            cache_file.unlink()
            return None
        
        try:
            with open(cache_file, 'r') as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            cache_file.unlink()
            return None
    
    def set(self, key: str, value: Dict[str, Any]):
        """Cache a value"""
        cache_file = self.cache_dir / f"{key}.json"
        
        with open(cache_file, 'w') as f:
            json.dump(value, f, indent=2, default=str)
    
    def clear(self, key: Optional[str] = None):
        """Clear cache entry or entire cache"""
        if key:
            cache_file = self.cache_dir / f"{key}.json"
            if cache_file.exists():
                cache_file.unlink()
        else:
            # Clear all cache files
            for cache_file in self.cache_dir.glob("*.json"):
                cache_file.unlink()
    
    def list_keys(self):
        """List all cached keys"""
        return [f.stem for f in self.cache_dir.glob("*.json")]
