# google_tv skill

This skill controls a Chromecast with Google TV (Google TV) device via ADB.

## Quick usage

Run with the skill venv python as documented in SKILL.md, e.g.:

    ./.venv/bin/python3 google_tv_skill.py status --device 192.168.4.64 --port 5555
    ./.venv/bin/python3 google_tv_skill.py play "7m714Ls29ZA" --device 192.168.4.64 --port 5555

## Subcommands

- status: show adb devices output
- play <query_or_id_or_url>: play content. Prefer providing a YouTube video ID or a provider URL/ID.
- pause: send media pause
- resume: send media play

## Behavior notes

- The script will NOT perform port scanning. It will attempt to use the explicit IP:PORT you pass, or a cached
  IP:PORT in .last_device.json. It will not probe for ports automatically.
  If you pass only --device or only --port, it will use the cached counterpart when available.

- YouTube handling: the script attempts to resolve the provided query to a YouTube video ID using the
  `yt-api` CLI (looked up on PATH) or the fallback path /Users/anthony/go/bin/yt-api. If a video ID is
  found, it launches the YouTube TV app directly using an ADB intent restricted to the YouTube TV package.
  There is no UI/Assistant fallback. Override the package with `YOUTUBE_TV_PACKAGE` if needed.

- Tubi handling: numeric Tubi IDs will attempt the tubitv:// intent first and fall back to a VIEW https
  intent. Both are restricted to the Tubi package. If you need a canonical Tubi https URL, the assistant
  can look it up via web_search and supply it here. Override the package with `TUBI_PACKAGE` if needed.

- Requirements: See requirements.txt (requests, beautifulsoup4) — install into the skill venv at ./.venv.

## Caching

The script stores the last successful device (ip and port) in .last_device.json in the skill folder. This is
used as a convenience if you don't pass an explicit device.

## Troubleshooting

- If adb connect fails, run `adb connect IP:PORT` manually from your host to verify the current port.
- If adb connect is refused and you're running interactively, the script will prompt you for a new port
  and update .last_device.json on success.
- If yt-api resolution fails, ensure `yt-api` is installed or accessible at /Users/anthony/go/bin/yt-api.

## Development

- The script uses simple subprocess calls to `adb`. It expects `adb` to be on PATH.

## License

Personal skill (Anthony). Modify as you like.
