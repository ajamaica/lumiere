#!/usr/bin/env python3
"""TrainingPeaks CLI — pure stdlib, no pip dependencies.

Provides access to the TrainingPeaks internal API using cookie-based auth.
"""

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

# ─── Constants ────────────────────────────────────────────────────────────────

TP_API_BASE = "https://tpapi.trainingpeaks.com"
TOKEN_ENDPOINT = "/users/v3/token"
USER_ENDPOINT = "/users/v3/user"
TOKEN_REFRESH_BUFFER = 60  # seconds before expiry to trigger refresh
MIN_REQUEST_INTERVAL = 0.15  # 150ms between requests
CONFIG_DIR = Path.home() / ".trainingpeaks"
COOKIE_FILE = CONFIG_DIR / "cookie"
TOKEN_FILE = CONFIG_DIR / "token.json"
CONFIG_FILE = CONFIG_DIR / "config.json"

# Valid PR types by sport
BIKE_PR_TYPES = [
    "power5sec", "power1min", "power5min", "power10min", "power20min",
    "power60min", "power90min",
    "hR5sec", "hR1min", "hR5min", "hR10min", "hR20min", "hR60min", "hR90min",
]

RUN_PR_TYPES = [
    "hR5sec", "hR1min", "hR5min", "hR10min", "hR20min", "hR60min", "hR90min",
    "speed400Meter", "speed800Meter", "speed1K", "speed1Mi", "speed5K",
    "speed5Mi", "speed10K", "speed10Mi", "speedHalfMarathon", "speedMarathon",
    "speed50K",
]


# ─── Helpers ──────────────────────────────────────────────────────────────────

def die(msg: str, code: int = 1) -> None:
    print(f"Error: {msg}", file=sys.stderr)
    sys.exit(code)


def ensure_config_dir() -> None:
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)


def fmt_duration(hours) -> str:
    """Convert hours (float/None) to human-readable h:mm format.
    
    TrainingPeaks API returns totalTimePlanned/totalTime in hours (e.g. 1.5 = 1h30m).
    """
    if hours is None:
        return "—"
    h_float = float(hours)
    if h_float <= 0:
        return "—"
    total_minutes = round(h_float * 60)
    h, m = divmod(total_minutes, 60)
    if h:
        return f"{h}:{m:02d}"
    return f"0:{m:02d}"


# Workout type ID → sport name mapping (from TrainingPeaks API)
WORKOUT_TYPE_MAP = {
    1: "Swim",
    2: "Bike",
    3: "Run",
    4: "Brick",
    5: "Cross-Train",
    6: "Rest",
    7: "Walk",
    8: "Other",
    9: "Strength",
    10: "Custom",
    11: "Rowing",
    12: "XC Ski",
    13: "Mtn Bike",
}


def get_sport_name(workout) -> str:
    """Get sport name from a workout dict."""
    # Try workoutTypeFamilyId first (sometimes present)
    family = workout.get("workoutTypeFamilyId")
    if family and isinstance(family, str):
        return family
    # Fall back to workoutTypeValueId numeric mapping
    type_id = workout.get("workoutTypeValueId")
    if type_id is not None:
        return WORKOUT_TYPE_MAP.get(int(type_id), f"Type {type_id}")
    return "—"


def fmt_distance(meters) -> str:
    """Convert meters to km with 2 decimal places."""
    if meters is None:
        return "—"
    km = float(meters) / 1000
    if km < 0.01:
        return "—"
    return f"{km:.2f} km"


def fmt_float(val, decimals=1) -> str:
    if val is None:
        return "—"
    return f"{float(val):.{decimals}f}"


