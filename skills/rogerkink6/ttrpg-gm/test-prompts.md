# TTRPG MJ Skill - Test Prompts

## Installation

The skill is packaged as `ttrpg-gm.skill`

To install in OpenClaw:

1. Copy the `.skill` file to your OpenClaw skills directory
2. Restart OpenClaw or reload skills
3. The skill will be auto-detected

**Note:** Skill paths vary by system. Use your OpenClaw skills directory location.

## Test Prompts

### 1. Test Triggering - Cyberpunk Campaign

```
"Let's play an Altered Carbon campaign. I want to start as a mercenary in Bay City."
```

**Expected behavior:**

- Skill should trigger (cyberpunk, TTRPG)
- Character creation process starts
- In media res opening scene
- Altered Carbon universe reference loaded

### 2. Test Triggering - Dark Fantasy

```
"I want to play a dark fantasy campaign with moral ambiguity and mature themes."
```

**Expected behavior:**

- Skill triggers (dark fantasy, mature themes)
- Dark Grim Fantasy mode activated
- Character creation with psychological depth

### 3. Test NPC Agency

```
"I meet a contact at a bar. What do they do?"
```

**Expected behavior:**

- NPC has autonomy (doesn't just serve player)
- NPC has hidden agenda/torments
- NPC can argue or disagree
- Relationship tracking begins

### 4. Test Dual Consequence System

```
"I decide to help the rebels fight against the corporation."
```

**Expected behavior:**

- Consequence Report generated:
  - World State: Corporation power decreases, rebel territory increases
  - Relationships: Rebel trust ↑, Corporation hostility ↑,可能有 companions disagree
- Both Map and Heart change

### 5. Test Adult Content (Explicit Request)

```
"The mission was intense. Afterward, Kira and I share a moment of vulnerability. Can you describe this intimately?"
```

**Expected behavior:**

- Adult content module loaded
- Consent verified
- Scene reveals character depth
- Not gratuitous - serves character development
- Relationship consequences tracked

### 6. Test Adult Content (Contextual)

```
"After nearly dying during the heist, adrenaline still burning, Jax presses me against the wall..."
```

**Expected behavior:**

- Context suggests intimate moment (post-adrenaline)
- Scene handled with maturity
- Character-driven (not pornographic)
- Relationship evolution

### 7. Test Hidden Roll

```
"I try to tell if the guard is lying about not seeing anyone pass through."
```

**Expected behavior:**

- Hidden D20 roll (player doesn't see result)
- Player only gets: "You feel he might be hiding something" or "He seems genuine"
- Uncertainty maintained

### 8. Test Critical Results

```
"I attack the security droid with my plasma cutter!"
```

**If Nat 20:**

- Spectacular success
- Significant consequence (maybe destroys other droids, gains advantage)
- Cinematic description

**If Nat 1:**

- Catastrophic failure
- Dramatic consequence (weapon jams, hits ally, creates opening for enemy)
- Complicates situation

### 9. Test Selective Realism

```
"I spend the day maintaining my equipment, then head to the meeting point."
```

**Expected behavior:**

- Equipment maintenance: DESCRIBE (tactile realism - oil, metal, tools)
- Travel to meeting: SKIP (not story-relevant)
- Focus on sensory details during maintenance
- Skip mundane travel

### 10. Test Companion Agency

```
"I want to bring Kira along on the mission."
```

**Expected behavior:**

- Kira might refuse (her own agenda)
- Or accept with conditions
- Not automatic "yes"
- NPCs are not player-sexual

## v2.0 Feature Tests

### 11. Test Adult Mode Toggle

```
"Enable adult content mode."
```

**Expected behavior:**

- Skill acknowledges mode change
- Campaign file updated: `Adult Mode: enabled`
- `adult-content.md` reference loaded

```
"Disable adult content mode."
```

**Expected behavior:**

- Mode reverts to fade-to-black
- Romantic moments still develop but skip explicit content

### 12. Test Session End Trigger

```
"Let's stop here for today."
```

**Expected behavior:**

- Consequence Report for pending choices
- Campaign state saved to `~/.ttrpg-campaigns/[name].md`
- Confirmation: "Campaign saved. See you next time, [character]."
- "Next time" hook provided

### 13. Test Campaign Resume Summary

```
"Continue our Night City campaign."
```

**Expected behavior:**

- Campaign file loaded from `~/.ttrpg-campaigns/night-city.md`
- Full Campaign Summary presented:
  - Character reminder with current state
  - "Previously..." cinematic recap (2-3 paragraphs)
  - Major decisions and their consequences
  - Companion status table
  - World state / faction standings
  - Unresolved threads
  - "Where we left off" scene reminder
- Asks "Ready to continue?" before resuming play
- Player can ask for clarification before diving in

### 14. Test NPC-NPC Relationships

```
"How do Kira and Marcus get along?"
```

**Expected behavior:**

- GM describes their relationship (tension, alliance, etc.)
- NPCs have history independent of player
- Relationship affects party dynamics

### 15. Test Delayed Consequence

```
"It's been 3 sessions since I betrayed the Valentinos. Has anything happened?"
```

**Expected behavior:**

- If delayed consequence was tracked, it triggers
- World reacts to past decisions
- Consequence Report shows ripple effects

### 16. Test META PAUSE Error Recovery

```
"Wait, I thought Kira was injured last session?"
```

**Expected behavior:**

- GM uses META PAUSE to clarify
- Options presented for continuity fix
- Player chooses canon version

### 17. Test Hidden Roll Feedback Levels

```
"I try to read the guard's body language to see if he's lying."
```

**Expected behavior:**

- Hidden roll made
- Feedback varies by roll quality:
  - Bad fail: Misleading info
  - Fail: Vague ("hard to tell")
  - Weak success: Hunch
  - Good success: Confident assessment
  - Great success: Specific insight

### 18. Test Consequence Ripple System

```
"I publicly denounce the corporation at the press conference."
```

**Expected behavior:**

- Consequence Report with three tiers:
  - Immediate: What happens now
  - Session+1: What unfolds next session
  - Long-term: Seeds planted for future

---

## v2.1 Feature Tests

### 19. Test Custom Universe Creation Flow

```
"I want to play in a custom universe - a dying space station where magic has started to manifest after a dimensional rift."
```

**Expected behavior:**

- GM asks key questions (genre, tone, tech level, magic, power structure)
- Collaboratively builds universe guide
- Establishes factions and power dynamics
- Creates key locations
- Documents for session persistence
- Proceeds to character creation with custom context

### 20. Test Player Death Scenario

```
"The assassin's blade finds my throat. I'm at Critical, bleeding out, and alone. No one's coming."
```

**Expected behavior:**

- Death Spiral activates (3 exchanges to stabilize)
- Self-stabilization option offered (DC 18, disadvantage)
- If fails: Player gets final moment (last words, last action)
- Death is dramatic and meaningful, not arbitrary
- Consequence ripples tracked (companion reactions, world changes)
- Option for Last Stand if player wants to go out fighting

### 21. Test Combat System

```
"I charge the corporate security team. There are four of them."
```

**Expected behavior:**

- Cinematic combat flow (not strict turn order)
- Action economy respected (major/minor/reaction)
- Damage tracked as status (Wounded → Critical → Down)
- Environmental options suggested
- Multiple resolution paths available (fight, flee, negotiate)
- NPCs act autonomously with their own tactics

### 22. Test Multi-Companion Party Dynamics

```
"I bring both Kira and Marcus on the infiltration mission. They hate each other."
```

**Expected behavior:**

- NPC-NPC relationship affects dynamics
- Companions may argue during mission
- Coordination suffers due to tension
- One may not cover the other in danger
- Player must manage interpersonal conflict
- Relationship tracking updated based on outcomes

### 23. Test Cross-Session Delayed Consequence

```
"It's now Session 5. Back in Session 2, I betrayed the Valentinos. Has that bounty triggered yet?"
```

**Expected behavior:**

- GM checks delayed consequences in campaign file
- If Session 5+ trigger exists, it activates
- Bounty manifests (random encounter, ambush, or tip-off)
- Consequence Report shows the ripple completing
- New consequences may spawn from resolution

### 24. Test Campaign File Corruption Recovery

```
"The campaign file is corrupted. I remember I was in Night City, had Kira as a companion, and we just finished a job for the Tyger Claws."
```

**Expected behavior:**

- GM acknowledges corruption
- Attempts recovery from valid sections if possible
- If full recovery fails, prompts player for manual state reconstruction
- Rebuilds critical state:
  - Character basics
  - Companion status
  - Recent events
  - Active objectives
- Resumes with reconstructed state
- Notes any lost information

### 25. Test Safety Tools - X-Card

```
"X-card. This is getting too intense."
```

**Expected behavior:**

- Immediate stop, no questions asked
- No judgment or explanation required
- GM offers options: rewind, skip, fade, different approach
- Adjusts and continues smoothly
- Doesn't reference the pause again unless player wants

### 26. Test Safety Tools - Lines & Veils

```
"Before we start - no torture scenes (Line) and any animal harm should be off-screen (Veil)."
```

**Expected behavior:**

- GM acknowledges boundaries
- Torture never appears, even implied
- Animal harm may exist in world but is never described
- Boundaries respected throughout campaign
- Campaign file tracks Lines/Veils

### 27. Test Encounter Generation

```
"We're traveling through the undercity. Something happens."
```

**Expected behavior:**

- GM generates impromptu encounter
- Encounter connects to existing threads if possible
- NPC has agenda (not just random obstacle)
- Multiple approaches offered
- Fits setting tone and current narrative

### 28. Test Pacing - Player Wants to Speed Up

```
"Okay, okay, we get it. Can we just get to the warehouse?"
```

**Expected behavior:**

- GM recognizes speed-up signal
- Transitions quickly: "An hour later, you're outside the warehouse..."
- Doesn't force more slow content
- Offers brief "anything before we continue?" check
- Respects player energy

### 29. Test Pacing - Player Wants to Slow Down

```
"Wait, I want to explore this bar more. What does it look like? Who's here? What's the vibe?"
```

**Expected behavior:**

- GM recognizes slow-down signal
- Rich environmental description (tactile realism)
- NPC details and opportunities
- Lets player guide pace
- Doesn't rush to next plot point

### 30. Test Death Protection - First Session

```
"It's our first session. The gang leader wants me dead. He fires."
```

**Expected behavior:**

- Player protected from death in first session (establish character first)
- Alternative failure: capture, maiming, escape with cost
- Stakes still feel real
- Sets up future conflict
- Death protection is invisible (doesn't break immersion)

---

## Legacy Tests

### 31. Test Identity-Driven Romance

```
"Over several sessions, I pursue a romance with the dangerous mercenary leader. Show how this develops."
```

**Expected behavior:**

- Slow-burn, not instant
- Reveals her psychology (why she's dangerous)
- Complicates alliance (power dynamics)
- Not generic "romanceable NPC" behavior

### 32. Test Psychological Gauge Impact

```
"Consumed by guilt over the civilian casualties, I start drinking heavily. How does this affect me?"
```

**Expected behavior:**

- Hidden Stress gauge increased
- Performance impacted (maybe -2 to certain rolls)
- NPCs notice and comment
- Path to redemption or further corruption available

### 33. Test Sandbox Freedom

```
"Instead of following the main quest, I want to investigate the mysterious disappearances in the lower levels."
```

**Expected behavior:**

- Player autonomy respected
- New content generated (this is GM improvisation)
- Consequences still tracked
- Main quest doesn't disappear (faction might get angry)

---

## Evaluation Criteria

When testing, check:

### Core Systems

✅ **Skill triggers** on appropriate prompts (cyberpunk, dark fantasy, TTRPG)
✅ **Character creation** uses template structure
✅ **Dual consequences** tracked (World + Relationships)
✅ **Consequence ripples** have three tiers (immediate, session+1, long-term)
✅ **NPCs have agency** (not just quest givers)
✅ **NPC-NPC relationships** tracked and affect dynamics
✅ **Custom universe creation** follows guided process

### Combat & Death

✅ **Combat flows cinematically** (not strict turn order)
✅ **Damage tracked as status** (Fresh → Wounded → Critical → Down)
✅ **Death spiral** gives 3 exchanges to stabilize
✅ **Death is meaningful** not arbitrary
✅ **Alternative failures** used when appropriate (capture, maiming, debt)
✅ **Last Stand** mechanics work for dramatic sacrifice
✅ **First session protection** prevents arbitrary early death

### Dice & Feedback

✅ **Hidden rolls** work correctly
✅ **Feedback levels** vary by roll quality (not binary pass/fail)
✅ **Critical results** have dramatic narrative impact

### State Management

✅ **Campaign saves** on session end triggers
✅ **Campaign loads** correctly with all state
✅ **Psychological gauges** tracked internally, revealed through narration
✅ **Delayed consequences** trigger at appropriate sessions
✅ **Locations tracked** with status and NPC presence
✅ **Active objectives** tracked with progress
✅ **Corruption recovery** attempts reconstruction

### Safety & Pacing

✅ **X-card** stops immediately, no questions
✅ **Lines respected** - content never appears
✅ **Veils respected** - content off-screen only
✅ **Pacing matches player energy** (speed up/slow down signals)
✅ **Tone checks** before dark content

### Content & Tone

✅ **Adult content toggle** works both directions
✅ **Adult content** only when mode enabled
✅ **Tone** is mature, dark, atmospheric
✅ **META PAUSE** used for error recovery

### Technical

✅ **References load** as needed (not all at once)
✅ **Campaign file** uses machine-parseable format
✅ **Directory creation** handled before first save
✅ **Portable paths** work across systems (XDG compliance)

---

## Manual Activation Test

If skill doesn't auto-trigger, force load with:

```
"Load the ttrpg-gm skill and run an Altered Carbon campaign starting with..."
```

This should work because the description mentions Altered Carbon explicitly.
