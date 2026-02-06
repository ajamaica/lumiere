#!/usr/bin/env python3
"""
Google Maps v3.1 - Next-Gen Maps Integration for OpenClaw
Author: Leo 🦁
Updated: 2026-02-06

Migrated to the NEW Routes API (replacing deprecated Distance Matrix & Directions APIs)

Features:
- Routes API (computeRoutes) - Modern directions with traffic
- Route Matrix API (computeRouteMatrix) - Distance/duration matrix
- Places API - Search and details
- Geocoding API - Address ↔ coordinates
- Future departure time prediction
- Traffic models (best_guess, pessimistic, optimistic)
- Route modifiers (avoid tolls, highways, ferries)
- Multiple travel modes (drive, walk, bicycle, transit, two_wheeler)
- Fuel-efficient and shorter-distance route options
- Waypoint optimization (TSP)
- Transit preferences (arrival time, route types)

APIs Used:
- Routes API v2 (NEW) - for routes and distance matrix
- Places API - for search and details
- Geocoding API - for address conversion
"""

import requests
import sys
import json
import os
from datetime import datetime, timedelta, timezone
import re


class GoogleMapsElite:
    """Google Maps integration for OpenClaw - v3.0 with Routes API."""
    
    # Default language: check env var, fall back to English
    DEFAULT_LANG = os.getenv("GOOGLE_MAPS_LANG", "en")
    
    def __init__(self):
        self.api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GOOGLE_MAPS_API_KEY")
        self.maps_base = "https://maps.googleapis.com/maps/api"
        self.routes_base = "https://routes.googleapis.com"
        self._current_lang = self.DEFAULT_LANG  # Track current request language
    
    def _validate_key(self):
        if not self.api_key:
            return {"error": "Missing API key. Set GOOGLE_API_KEY environment variable."}
        return None
    
    def _parse_time(self, time_str):
        """
        Parse time string to RFC 3339 timestamp for Routes API.
        Supports:
        - "now" → current time
        - "+30m", "+1h", "+2h30m" → relative time
        - "14:00", "14:30" → today at that time (or tomorrow if passed)
        - "2026-02-06 14:00" → specific datetime
        - Unix timestamp (integer)
        
        Returns RFC 3339 format: "2026-02-06T14:00:00Z"
        """
        if time_str is None or time_str == "now":
            return None  # Routes API uses current time by default
        
        now = datetime.now(timezone.utc)
        local_now = datetime.now()
        
        # Already a timestamp
        if isinstance(time_str, int) or (isinstance(time_str, str) and time_str.isdigit()):
            ts = int(time_str)
            dt = datetime.fromtimestamp(ts, timezone.utc)
            return dt.strftime("%Y-%m-%dT%H:%M:%SZ")
        
        # Relative time: +30m, +1h, +2h30m
        relative_match = re.match(r'^\+(\d+h)?(\d+m)?$', time_str.replace(' ', ''))
        if relative_match:
            hours = int(relative_match.group(1)[:-1]) if relative_match.group(1) else 0
            minutes = int(relative_match.group(2)[:-1]) if relative_match.group(2) else 0
            future = now + timedelta(hours=hours, minutes=minutes)
            return future.strftime("%Y-%m-%dT%H:%M:%SZ")
        
        # Time only: 14:00, 14:30 (local time)
        time_only_match = re.match(r'^(\d{1,2}):(\d{2})$', time_str)
        if time_only_match:
            hour, minute = int(time_only_match.group(1)), int(time_only_match.group(2))
            target = local_now.replace(hour=hour, minute=minute, second=0, microsecond=0)
            if target <= local_now:
                target += timedelta(days=1)  # Tomorrow if time has passed
            # Convert to UTC
            target_utc = target.astimezone(timezone.utc)
            return target_utc.strftime("%Y-%m-%dT%H:%M:%SZ")
        
        # Full datetime: 2026-02-06 14:00 (local time)
        try:
            dt = datetime.strptime(time_str, "%Y-%m-%d %H:%M")
            dt_utc = dt.astimezone(timezone.utc)
            return dt_utc.strftime("%Y-%m-%dT%H:%M:%SZ")
        except ValueError:
            pass
        
        # ISO format with timezone
        try:
            dt = datetime.fromisoformat(time_str.replace('Z', '+00:00'))
            return dt.strftime("%Y-%m-%dT%H:%M:%SZ")
        except ValueError:
            pass
        
        return None  # Fallback to current time
    
    def _format_duration(self, duration_str):
        """Convert '1234s' to human readable format."""
        if not duration_str:
            return None
        lang = getattr(self, '_current_lang', self.DEFAULT_LANG)
        seconds = int(duration_str.rstrip('s'))
        hours = seconds // 3600
        minutes = (seconds % 3600) // 60
        
        if lang == "he":
            if hours > 0:
                return f"{hours} שעות {minutes} דקות" if minutes > 0 else f"{hours} שעות"
            return f"{minutes} דקות"
        else:
            # English/international
            if hours > 0:
                return f"{hours} hr {minutes} min" if minutes > 0 else f"{hours} hr"
            return f"{minutes} min"
    
    def _format_distance(self, meters):
        """Convert meters to km or m."""
        lang = getattr(self, '_current_lang', self.DEFAULT_LANG)
        if lang == "he":
            if meters >= 1000:
                return f"{meters/1000:.1f} ק\"מ"
            return f"{meters} מ'"
        else:
            # English/international - use km
            if meters >= 1000:
                return f"{meters/1000:.1f} km"
            return f"{meters} m"
    
    def _travel_mode(self, mode):
        """Convert user-friendly mode to Routes API enum."""
        modes = {
            'driving': 'DRIVE',
            'drive': 'DRIVE',
            'walking': 'WALK',
            'walk': 'WALK',
            'bicycling': 'BICYCLE',
            'bicycle': 'BICYCLE',
            'bike': 'BICYCLE',
            'transit': 'TRANSIT',
            'two_wheeler': 'TWO_WHEELER',
            'motorcycle': 'TWO_WHEELER',
        }
        return modes.get(mode.lower(), 'DRIVE')
    
    def _routing_preference(self, traffic_mode):
        """Get routing preference based on traffic mode."""
        if traffic_mode in ['optimistic', 'pessimistic']:
            return 'TRAFFIC_AWARE_OPTIMAL'  # Required for traffic models
        return 'TRAFFIC_AWARE'  # Good balance of speed and accuracy
    
    def _traffic_model(self, model):
        """Convert user-friendly traffic model to API enum."""
        models = {
            'best_guess': 'BEST_GUESS',
            'optimistic': 'OPTIMISTIC',
            'pessimistic': 'PESSIMISTIC',
        }
        return models.get(model.lower(), 'BEST_GUESS') if model else None

    # ==================== GEOCODING ====================
    
    def geocode(self, address, language=None):
        """Convert address to coordinates (forward geocoding)."""
        language = language or self.DEFAULT_LANG
        error = self._validate_key()
        if error:
            return error
        
        url = f"{self.maps_base}/geocode/json"
        params = {
            "address": address,
            "key": self.api_key,
            "language": language
        }
        
        res = requests.get(url, params=params).json()
        
        if res.get("status") == "OK" and res.get("results"):
            result = res["results"][0]
            location = result["geometry"]["location"]
            return {
                "address": result["formatted_address"],
                "lat": location["lat"],
                "lng": location["lng"],
                "place_id": result.get("place_id"),
                "location_type": result["geometry"].get("location_type")
            }
        
        return {"error": f"Geocoding failed: {res.get('status')}"}
    
    def reverse_geocode(self, lat, lng, language=None):
        """Convert coordinates to address (reverse geocoding)."""
        language = language or self.DEFAULT_LANG
        error = self._validate_key()
        if error:
            return error
        
        url = f"{self.maps_base}/geocode/json"
        params = {
            "latlng": f"{lat},{lng}",
            "key": self.api_key,
            "language": language
        }
        
        res = requests.get(url, params=params).json()
        
        if res.get("status") == "OK" and res.get("results"):
            result = res["results"][0]
            return {
                "address": result["formatted_address"],
                "place_id": result.get("place_id"),
                "types": result.get("types", [])
            }
        
        return {"error": f"Reverse geocoding failed: {res.get('status')}"}

    # ==================== PLACES ====================
    
    def search(self, query, location="32.0684,34.7905", radius=2000, open_now=False, language=None):
        """Search for places by text query."""
        language = language or self.DEFAULT_LANG
        error = self._validate_key()
        if error:
            return error
        
        url = f"{self.maps_base}/place/textsearch/json"
        params = {
            "query": query,
            "location": location,
            "radius": radius,
            "key": self.api_key,
            "language": language
        }
        if open_now:
            params["opennow"] = "true"
        
        res = requests.get(url, params=params).json()
        results = res.get("results", [])[:5]
        
        for place in results:
            if place.get("photos"):
                photo_ref = place["photos"][0]["photo_reference"]
                place["photo_url"] = f"https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference={photo_ref}&key={self.api_key}"
        
        return results
    
    def details(self, place_id, language=None):
        """Get detailed information about a place."""
        language = language or self.DEFAULT_LANG
        error = self._validate_key()
        if error:
            return error
        
        url = f"{self.maps_base}/place/details/json"
        params = {
            "place_id": place_id,
            "key": self.api_key,
            "language": language,
            "fields": "name,opening_hours,formatted_phone_number,rating,formatted_address,reviews,url,price_level,photos,vicinity,website"
        }
        
        res = requests.get(url, params=params).json().get("result", {})
        
        if res.get("photos"):
            photo_ref = res["photos"][0]["photo_reference"]
            res["photo_url"] = f"https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference={photo_ref}&key={self.api_key}"
        
        return res

    # ==================== ROUTES API - DISTANCE ====================
    
    def _resolve_location(self, location_str):
        """
        Resolve a location string to lat/lng.
        Accepts: address string, "lat,lng", or place_id:xxx
        """
        # Check if it's already coordinates
        coord_match = re.match(r'^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$', location_str.strip())
        if coord_match:
            return {
                "location": {
                    "latLng": {
                        "latitude": float(coord_match.group(1)),
                        "longitude": float(coord_match.group(2))
                    }
                }
            }
        
        # Check if it's a place_id
        if location_str.startswith("place_id:"):
            return {"placeId": location_str[9:]}
        
        # Geocode the address
        geo = self.geocode(location_str)
        if "error" in geo:
            return None
        
        return {
            "location": {
                "latLng": {
                    "latitude": geo["lat"],
                    "longitude": geo["lng"]
                }
            }
        }
    
    def distance(self, origin, destination, mode="driving", language=None,
                 departure_time=None, arrival_time=None, traffic_model=None, avoid=None):
        """
        Calculate distance and duration between two points using Routes API.
        
        Args:
            origin: Starting point (address, coordinates, or place_id:xxx)
            destination: End point
            mode: Travel mode - driving, walking, bicycling, transit, two_wheeler
            departure_time: When to leave - "now", "+30m", "+1h", "14:00", "2026-02-06 14:00"
            arrival_time: When to arrive (transit only)
            traffic_model: "best_guess" (default), "pessimistic", "optimistic"
            avoid: Comma-separated - "tolls", "highways", "ferries"
        
        Returns:
            dict with distance, duration, duration_in_traffic
        """
        language = language or self.DEFAULT_LANG
        self._current_lang = language  # Store for formatting functions
        error = self._validate_key()
        if error:
            return error
        
        # Resolve locations
        origin_wp = self._resolve_location(origin)
        dest_wp = self._resolve_location(destination)
        
        if not origin_wp or not dest_wp:
            return {"error": "Could not resolve origin or destination address"}
        
        # Build request
        travel_mode = self._travel_mode(mode)
        
        # For computeRoutes, origin/destination are direct Waypoint objects
        request_body = {
            "origin": origin_wp,
            "destination": dest_wp,
            "travelMode": travel_mode,
            "languageCode": language,
            "units": "METRIC"
        }
        
        # Routing preference (only for DRIVE/TWO_WHEELER)
        if travel_mode in ['DRIVE', 'TWO_WHEELER']:
            request_body["routingPreference"] = self._routing_preference(traffic_model)
            
            # Traffic model (only with TRAFFIC_AWARE_OPTIMAL)
            if traffic_model and traffic_model.lower() in ['optimistic', 'pessimistic']:
                request_body["trafficModel"] = self._traffic_model(traffic_model)
        
        # Departure time
        if departure_time:
            parsed = self._parse_time(departure_time)
            if parsed:
                request_body["departureTime"] = parsed
        
        # Arrival time (transit only)
        if arrival_time and travel_mode == "TRANSIT":
            parsed = self._parse_time(arrival_time)
            if parsed:
                request_body["arrivalTime"] = parsed
                request_body.pop("departureTime", None)
        
        # Route modifiers
        if avoid:
            modifiers = {}
            avoid_list = [a.strip().lower() for a in avoid.split(",")]
            if "tolls" in avoid_list:
                modifiers["avoidTolls"] = True
            if "highways" in avoid_list:
                modifiers["avoidHighways"] = True
            if "ferries" in avoid_list:
                modifiers["avoidFerries"] = True
            if modifiers:
                request_body["routeModifiers"] = modifiers
        
        # Call Routes API
        url = f"{self.routes_base}/directions/v2:computeRoutes"
        headers = {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": self.api_key,
            "X-Goog-FieldMask": "routes.duration,routes.staticDuration,routes.distanceMeters,routes.legs.startLocation,routes.legs.endLocation"
        }
        
        response = requests.post(url, headers=headers, json=request_body)
        
        if response.status_code != 200:
            return {"error": f"API error: {response.status_code}", "details": response.text}
        
        data = response.json()
        
        if not data.get("routes"):
            return {"error": "No route found"}
        
        route = data["routes"][0]
        
        result = {
            "distance": self._format_distance(route.get("distanceMeters", 0)),
            "distance_meters": route.get("distanceMeters", 0),
        }
        
        # Duration (with traffic for DRIVE)
        if route.get("duration"):
            result["duration"] = self._format_duration(route["duration"])
            result["duration_seconds"] = int(route["duration"].rstrip('s'))
        
        # Static duration (without traffic)
        if route.get("staticDuration"):
            result["static_duration"] = self._format_duration(route["staticDuration"])
            result["static_duration_seconds"] = int(route["staticDuration"].rstrip('s'))
        
        # If traffic-aware, duration already includes traffic
        if travel_mode in ['DRIVE', 'TWO_WHEELER'] and route.get("duration"):
            result["duration_in_traffic"] = result["duration"]
            result["duration_in_traffic_seconds"] = result["duration_seconds"]
        
        # Add departure time info
        if departure_time and departure_time != "now":
            result["departure_time"] = departure_time
        
        return result

    # ==================== ROUTES API - DIRECTIONS ====================
    
    def directions(self, origin, destination, mode="driving", language=None,
                   departure_time=None, arrival_time=None, alternatives=False,
                   avoid=None, waypoints=None, optimize_waypoints=False,
                   fuel_efficient=False, shorter_distance=False):
        """
        Get full directions with route steps using Routes API.
        
        Args:
            origin: Starting point
            destination: End point
            mode: driving, walking, bicycling, transit, two_wheeler
            departure_time: When to leave
            arrival_time: When to arrive (transit only)
            alternatives: Return alternative routes
            avoid: tolls, highways, ferries
            waypoints: List of intermediate stops
            optimize_waypoints: Optimize waypoint order (TSP)
            fuel_efficient: Request fuel-efficient route
            shorter_distance: Request shorter distance route
        
        Returns:
            Route information with steps, duration, distance
        """
        language = language or self.DEFAULT_LANG
        self._current_lang = language  # Store for formatting functions
        error = self._validate_key()
        if error:
            return error
        
        # Resolve locations
        origin_wp = self._resolve_location(origin)
        dest_wp = self._resolve_location(destination)
        
        if not origin_wp or not dest_wp:
            return {"error": "Could not resolve origin or destination address"}
        
        travel_mode = self._travel_mode(mode)
        
        # For computeRoutes, origin/destination are direct Waypoint objects
        request_body = {
            "origin": origin_wp,
            "destination": dest_wp,
            "travelMode": travel_mode,
            "languageCode": language,
            "units": "METRIC"
        }
        
        # Routing preference
        if travel_mode in ['DRIVE', 'TWO_WHEELER']:
            request_body["routingPreference"] = "TRAFFIC_AWARE"
        
        # Alternatives
        if alternatives and not waypoints:
            request_body["computeAlternativeRoutes"] = True
        
        # Departure time
        if departure_time:
            parsed = self._parse_time(departure_time)
            if parsed:
                request_body["departureTime"] = parsed
        
        # Arrival time (transit only)
        if arrival_time and travel_mode == "TRANSIT":
            parsed = self._parse_time(arrival_time)
            if parsed:
                request_body["arrivalTime"] = parsed
                request_body.pop("departureTime", None)
        
        # Route modifiers
        modifiers = {}
        if avoid:
            avoid_list = [a.strip().lower() for a in avoid.split(",")]
            if "tolls" in avoid_list:
                modifiers["avoidTolls"] = True
            if "highways" in avoid_list:
                modifiers["avoidHighways"] = True
            if "ferries" in avoid_list:
                modifiers["avoidFerries"] = True
        if modifiers:
            request_body["routeModifiers"] = modifiers
        
        # Waypoints (intermediates are direct Waypoint objects for computeRoutes)
        if waypoints:
            intermediates = []
            wp_list = waypoints if isinstance(waypoints, list) else waypoints.split("|")
            for wp in wp_list:
                resolved = self._resolve_location(wp.strip())
                if resolved:
                    intermediates.append(resolved)
            if intermediates:
                request_body["intermediates"] = intermediates
                if optimize_waypoints:
                    request_body["optimizeWaypointOrder"] = True
        
        # Reference routes
        if fuel_efficient or shorter_distance:
            refs = []
            if fuel_efficient:
                refs.append("FUEL_EFFICIENT")
            if shorter_distance:
                refs.append("SHORTER_DISTANCE")
            request_body["requestedReferenceRoutes"] = refs
        
        # Call Routes API
        url = f"{self.routes_base}/directions/v2:computeRoutes"
        
        # Build field mask
        field_mask = "routes.duration,routes.staticDuration,routes.distanceMeters,routes.description,routes.routeLabels,routes.legs.steps.navigationInstruction,routes.legs.steps.distanceMeters,routes.legs.steps.staticDuration,routes.legs.steps.transitDetails,routes.legs.localizedValues,routes.warnings"
        
        # Add optimized waypoint index if optimizing
        if optimize_waypoints:
            field_mask += ",routes.optimizedIntermediateWaypointIndex"
        
        headers = {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": self.api_key,
            "X-Goog-FieldMask": field_mask
        }
        
        response = requests.post(url, headers=headers, json=request_body)
        
        if response.status_code != 200:
            return {"error": f"API error: {response.status_code}", "details": response.text}
        
        data = response.json()
        
        if not data.get("routes"):
            return {"error": "No route found"}
        
        routes = []
        for route in data["routes"]:
            route_info = {
                "distance": self._format_distance(route.get("distanceMeters", 0)),
                "distance_meters": route.get("distanceMeters", 0),
            }
            
            # Description
            if route.get("description"):
                route_info["summary"] = route["description"]
            
            # Labels (DEFAULT_ROUTE, FUEL_EFFICIENT, etc.)
            if route.get("routeLabels"):
                route_info["labels"] = route["routeLabels"]
            
            # Duration
            if route.get("duration"):
                route_info["duration"] = self._format_duration(route["duration"])
                route_info["duration_seconds"] = int(route["duration"].rstrip('s'))
            
            if route.get("staticDuration"):
                route_info["static_duration"] = self._format_duration(route["staticDuration"])
            
            # Warnings
            if route.get("warnings"):
                route_info["warnings"] = route["warnings"]
            
            # Optimized waypoint order
            if route.get("optimizedIntermediateWaypointIndex"):
                route_info["optimized_waypoint_order"] = route["optimizedIntermediateWaypointIndex"]
            
            # Steps
            steps = []
            for leg in route.get("legs", []):
                # Leg-level info
                if leg.get("localizedValues"):
                    lv = leg["localizedValues"]
                    if lv.get("staticDuration") and not route_info.get("static_duration"):
                        route_info["static_duration"] = lv["staticDuration"].get("text")
                    if lv.get("distance") and not route_info.get("distance"):
                        route_info["distance"] = lv["distance"].get("text")
                
                for step in leg.get("steps", []):
                    step_info = {}
                    
                    # Navigation instruction
                    if step.get("navigationInstruction"):
                        nav = step["navigationInstruction"]
                        step_info["instruction"] = nav.get("instructions", "")
                        if nav.get("maneuver"):
                            step_info["maneuver"] = nav["maneuver"]
                    
                    # Distance
                    if step.get("distanceMeters"):
                        step_info["distance"] = self._format_distance(step["distanceMeters"])
                    
                    # Duration
                    if step.get("staticDuration"):
                        step_info["duration"] = self._format_duration(step["staticDuration"])
                    
                    # Transit details
                    if step.get("transitDetails"):
                        td = step["transitDetails"]
                        transit_info = {}
                        if td.get("transitLine"):
                            line = td["transitLine"]
                            transit_info["line"] = line.get("nameShort") or line.get("name", "")
                            if line.get("vehicle"):
                                transit_info["vehicle"] = line["vehicle"].get("name", {}).get("text", "")
                        if td.get("stopDetails"):
                            sd = td["stopDetails"]
                            if sd.get("departureStop"):
                                transit_info["departure_stop"] = sd["departureStop"].get("name", "")
                            if sd.get("arrivalStop"):
                                transit_info["arrival_stop"] = sd["arrivalStop"].get("name", "")
                        if td.get("stopCount"):
                            transit_info["num_stops"] = td["stopCount"]
                        step_info["transit"] = transit_info
                    
                    if step_info:
                        steps.append(step_info)
            
            route_info["steps"] = steps
            routes.append(route_info)
        
        return routes[0] if not alternatives else routes

    # ==================== ROUTE MATRIX ====================
    
    def matrix(self, origins, destinations, mode="driving", departure_time=None, avoid=None):
        """
        Calculate distance/duration matrix for multiple origins and destinations.
        
        Args:
            origins: List of origin addresses/coordinates
            destinations: List of destination addresses/coordinates
            mode: Travel mode
            departure_time: When to depart
            avoid: Route modifiers
        
        Returns:
            Matrix of distances and durations
        """
        error = self._validate_key()
        if error:
            return error
        
        # Resolve all locations
        origin_waypoints = []
        for o in origins:
            resolved = self._resolve_location(o)
            if resolved:
                origin_waypoints.append({"waypoint": resolved})
        
        dest_waypoints = []
        for d in destinations:
            resolved = self._resolve_location(d)
            if resolved:
                dest_waypoints.append({"waypoint": resolved})
        
        if not origin_waypoints or not dest_waypoints:
            return {"error": "Could not resolve all locations"}
        
        travel_mode = self._travel_mode(mode)
        
        request_body = {
            "origins": origin_waypoints,
            "destinations": dest_waypoints,
            "travelMode": travel_mode,
        }
        
        # Routing preference
        if travel_mode in ['DRIVE', 'TWO_WHEELER']:
            request_body["routingPreference"] = "TRAFFIC_AWARE"
        
        # Departure time
        if departure_time:
            parsed = self._parse_time(departure_time)
            if parsed:
                # Note: For matrix, we'd need to add this per-origin or as extraComputations
                pass
        
        # Call Route Matrix API
        url = f"{self.routes_base}/distanceMatrix/v2:computeRouteMatrix"
        headers = {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": self.api_key,
            "X-Goog-FieldMask": "originIndex,destinationIndex,duration,distanceMeters,status,condition"
        }
        
        response = requests.post(url, headers=headers, json=request_body)
        
        if response.status_code != 200:
            return {"error": f"API error: {response.status_code}", "details": response.text}
        
        data = response.json()
        
        # Format results as matrix
        results = []
        for element in data:
            if element.get("condition") == "ROUTE_EXISTS":
                results.append({
                    "origin_index": element.get("originIndex", 0),
                    "destination_index": element.get("destinationIndex", 0),
                    "distance": self._format_distance(element.get("distanceMeters", 0)),
                    "distance_meters": element.get("distanceMeters", 0),
                    "duration": self._format_duration(element.get("duration")),
                    "duration_seconds": int(element.get("duration", "0s").rstrip('s'))
                })
            else:
                results.append({
                    "origin_index": element.get("originIndex", 0),
                    "destination_index": element.get("destinationIndex", 0),
                    "error": element.get("condition", "UNKNOWN")
                })
        
        return {
            "origins": origins,
            "destinations": destinations,
            "results": results
        }


