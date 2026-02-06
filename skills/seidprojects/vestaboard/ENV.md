# Environment variables (Vestaboard)

Do **not** upload tokens to ClawHub or commit them to git.

Set one of the following at runtime:

- `VESTABOARD_TOKEN` (preferred) — used as `X-Vestaboard-Token` for the Cloud API
- `VESTABOARD_RW_KEY` (legacy) — used as `X-Vestaboard-Read-Write-Key` for the legacy endpoint

Optional:

- `VESTABOARD_API_BASE` (default: `https://cloud.vestaboard.com/`)
