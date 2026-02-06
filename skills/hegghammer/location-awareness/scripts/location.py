#!/usr/bin/env python3
"""
Location awareness for Clawdbot.

Supports multiple location providers (Home Assistant, OwnTracks, HTTP endpoint, etc.)
Manages geofences, reminders, proximity alerts, and POI discovery.
"""

import sys
import os
import json
import math
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path
from abc import ABC, abstractmethod
import subprocess

SCRIPT_DIR = Path(__file__).parent
CONFIG_FILE = SCRIPT_DIR / "config.json"
GEOFENCES_FILE = SCRIPT_DIR / "geofences.json"
STATE_FILE = SCRIPT_DIR / ".location_state.json"

def resolve_secret(value: str) -> str:
    """Resolve secret: plain, env:VAR, pass:path, or cmd:command"""
    if not value: return ""
    if value.startswith("env:"):
        return os.environ.get(value[4:], "")
    elif value.startswith("pass:"):
        try:
            r = subprocess.run(["pass", "show", value[5:]], capture_output=True, text=True, timeout=5)
            return r.stdout.strip().split("\n")[0]
        except: return ""
    elif value.startswith("cmd:"):
        try:
            r = subprocess.run(value[4:], shell=True, capture_output=True, text=True, timeout=5)
            return r.stdout.strip()
        except: return ""
    return value



# =============================================================================
# LOCATION PROVIDERS
# =============================================================================

class LocationProvider(ABC):
    """Base class for location providers."""
    
    @abstractmethod
    def get_location(self) -> dict:
        """Return {"lat": float, "lon": float, "accuracy": float, "state": str, "battery": float}"""
        pass
    
    def get_history(self, days: int = 7) -> list:
        """Return list of {"state": str, "time": str, "lat": float, "lon": float}. Optional."""
        return None  # Not all providers support history


class HomeAssistantProvider(LocationProvider):
    """Home Assistant device tracker provider."""
    
    def __init__(self, url: str, token: str, entity_id: str):
        self.url = url.rstrip("/")
        self.token = token
        self.entity_id = entity_id
    
    def _request(self, endpoint: str, timeout: int = 10) -> dict:
        url = f"{self.url}{endpoint}"
        req = urllib.request.Request(url, headers={
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        })
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.load(resp)
    
    def get_location(self) -> dict:
        try:
            data = self._request(f"/api/states/{self.entity_id}")
            attrs = data.get("attributes", {})
            return {
                "state": data.get("state", "unknown"),
                "lat": attrs.get("latitude"),
                "lon": attrs.get("longitude"),
                "accuracy": attrs.get("gps_accuracy"),
                "battery": attrs.get("battery_level"),
                "last_updated": data.get("last_updated"),
            }
        except Exception as e:
            return {"error": str(e)}
    
    def get_history(self, days: int = 7) -> list:
        try:
            start = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
            data = self._request(f"/api/history/period/{start}?filter_entity_id={self.entity_id}", timeout=30)
            if not data or not data[0]:
                return []
            
            history = []
            for entry in data[0]:
                attrs = entry.get("attributes", {})
                history.append({
                    "state": entry.get("state", "unknown"),
                    "time": entry.get("last_changed"),
                    "lat": attrs.get("latitude"),
                    "lon": attrs.get("longitude"),
                })
            return history
        except Exception as e:
            return []


class HTTPProvider(LocationProvider):
    """Generic HTTP endpoint provider. Expects JSON: {"lat": N, "lon": N, ...}"""
    
    def __init__(self, url: str, headers: dict = None):
        self.url = url
        self.headers = headers or {}
    
    def get_location(self) -> dict:
        try:
            req = urllib.request.Request(self.url, headers=self.headers)
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.load(resp)
                return {
                    "state": data.get("state", "unknown"),
                    "lat": data.get("lat") or data.get("latitude"),
                    "lon": data.get("lon") or data.get("longitude") or data.get("lng"),
                    "accuracy": data.get("accuracy") or data.get("gps_accuracy"),
                    "battery": data.get("battery") or data.get("battery_level"),
                    "last_updated": data.get("timestamp") or data.get("last_updated"),
                }
        except Exception as e:
            return {"error": str(e)}