def print_table(headers: list[str], rows: list[list[str]], min_widths: list[int] | None = None) -> None:
    """Print a simple ASCII table."""
    if not rows:
        print("  (no data)")
        return
    widths = [len(h) for h in headers]
    if min_widths:
        widths = [max(w, m) for w, m in zip(widths, min_widths)]
    for row in rows:
        for i, cell in enumerate(row):
            if i < len(widths):
                widths[i] = max(widths[i], len(str(cell)))
    # Header
    header_line = "  ".join(h.ljust(widths[i]) for i, h in enumerate(headers))
    print(header_line)
    print("  ".join("─" * widths[i] for i in range(len(headers))))
    # Rows
    for row in rows:
        cells = []
        for i, cell in enumerate(row):
            if i < len(widths):
                cells.append(str(cell).ljust(widths[i]))
            else:
                cells.append(str(cell))
        print("  ".join(cells))


# ─── Cookie / Token Storage ──────────────────────────────────────────────────

def get_cookie() -> str | None:
    """Get cookie from env var or file."""
    env = os.environ.get("TP_AUTH_COOKIE")
    if env:
        return env.strip()
    if COOKIE_FILE.exists():
        return COOKIE_FILE.read_text().strip()
    return None


def store_cookie(cookie: str) -> None:
    ensure_config_dir()
    COOKIE_FILE.write_text(cookie.strip())
    # Restrict permissions
    try:
        COOKIE_FILE.chmod(0o600)
    except OSError:
        pass


def load_token_cache() -> dict | None:
    """Load cached token from disk."""
    if not TOKEN_FILE.exists():
        return None
    try:
        data = json.loads(TOKEN_FILE.read_text())
        return data
    except (json.JSONDecodeError, OSError):
        return None


def save_token_cache(access_token: str, expires_at: float) -> None:
    ensure_config_dir()
    TOKEN_FILE.write_text(json.dumps({
        "access_token": access_token,
        "expires_at": expires_at,
    }))
    try:
        TOKEN_FILE.chmod(0o600)
    except OSError:
        pass


def clear_token_cache() -> None:
    if TOKEN_FILE.exists():
        TOKEN_FILE.unlink()


def load_config() -> dict:
    if CONFIG_FILE.exists():
        try:
            return json.loads(CONFIG_FILE.read_text())
        except (json.JSONDecodeError, OSError):
            pass
    return {}


def save_config(cfg: dict) -> None:
    ensure_config_dir()
    CONFIG_FILE.write_text(json.dumps(cfg, indent=2))


# ─── HTTP Layer ───────────────────────────────────────────────────────────────

_last_request_time = 0.0


def _throttle() -> None:
    global _last_request_time
    elapsed = time.monotonic() - _last_request_time
    if elapsed < MIN_REQUEST_INTERVAL:
        time.sleep(MIN_REQUEST_INTERVAL - elapsed)
    _last_request_time = time.monotonic()


def _http_request(url: str, method: str = "GET", headers: dict | None = None,
                  body: bytes | None = None) -> tuple[int, dict | list | None]:
    """Make an HTTP request, return (status_code, parsed_json_or_None)."""
    _throttle()
    if headers is None:
        headers = {}
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            raw = resp.read().decode("utf-8")
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                data = None
            return resp.status, data
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace") if e.fp else ""
        try:
            data = json.loads(raw)
        except (json.JSONDecodeError, ValueError):
            data = None
        return e.code, data
    except urllib.error.URLError as e:
        die(f"Network error: {e.reason}")
    except Exception as e:
        die(f"Request failed: {e}")
    return 0, None  # unreachable


def exchange_cookie_for_token(cookie: str) -> dict:
    """Exchange Production_tpAuth cookie for OAuth token.

    Returns the full JSON response from /users/v3/token.
    """
    url = f"{TP_API_BASE}{TOKEN_ENDPOINT}"
    headers = {
        "Cookie": f"Production_tpAuth={cookie}",
        "Accept": "application/json",
    }
    status, data = _http_request(url, "GET", headers)
    if status == 401:
        die("Cookie expired or invalid. Re-authenticate with: tp.py auth <cookie>")
    if status != 200:
        die(f"Token exchange failed (HTTP {status})")
    if not isinstance(data, dict):
        die("Invalid token response format")
    return data


