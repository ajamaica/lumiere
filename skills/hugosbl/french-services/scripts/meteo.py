#!/usr/bin/env python3
"""Météo France via Open-Meteo — pas de clé API nécessaire.

Usage:
    python3 meteo.py Paris
    python3 meteo.py Lyon --days 7
    python3 meteo.py --lat 48.85 --lon 2.35
    python3 meteo.py Marseille --json
"""

import argparse
import json
import sys
import urllib.request
import urllib.parse
import urllib.error
from datetime import datetime

# Villes françaises courantes → coordonnées
VILLES = {
    "paris": (48.8566, 2.3522),
    "lyon": (45.7640, 4.8357),
    "marseille": (43.2965, 5.3698),
    "toulouse": (43.6047, 1.4442),
    "nice": (43.7102, 7.2620),
    "nantes": (47.2184, -1.5536),
    "strasbourg": (48.5734, 7.7521),
    "montpellier": (43.6108, 3.8767),
    "bordeaux": (44.8378, -0.5792),
    "lille": (50.6292, 3.0573),
    "rennes": (48.1173, -1.6778),
    "reims": (49.2583, 4.0317),
    "le havre": (49.4944, 0.1079),
    "saint-étienne": (45.4397, 4.3872),
    "toulon": (43.1242, 5.9280),
    "grenoble": (45.1885, 5.7245),
    "dijon": (47.3220, 5.0415),
    "angers": (47.4784, -0.5632),
    "nîmes": (43.8367, 4.3601),
    "clermont-ferrand": (45.7772, 3.0870),
    "aix-en-provence": (43.5297, 5.4474),
    "brest": (48.3904, -4.4861),
    "tours": (47.3941, 0.6848),
    "amiens": (49.8941, 2.2958),
    "limoges": (45.8336, 1.2611),
    "perpignan": (42.6986, 2.8954),
    "besançon": (47.2378, 6.0241),
    "orléans": (47.9029, 1.9093),
    "rouen": (49.4432, 1.0993),
    "metz": (49.1193, 6.1757),
    "nancy": (48.6921, 6.1844),
    "caen": (49.1829, -0.3707),
    "pau": (43.2951, -0.3708),
    "la rochelle": (46.1591, -1.1520),
    "avignon": (43.9493, 4.8055),
    "cannes": (43.5528, 7.0174),
    "ajaccio": (41.9192, 8.7386),
    "bastia": (42.6977, 9.4508),
    "poitiers": (46.5802, 0.3404),
    "valence": (44.9334, 4.8924),
}

# Codes météo WMO → description en français
WMO_CODES = {
    0: "☀️ Ciel dégagé",
    1: "🌤️ Principalement dégagé",
    2: "⛅ Partiellement nuageux",
    3: "☁️ Couvert",
    45: "🌫️ Brouillard",
    48: "🌫️ Brouillard givrant",
    51: "🌦️ Bruine légère",
    53: "🌦️ Bruine modérée",
    55: "🌦️ Bruine dense",
    56: "🌧️ Bruine verglaçante légère",
    57: "🌧️ Bruine verglaçante dense",
    61: "🌧️ Pluie légère",
    63: "🌧️ Pluie modérée",
    65: "🌧️ Pluie forte",
    66: "🌧️ Pluie verglaçante légère",
    67: "🌧️ Pluie verglaçante forte",
    71: "🌨️ Neige légère",
    73: "🌨️ Neige modérée",
    75: "🌨️ Neige forte",
    77: "🌨️ Grains de neige",
    80: "🌦️ Averses légères",
    81: "🌦️ Averses modérées",
    82: "🌦️ Averses violentes",
    85: "🌨️ Averses de neige légères",
    86: "🌨️ Averses de neige fortes",
    95: "⛈️ Orage",
    96: "⛈️ Orage avec grêle légère",
    99: "⛈️ Orage avec grêle forte",
}


def geocode(ville):
    """Résout une ville en coordonnées via l'API de géocodage Open-Meteo."""
    # D'abord, vérifier le cache local
    key = ville.lower().strip()
    if key in VILLES:
        return VILLES[key]

    # Sinon, appeler l'API de géocodage
    params = urllib.parse.urlencode({
        "name": ville,
        "count": 1,
        "language": "fr",
        "format": "json",
    })
    url = f"https://geocoding-api.open-meteo.com/v1/search?{params}"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "french-services/1.0"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode())
        if "results" in data and data["results"]:
            r = data["results"][0]
            return (r["latitude"], r["longitude"])
    except Exception:
        pass

    return None


def fetch_meteo(lat, lon, days=3):
    """Appelle l'API Open-Meteo avec le modèle Météo France."""
    params = urllib.parse.urlencode({
        "latitude": lat,
        "longitude": lon,
        "current": "temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m",
        "daily": "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,sunrise,sunset",
        "timezone": "Europe/Paris",
        "forecast_days": days,
        "models": "meteofrance_seamless",
    })
    url = f"https://api.open-meteo.com/v1/meteofrance?{params}"
    req = urllib.request.Request(url, headers={"User-Agent": "french-services/1.0"})
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read().decode())