class OwnTracksProvider(LocationProvider):
    """OwnTracks HTTP API provider."""
    
    def __init__(self, url: str, user: str, device: str, token: str = None):
        self.url = url.rstrip("/")
        self.user = user
        self.device = device
        self.token = token
    
    def get_location(self) -> dict:
        try:
            endpoint = f"{self.url}/api/0/last"
            headers = {}
            if self.token:
                headers["Authorization"] = f"Bearer {self.token}"
            
            req = urllib.request.Request(endpoint, headers=headers)
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.load(resp)
                # OwnTracks returns list of locations per user/device
                for item in data:
                    if item.get("username") == self.user and item.get("device") == self.device:
                        return {
                            "state": item.get("inregions", ["unknown"])[0] if item.get("inregions") else "unknown",
                            "lat": item.get("lat"),
                            "lon": item.get("lon"),
                            "accuracy": item.get("acc"),
                            "battery": item.get("batt"),
                            "last_updated": datetime.fromtimestamp(item.get("tst", 0), tz=timezone.utc).isoformat(),
                        }
                return {"error": f"No data for {self.user}/{self.device}"}
        except Exception as e:
            return {"error": str(e)}


class GPSLoggerProvider(LocationProvider):
    """GPSLogger file-based provider. Reads latest position from a JSON file."""
    
    def __init__(self, file_path: str):
        self.file_path = Path(file_path)
    
    def get_location(self) -> dict:
        try:
            with open(self.file_path) as f:
                data = json.load(f)
                return {
                    "state": data.get("state", "unknown"),
                    "lat": data.get("lat") or data.get("latitude"),
                    "lon": data.get("lon") or data.get("longitude"),
                    "accuracy": data.get("accuracy"),
                    "battery": data.get("battery"),
                    "last_updated": data.get("timestamp"),
                }
        except Exception as e:
            return {"error": str(e)}


# =============================================================================
# PROVIDER FACTORY
# =============================================================================

def create_provider(config: dict) -> LocationProvider:
    """Create a location provider from config."""
    provider_type = config.get("provider", "homeassistant")
    
    if provider_type == "homeassistant":
        ha = config.get("homeassistant", {})
        return HomeAssistantProvider(
            url=resolve_secret(ha.get("url")) or os.environ.get("HA_URL", ""),
            token=resolve_secret(ha.get("token")) or os.environ.get("HA_TOKEN", ""),
            entity_id=ha.get("entity_id", "device_tracker.phone"),
        )
    
    elif provider_type == "http":
        http = config.get("http", {})
        return HTTPProvider(
            url=http.get("url"),
            headers=http.get("headers", {}),
        )
    
    elif provider_type == "owntracks":
        ot = config.get("owntracks", {})
        return OwnTracksProvider(
            url=ot.get("url"),
            user=ot.get("user"),
            device=ot.get("device"),
            token=resolve_secret(ot.get("token")),
        )
    
    elif provider_type == "gpslogger":
        gl = config.get("gpslogger", {})
        return GPSLoggerProvider(file_path=gl.get("file"))
    
    else:
        raise ValueError(f"Unknown provider: {provider_type}")


# =============================================================================
# CONFIG & STATE
# =============================================================================

_provider = None

def get_provider() -> LocationProvider:
    """Get or create the location provider."""
    global _provider
    if _provider is None:
        config = load_config()
        _provider = create_provider(config)
    return _provider

def load_config() -> dict:
    # Try config.json first, fall back to geofences.json for backward compat
    if CONFIG_FILE.exists():
        with open(CONFIG_FILE) as f:
            return json.load(f)
    if GEOFENCES_FILE.exists():
        with open(GEOFENCES_FILE) as f:
            data = json.load(f)
            # Migrate old format
            if "provider" not in data:
                data["provider"] = "homeassistant"
                data["homeassistant"] = {
                    "entity_id": data.pop("device_tracker", "device_tracker.phone")
                }
            return data
    return {"provider": "homeassistant", "geofences": [], "location_reminders": []}

def load_geofences() -> dict:
    if GEOFENCES_FILE.exists():
        with open(GEOFENCES_FILE) as f:
            return json.load(f)
    return {"geofences": [], "location_reminders": [], "proximity_alerts": []}

def save_geofences(data: dict):
    with open(GEOFENCES_FILE, "w") as f:
        json.dump(data, f, indent=2)

def load_state() -> dict:
    if STATE_FILE.exists():
        with open(STATE_FILE) as f:
            return json.load(f)
    return {"last_triggered": {}}

def save_state(state: dict):
    with open(STATE_FILE, "w") as f:
        json.dump(state, f, indent=2)


# =============================================================================
# GEO UTILITIES
# =============================================================================

def haversine_distance(lat1, lon1, lat2, lon2) -> float:
    """Calculate distance between two coordinates in meters."""
    R = 6371000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi/2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda/2)**2
    return 2 * R * math.atan2(math.sqrt(a), math.sqrt(1-a))

