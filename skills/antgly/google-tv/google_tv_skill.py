#!/usr/bin/env python3
"""
google_tv_skill.py

Control Google TV / Chromecast with Google TV via ADB.

Usage:
  ./google_tv_skill.py status [--device IP] [--port PORT] [--verbose]
  ./google_tv_skill.py play <query_or_id_or_url> [--device IP] [--port PORT] [--app APP] [--verbose]
  ./google_tv_skill.py pause [--device IP] [--port PORT] [--verbose]
  ./google_tv_skill.py resume [--device IP] [--port PORT] [--verbose]

Notes:
- Uses the skill-local venv Python; be sure to run with ./.venv/bin/python3 as documented.
- Caches last successful IP:PORT to .last_device.json in the skill folder.
- Does NOT perform port scanning. It will attempt the explicit port passed or cached one.
- YouTube: prefers resolving to a video ID using the yt-api CLI (calls `yt-api` on PATH or the fallback
  path /Users/anthony/go/bin/yt-api). If an ID is obtained, it launches the YouTube TV app via an intent
  restricted to the YouTube TV package.
- Tubi: expects either a tubitv numeric id or an https URL. The script will attempt the tubitv:// intent
  first and then a VIEW https intent, both restricted to the Tubi package.

Exit codes:
  0 success
  2 adb connect/connection error
  3 resolution (YouTube ID) failure
  4 adb command failure

"""

import argparse
import json
import logging
import os
import re
import shlex
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Iterable, Optional, Sequence, Tuple
from urllib.parse import parse_qs, urlparse

SKILL_DIR = Path(__file__).resolve().parent
CACHE_FILE = SKILL_DIR / '.last_device.json'
FALLBACK_YT_API_PATH = '/Users/anthony/go/bin/yt-api'
ADB_TIMEOUT_SECONDS = 10
ADB_CONNECT_ATTEMPTS = 3
DEFAULT_YOUTUBE_TV_PACKAGE = 'com.google.android.youtube.tv'
DEFAULT_TUBI_PACKAGE = 'com.tubitv'

YOUTUBE_ID_RE = re.compile(r'^[A-Za-z0-9_-]{6,}$')
YOUTUBE_HOSTS = {'youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com'}
YOUTUBE_SHORT_HOSTS = {'youtu.be', 'www.youtu.be'}

KEYCODE_MEDIA_PLAY = 126
KEYCODE_MEDIA_PAUSE = 127

TUBI_SCHEME_PREFIX = 'tubitv://'
TUBI_INTENT_SCHEME = 'tubitv://video/{id}'

logger = logging.getLogger('google_tv_skill')


def load_cache() -> Optional[dict]:
    if not CACHE_FILE.exists():
        return None
    try:
        data = json.loads(CACHE_FILE.read_text())
    except Exception:
        return None
    if not isinstance(data, dict):
        return None
    ip = data.get('ip')
    port = data.get('port')
    if not ip or port is None:
        return None
    try:
        port_int = int(port)
    except Exception:
        return None
    return {'ip': str(ip), 'port': port_int}


def save_cache(ip: str, port: int):
    try:
        CACHE_FILE.write_text(json.dumps({'ip': ip, 'port': int(port)}))
    except Exception as e:
        logger.debug('Failed to write cache: %s', e)


def adb_available() -> bool:
    return bool(shutil.which('adb'))


def is_youtube_id(value: str) -> bool:
    return bool(YOUTUBE_ID_RE.fullmatch(value or ''))


