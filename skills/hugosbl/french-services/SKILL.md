# French Services — Services français du quotidien

Skill pour accéder aux services français : trains SNCF, suivi colis La Poste, météo, transports IDF.

## Scripts disponibles

Tous dans `skills/french-services/scripts/`. Utilisent uniquement la stdlib Python (pas de dépendances).

### 🚄 SNCF — Trains (`sncf.py`)

Recherche d'itinéraires et prochains départs via l'API Navitia.

```bash
# Rechercher un trajet
python3 scripts/sncf.py search Paris Lyon
python3 scripts/sncf.py search "Gare de Lyon" Marseille --date 2025-01-15 --time 08:00

# Prochains départs depuis une gare
python3 scripts/sncf.py departures Paris

# Perturbations sur une ligne
python3 scripts/sncf.py disruptions
```

**API key requise :** `SNCF_API_KEY` (token Navitia — gratuit sur https://navitia.io)

### 📦 La Poste — Suivi de colis (`laposte.py`)

```bash
# Suivre un colis
python3 scripts/laposte.py track 6A12345678901

# Suivre plusieurs colis
python3 scripts/laposte.py track 6A12345678901 8R98765432109
```

**API key requise :** `LAPOSTE_API_KEY` (gratuit sur https://developer.laposte.fr)

### 🌤️ Météo (`meteo.py`)

Météo actuelle et prévisions via Open-Meteo (modèle Météo France). **Pas de clé API nécessaire.**

```bash
# Météo actuelle + prévisions 3 jours
python3 scripts/meteo.py Paris
python3 scripts/meteo.py Lyon --days 7
python3 scripts/meteo.py --lat 43.6 --lon 1.44    # Toulouse par coordonnées

# Format JSON
python3 scripts/meteo.py Paris --json
```

### 🚇 RATP/IDFM — Transports IDF (`ratp.py`)

État du trafic et prochains passages en Île-de-France via l'API PRIM.

```bash
# État du trafic global
python3 scripts/ratp.py traffic

# État d'une ligne spécifique
python3 scripts/ratp.py traffic --line "Métro 13"
python3 scripts/ratp.py traffic --line "RER A"

# Prochains passages à un arrêt
python3 scripts/ratp.py next "Châtelet"
```

**API key requise :** `IDFM_API_KEY` (gratuit sur https://prim.iledefrance-mobilites.fr)

## Options communes

| Option   | Description                          |
| -------- | ------------------------------------ |
| `--json` | Sortie JSON au lieu du texte lisible |
| `--help` | Aide du script                       |

## Env vars

| Variable          | Service   | Obtention                                   |
| ----------------- | --------- | ------------------------------------------- |
| `SNCF_API_KEY`    | SNCF      | https://navitia.io (gratuit, 5000 req/mois) |
| `LAPOSTE_API_KEY` | La Poste  | https://developer.laposte.fr                |
| `IDFM_API_KEY`    | RATP/IDFM | https://prim.iledefrance-mobilites.fr       |

Voir `references/api-setup.md` pour le guide de configuration détaillé.

## Quand utiliser quel script

| Question de l'utilisateur                | Script       |
| ---------------------------------------- | ------------ |
| "Prochain train pour Lyon"               | `sncf.py`    |
| "Horaires Paris-Marseille demain matin"  | `sncf.py`    |
| "Où en est mon colis 6A123..."           | `laposte.py` |
| "Il fait quoi demain ?" / "Météo à Nice" | `meteo.py`   |
| "Le métro 13 marche ?" / "État du RER A" | `ratp.py`    |
| "Prochain métro à Châtelet"              | `ratp.py`    |

## Notes

- La météo fonctionne sans aucune configuration (Open-Meteo est gratuit et sans clé)
- Pour les autres services, configurer les API keys selon `references/api-setup.md`
- Les scripts gèrent proprement l'absence de clé API avec un message explicatif
- Output en français par défaut, `--json` pour l'intégration machine
