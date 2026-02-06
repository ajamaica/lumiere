---
name: screen-narrator
description: Live narration of your screen activity with 7 styles (sports, nature, horror, noir, reality_tv, asmr, wrestling) and live switching.
homepage: https://github.com/buddyh/narrator
metadata:
  {
    'clawdbot':
      {
        'emoji': '',
        'os': ['darwin'],
        'requires':
          {
            'bins': ['python3', 'tmux', 'peekaboo'],
            'envs': ['GEMINI_API_KEY', 'ELEVENLABS_API_KEY'],
          },
      },
  }
---

# Screen Narrator

Live screen narration via Gemini vision + ElevenLabs TTS. 7 styles with per-style voices and ambient tracks.

## Commands

### Start

```bash
tmux new-session -d -s narrator "cd {baseDir} && python -m narrator sports --control-file /tmp/narrator-ctl.json --status-file /tmp/narrator-status.json"
```

### Start with timer

```bash
tmux new-session -d -s narrator "cd {baseDir} && python -m narrator wrestling -t 5m --control-file /tmp/narrator-ctl.json --status-file /tmp/narrator-status.json"
```

### Change style

```bash
echo '{"command": "style", "value": "horror"}' > /tmp/narrator-ctl.json
```

### Change profanity

```bash
echo '{"command": "profanity", "value": "low"}' > /tmp/narrator-ctl.json
```

### Pause / Resume

```bash
echo '{"command": "pause"}' > /tmp/narrator-ctl.json
echo '{"command": "resume"}' > /tmp/narrator-ctl.json
```

### Multiple commands

```bash
echo '[{"command": "style", "value": "noir"}, {"command": "profanity", "value": "high"}]' > /tmp/narrator-ctl.json
```

### Check status

```bash
cat /tmp/narrator-status.json
```

### Stop

```bash
tmux kill-session -t narrator
```

## Styles

| Style        | Vibe                                  |
| ------------ | ------------------------------------- |
| `sports`     | Punchy play-by-play announcer         |
| `nature`     | David Attenborough documentary        |
| `horror`     | Creeping dread, ominous foreshadowing |
| `noir`       | Hard-boiled detective narration       |
| `reality_tv` | Reality TV confessional booth         |
| `asmr`       | Whispered meditation                  |
| `wrestling`  | BAH GAWD maximum hype announcer       |

## Control commands

| Command     | Value                | Example                                      |
| ----------- | -------------------- | -------------------------------------------- |
| `style`     | Style name           | `{"command": "style", "value": "wrestling"}` |
| `profanity` | `off`, `low`, `high` | `{"command": "profanity", "value": "low"}`   |
| `pause`     | (none)               | `{"command": "pause"}`                       |
| `resume`    | (none)               | `{"command": "resume"}`                      |

## Common requests

- "narrate my screen" / "roast my screen" -> Start with `sports`
- "haunt my screen" -> Start with `horror`
- "narrate for 5 minutes" -> Use `-t 5m`
- "switch to wrestling" -> Write style command to control file
- "make it family friendly" -> Set profanity to `off`
- "pause" / "shut up" -> Pause command
- "stop narrating" -> `tmux kill-session -t narrator`