def extract_youtube_id(value: str) -> Optional[str]:
    """
    Extract a YouTube video ID from an ID string or a YouTube URL.
    """
    if not value:
        return None
    value = value.strip()
    if is_youtube_id(value):
        return value

    try:
        parsed = urlparse(value)
    except Exception:
        return None

    if not parsed.scheme or not parsed.netloc:
        return None

    host = parsed.netloc.lower()
    if host in YOUTUBE_SHORT_HOSTS:
        candidate = parsed.path.lstrip('/').split('/')[0]
        return candidate if is_youtube_id(candidate) else None

    if host in YOUTUBE_HOSTS:
        if parsed.path in ('/watch', '/watch/'):
            qs = parse_qs(parsed.query or '')
            candidate = (qs.get('v') or [None])[0]
            if candidate and is_youtube_id(candidate):
                return candidate
        for prefix in ('/shorts/', '/embed/', '/live/'):
            if parsed.path.startswith(prefix):
                candidate = parsed.path[len(prefix):].split('/')[0]
                return candidate if is_youtube_id(candidate) else None
        if parsed.fragment:
            frag = parsed.fragment
            if frag.startswith('watch?'):
                qs = parse_qs(frag[len('watch?'):])
                candidate = (qs.get('v') or [None])[0]
                if candidate and is_youtube_id(candidate):
                    return candidate
    return None


def find_video_id(data) -> Optional[str]:
    """
    Walk a JSON-like structure and return the first plausible YouTube video id.
    """
    if isinstance(data, dict):
        for key in ('videoId', 'video_id', 'id'):
            val = data.get(key)
            if isinstance(val, str) and is_youtube_id(val):
                return val
            if isinstance(val, dict):
                nested = find_video_id(val)
                if nested:
                    return nested
        for val in data.values():
            nested = find_video_id(val)
            if nested:
                return nested
    elif isinstance(data, list):
        for item in data:
            nested = find_video_id(item)
            if nested:
                return nested
    return None


def yt_api_candidates() -> Iterable[str]:
    seen = set()
    path = shutil.which('yt-api')
    if path:
        seen.add(path)
        yield path
    fallback = Path(FALLBACK_YT_API_PATH)
    if fallback.exists():
        path = str(fallback)
        if path not in seen:
            yield path


def run_adb(args: Sequence[str], device: Optional[str] = None, timeout: int = ADB_TIMEOUT_SECONDS) -> Tuple[int, str]:
    cmd = ['adb']
    if device:
        cmd += ['-s', device]
    cmd += list(args)
    logger.debug('Running adb command: %s', ' '.join(shlex.quote(a) for a in cmd))
    try:
        p = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        out = (p.stdout or '') + (p.stderr or '')
        return p.returncode, out
    except FileNotFoundError:
        return 127, 'adb not found on PATH'
    except Exception as e:
        return 1, str(e)


def adb_shell(args: Sequence[str], device: Optional[str], timeout: int = ADB_TIMEOUT_SECONDS) -> Tuple[int, str]:
    return run_adb(['shell', *args], device, timeout=timeout)


def adb_intent_view(device: str, url: str, package: Optional[str] = None) -> Tuple[bool, str]:
    cmd = ['am', 'start', '-a', 'android.intent.action.VIEW', '-d', url]
    if package and package.strip():
        cmd += ['-p', package]
    code, out = adb_shell(cmd, device)
    return code == 0, out


def youtube_package() -> str:
    return (os.environ.get('YOUTUBE_TV_PACKAGE') or DEFAULT_YOUTUBE_TV_PACKAGE).strip()


def tubi_package() -> str:
    return (os.environ.get('TUBI_PACKAGE') or DEFAULT_TUBI_PACKAGE).strip()


def adb_connect(
    ip: str,
    port: int,
    timeout: int = ADB_TIMEOUT_SECONDS,
    attempts: int = ADB_CONNECT_ATTEMPTS,
) -> Tuple[bool, str]:
    """
    Attempt to adb connect with a small retry/backoff strategy.
    Returns (ok, output).
    """
    addr = f"{ip}:{port}"
    last_out = ''
    for attempt in range(1, attempts + 1):
        code, out = run_adb(['connect', addr], None, timeout=timeout)
        last_out = out
        if code == 127:
            return False, out
        ok = code == 0 and ('connected to' in out.lower() or 'already connected' in out.lower())
        if ok:
            return True, out
        # short exponential backoff (0.5s, 1s, 2s)
        if attempt < attempts:
            backoff = 0.5 * (2 ** (attempt - 1))
            logger.debug('adb connect attempt %d failed: %s; sleeping %.1fs before retry', attempt, out.strip(), backoff)
            try:
                import time

                time.sleep(backoff)
            except Exception:
                pass
    return False, last_out


