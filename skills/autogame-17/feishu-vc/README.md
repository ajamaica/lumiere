# Feishu Video Conference Skill

Manage Feishu Video Conferences (VC).

## Usage

### Reserve a Meeting

Create a meeting reservation.

```bash
node skills/feishu-vc/reserve.js --subject "Meeting Title" --time "2026-02-04T10:00:00+08:00"
```

## API Reference

- Reserve: `POST /open-apis/vc/v1/reserve`
- Permissions required: `vc:meeting:request` (Update meeting reservation info)

## Setup

Requires `FEISHU_APP_ID` and `FEISHU_APP_SECRET`.
