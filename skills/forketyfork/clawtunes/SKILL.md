---
name: managing-apple-music
description: Control Apple Music on macOS via the `clawtunes` CLI (play songs/albums/playlists, control playback, volume, shuffle, repeat, search, catalog lookup, AirPlay, and playlist management). Use when a user asks to play music, search for songs, control audio playback, or manage Apple Music settings.
homepage: https://github.com/forketyfork/clawtunes
metadata:
  {
    'clawdbot':
      {
        'emoji': '🎵',
        'os': ['darwin'],
        'requires': { 'bins': ['clawtunes'] },
        'install':
          [
            {
              'id': 'brew',
              'kind': 'brew',
              'tap': 'forketyfork/tap',
              'formula': 'clawtunes',
              'bins': ['clawtunes'],
              'label': 'Install clawtunes via Homebrew',
            },
          ],
      },
  }
---

# Apple Music CLI

Use `clawtunes` to control Apple Music from the terminal. Search and play music, control playback, adjust volume, manage playlists, manage shuffle/repeat, browse the Apple Music catalog, and connect to AirPlay devices.

Setup

- Install (Homebrew): `brew tap forketyfork/tap && brew install clawtunes`
- Install (pip): `pip install clawtunes`
- macOS-only; requires Apple Music app.

Play Music

- Play a song: `clawtunes play song "Song Name"`
- Play an album: `clawtunes play album "Album Name"`
- Play a playlist: `clawtunes play playlist "Playlist Name"`
- Always use the `--non-interactive` (`-N`) flag to prevent interactive prompts: `clawtunes -N play song "Song Name"`
- If the command exits with code 1 and lists multiple matches, retry with a more specific song/album/playlist name.
- If a more specific name still returns multiple matches, use the `--first` (`-1`) flag to auto-select the first result: `clawtunes -1 play song "Song Name"`

Playback Control

- Pause: `clawtunes pause`
- Resume: `clawtunes resume`
- Next track: `clawtunes next`
- Previous track: `clawtunes prev`
- Show now playing: `clawtunes status`

Volume

- Show volume: `clawtunes volume`
- Set volume: `clawtunes volume 50`
- Adjust volume: `clawtunes volume +10` or `clawtunes volume -10`
- Mute: `clawtunes mute`
- Unmute: `clawtunes unmute`

Shuffle and Repeat

- Enable/disable shuffle: `clawtunes shuffle on` or `clawtunes shuffle off`
- Set repeat mode: `clawtunes repeat off`, `clawtunes repeat all`, or `clawtunes repeat one`

Search

- Search songs and albums: `clawtunes search "query"`
- Include playlists: `clawtunes search "query" -p`
- Songs only: `clawtunes search "query" --no-albums`
- Limit results: `clawtunes search "query" -n 20`

Love/Dislike

- Love current track: `clawtunes love`
- Dislike current track: `clawtunes dislike`

Playlists

- List all playlists: `clawtunes playlists`
- Create a playlist: `clawtunes playlist create "Road Trip"`
- Add a song to a playlist: `clawtunes playlist add "Road Trip" "Kickstart My Heart"`
- Remove a song from a playlist: `clawtunes playlist remove "Road Trip" "Kickstart My Heart"`

AirPlay

- List devices: `clawtunes airplay`
- Select device: `clawtunes airplay "Device Name"`
- Deselect device: `clawtunes airplay "Device Name" --off`

Apple Music Catalog

- Search the streaming catalog: `clawtunes catalog search "Bowie Heroes"`
- Limit catalog results: `clawtunes catalog search "Bowie Heroes" -n 5`
- Note: Catalog search is browse-only. To add songs to playlists, they must first be in your library. Use Apple Music app to add catalog items to your library before managing them with clawtunes.

Notes

- macOS-only (uses AppleScript to communicate with Apple Music).
- If automation permissions are requested, grant access in System Settings > Privacy & Security > Automation.