def connection_refused(message: str) -> bool:
    if not message:
        return False
    lowered = message.lower()
    return (
        'connection refused' in lowered
        or 'refused' in lowered
        or 'failed to connect' in lowered
        or 'cannot connect' in lowered
    )


def prompt_for_port(ip: str) -> Optional[int]:
    if not sys.stdin.isatty():
        return None
    prompt = f'Enter new ADB port for {ip} (blank to cancel): '
    while True:
        try:
            value = input(prompt).strip()
        except EOFError:
            return None
        if not value:
            return None
        if value.isdigit():
            port = int(value)
            if 0 < port < 65536:
                return port
        print('Invalid port. Enter a number between 1 and 65535.')


def try_prompt_new_port(ip: str, message: str) -> Tuple[Optional[str], Optional[str]]:
    if not connection_refused(message):
        return None, None
    new_port = prompt_for_port(ip)
    if not new_port:
        return None, None
    ok, out = adb_connect(ip, new_port)
    if ok:
        save_cache(ip, new_port)
        return f"{ip}:{new_port}", None
    return None, f'adb connect failed (new port): {out.strip()}'


def ensure_connected(ip: Optional[str], port: Optional[int]) -> Tuple[Optional[str], Optional[str]]:
    # Returns (device_spec, error_message)
    cache = load_cache()

    if ip and not port:
        if cache and cache['ip'] == ip:
            port = cache['port']
            logger.debug('Using cached port %s for %s', port, ip)
        else:
            return None, f'port required for device {ip} (no cached port available)'

    if port and not ip:
        if cache:
            ip = cache['ip']
            logger.debug('Using cached ip %s for port %s', ip, port)
        else:
            return None, 'device IP required when port is provided without cache'

    if not ip and not port:
        if cache:
            ip = cache['ip']
            port = cache['port']
        else:
            return None, 'no device specified and no cached device found'

    ok, out = adb_connect(ip, port)
    if ok:
        save_cache(ip, port)
        return f"{ip}:{port}", None

    prompted_device, prompt_err = try_prompt_new_port(ip, out)
    if prompted_device:
        return prompted_device, None
    if prompt_err:
        return None, prompt_err

    if cache and (cache['ip'], cache['port']) != (ip, port):
        logger.debug('Explicit adb connect failed; attempting cached device %s:%s', cache['ip'], cache['port'])
        ok2, out2 = adb_connect(cache['ip'], cache['port'])
        if ok2:
            return f"{cache['ip']}:{cache['port']}", None

        prompted_device, prompt_err = try_prompt_new_port(cache['ip'], out2)
        if prompted_device:
            return prompted_device, None
        if prompt_err:
            return None, prompt_err

        return None, f'adb connect failed (explicit): {out.strip()} ; cached attempt: {out2.strip()}'

    return None, f'adb connect failed: {out.strip()}'


def status_cmd(args) -> int:
    device, err = ensure_connected(args.ip, args.port)
    if not device:
        if err:
            print(err)
        code, out = run_adb(['devices'])
        print(out.strip())
        return 2
    code, out = run_adb(['devices'])
    print(out.strip())
    return 0 if code == 0 else 4


def pause_cmd(args) -> int:
    device, err = ensure_connected(args.ip, args.port)
    if not device:
        print(err)
        return 2
    # Send media keycode: KEYCODE_MEDIA_PAUSE (127)
    code, out = adb_shell(['input', 'keyevent', str(KEYCODE_MEDIA_PAUSE)], device)
    if code != 0:
        print('adb command failed:', out)
        return 4
    print('paused')
    return 0


