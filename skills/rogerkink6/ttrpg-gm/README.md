# TTRPG MJ Skill - Advanced Narrative Engine

**Version:** 2.1.0
**Author:** RogerKink6 (Sovereign Architect player profile)
**License:** OpenClaw Skill
**Repository:** https://github.com/RogerKink6/ttrpg-gm

## Overview

Advanced Game Master skill for OpenClaw creating mature, dark-themed TTRPG experiences with deep character psychology, dual-consequence tracking, autonomous NPCs, and persistent campaign state.

## What's New in v2.1

- **Auto-trigger patterns** for seamless skill activation
- **Full combat system** with cinematic flow and status-based damage
- **Death & failure handling** with death spiral, last stand, and alternative failures
- **Safety tools** (Lines & Veils, X-card, tone checks)
- **Location & quest tracking** in campaign files
- **Inventory & resources** tracking
- **NPC voice templates** for distinctive dialogue
- **Encounter generation** tables and guidelines
- **Pacing system** with speed-up/slow-down signals
- **Scene templates** for common situations
- **Portable paths** (XDG-compliant, cross-platform)
- **Token efficiency** improvements (core profile in SKILL.md)
- **33 test prompts** covering all features

## What's in v2.0

- **Machine-parseable campaign files** with internal state tracking
- **Session end triggers** for automatic saves
- **Adult mode toggle** (enable/disable mid-campaign)
- **NPC-NPC relationship tracking** (companions have opinions about each other)
- **Consequence ripple system** (immediate, session+1, long-term effects)
- **Improved hidden roll feedback** (graduated responses based on roll quality)
- **META PAUSE system** for error recovery and continuity fixes
- **Character creation template** with structured fields
- **Universes reference file** (reduced token overhead)

## Features

### Core Systems

- **Dual-Consequence Tracking:** Every choice impacts World State AND Relationships
- **Consequence Ripple:** Effects unfold over time (immediate → session+1 → long-term)
- **Autonomous NPCs:** Companions with hidden agendas, moral codes, and lives beyond the player
- **NPC-NPC Relationships:** Companions interact with each other, not just the player
- **Psychological Gauges:** Stress, Fragmentation, Morality (tracked internally, revealed through narration)
- **Hidden D20 System:** Graduated feedback levels based on roll quality
- **Perspective Shifting:** Cinematic 3rd-person + immersive 1st-person

### Combat & Death (v2.1)

- **Cinematic Combat:** Fluid exchanges, not strict turn order
- **Status-Based Damage:** Fresh → Wounded → Critical → Down → Dead
- **Death Spiral:** 3 exchanges to stabilize when Down
- **Last Stand:** Dramatic sacrifice with guaranteed impact
- **Alternative Failures:** Capture, maiming, debt, corruption instead of death
- **Companion Combat:** NPCs fight autonomously based on their relationships

### Safety & Pacing (v2.1)

- **Lines & Veils:** Hard limits and off-screen content
- **X-Card / Pause:** Immediate stop, no questions asked
- **Tone Checks:** Consent before dark content
- **Pacing Signals:** Match player energy (slow down/speed up)
- **Scene Templates:** Confrontation, heist, negotiation, chase, revelation

### State Tracking (v2.1)

- **Location Discovery:** Track places with status, NPCs, secrets
- **Active Objectives:** Quest/goal tracking with progress
- **Inventory & Resources:** Currency, key items, gear condition
- **NPC Voice Profiles:** Distinctive speech patterns for each character

### Settings Supported

- **Cyberpunk:** Night City, Altered Carbon, Blade Runner
- **Dark Fantasy:** Witcher, Warhammer 40K, Game of Thrones
- **Urban Horror:** Vampire: The Masquerade, Shadowrun
- **Space Opera:** Star Wars, Dune, Mass Effect
- **Post-Apocalyptic:** Fallout
- **Custom Universes:** Guided creation process

See `references/universes.md` for full universe catalog.

### Optional Modules

