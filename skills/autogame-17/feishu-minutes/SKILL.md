# Feishu Minutes (妙记) Skill

Fetch info, stats, transcript, and media from Feishu Minutes.

## Usage

```bash
node skills/feishu-minutes/index.js process <minutes_token> --out <output_dir>
```

- `<minutes_token>`: The token from the Minutes URL (e.g., `mmcn...`).
- `--out`: Optional output directory (defaults to `memory/feishu_minutes/<token>`).

## Output

- `info.json`: Basic metadata.
- `stats.json`: View/Comment stats.
- `subtitle.json`: Raw transcript data.
- `transcript.md`: Readable transcript.
- `media.mp4`: Video/Audio recording.