def resume_cmd(args) -> int:
    device, err = ensure_connected(args.ip, args.port)
    if not device:
        print(err)
        return 2
    code, out = adb_shell(['input', 'keyevent', str(KEYCODE_MEDIA_PLAY)], device)
    if code != 0:
        print('adb command failed:', out)
        return 4
    print('resumed')
    return 0


def resolve_youtube_id_with_yt_api(query: str) -> Optional[str]:
    """
    Try to resolve a YouTube ID using an available yt-api CLI on PATH, or fallback path.
    Expects a simple invocation that returns JSON or plain ID when asked.
    """
    for bin_path in yt_api_candidates():
        try:
            logger.debug('Trying to resolve YouTube ID using %s', bin_path)
            p = subprocess.run([bin_path, 'search', query], capture_output=True, text=True, timeout=15)
            out = (p.stdout or '').strip()
            err = (p.stderr or '').strip()
            if p.returncode != 0:
                logger.debug('yt-api returned %s: %s', p.returncode, err or out)
                continue
            if not out:
                continue

            try:
                data = json.loads(out)
                found = find_video_id(data)
                if found:
                    return found
            except Exception:
                pass

            for line in out.splitlines():
                candidate = extract_youtube_id(line.strip())
                if candidate:
                    return candidate

            m = re.search(r'v=([A-Za-z0-9_-]{6,})', out)
            if m:
                return m.group(1)
            if is_youtube_id(out):
                return out
        except FileNotFoundError:
            continue
        except Exception as e:
            logger.debug('yt-api call failed: %s', e)
            continue
    return None


def launch_youtube_intent(device: str, video_id: str) -> Tuple[bool, str]:
    url = f'https://www.youtube.com/watch?v={video_id}'
    return adb_intent_view(device, url, youtube_package())


def looks_like_tubi(term: str) -> bool:
    if not term:
        return False
    value = term.strip().lower()
    return (
        value.isdigit()
        or value.startswith(TUBI_SCHEME_PREFIX)
        or value.startswith('tubitv')
        or 'tubitv.com' in value
    )


def handle_tubi(device: str, term: str) -> Tuple[bool, str]:
    # If term looks numeric, try tubitv:// first, then fallback to https VIEW
    if term.isdigit():
        scheme = TUBI_INTENT_SCHEME.format(id=term)
        ok, out = adb_intent_view(device, scheme, tubi_package())
        if ok:
            return True, out
        # fallback to https
        # The user asked to use web_search when we need canonical Tubi URLs; this script
        # expects a Tubi https URL as fallback input if available. If not provided, try generic https format.
        https = f'https://tubitv.com/movies/{term}'
        return adb_intent_view(device, https, tubi_package())

    if term.lower().startswith(TUBI_SCHEME_PREFIX):
        return adb_intent_view(device, term, tubi_package())

    if term.startswith('http'):
        return adb_intent_view(device, term, tubi_package())

    if term.startswith('tubitv.com') or term.startswith('www.tubitv.com'):
        return adb_intent_view(device, f'https://{term}', tubi_package())

    # otherwise we don't attempt assistant-like search here
    return False, 'Tubi term is not numeric ID nor URL; provide either.'