def print_help():
    """Print usage information."""
    help_text = """
Google Maps v3.1 (Routes API) - Usage:

═══════════════════════════════════════════════════════════════
DISTANCE & TRAVEL TIME
═══════════════════════════════════════════════════════════════

  python map_helper.py distance "origin" "destination" [options]
  
  Options:
    --mode=driving|walking|bicycling|transit|two_wheeler
    --depart="now"|"+30m"|"+1h"|"14:00"|"2026-02-06 14:00"
    --arrive="14:00" (transit only)
    --traffic=best_guess|pessimistic|optimistic
    --avoid=tolls|highways|ferries (comma-separated)
  
  Examples:
    python map_helper.py distance "Tel Aviv" "Jerusalem"
    python map_helper.py distance "Tel Aviv" "Jerusalem" --depart="+1h"
    python map_helper.py distance "Home" "Work" --depart="08:00" --traffic=pessimistic
    python map_helper.py distance "A" "B" --mode=transit --arrive="09:00"
    python map_helper.py distance "A" "B" --avoid=tolls,highways

═══════════════════════════════════════════════════════════════
FULL DIRECTIONS (Turn-by-Turn)
═══════════════════════════════════════════════════════════════

  python map_helper.py directions "origin" "destination" [options]
  
  Options (same as distance, plus):
    --alternatives       Get multiple route options
    --waypoints="A|B|C"  Intermediate stops
    --optimize           Optimize waypoint order (TSP)
    --fuel-efficient     Request fuel-efficient route
    --shorter            Request shorter distance route

  Examples:
    python map_helper.py directions "Tel Aviv" "Jerusalem"
    python map_helper.py directions "A" "B" --alternatives
    python map_helper.py directions "A" "D" --waypoints="B|C" --optimize

═══════════════════════════════════════════════════════════════
DISTANCE MATRIX (Multiple Origins/Destinations)
═══════════════════════════════════════════════════════════════

  python map_helper.py matrix "orig1|orig2" "dest1|dest2" [options]

  Example:
    python map_helper.py matrix "Tel Aviv|Haifa" "Jerusalem|Eilat"

═══════════════════════════════════════════════════════════════
GEOCODING
═══════════════════════════════════════════════════════════════

  python map_helper.py geocode "Dizengoff 50, Tel Aviv"
  python map_helper.py reverse 32.0684 34.7905

═══════════════════════════════════════════════════════════════
PLACES SEARCH
═══════════════════════════════════════════════════════════════

  python map_helper.py search "coffee near Dizengoff" [--open] [--lang=en]
  python map_helper.py details "<place_id>"

═══════════════════════════════════════════════════════════════
HELP
═══════════════════════════════════════════════════════════════

  python map_helper.py help

"""
    print(help_text)


