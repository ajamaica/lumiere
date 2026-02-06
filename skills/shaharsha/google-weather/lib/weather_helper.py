#!/usr/bin/env python3
"""
Google Weather API integration for OpenClaw.
Uses the same API key as Google Maps (GOOGLE_API_KEY).
"""
import requests
import sys
import json
import os
from datetime import datetime

class GoogleWeather:
    """Elite Google Weather integration."""
    
    # Common locations for quick lookup
    LOCATIONS = {
        "tel aviv": (32.0853, 34.7818),
        "תל אביב": (32.0853, 34.7818),
        "tlv": (32.0853, 34.7818),
        "jerusalem": (31.7683, 35.2137),
        "ירושלים": (31.7683, 35.2137),
        "haifa": (32.7940, 34.9896),
        "חיפה": (32.7940, 34.9896),
        "yehud": (32.0333, 34.8833),
        "יהוד": (32.0333, 34.8833),
        "ramat gan": (32.0680, 34.8248),
        "רמת גן": (32.0680, 34.8248),
        "holon": (32.0114, 34.7748),
        "חולון": (32.0114, 34.7748),
    }
    
    # Weather condition translations
    CONDITIONS_HE = {
        "CLEAR": "בהיר ☀️",
        "MOSTLY_CLEAR": "בהיר ברובו 🌤️",
        "PARTLY_CLOUDY": "מעונן חלקית ⛅",
        "MOSTLY_CLOUDY": "מעונן ברובו 🌥️",
        "CLOUDY": "מעונן ☁️",
        "HAZE": "אובך 🌫️",
        "FOG": "ערפל 🌫️",
        "LIGHT_RAIN": "גשם קל 🌧️",
        "RAIN": "גשם 🌧️",
        "HEAVY_RAIN": "גשם כבד 🌧️",
        "THUNDERSTORM": "סופת רעמים ⛈️",
        "SNOW": "שלג ❄️",
    }
    
    def __init__(self):
        # Support multiple env var names for flexibility
        self.api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GOOGLE_WEATHER_API_KEY") or os.getenv("GOOGLE_MAPS_API_KEY")
        self.current_url = "https://weather.googleapis.com/v1/currentConditions:lookup"
        self.forecast_url = "https://weather.googleapis.com/v1/forecast/hours:lookup"
        self.geocode_url = "https://maps.googleapis.com/maps/api/geocode/json"
    
    def _validate_key(self):
        if not self.api_key:
            return {"error": "Missing API key. Set GOOGLE_API_KEY environment variable."}
        return None
    
    def geocode(self, location):
        """Convert location name to lat/lon."""
        # Check common locations first
        loc_lower = location.lower().strip()
        if loc_lower in self.LOCATIONS:
            return self.LOCATIONS[loc_lower]
        
        # Use Google Geocoding API
        params = {
            "address": location,
            "key": self.api_key
        }
        try:
            res = requests.get(self.geocode_url, params=params).json()
            if res.get("results"):
                loc = res["results"][0]["geometry"]["location"]
                return (loc["lat"], loc["lng"])
        except Exception as e:
            pass
        return None
    
    def current(self, location, language="en"):
        """Get current weather conditions."""
        error = self._validate_key()
        if error:
            return error
        
        # Get coordinates
        coords = self.geocode(location) if isinstance(location, str) else location
        if not coords:
            return {"error": f"Could not find location: {location}"}
        lat, lon = coords
        
        # Call Weather API
        params = {
            "key": self.api_key,
            "location.latitude": lat,
            "location.longitude": lon,
            "languageCode": language
        }
        
        try:
            res = requests.get(self.current_url, params=params)
            if res.status_code != 200:
                return {"error": f"API error: {res.status_code}", "details": res.text}
            data = res.json()
        except Exception as e:
            return {"error": f"Request failed: {str(e)}"}
        
        # Format response
        result = {
            "location": location if isinstance(location, str) else f"{lat},{lon}",
            "time": data.get("currentTime", ""),
            "timezone": data.get("timeZone", {}).get("id", ""),
            "is_daytime": data.get("isDaytime", True),
        }
        
        # Weather condition
        condition = data.get("weatherCondition", {})
        condition_type = condition.get("type", "UNKNOWN")
        condition_he = self.CONDITIONS_HE.get(condition_type, condition_type)
        emoji = ''.join(c for c in condition_he if c in '☀️🌤️⛅🌥️☁️🌫️🌧️⛈️❄️') or ''
        result["condition"] = {
            "type": condition_type,
            "text": condition.get("description", {}).get("text", ""),
            "text_he": condition_he.replace(emoji, '').strip(),
            "emoji": emoji,
            "icon": condition.get("iconBaseUri", "")
        }
        
        # Temperature
        temp = data.get("temperature", {})
        feels_like = data.get("feelsLikeTemperature", {})
        result["temperature"] = {
            "current": temp.get("degrees"),
            "feels_like": feels_like.get("degrees"),
            "unit": temp.get("unit", "CELSIUS")
        }
        
        # Other conditions
        result["humidity"] = data.get("relativeHumidity")
        result["uv_index"] = data.get("uvIndex")
        result["cloud_cover"] = data.get("cloudCover")
        
        # Wind
        wind = data.get("wind", {})
        result["wind"] = {
            "speed": wind.get("speed", {}).get("value"),
            "unit": wind.get("speed", {}).get("unit", "KILOMETERS_PER_HOUR"),
            "direction": wind.get("direction", {}).get("cardinal", ""),
            "gust": wind.get("gust", {}).get("value")
        }
        
        # Precipitation
        precip = data.get("precipitation", {})
        result["precipitation"] = {
            "probability": precip.get("probability", {}).get("percent", 0),
            "type": precip.get("probability", {}).get("type", "RAIN")
        }
        
        return result

    def forecast(self, location, hours=24, language="en"):
        """Get hourly forecast."""
        error = self._validate_key()
        if error:
            return error
        
        # Get coordinates
        coords = self.geocode(location) if isinstance(location, str) else location
        if not coords:
            return {"error": f"Could not find location: {location}"}
        lat, lon = coords
        
        # Call Forecast API
        params = {
            "key": self.api_key,
            "location.latitude": lat,
            "location.longitude": lon,
            "hours": hours,
            "languageCode": language
        }
        
        try:
            res = requests.get(self.forecast_url, params=params)
            if res.status_code != 200:
                return {"error": f"API error: {res.status_code}", "details": res.text}
            data = res.json()
        except Exception as e:
            return {"error": f"Request failed: {str(e)}"}
        
        # Process hours
        hourly = []
        for h in data.get("forecastHours", []):
            condition_type = h.get("weatherCondition", {}).get("type", "UNKNOWN")
            condition_he = self.CONDITIONS_HE.get(condition_type, condition_type)
            emoji = ''.join(c for c in condition_he if c in '☀️🌤️⛅🌥️☁️🌫️🌧️⛈️❄️') or ''
            
            entry = {
                "time": h.get("interval", {}).get("startTime"),
                "display_time": h.get("displayDateTime"),
                "temp": h.get("temperature", {}).get("degrees"),
                "condition": {
                    "text": h.get("weatherCondition", {}).get("description", {}).get("text"),
                    "text_he": condition_he.replace(emoji, '').strip(),
                    "emoji": emoji
                },
                "wind": {
                    "speed": h.get("wind", {}).get("speed", {}).get("value"),
                    "direction": h.get("wind", {}).get("direction", {}).get("cardinal"),
                    "gust": h.get("wind", {}).get("gust", {}).get("value")
                },
                "precip_prob": h.get("precipitation", {}).get("probability", {}).get("percent")
            }
            hourly.append(entry)
            
        return {"location": location, "hourly": hourly}

    def format_summary(self, data, lang="en"):
        """Format weather data as human-readable summary."""
        if "error" in data:
            return f"Error: {data['error']}"
        
        if "hourly" in data:
            return self.format_forecast(data, lang)
            
        temp = data.get("temperature", {})
        condition = data.get("condition", {})
        wind = data.get("wind", {})
        emoji = condition.get('emoji', '')
        
        if lang == "he":
            desc = condition.get('text_he', '') or condition.get('text', '')
            lines = [
                f"*{data.get('location', 'Unknown')}*",
                f"{desc} {emoji}".strip(),
                f"🌡️ {temp.get('current', '?')}°C (מרגיש כמו {temp.get('feels_like', '?')}°C)",
                f"💨 רוח: {wind.get('speed', '?')} קמ\"ש {wind.get('direction', '')}",
                f"💧 לחות: {data.get('humidity', '?')}%",
            ]
        else:
            desc = condition.get('text', '') or condition.get('type', '')
            lines = [
                f"*{data.get('location', 'Unknown')}*",
                f"{desc} {emoji}".strip(),
                f"🌡️ {temp.get('current', '?')}°C (feels like {temp.get('feels_like', '?')}°C)",
                f"💨 Wind: {wind.get('speed', '?')} km/h {wind.get('direction', '')}",
                f"💧 Humidity: {data.get('humidity', '?')}%",
            ]
        
        return "\n".join(lines)

    def format_forecast(self, data, lang="en"):
        """Format forecast data."""
        lines = [f"*תחזית ל-{data['location']} (24 שעות)*" if lang == "he" else f"*24h Forecast for {data['location']}*"]
        
        # Select key hours (every 3-4 hours to keep it brief)
        for i, h in enumerate(data['hourly']):
            if i % 4 == 0:
                time_str = f"{h['display_time']['hours']:02d}:00"
                if lang == "he":
                    lines.append(f"{time_str}: {h['temp']}°C, {h['condition']['emoji']} {h['wind']['speed']} קמ\"ש {h['wind']['direction']}")
                else:
                    lines.append(f"{time_str}: {h['temp']}°C, {h['condition']['emoji']} {h['wind']['speed']} km/h {h['wind']['direction']}")
        
        return "\n".join(lines)


def main():
    if len(sys.argv) < 2:
        print("Usage: weather_helper.py <command> [args]")
        print("Commands:")
        print("  current <location>  - Get current weather")
        print("  forecast <location> - Get 24h forecast")
        print("  json <location>     - Get raw JSON data")
        sys.exit(1)
    
    weather = GoogleWeather()
    command = sys.argv[1].lower()
    location = " ".join(sys.argv[2:]) if len(sys.argv) > 2 else "tel aviv"
    
    if command == "current":
        data = weather.current(location)
        print(weather.format_summary(data))
    elif command == "forecast":
        data = weather.forecast(location)
        print(weather.format_summary(data))
    elif command == "json":
        data = weather.current(location)
        print(json.dumps(data, ensure_ascii=False, indent=2))
    else:
        print(f"Unknown command: {command}")
        sys.exit(1)

if __name__ == "__main__":
    main()