def ensure_token() -> str:
    """Ensure we have a valid Bearer token. Auto-refresh if needed.

    Returns the access_token string.
    """
    # Check cached token first
    cached = load_token_cache()
    if cached and cached.get("access_token"):
        expires_at = cached.get("expires_at", 0)
        if time.time() < (expires_at - TOKEN_REFRESH_BUFFER):
            return cached["access_token"]

    # Need to refresh — get cookie
    cookie = get_cookie()
    if not cookie:
        die("Not authenticated. Run: tp.py auth <cookie>")

    data = exchange_cookie_for_token(cookie)

    # The response may have token nested or at top level
    # From the MCP source: data["token"]["access_token"]
    token_data = data.get("token", data)
    access_token = token_data.get("access_token")
    if not access_token:
        die("Token response missing access_token")

    expires_in = token_data.get("expires_in", 3600)
    expires_at = time.time() + expires_in
    save_token_cache(access_token, expires_at)

    return access_token


def api_get(endpoint: str, params: dict | None = None) -> tuple[int, dict | list | None]:
    """Authenticated GET request."""
    token = ensure_token()
    url = f"{TP_API_BASE}{endpoint}"
    if params:
        qs = "&".join(f"{k}={urllib.request.quote(str(v))}" for k, v in params.items())
        url = f"{url}?{qs}"
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }
    status, data = _http_request(url, "GET", headers)
    # On 401, try refreshing token once
    if status == 401:
        clear_token_cache()
        token = ensure_token()
        headers["Authorization"] = f"Bearer {token}"
        status, data = _http_request(url, "GET", headers)
    return status, data


def api_post(endpoint: str, body: dict | None = None) -> tuple[int, dict | list | None]:
    """Authenticated POST request."""
    token = ensure_token()
    url = f"{TP_API_BASE}{endpoint}"
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }
    body_bytes = json.dumps(body).encode("utf-8") if body else None
    status, data = _http_request(url, "POST", headers, body_bytes)
    if status == 401:
        clear_token_cache()
        token = ensure_token()
        headers["Authorization"] = f"Bearer {token}"
        status, data = _http_request(url, "POST", headers, body_bytes)
    return status, data


# ─── Athlete ID ───────────────────────────────────────────────────────────────

def get_athlete_id() -> int:
    """Get athlete ID, using cache or fetching from API."""
    cfg = load_config()
    aid = cfg.get("athlete_id")
    if aid:
        return int(aid)

    # Fetch from profile
    status, data = api_get(USER_ENDPOINT)
    if status != 200 or not isinstance(data, dict):
        die("Failed to fetch user profile")

    user_data = data.get("user", data)
    athlete_id = user_data.get("personId")
    if not athlete_id:
        athletes = user_data.get("athletes", [])
        if athletes:
            athlete_id = athletes[0].get("athleteId")
    if not athlete_id:
        die("Could not determine athlete ID from profile")

    cfg["athlete_id"] = int(athlete_id)
    save_config(cfg)
    return int(athlete_id)


# ─── Commands ─────────────────────────────────────────────────────────────────

def cmd_auth(args: argparse.Namespace) -> None:
    """Store and validate a Production_tpAuth cookie."""
    cookie = args.cookie.strip()
    if not cookie:
        die("Cookie value cannot be empty")

    print("Validating cookie…")
    data = exchange_cookie_for_token(cookie)

    # Extract token info
    token_data = data.get("token", data)
    access_token = token_data.get("access_token")
    if not access_token:
        die("Token exchange succeeded but no access_token in response")

    expires_in = token_data.get("expires_in", 3600)
    expires_at = time.time() + expires_in

    # Store everything
    store_cookie(cookie)
    save_token_cache(access_token, expires_at)

    # Try to get and cache athlete ID
    athlete_id = data.get("athleteId")
    username = data.get("username")

    if athlete_id:
        cfg = load_config()
        cfg["athlete_id"] = int(athlete_id)
        if username:
            cfg["email"] = username
        save_config(cfg)

    print("✓ Authenticated successfully!")
    if username:
        print(f"  Account: {username}")
    if athlete_id:
        print(f"  Athlete ID: {athlete_id}")
    print(f"  Token expires in: {expires_in // 60} minutes")
    print(f"  Credentials stored in: {CONFIG_DIR}")