if __name__ == "__main__":
    if len(sys.argv) < 2 or sys.argv[1] == "help":
        print_help()
        sys.exit(0)
    
    action = sys.argv[1]
    elite = GoogleMapsElite()
    
    # Parse optional arguments
    def get_arg(prefix, default=None):
        for arg in sys.argv:
            if arg.startswith(f"--{prefix}="):
                return arg.split("=", 1)[1]
        return default
    
    def has_flag(flag):
        return f"--{flag}" in sys.argv
    
    lang = get_arg("lang")  # None = use DEFAULT_LANG from env or "en"
    
    result = None
    
    if action == "search" and len(sys.argv) >= 3:
        result = elite.search(sys.argv[2], open_now=has_flag("open"), language=lang)
    
    elif action == "details" and len(sys.argv) >= 3:
        result = elite.details(sys.argv[2], language=lang)
    
    elif action == "distance" and len(sys.argv) >= 4:
        result = elite.distance(
            origin=sys.argv[2],
            destination=sys.argv[3],
            mode=get_arg("mode", "driving"),
            language=lang,
            departure_time=get_arg("depart"),
            arrival_time=get_arg("arrive"),
            traffic_model=get_arg("traffic"),
            avoid=get_arg("avoid")
        )
    
    elif action == "directions" and len(sys.argv) >= 4:
        result = elite.directions(
            origin=sys.argv[2],
            destination=sys.argv[3],
            mode=get_arg("mode", "driving"),
            language=lang,
            departure_time=get_arg("depart"),
            arrival_time=get_arg("arrive"),
            alternatives=has_flag("alternatives"),
            avoid=get_arg("avoid"),
            waypoints=get_arg("waypoints"),
            optimize_waypoints=has_flag("optimize"),
            fuel_efficient=has_flag("fuel-efficient"),
            shorter_distance=has_flag("shorter")
        )
    
    elif action == "matrix" and len(sys.argv) >= 4:
        origins = sys.argv[2].split("|")
        destinations = sys.argv[3].split("|")
        result = elite.matrix(
            origins=origins,
            destinations=destinations,
            mode=get_arg("mode", "driving"),
            departure_time=get_arg("depart"),
            avoid=get_arg("avoid")
        )
    
    elif action == "geocode" and len(sys.argv) >= 3:
        result = elite.geocode(sys.argv[2], language=lang)
    
    elif action == "reverse" and len(sys.argv) >= 4:
        result = elite.reverse_geocode(sys.argv[2], sys.argv[3], language=lang)
    
    else:
        print_help()
        sys.exit(1)
    
    print(json.dumps(result, ensure_ascii=False, indent=2))