def play_cmd(args) -> int:
    device, err = ensure_connected(args.ip, args.port)
    if not device:
        print(err)
        return 2
    query = args.query.strip()
    app_hint = (args.app or '').strip().lower()
    if app_hint and app_hint not in {'youtube', 'tubi'}:
        logger.debug('Unknown app hint %s; ignoring', app_hint)
        app_hint = ''

    if app_hint == 'tubi':
        ok, out = handle_tubi(device, query)
        if ok:
            print('launched tubi')
            return 0
        print('tubi launch failed:', out)
        return 4

    if app_hint == 'youtube':
        video_id = extract_youtube_id(query) or resolve_youtube_id_with_yt_api(query)
        if not video_id:
            print('failed to resolve YouTube ID for query; per policy no Assistant/UI fallback will be attempted')
            return 3
        ok, out = launch_youtube_intent(device, video_id)
        if ok:
            print('launched youtube video', video_id)
            return 0
        print('adb intent failed:', out)
        return 4

    video_id = extract_youtube_id(query)
    if video_id:
        ok, out = launch_youtube_intent(device, video_id)
        if ok:
            print('launched youtube video', video_id)
            return 0
        print('adb intent failed:', out)
        return 4

    if looks_like_tubi(query):
        ok, out = handle_tubi(device, query)
        if ok:
            print('launched tubi')
            return 0
        logger.debug('tubi launch failed; falling back to yt-api: %s', out)

    # Otherwise attempt to resolve a YouTube ID using yt-api CLI as requested
    video_id = resolve_youtube_id_with_yt_api(query)
    if video_id:
        ok, out = launch_youtube_intent(device, video_id)
        if ok:
            print('launched youtube video', video_id)
            return 0
        print('adb intent failed:', out)
        return 4

    print('failed to resolve YouTube ID for query; per policy no Assistant/UI fallback will be attempted')
    return 3


def build_parser():
    p = argparse.ArgumentParser(prog='google_tv_skill.py')
    sub = p.add_subparsers(dest='cmd')

    sp_status = sub.add_parser('status')
    sp_status.add_argument('--device', dest='ip', help='Chromecast IP address')
    sp_status.add_argument('--port', type=int, dest='port', help='ADB port')
    sp_status.add_argument('--verbose', action='store_true')
    sp_status.set_defaults(func=status_cmd)

    sp_play = sub.add_parser('play')
    sp_play.add_argument('query', help='Query, YouTube id, or provider-specific id/url')
    sp_play.add_argument('--device', dest='ip', help='Chromecast IP address')
    sp_play.add_argument('--port', type=int, dest='port', help='ADB port')
    sp_play.add_argument('--app', dest='app', help='App hint (youtube, tubi)')
    sp_play.add_argument('--verbose', action='store_true')
    sp_play.set_defaults(func=play_cmd)

    sp_pause = sub.add_parser('pause')
    sp_pause.add_argument('--device', dest='ip', help='Chromecast IP address')
    sp_pause.add_argument('--port', type=int, dest='port', help='ADB port')
    sp_pause.add_argument('--verbose', action='store_true')
    sp_pause.set_defaults(func=pause_cmd)

    sp_resume = sub.add_parser('resume')
    sp_resume.add_argument('--device', dest='ip', help='Chromecast IP address')
    sp_resume.add_argument('--port', type=int, dest='port', help='ADB port')
    sp_resume.add_argument('--verbose', action='store_true')
    sp_resume.set_defaults(func=resume_cmd)

    return p


def main(argv=None):
    argv = argv if argv is not None else sys.argv[1:]
    parser = build_parser()
    args = parser.parse_args(argv)
    if not args.cmd:
        parser.print_help()
        return 1

    # Apply env overrides
    if hasattr(args, 'ip') and not args.ip:
        args.ip = os.environ.get('CHROMECAST_HOST')
    if hasattr(args, 'port') and not args.port:
        p = os.environ.get('CHROMECAST_PORT')
        if p:
            try:
                args.port = int(p)
            except Exception:
                pass

    # logging
    level = logging.DEBUG if getattr(args, 'verbose', False) else logging.INFO
    logging.basicConfig(level=level, format='%(levelname)s: %(message)s')

    if not adb_available():
        print('adb not found on PATH. Install Android platform-tools and ensure adb is available.')
        return 2

    # Run the command
    try:
        rc = args.func(args)
    except Exception as e:
        logger.exception('Unhandled error')
        print('error:', e)
        return 1
    return rc


if __name__ == '__main__':
    raise SystemExit(main())