def herewego_link(lat, lon) -> str:
    """Generate HERE WeGo map link (mobile app compatible)."""
    return f"https://share.here.com/l/{lat},{lon}"

def reverse_geocode(lat, lon) -> dict:
    """Get city/region from coordinates using OpenStreetMap Nominatim."""
    url = f"https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lon}&format=json&zoom=10"
    req = urllib.request.Request(url, headers={"User-Agent": "Clawdbot/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.load(resp)
            addr = data.get("address", {})
            city = (addr.get("city") or addr.get("town") or addr.get("village") 
                    or addr.get("county") or addr.get("state"))
            return {"city": city, "country": addr.get("country")}
    except:
        return {"city": None, "country": None}


# =============================================================================
# GEOFENCE LOGIC
# =============================================================================

def check_geofences(location: dict, include_disabled: bool = False) -> list:
    """Return list of geofences the current location is inside."""
    if not location.get("lat") or not location.get("lon"):
        return []
    
    data = load_geofences()
    lat, lon = location["lat"], location["lon"]
    inside = []
    
    for fence in data.get("geofences", []):
        if not include_disabled and not fence.get("enabled", True):
            continue
        dist = haversine_distance(lat, lon, fence["lat"], fence["lon"])
        if dist <= fence["radius_m"]:
            inside.append({
                "id": fence["id"],
                "name": fence["name"],
                "distance_m": round(dist, 1),
                "action": fence.get("action", "none"),
                "message": fence.get("message"),
                "cooldown_hours": fence.get("cooldown_hours", 0),
                "enabled": fence.get("enabled", True)
            })
    return inside

def get_triggered_actions(geofences_inside: list) -> list:
    """Filter geofences to those whose actions should fire (respecting cooldowns)."""
    state = load_state()
    now = datetime.now(timezone.utc)
    triggered = []
    
    for fence in geofences_inside:
        if fence["action"] == "none":
            continue
        fence_id = fence["id"]
        cooldown = fence.get("cooldown_hours", 0)
        last_triggered = state["last_triggered"].get(fence_id)
        
        if last_triggered:
            last_dt = datetime.fromisoformat(last_triggered.replace("Z", "+00:00"))
            if now - last_dt < timedelta(hours=cooldown):
                continue
        
        triggered.append(fence)
        state["last_triggered"][fence_id] = now.isoformat()
    
    if triggered:
        save_state(state)
    return triggered


# =============================================================================
# REMINDERS & ALERTS
# =============================================================================

def check_reminders(geofences_inside: list) -> list:
    """Check and return triggered location reminders (one-shot)."""
    data = load_geofences()
    triggered, remaining = [], []
    inside_ids = {g["id"] for g in geofences_inside}
    
    for reminder in data.get("location_reminders", []):
        if reminder["place_id"] in inside_ids:
            triggered.append(reminder)
        else:
            remaining.append(reminder)
    
    if triggered:
        data["location_reminders"] = remaining
        save_geofences(data)
    return triggered

def add_reminder(text: str, place_id: str) -> dict:
    """Add a one-shot location reminder."""
    data = load_geofences()
    valid_ids = [f["id"] for f in data.get("geofences", [])]
    if place_id not in valid_ids:
        return {"error": f"Unknown place: {place_id}"}
    
    reminder = {"text": text, "place_id": place_id, "created": datetime.now(timezone.utc).isoformat()}
    data.setdefault("location_reminders", []).append(reminder)
    save_geofences(data)
    
    place_name = next(f["name"] for f in data["geofences"] if f["id"] == place_id)
    return {"success": True, "reminder": reminder, "place_name": place_name}

def check_proximity_alerts(location: dict) -> list:
    """Check and return triggered proximity alerts (one-shot)."""
    if not location.get("lat") or not location.get("lon"):
        return []
    
    data = load_geofences()
    triggered, remaining = [], []
    
    for alert in data.get("proximity_alerts", []):
        dist = haversine_distance(location["lat"], location["lon"], alert["lat"], alert["lon"])
        if dist <= alert["radius_m"]:
            triggered.append(alert)
        else:
            remaining.append(alert)
    
    if triggered:
        data["proximity_alerts"] = remaining
        save_geofences(data)
    return triggered

def add_proximity_alert(text: str, lat: float, lon: float, radius_m: int = 1000) -> dict:
    """Add a proximity alert."""
    data = load_geofences()
    alert = {"text": text, "lat": lat, "lon": lon, "radius_m": radius_m, "created": datetime.now(timezone.utc).isoformat()}
    data.setdefault("proximity_alerts", []).append(alert)
    save_geofences(data)
    return {"success": True, "alert": alert}


# =============================================================================
# PLACE MANAGEMENT
# =============================================================================

def add_geofence(name: str, fence_id: str = None, radius_m: int = 50, region: str = None, category: str = None) -> dict:
    """Add a new geofence at current location."""
    loc = get_provider().get_location()
    if "error" in loc:
        return {"error": loc["error"]}
    if not loc.get("lat") or not loc.get("lon"):
        return {"error": "No location available"}
    
    data = load_geofences()
    
    if not fence_id:
        fence_id = name.lower().replace(" ", "_").replace("-", "_")
    
    if fence_id in [f["id"] for f in data.get("geofences", [])]:
        return {"error": f"Place already exists: {fence_id}"}
    
    if not region:
        geo = reverse_geocode(loc["lat"], loc["lon"])
        region = geo.get("city") or geo.get("country") or "Unknown"
    
    new_fence = {
        "id": fence_id, "name": name,
        "lat": loc["lat"], "lon": loc["lon"],
        "radius_m": radius_m, "action": "none",
        "cooldown_hours": 0, "message": None,
        "enabled": True, "region": region, "category": category
    }
    
    data.setdefault("geofences", []).append(new_fence)
    save_geofences(data)
    return {"success": True, "geofence": new_fence}

def edit_geofence(fence_id: str, updates: dict) -> dict:
    """Edit an existing geofence."""
    data = load_geofences()
    for fence in data.get("geofences", []):
        if fence["id"] == fence_id:
            for key in ["name", "region", "category", "action", "message"]:
                if key in updates:
                    fence[key] = updates[key]
            for key in ["radius", "cooldown"]:
                if key in updates:
                    fence[f"{key}_m" if key == "radius" else f"{key}_hours"] = int(updates[key])
            save_geofences(data)
            return {"success": True, "geofence": fence}
    return {"error": f"Unknown place: {fence_id}"}

def delete_geofence(fence_id: str) -> dict:
    """Delete a geofence."""
    data = load_geofences()
    original_len = len(data.get("geofences", []))
    data["geofences"] = [g for g in data.get("geofences", []) if g["id"] != fence_id]
    if len(data["geofences"]) == original_len:
        return {"error": f"Unknown place: {fence_id}"}
    save_geofences(data)
    return {"success": True, "deleted": fence_id}

def set_geofence_enabled(fence_id: str, enabled: bool) -> dict:
    """Enable or disable a geofence."""
    data = load_geofences()
    for fence in data.get("geofences", []):
        if fence["id"] == fence_id:
            fence["enabled"] = enabled
            save_geofences(data)
            return {"success": True, "id": fence_id, "enabled": enabled, "name": fence["name"]}
    return {"error": f"Unknown place: {fence_id}"}


# =============================================================================
# HISTORY & STATS
# =============================================================================

def get_history(place_id: str = None, days: int = 7) -> dict:
    """Query location history."""
    provider = get_provider()
    history = provider.get_history(days)
    
    if history is None:
        return {"error": "History not supported by this provider"}
    if not history:
        return {"visits": []}
    
    data = load_geofences()
    target_fence = None
    if place_id:
        for f in data.get("geofences", []):
            if f["id"] == place_id or f["name"].lower() == place_id.lower():
                target_fence = f
                break
        if not target_fence:
            return {"error": f"Unknown place: {place_id}"}
    
    visits = []
    for entry in history:
        state = entry.get("state", "").lower()
        lat, lon = entry.get("lat"), entry.get("lon")
        
        if target_fence:
            name_match = state == target_fence["name"].lower() or state.replace(" ", "_") == target_fence["id"]
            coord_match = lat and lon and haversine_distance(lat, lon, target_fence["lat"], target_fence["lon"]) <= target_fence["radius_m"]
            if name_match or coord_match:
                visits.append({"state": entry.get("state"), "time": entry.get("time")})
        else:
            visits.append({"state": entry.get("state"), "time": entry.get("time")})
    
    # Dedupe consecutive same-state entries
    if visits:
        deduped = [visits[0]]
        for v in visits[1:]:
            if v["state"] != deduped[-1]["state"]:
                deduped.append(v)
        visits = deduped
    
    return {"visits": visits[-10:], "place": target_fence["name"] if target_fence else "all"}

def get_stats(days: int = 7) -> dict:
    """Get location statistics."""
    provider = get_provider()
    history = provider.get_history(days)
    
    if history is None:
        return {"error": "History not supported by this provider"}
    if not history:
        return {"error": "No history found"}
    
    place_time, place_visits = {}, {}
    last_state, last_time = None, None
    
    for entry in history:
        state = entry.get("state", "unknown")
        time_str = entry.get("time")
        if not time_str:
            continue
        
        current_time = datetime.fromisoformat(time_str.replace("Z", "+00:00"))
        
        if last_state and last_time:
            duration = (current_time - last_time).total_seconds()
            place_time[last_state] = place_time.get(last_state, 0) + duration
            if state != last_state:
                place_visits[state] = place_visits.get(state, 0) + 1
        else:
            place_visits[state] = place_visits.get(state, 0) + 1
        
        last_state, last_time = state, current_time
    
    if last_state and last_time:
        duration = (datetime.now(timezone.utc) - last_time).total_seconds()
        place_time[last_state] = place_time.get(last_state, 0) + duration
    
    stats = [{"place": p, "hours": round(s/3600, 1), "visits": place_visits.get(p, 0)} 
             for p, s in sorted(place_time.items(), key=lambda x: -x[1])]
    return {"stats": stats[:10], "days": days}


# =============================================================================
# POI DISCOVERY
# =============================================================================

def search_nearby_pois(category: str, radius_m: int = 500) -> dict:
    """Search for nearby POIs using OpenStreetMap Overpass API."""
    loc = get_provider().get_location()
    if "error" in loc:
        return {"error": loc["error"]}
    if not loc.get("lat") or not loc.get("lon"):
        return {"error": "No location available"}
    
    lat, lon = loc["lat"], loc["lon"]
    
    category_map = {
        "cafe": "amenity=cafe", "coffee": "amenity=cafe",
        "pub": "amenity=pub", "bar": "amenity=bar",
        "restaurant": "amenity=restaurant", "food": "amenity=restaurant",
        "supermarket": "shop=supermarket", "grocery": "shop=supermarket",
        "pharmacy": "amenity=pharmacy", "bank": "amenity=bank",
        "atm": "amenity=atm", "parking": "amenity=parking",
        "toilet": "amenity=toilets", "hotel": "tourism=hotel",
        "museum": "tourism=museum", "library": "amenity=library",
        "hospital": "amenity=hospital", "petrol": "amenity=fuel",
        "post": "amenity=post_office", "shop": "shop=convenience",
    }
    
    osm_tag = category_map.get(category.lower(), f"amenity={category}")
    query = f"[out:json][timeout:10];(node[{osm_tag}](around:{radius_m},{lat},{lon});way[{osm_tag}](around:{radius_m},{lat},{lon}););out center tags;"
    
    try:
        req = urllib.request.Request(
            "https://overpass-api.de/api/interpreter",
            data=query.encode("utf-8"),
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            result = json.load(resp)
            pois = []
            for elem in result.get("elements", []):
                tags = elem.get("tags", {})
                poi_lat = elem.get("lat") or elem.get("center", {}).get("lat")
                poi_lon = elem.get("lon") or elem.get("center", {}).get("lon")
                if poi_lat and poi_lon:
                    pois.append({
                        "name": tags.get("name", "Unnamed"),
                        "distance_m": round(haversine_distance(lat, lon, poi_lat, poi_lon)),
                        "lat": poi_lat, "lon": poi_lon
                    })
            pois.sort(key=lambda x: x["distance_m"])
            return {"pois": pois[:10], "category": category, "radius_m": radius_m}
    except Exception as e:
        return {"error": str(e)}


# =============================================================================
# CLI
# =============================================================================

def parse_args(argv):
    args, flags = [], {}
    i = 0
    while i < len(argv):
        if argv[i].startswith("--"):
            key = argv[i][2:]
            if i + 1 < len(argv) and not argv[i + 1].startswith("--"):
                flags[key] = argv[i + 1]
                i += 2
            else:
                flags[key] = True
                i += 1
        else:
            args.append(argv[i])
            i += 1
    return args, flags

def main():
    if len(sys.argv) < 2:
        print("Usage: location.py <command> [args] [--flags]")
        print("Commands: status, herewego, check, places, geofences, remind, reminders,")
        print("          addplace, editplace, delplace, enable, disable, history, stats,")
        print("          nearby, proximity")
        print("Add --human for human-readable output")
        sys.exit(1)
    
    args, flags = parse_args(sys.argv[1:])
    cmd = args[0] if args else ""
    human = "json" not in flags  # Human output by default, use --json for JSON
    provider = get_provider()
    
    # --- Query Commands ---
    
    if cmd == "status":
        loc = provider.get_location()
        if "error" in loc:
            print(loc["error"] if human else json.dumps(loc)); sys.exit(1)
        fences = check_geofences(loc, include_disabled=True)
        loc["geofences"] = fences
        loc["herewego"] = herewego_link(loc["lat"], loc["lon"]) if loc.get("lat") else None
        if human:
            zone = loc.get("state", "Unknown")
            battery = f" ({loc['battery']}% battery)" if loc.get("battery") else ""
            # If not in a known zone, reverse geocode for a friendly address
            if zone.lower() in ("not_home", "away", "unknown", "unavailable", ""):
                if loc.get("lat") and loc.get("lon"):
                    address = reverse_geocode(loc["lat"], loc["lon"])
                    print(f"{address}{battery}")
                else:
                    print(f"Unknown location{battery}")
            else:
                print(f"{zone}{battery}")
        else:
            print(json.dumps(loc, indent=2))
    
    elif cmd == "herewego":
        loc = provider.get_location()
        if loc.get("lat") and loc.get("lon"):
            print(herewego_link(loc["lat"], loc["lon"]))
        else:
            print(json.dumps({"error": "No location available"})); sys.exit(1)
    
    elif cmd == "check":
        loc = provider.get_location()
        if "error" in loc or not loc.get("lat"):
            print(json.dumps({"actions": [], "reminders": [], "proximity_alerts": []}))
            sys.exit(0)
        fences = check_geofences(loc)
        print(json.dumps({
            "location": loc["state"],
            "lat": loc["lat"], "lon": loc["lon"],
            "actions": get_triggered_actions(fences),
            "reminders": check_reminders(fences),
            "proximity_alerts": check_proximity_alerts(loc)
        }, indent=2))
    
    # --- Place Listing ---
    
    elif cmd == "places":
        data = load_geofences()
        near_mode = "near" in flags
        region_filter = flags.get("region", "").lower() if "region" in flags else None
        category_filter = flags.get("category", "").lower() if "category" in flags else None
        
        loc = provider.get_location() if near_mode else None
        if near_mode and (not loc or "error" in loc):
            print(json.dumps({"error": "Cannot get location"})); sys.exit(1)
        
        places = []
        for f in data.get("geofences", []):
            if region_filter and region_filter not in (f.get("region") or "").lower():
                continue
            if category_filter and category_filter not in (f.get("category") or "").lower():
                continue
            
            place = {"id": f["id"], "name": f["name"]}
            if f.get("region"): place["region"] = f["region"]
            if f.get("category"): place["category"] = f["category"]
            
            if near_mode:
                dist = haversine_distance(loc["lat"], loc["lon"], f["lat"], f["lon"])
                if dist > 10000: continue
                place["distance_km"] = round(dist / 1000, 1)
            
            places.append(place)
        
        if near_mode:
            places.sort(key=lambda x: x.get("distance_km", 0))
        if human:
            if not places:
                print("No places saved.")
            else:
                for p in places:
                    parts = [p["name"]]
                    if p.get("region"): parts.append(p["region"])
                    if p.get("category"): parts.append(p["category"])
                    if p.get("distance_km"): parts.append(f"{p['distance_km']} km")
                    print(f"• {parts[0]}" + (f" ({', '.join(parts[1:])})" if len(parts) > 1 else ""))
        else:
            print(json.dumps(places, indent=2))

    elif cmd == "geofences":
        data = load_geofences()
        fences = [{
            "id": f["id"], "name": f["name"],
            "action": f.get("action", "none"),
            "cooldown_hours": f.get("cooldown_hours", 0),
            "radius_m": f.get("radius_m"),
            "enabled": f.get("enabled", True),
            "region": f.get("region"),
            "category": f.get("category")
        } for f in data.get("geofences", [])]
        if human:
            if not fences:
                print("No geofence rules configured.")
            else:
                for f in fences:
                    status = "enabled" if f["enabled"] else "disabled"
                    action = f["action"] if f["action"] != "none" else "no action"
                    print(f"• {f['name']} — {action} ({status})")
        else:
            print(json.dumps(fences, indent=2))
    
    # --- Reminders ---
    
    elif cmd == "remind":
        if len(args) < 3:
            print("Usage: location.py remind <text> <place_id>"); sys.exit(1)
        print(json.dumps(add_reminder(args[1], args[2]), indent=2))
    
    elif cmd == "reminders":
        data = load_geofences()
        reminders = data.get("location_reminders", [])
        if human:
            if not reminders:
                print("No pending reminders.")
            else:
                for r in reminders:
                    print(f"• {r['text']} (when: {r['place_id']})")
        else:
            print(json.dumps(reminders, indent=2))
    
    elif cmd == "proximity":
        if len(args) < 3:
            print("Usage: location.py proximity <text> <place_id|lat> [lon] [radius_m]"); sys.exit(1)
        text = args[1]
        data = load_geofences()
        place = next((f for f in data.get("geofences", []) if f["id"] == args[2]), None)
        if place:
            lat, lon = place["lat"], place["lon"]
            radius = int(args[3]) if len(args) > 3 else 1000
        else:
            lat, lon = float(args[2]), float(args[3])
            radius = int(args[4]) if len(args) > 4 else 1000
        print(json.dumps(add_proximity_alert(text, lat, lon, radius), indent=2))
    
    # --- Place Management ---
    
    elif cmd == "addplace":
        if len(args) < 2:
            print("Usage: location.py addplace <name> [radius] [--region R] [--category C]"); sys.exit(1)
        print(json.dumps(add_geofence(
            args[1], radius_m=int(args[2]) if len(args) > 2 else 50,
            region=flags.get("region"), category=flags.get("category")
        ), indent=2))
    
    elif cmd == "editplace":
        if len(args) < 2:
            print("Usage: location.py editplace <id> [--name N] [--radius R] ..."); sys.exit(1)
        print(json.dumps(edit_geofence(args[1], flags), indent=2))
    
    elif cmd == "delplace":
        if len(args) < 2:
            print("Usage: location.py delplace <id>"); sys.exit(1)
        print(json.dumps(delete_geofence(args[1]), indent=2))
    
    elif cmd == "enable":
        if len(args) < 2:
            print("Usage: location.py enable <id>"); sys.exit(1)
        print(json.dumps(set_geofence_enabled(args[1], True), indent=2))
    
    elif cmd == "disable":
        if len(args) < 2:
            print("Usage: location.py disable <id>"); sys.exit(1)
        print(json.dumps(set_geofence_enabled(args[1], False), indent=2))
    
    # --- History & Stats ---
    
    elif cmd == "history":
        place = args[1] if len(args) > 1 else None
        print(json.dumps(get_history(place, int(flags.get("days", 7))), indent=2))
    
    elif cmd == "stats":
        print(json.dumps(get_stats(int(flags.get("days", 7))), indent=2))
    
    # --- POI Discovery ---
    
    elif cmd == "nearby":
        if len(args) < 2:
            print("Usage: location.py nearby <category> [radius_m]"); sys.exit(1)
        print(json.dumps(search_nearby_pois(args[1], int(args[2]) if len(args) > 2 else 500), indent=2))
    
    elif cmd == "eta":
        if len(args) < 2:
            print("Usage: location.py eta <place_id|lat,lon> [--mode walk|bike|car]")
            sys.exit(1)
        data = load_geofences()
        place = next((f for f in data.get("geofences", []) if f["id"] == args[1] or f["name"].lower() == args[1].lower()), None)
        if place:
            dest_lat, dest_lon = place["lat"], place["lon"]
            dest_name = place["name"]
        elif "," in args[1]:
            parts = args[1].split(",")
            dest_lat, dest_lon = float(parts[0]), float(parts[1])
            dest_name = f"{dest_lat},{dest_lon}"
        else:
            # Try geocoding the place name, biased to current location
            loc = provider.get_location()
            geo = geocode(args[1], loc.get("lat"), loc.get("lon"))
            if "error" in geo:
                if human:
                    print(geo["error"])
                else:
                    print(json.dumps(geo))
                sys.exit(1)
            dest_lat, dest_lon = geo["lat"], geo["lon"]
            dest_name = geo["name"]
        mode = flags.get("mode", "walk")
        result = get_eta(dest_lat, dest_lon, mode)
        if "error" not in result:
            result["destination"] = dest_name
        if human:
            if "error" in result:
                print(result["error"])
            else:
                mode_word = {"foot": "walk", "bike": "cycle", "car": "drive"}.get(result.get("mode", "foot"), "walk")
                print(f"{result['distance']}, about {result['duration']} {mode_word}")
        else:
            print(json.dumps(result, indent=2))

    else:
        print(f"Unknown command: {cmd}"); sys.exit(1)


def geocode(query: str, near_lat: float = None, near_lon: float = None) -> dict:
    """Geocode a place name using Nominatim (OpenStreetMap), biased to location."""
    try:
        encoded = urllib.parse.quote(query)
        url = f"https://nominatim.openstreetmap.org/search?q={encoded}&format=json&limit=5"
        # Add viewbox bias if we have a location (±0.5 degrees ~ 50km)
        if near_lat and near_lon:
            vb = f"{near_lon-0.5},{near_lat+0.5},{near_lon+0.5},{near_lat-0.5}"
            url += f"&viewbox={vb}&bounded=0"
        req = urllib.request.Request(url, headers={"User-Agent": "Clawdbot/1.0"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.load(resp)
            if not data:
                return {"error": f"Could not find location: {query}"}
            # If we have location, pick closest result
            if near_lat and near_lon and len(data) > 1:
                data.sort(key=lambda r: haversine_distance(near_lat, near_lon, float(r["lat"]), float(r["lon"])))
            result = data[0]
            return {
                "lat": float(result["lat"]),
                "lon": float(result["lon"]),
                "name": result.get("display_name", query).split(",")[0]
            }
    except Exception as e:
        return {"error": str(e)}


def reverse_geocode(lat: float, lon: float) -> str:
    """Reverse geocode coordinates to a human-readable address."""
    try:
        url = f"https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lon}&format=json&zoom=18"
        req = urllib.request.Request(url, headers={"User-Agent": "Clawdbot/1.0"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.load(resp)
            addr = data.get("address", {})
            # Build a concise address
            parts = []
            # Street-level
            for key in ["road", "pedestrian", "footway", "path"]:
                if addr.get(key):
                    parts.append(addr[key])
                    break
            # Area
            for key in ["suburb", "neighbourhood", "quarter", "village"]:
                if addr.get(key):
                    parts.append(addr[key])
                    break
            # City
            for key in ["city", "town", "municipality"]:
                if addr.get(key):
                    parts.append(addr[key])
                    break
            if parts:
                return ", ".join(parts)
            # Fallback to display_name
            display = data.get("display_name", "")
            return ", ".join(display.split(",")[:3]) if display else f"{lat:.4f}, {lon:.4f}"
    except Exception:
        return f"{lat:.4f}, {lon:.4f}"


def get_eta(dest_lat: float, dest_lon: float, mode: str = "foot") -> dict:
    """Get travel time and distance to destination using OSRM."""
    loc = get_provider().get_location()
    if "error" in loc:
        return {"error": loc["error"]}
    if not loc.get("lat") or not loc.get("lon"):
        return {"error": "No location available"}
    
    # OSRM profiles
    profiles = {
        "walk": "foot",
        "foot": "foot",
        "bike": "bike",
        "cycle": "bike",
        "car": "car",
        "drive": "car",
    }
    profile = profiles.get(mode.lower(), "foot")
    
    # Query OSRM demo server
    orig = f"{loc['lon']},{loc['lat']}"
    dest = f"{dest_lon},{dest_lat}"
    url = f"http://router.project-osrm.org/route/v1/{profile}/{orig};{dest}?overview=false"
    
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Clawdbot/1.0"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.load(resp)
            if data.get("code") != "Ok" or not data.get("routes"):
                return {"error": "No route found"}
            
            route = data["routes"][0]
            distance_m = route["distance"]
            
            # OSRM demo server only has driving data, so calculate duration by mode
            # Read speeds from config, with sensible defaults
            config = load_config()
            config_speeds = config.get("speeds_kmh", {})
            speeds = {
                "foot": config_speeds.get("walk", 5),
                "bike": config_speeds.get("bike", 15),
                "car": None  # use OSRM for driving
            }
            speed = speeds.get(profile)
            if speed:
                duration_s = (distance_m / 1000) / speed * 3600  # seconds
            else:
                duration_s = route["duration"]  # use OSRM for driving
            
            # Format nicely
            if distance_m < 1000:
                distance_str = f"{round(distance_m)} m"
            else:
                distance_str = f"{round(distance_m / 1000, 1)} km"
            
            mins = int(duration_s // 60)
            if mins < 60:
                duration_str = f"{mins} min"
            else:
                hours = mins // 60
                remaining_mins = mins % 60
                duration_str = f"{hours}h {remaining_mins}m"
            
            return {
                "distance_m": round(distance_m),
                "distance": distance_str,
                "duration_s": round(duration_s),
                "duration": duration_str,
                "mode": profile,
                "from": {"lat": loc["lat"], "lon": loc["lon"]},
                "to": {"lat": dest_lat, "lon": dest_lon}
            }
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    main()
