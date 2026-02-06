# TOOLS.md - Local Notes

Skills define _how_ tools work. This file is for _your_ specifics — the stuff that's unique to your setup.

## 🗝️ Legacy Gork Credentials

These keys were migrated from the `.env` on William on 2026-01-31.

### Google APIs

- **Client ID 1 (Calendar/Gmail)**: `1047489305186-9945mtot1ni3hv1pfv6k7vgoml4usk3i.apps.googleusercontent.com`
- **Client Secret 1**: `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`
- **Refresh Token 1**: `1//05HZahH7ZCFi8CgYIARAAGAUSNwF-L9Irqeo103L-hVFrIQux3M5uajLFvzYKtdPrWubqJ_fGlcBu5dPOJOwO5j_04INcM2neIas`
- **Client ID 2 (Sheets)**: `996635068630-ho57vug7e4ppm4tgu8v0kus2b4p8rd9j.apps.googleusercontent.com`
- **Client Secret 2**: `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`
- **Refresh Token 2**: `1//05vFSLtHz9wbGCgYIARAAGAUSNwF-L9IrPX3lNg31hvx3Xav4N94u0xLDKnql88i8mAC57hiYVHeuw9Mq2s4mBrgAqzPtcep1TYY`
- **Sheet ID**: `1cE0Se1iq-NbNCkrTrMqEUBH4jjUaYFyKI9HCu8-wwms`

### Strava

- **Client ID**: `195710`
- **Client Secret**: `c77bfdbeddd924fbe89fe3fbf606fa359fe17ea1`
- **Refresh Token**: `c572c7abcf7f7661650fd020bfdcb32fe846ff53`

### Slack

- **User Token**: `xoxp-10286740254468-10279713479109-10276768353091-fd3db38180735fe27c74ab926bfc0bec`

### Harvest

- **Access Token**: `4164532.pt.yVEyYdyv6fHCaB0WwlWMBvfgXG9sEj6WcnoO_CkoDAhtckpDPd3DHwpkyETX2TiNOhx-h7NNuw0Bwj8cH5Xnnw`
- **Account ID**: `2089744`

### Services

- **Gemini Legacy Key**: `AIzaSyAYg0510MBGU64MH0VRT_98A13xHykLvY8`

## What Goes Here

Things like:

- Camera names and locations
- SSH hosts and aliases
- Preferred voices for TTS
- Speaker/room names
- Device nicknames
- Anything environment-specific

### Cameras

- living-room → Main area, 180° wide angle
- front-door → Entrance, motion-triggered

### SSH

- william → 192.168.12.153 (Unraid Host), user: root, key: ~/.ssh/id_ed25519_william
- babyserver → 100.103.97.93 (Tailscale)

### TTS

- Preferred voice: "Nova" (warm, slightly British)
- Default speaker: Kitchen HomePod

## Why Separate?

Skills are shared. Your setup is yours. Keeping them apart means you can update skills without losing your notes, and share skills without leaking your infrastructure.

---

Add whatever helps you do your job. This is your cheat sheet.