- **Adult Content:** Identity-driven intimacy with toggle control
- **Political Intrigue:** Court politics, faction warfare

## File Structure

```
ttrpg-gm/
├── SKILL.md                          # Main skill instructions
├── README.md                         # This file
├── test-prompts.md                   # Testing scenarios
├── references/
│   ├── player-profile.md             # Sovereign Architect profile
│   ├── game-preferences.md           # Gameplay style preferences
│   ├── universes.md                  # Supported universe catalog (NEW)
│   ├── characters.md                 # Example characters (Vex, Ashara, Malakai)
│   └── adult-content.md              # Mature intimacy module
├── scripts/
│   └── package.py                    # Skill packager
└── assets/                           # (reserved for future use)
```

## Installation

1. Copy `ttrpg-gm.skill` to your OpenClaw skills directory
2. Restart OpenClaw or reload skills
3. Skill auto-triggers on TTRPG-related prompts

**Or install via ClawHub:**

```bash
clawhub install ttrpg-gm
```

## Usage

### Starting a Campaign

```
"Let's play a Cyberpunk 2077 campaign. I'm a street kid trying to survive in Night City."
```

### Resuming a Campaign

```
"Continue our Cyberpunk campaign."
```

Campaign loads from `~/.ttrpg-campaigns/[campaign-name].md`

### Toggling Adult Content

```
"Enable adult content"   # Activates mature module
"Disable adult content"  # Returns to fade-to-black
```

### Ending a Session

```
"Let's stop here" / "Save game" / "End session"
```

Auto-saves campaign state with consequence tracking.

## Campaign Persistence

Campaigns save to `${XDG_DATA_HOME:-$HOME/.local/share}/ttrpg-campaigns/[campaign-name].md` with:

- Character sheet and psychological gauges
- World state and faction standings
- Companion status and relationships
- NPC-NPC relationship matrix
- Locations discovered (with secrets and NPC presence)
- Active objectives and progress
- Inventory and resources
- Pending delayed consequences
- Safety settings (Lines & Veils)
- Next session hooks

## Reference Loading

| Reference             | Loads When                                        |
| --------------------- | ------------------------------------------------- |
| `player-profile.md`   | On request (core profile in SKILL.md)             |
| `game-preferences.md` | On request (key preferences in SKILL.md)          |
| `universes.md`        | Universe selection                                |
| `characters.md`       | NPC/companion creation (includes voice templates) |
| `adult-content.md`    | Adult mode explicitly enabled                     |

**Token Efficiency:** Core player profile and preferences are now embedded in SKILL.md. Reference files contain extended details loaded only when needed.

## Player Profile: The Sovereign Architect

This skill targets players who:

- Expect choices that bend the story
- Want autonomous companions (Found Family)
- Demand consequences (World + Heart)
- Value density over distance
- Seek mature, identity-driven romance
- Enjoy tactical realism (not busy work)

## Testing

See `test-prompts.md` for scenarios covering:

- Skill triggering
- NPC agency and NPC-NPC dynamics
- Dual-consequence tracking
- Delayed consequence ripples
- Hidden roll feedback levels
- Adult content toggle
- META PAUSE error recovery
- Critical results

## Technical Notes

- **Token Efficiency:** Universes moved to reference file, loaded on-demand
- **State Persistence:** Machine-parseable campaign format with HTML comments
- **Error Recovery:** META PAUSE system for continuity fixes
- **Gauge Tracking:** Internal numeric tracking, narrated to player

## Credits

Example characters designed for this system:

- Vex (The Hollow Prophet - Cyberpunk)
- Ashara (The Branded Saint - Dark Fantasy)
- Malakai (The Eaten Man - Urban Horror)

System design:

- Sovereign Architect player profile methodology
- Dual-consequence narrative theory
- Consequence ripple system
- Progressive disclosure skill architecture

## License

Part of OpenClaw skills ecosystem. Use freely, modify as needed, credit appreciated.

## Contributing

Issues and PRs welcome at https://github.com/RogerKink6/ttrpg-gm