def format_meteo(data, ville_name=None):
    """Formate les données météo en texte lisible."""
    lines = []

    header = "🌤️ Météo"
    if ville_name:
        header += f" — {ville_name.title()}"
    lines.append(header)
    lines.append("=" * len(header.encode('ascii', 'replace').decode()))

    # Météo actuelle
    current = data.get("current", {})
    if current:
        temp = current.get("temperature_2m", "?")
        apparent = current.get("apparent_temperature", "?")
        code = current.get("weather_code", 0)
        wind = current.get("wind_speed_10m", "?")
        humidity = current.get("relative_humidity_2m", "?")
        desc = WMO_CODES.get(code, f"Code {code}")

        lines.append("")
        lines.append(f"📍 Actuellement : {desc}")
        lines.append(f"🌡️ {temp}°C (ressenti {apparent}°C)")
        lines.append(f"💨 Vent : {wind} km/h")
        lines.append(f"💧 Humidité : {humidity}%")

    # Prévisions
    daily = data.get("daily", {})
    dates = daily.get("time", [])
    if dates:
        lines.append("")
        lines.append("📅 Prévisions")
        lines.append("-" * 40)

        jours_semaine = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]

        for i, date_str in enumerate(dates):
            dt = datetime.strptime(date_str, "%Y-%m-%d")
            jour = jours_semaine[dt.weekday()]
            date_fmt = dt.strftime("%d/%m")

            code = daily.get("weather_code", [0])[i] if i < len(daily.get("weather_code", [])) else 0
            t_min = daily.get("temperature_2m_min", ["?"])[i] if i < len(daily.get("temperature_2m_min", [])) else "?"
            t_max = daily.get("temperature_2m_max", ["?"])[i] if i < len(daily.get("temperature_2m_max", [])) else "?"
            precip = daily.get("precipitation_sum", [0])[i] if i < len(daily.get("precipitation_sum", [])) else 0
            prob = daily.get("precipitation_probability_max", [None])
            prob_val = prob[i] if prob and i < len(prob) else None

            desc = WMO_CODES.get(code, f"Code {code}") if code is not None else "Données indisponibles"
            # Skip if we have no data for this day
            if t_min is None and t_max is None:
                continue
            # Remove emoji from desc for compact line
            desc_short = desc.split(" ", 1)[-1] if " " in desc else desc
            emoji = desc.split(" ")[0] if " " in desc else ""

            t_min_str = f"{t_min}" if t_min is not None else "?"
            t_max_str = f"{t_max}" if t_max is not None else "?"

            line = f"  {jour} {date_fmt} : {emoji} {t_min_str}°/{t_max_str}° — {desc_short}"
            if precip and precip > 0:
                line += f" | 🌧️ {precip}mm"
            if prob_val is not None and prob_val > 0:
                line += f" ({prob_val}%)"

            lines.append(line)

    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(
        description="Météo France via Open-Meteo (pas de clé API nécessaire)",
        epilog="Exemples:\n  python3 meteo.py Paris\n  python3 meteo.py Lyon --days 7\n  python3 meteo.py --lat 43.6 --lon 1.44",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("ville", nargs="?", help="Nom de la ville")
    parser.add_argument("--lat", type=float, help="Latitude")
    parser.add_argument("--lon", type=float, help="Longitude")
    parser.add_argument("--days", type=int, default=3, help="Nombre de jours de prévision (défaut: 3, max: 16)")
    parser.add_argument("--json", action="store_true", help="Sortie au format JSON")

    args = parser.parse_args()

    # Déterminer les coordonnées
    ville_name = args.ville
    if args.lat is not None and args.lon is not None:
        lat, lon = args.lat, args.lon
        if not ville_name:
            ville_name = f"{lat}, {lon}"
    elif args.ville:
        coords = geocode(args.ville)
        if coords is None:
            print(f"❌ Ville introuvable : {args.ville}", file=sys.stderr)
            print("Utilise --lat et --lon pour spécifier les coordonnées.", file=sys.stderr)
            sys.exit(1)
        lat, lon = coords
    else:
        # Défaut : Paris
        lat, lon = 48.8566, 2.3522
        ville_name = "Paris"

    try:
        data = fetch_meteo(lat, lon, min(args.days, 16))
    except urllib.error.URLError as e:
        print(f"❌ Erreur réseau : {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"❌ Erreur : {e}", file=sys.stderr)
        sys.exit(1)

    if args.json:
        data["_query"] = {"ville": ville_name, "lat": lat, "lon": lon}
        print(json.dumps(data, ensure_ascii=False, indent=2))
    else:
        print(format_meteo(data, ville_name))


if __name__ == "__main__":
    main()