def cmd_auth_status(args: argparse.Namespace) -> None:
    """Check authentication status."""
    cookie = get_cookie()
    if not cookie:
        print("✗ Not authenticated")
        print("  Run: tp.py auth <cookie>")
        sys.exit(1)

    source = "environment variable" if os.environ.get("TP_AUTH_COOKIE") else "file"
    print(f"Cookie: stored ({source})")

    cached = load_token_cache()
    if cached and cached.get("access_token"):
        expires_at = cached.get("expires_at", 0)
        remaining = expires_at - time.time()
        if remaining > TOKEN_REFRESH_BUFFER:
            mins = int(remaining // 60)
            print(f"Token: valid ({mins}m remaining)")
        else:
            print("Token: expired (will auto-refresh)")
    else:
        print("Token: not cached (will fetch on next request)")

    cfg = load_config()
    if cfg.get("athlete_id"):
        print(f"Athlete ID: {cfg['athlete_id']}")
    if cfg.get("email"):
        print(f"Account: {cfg['email']}")

    print("✓ Ready")


def cmd_profile(args: argparse.Namespace) -> None:
    """Get athlete profile."""
    status, data = api_get(USER_ENDPOINT)
    if status != 200 or not isinstance(data, dict):
        die(f"Failed to fetch profile (HTTP {status})")

    if args.json:
        print(json.dumps(data, indent=2))
        return

    user = data.get("user", data)
    print("Profile")
    print("═" * 40)
    print(f"  Name:        {user.get('firstName', '')} {user.get('lastName', '')}")
    print(f"  Email:       {user.get('username', '—')}")
    print(f"  Athlete ID:  {user.get('personId', user.get('athleteId', '—'))}")
    print(f"  Account:     {user.get('accountType', '—')}")

    athletes = user.get("athletes", [])
    if athletes:
        a = athletes[0]
        print(f"  Weight:      {a.get('weight', '—')} kg")
        print(f"  DOB:         {a.get('dateOfBirth', '—')}")
        print(f"  Gender:      {a.get('sex', '—')}")
        print(f"  Bike FTP:    {a.get('cyclingFtp', '—')} W")
        print(f"  Run FTP:     {a.get('runningFtp', '—')}")
        print(f"  Swim FTP:    {a.get('swimFtp', '—')}")


def cmd_workouts(args: argparse.Namespace) -> None:
    """List workouts in a date range."""
    try:
        start = date.fromisoformat(args.start_date)
        end = date.fromisoformat(args.end_date)
    except ValueError as e:
        die(f"Invalid date: {e}. Use YYYY-MM-DD format.")

    if start > end:
        die("start_date must be before or equal to end_date")
    if (end - start).days > 90:
        die("Date range too large. Maximum is 90 days.")

    athlete_id = get_athlete_id()
    endpoint = f"/fitness/v6/athletes/{athlete_id}/workouts/{start}/{end}"
    status, data = api_get(endpoint)

    if status != 200:
        die(f"Failed to fetch workouts (HTTP {status})")

    if not isinstance(data, list):
        data = []

    # Apply filter
    workouts = data
    if args.filter == "completed":
        workouts = [w for w in workouts if w.get("completed") or w.get("totalTime") is not None]
    elif args.filter == "planned":
        workouts = [w for w in workouts if not w.get("completed") and w.get("totalTime") is None]

    if args.json:
        print(json.dumps(workouts, indent=2))
        return

    if not workouts:
        print(f"No {'matching ' if args.filter != 'all' else ''}workouts found for {start} → {end}")
        return

    print(f"Workouts: {start} → {end}  ({len(workouts)} {'total' if args.filter == 'all' else args.filter})")
    print()

    headers = ["Date", "Title", "Sport", "Status", "Planned", "Actual", "TSS", "Distance"]
    rows = []
    for w in workouts:
        wo_date = (w.get("workoutDay") or "")[:10]
        title = w.get("title") or "—"
        if len(title) > 30:
            title = title[:27] + "…"
        sport = get_sport_name(w)
        is_completed = w.get("completed") or w.get("totalTime") is not None
        status_str = "✓" if is_completed else "○"
        dur_planned = fmt_duration(w.get("totalTimePlanned"))
        dur_actual = fmt_duration(w.get("totalTime"))
        tss = fmt_float(w.get("tssActual") or w.get("tssPlanned"), 0)
        dist = fmt_distance(w.get("distance") or w.get("distancePlanned"))

        rows.append([wo_date, title, sport, status_str, dur_planned, dur_actual, tss, dist])

    print_table(headers, rows)


def cmd_workout(args: argparse.Namespace) -> None:
    """Get full workout detail."""
    athlete_id = get_athlete_id()
    endpoint = f"/fitness/v6/athletes/{athlete_id}/workouts/{args.workout_id}"
    status, data = api_get(endpoint)

    if status == 404:
        die(f"Workout {args.workout_id} not found")
    if status != 200 or not isinstance(data, dict):
        die(f"Failed to fetch workout (HTTP {status})")

    if args.json:
        print(json.dumps(data, indent=2))
        return

    w = data
    print(f"Workout: {w.get('title', 'Untitled')}")
    print("═" * 50)
    print(f"  Date:         {(w.get('workoutDay') or '')[:10]}")
    print(f"  Sport:        {get_sport_name(w)}")
    print(f"  Status:       {'Completed ✓' if w.get('completed') or w.get('totalTime') else 'Planned ○'}")
    print()

    # Durations
    print("  Duration")
    print(f"    Planned:    {fmt_duration(w.get('totalTimePlanned'))}")
    print(f"    Actual:     {fmt_duration(w.get('totalTime'))}")
    print()

    # Metrics
    print("  Metrics")
    print(f"    TSS:        {fmt_float(w.get('tssActual'), 0)} actual / {fmt_float(w.get('tssPlanned'), 0)} planned")
    print(f"    IF:         {fmt_float(w.get('if'), 2)} actual / {fmt_float(w.get('ifPlanned'), 2)} planned")
    print(f"    Distance:   {fmt_distance(w.get('distance'))} actual / {fmt_distance(w.get('distancePlanned'))} planned")
    print(f"    Avg Power:  {fmt_float(w.get('powerAverage'), 0)} W")
    print(f"    NP:         {fmt_float(w.get('normalizedPowerActual'), 0)} W")
    print(f"    Avg HR:     {fmt_float(w.get('heartRateAverage'), 0)} bpm")
    print(f"    Avg Cadence:{fmt_float(w.get('cadenceAverage'), 0)}")
    print(f"    Elev Gain:  {fmt_float(w.get('elevationGain'), 0)} m")
    print(f"    Calories:   {w.get('calories') or '—'}")
    print()

    # Description
    desc = w.get("description")
    if desc:
        print("  Description:")
        for line in desc.strip().split("\n"):
            print(f"    {line}")
        print()

    coach = w.get("coachComments")
    if coach:
        print("  Coach Comments:")
        for line in coach.strip().split("\n"):
            print(f"    {line}")
        print()

    athlete = w.get("athleteComments")
    if athlete:
        print("  Athlete Comments:")
        for line in athlete.strip().split("\n"):
            print(f"    {line}")


def cmd_fitness(args: argparse.Namespace) -> None:
    """Get CTL/ATL/TSB fitness data."""
    days = args.days
    if days < 1 or days > 365:
        die("--days must be between 1 and 365")

    end_date = date.today()
    start_date = end_date - timedelta(days=days)

    athlete_id = get_athlete_id()
    endpoint = f"/fitness/v1/athletes/{athlete_id}/reporting/performancedata/{start_date}/{end_date}"
    body = {
        "atlConstant": 7,
        "atlStart": 0,
        "ctlConstant": 42,
        "ctlStart": 0,
        "workoutTypes": [],
    }

    status, data = api_post(endpoint, body)
    if status != 200:
        die(f"Failed to fetch fitness data (HTTP {status})")

    if not isinstance(data, list):
        data = []

    if args.json:
        print(json.dumps(data, indent=2))
        return

    if not data:
        print("No fitness data available")
        return

    # Current values (latest entry)
    latest = data[-1]
    ctl = latest.get("ctl", 0)
    atl = latest.get("atl", 0)
    tsb = latest.get("tsb", 0)

    def fitness_status(tsb_val: float) -> str:
        if tsb_val > 25:
            return "Very Fresh (detraining risk)"
        elif tsb_val > 10:
            return "Fresh (race ready)"
        elif tsb_val > 0:
            return "Neutral (normal training)"
        elif tsb_val > -10:
            return "Tired (absorbing training)"
        elif tsb_val > -25:
            return "Very Tired (high fatigue)"
        else:
            return "Exhausted (overreaching risk)"

    print("Fitness Summary")
    print("═" * 45)
    print(f"  CTL (Fitness):  {ctl:.1f}")
    print(f"  ATL (Fatigue):  {atl:.1f}")
    print(f"  TSB (Form):     {tsb:.1f}")
    print(f"  Status:         {fitness_status(tsb)}")
    print(f"  Period:         {start_date} → {end_date} ({days} days)")
    print()

    # Show last 14 days of detail (or all if fewer)
    display_data = data[-14:] if len(data) > 14 else data
    print(f"Daily Data (last {len(display_data)} days):")
    headers = ["Date", "TSS", "CTL", "ATL", "TSB"]
    rows = []
    for entry in display_data:
        d = (entry.get("workoutDay") or "")[:10]
        tss = fmt_float(entry.get("tssActual", 0), 0)
        c = fmt_float(entry.get("ctl", 0), 1)
        a = fmt_float(entry.get("atl", 0), 1)
        t = fmt_float(entry.get("tsb", 0), 1)
        rows.append([d, tss, c, a, t])

    print_table(headers, rows)

    if len(data) > 14:
        print(f"\n  (Showing last 14 of {len(data)} days. Use --json for full data)")


def cmd_peaks(args: argparse.Namespace) -> None:
    """Get personal records."""
    sport = args.sport
    pr_type = args.pr_type
    days = args.days

    # Validate
    valid_types = BIKE_PR_TYPES if sport == "Bike" else RUN_PR_TYPES
    if pr_type not in valid_types:
        die(f"Invalid pr_type '{pr_type}' for {sport}.\n"
            f"Valid types: {', '.join(valid_types)}")

    athlete_id = get_athlete_id()
    end_date = date.today()
    start_date = end_date - timedelta(days=days)

    endpoint = f"/personalrecord/v2/athletes/{athlete_id}/{sport}"
    params = {
        "prType": pr_type,
        "startDate": f"{start_date}T00:00:00",
        "endDate": f"{end_date}T00:00:00",
    }

    status, data = api_get(endpoint, params)
    if status != 200:
        die(f"Failed to fetch personal records (HTTP {status})")

    if not isinstance(data, list):
        data = []

    if args.json:
        print(json.dumps(data, indent=2))
        return

    if not data:
        print(f"No {pr_type} records found for {sport} in the last {days} days")
        return

    # Determine unit
    is_power = "power" in pr_type.lower()
    is_speed = "speed" in pr_type.lower()
    is_hr = "hR" in pr_type or "hr" in pr_type.lower()

    if is_power:
        unit = "W"
    elif is_hr:
        unit = "bpm"
    elif is_speed:
        unit = ""  # pace or speed — varies
    else:
        unit = ""

    print(f"Personal Records: {sport} — {pr_type}")
    print(f"Period: {start_date} → {end_date}")
    print("═" * 55)

    headers = ["Rank", f"Value ({unit})" if unit else "Value", "Date", "Workout"]
    rows = []
    for r in data:
        rank = str(r.get("rank", "—"))
        value = r.get("value")
        if value is not None:
            if is_power:
                value_str = f"{int(float(value))}"
            elif is_hr:
                value_str = f"{int(float(value))}"
            else:
                value_str = fmt_float(value, 2)
        else:
            value_str = "—"
        wo_date = (r.get("workoutDate") or "")[:10]
        wo_title = r.get("workoutTitle") or "—"
        if len(wo_title) > 30:
            wo_title = wo_title[:27] + "…"
        rows.append([rank, value_str, wo_date, wo_title])

    print_table(headers, rows)


# ─── CLI Setup ────────────────────────────────────────────────────────────────

def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="tp.py",
        description="TrainingPeaks CLI — access your training data from the command line.",
    )
    sub = parser.add_subparsers(dest="command", help="Available commands")

    # auth
    p_auth = sub.add_parser("auth", help="Authenticate with a Production_tpAuth cookie")
    p_auth.add_argument("cookie", help="Value of the Production_tpAuth cookie")

    # auth-status
    sub.add_parser("auth-status", help="Check authentication status")

    # profile
    p_profile = sub.add_parser("profile", help="Get athlete profile")
    p_profile.add_argument("--json", action="store_true", help="Output raw JSON")

    # workouts
    p_workouts = sub.add_parser("workouts", help="List workouts in a date range")
    p_workouts.add_argument("start_date", help="Start date (YYYY-MM-DD)")
    p_workouts.add_argument("end_date", help="End date (YYYY-MM-DD)")
    p_workouts.add_argument("--filter", choices=["all", "planned", "completed"],
                            default="all", help="Filter workouts (default: all)")
    p_workouts.add_argument("--json", action="store_true", help="Output raw JSON")

    # workout
    p_workout = sub.add_parser("workout", help="Get full workout detail")
    p_workout.add_argument("workout_id", help="Workout ID")
    p_workout.add_argument("--json", action="store_true", help="Output raw JSON")

    # fitness
    p_fitness = sub.add_parser("fitness", help="Get CTL/ATL/TSB fitness data")
    p_fitness.add_argument("--days", type=int, default=90,
                           help="Days of history (default: 90, max: 365)")
    p_fitness.add_argument("--json", action="store_true", help="Output raw JSON")

    # peaks
    p_peaks = sub.add_parser("peaks", help="Get personal records")
    p_peaks.add_argument("sport", choices=["Bike", "Run"], help="Sport type")
    p_peaks.add_argument("pr_type", help="PR type (e.g., power20min, speed5K)")
    p_peaks.add_argument("--days", type=int, default=3650,
                         help="Days of history (default: 3650 ≈ 10 years)")
    p_peaks.add_argument("--json", action="store_true", help="Output raw JSON")

    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(0)

    commands = {
        "auth": cmd_auth,
        "auth-status": cmd_auth_status,
        "profile": cmd_profile,
        "workouts": cmd_workouts,
        "workout": cmd_workout,
        "fitness": cmd_fitness,
        "peaks": cmd_peaks,
    }

    fn = commands.get(args.command)
    if fn:
        fn(args)
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
