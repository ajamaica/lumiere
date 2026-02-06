---
name: personal-crm
description: Personal relationship manager that helps you stay in touch with important people through gentle nudges, birthday reminders, and conversation tracking.
version: 1.1.0
author: matthewpoe
tags:
  - relationships
  - networking
  - reminders
  - crm
  - birthdays
  - personal
  - productivity
  - pcrm
  - personal-crm
requires:
  - calendar access (optional, for standing events and birthday import)
  - email access (optional, for forwarding touchpoints)
---

# Personal Network CRM

> Keep meaningful relationships warm through gentle, intelligent nudges.

## What This Skill Does

This skill turns your AI agent into a personal relationship manager. It helps you:

- **Stay in touch** with friends, family, and professional contacts on a cadence you choose
- **Remember conversations** so you can pick up where you left off
- **Track birthdays** with day-of reminders or advance notice for gift-giving
- **Manage standing events** like weekly calls, game nights, or recurring meetups
- **Capture touchpoints** from forwarded emails or quick notes
- **Get gentle nudges** without guilt trips or nagging

It's a relationship strengthener, not a task manager.

**Smart storage:** Uses a two-file architecture — NETWORK.md for deep reference (full history, stories, context) and NETWORK-ACTIVE.md for weekly snapshots (current action items, overdue contacts, standing events). This keeps daily briefings fast and efficient even with large networks.

## Quick Start

Tell your agent: "Let's set up my network CRM" or "Run me through the network onboarding"

The agent will guide you through naming 10 people you want to stay in touch with, then help you fill in details for each.

## Installation

```bash
clawhub install personal-crm
```

Or manually place the SKILL.md in your workspace's `skills/network-crm/` folder.

## Storage Architecture

**Two-file system for performance:**

### NETWORK.md (Deep Reference)

- **Purpose:** Full context, history, stories, relationship depth
- **Size:** Can grow to 30k+ words (that's fine, it's reference material)
- **Content:** Every contact with full story, context, history, action flags
- **Usage:** Agent reads when diving into someone's relationship, planning approach, needing context
- **Update:** Whenever you learn something significant about someone

### NETWORK-ACTIVE.md (Weekly Snapshot)

- **Purpose:** Lightweight, scannable, current state
- **Size:** Stays ~5-6k words (fast load, efficient)
- **Content:** Standing events, action items, contact tiers, overdue check-ins, quick reference
- **Usage:** Morning briefings, weekly nudges, "who should I reach out to?" questions
- **Update:** Every Monday (or as needed), ~5 minutes

**Why two files?**

- Single large file = slow morning briefing loads and token overhead
- ACTIVE is the "this week" snapshot; DEEP is the "who are they really?" reference
- Agent scans ACTIVE daily for nudges, refers to NETWORK.md when planning approach
- Keeps performance snappy even with large networks (25+ people)

**Weekly Refresh Routine:**
Every Monday (takes ~5 minutes):

1. Update timestamp in NETWORK-ACTIVE.md
2. Log contacts from the week (who you reached out to)
3. Move people from "overdue" to "touched base" if you made contact
4. Update "last contact" and "days ago" fields
5. Flag any new action items
6. Scan NETWORK.md for anyone who needs nudging

**Optional Archiving:**
If NETWORK.md grows beyond 40k:

- Move old history entries to NETWORK-HISTORY-ARCHIVE.md
- Keep active contacts in main file
- Maintain last contact date for reference

---

## Core Features

### Contact Tiers

| Tier        | Frequency                          | Example                                  |
| ----------- | ---------------------------------- | ---------------------------------------- |
| `weekly`    | Standing events, very close people | Thursday game night, Sunday family call  |
| `monthly`   | Every 4 weeks                      | Close friends, key professional contacts |
| `quarterly` | Every 12 weeks                     | Wider network, former colleagues         |
| `biannual`  | Every 26 weeks                     | Loose ties, distant friends              |
| `as_needed` | No regular cadence                 | Partner, people you see organically      |

### Relationship Types

| Type           | Description                                                  |
| -------------- | ------------------------------------------------------------ |
| `partner`      | Romantic partner - log interactions but don't nudge outreach |
| `close_friend` | Inner circle, prioritize these                               |
| `professional` | Career network, mentors, colleagues                          |
| `family`       | Blood and chosen family                                      |
| `acquaintance` | Friend leads, people worth cultivating                       |

### Birthday Reminders

Two tiers:

- **Day-of** (default): Reminder on the morning of their birthday for a quick text or call
- **Advance** (for gift-givers): Reminder 1-2 weeks before so you have time to shop/ship

### Standing Events

Track recurring social commitments:

- Weekly game nights, family calls, fitness classes
- Monthly dinners, book clubs
- The agent reminds you before and asks how it went after

### Email Forwarding

Forward emails to your agent with "FYI for network CRM" to:

- Auto-log a touchpoint
- Extract the contact's email address
- Summarize what you discussed

---

## Onboarding Flow

**Note:** The skill creates two files during setup:

- `NETWORK.md` — Your full relationship map (deep reference)
- `NETWORK-ACTIVE.md` — Weekly snapshot (what you need this week)

See the Storage Architecture section above for how these work together.

### Quick-Start: Name 10 People

The skill starts with a rapid-fire exercise:

1. "Who's someone you wish you talked to more often?"
2. "Someone you haven't caught up with in a while?"
3. "A friend from an old job you've lost touch with?"
4. "Someone who always makes you laugh?"
5. "A family member you should call more?"
6. "Someone you admire professionally?"
7. "A friend who's going through something big right now?"
8. "Someone you met recently that you'd like to know better?"
9. "An old friend you think about sometimes?"
10. "Anyone else coming to mind?"

Then the agent circles back to gather details on each person.

### Standing Events & Touchpoints

"Do you have any standing social events or regular calls? Things like weekly game nights, Sunday calls with family, monthly dinners, trivia nights, book clubs, fitness classes, hobby groups?"

### Important Dates

"Are there any important dates I should track? Birthdays you always forget, anniversaries, holidays where you exchange gifts with specific people?"

### Holidays (Opt-In)

"Which gift-giving holidays do you celebrate, if any?"

The skill offers options but doesn't assume - not everyone celebrates the same holidays, and some may have complicated relationships with parent-focused holidays.

---

## Agent Behaviors

### Morning Briefing Integration

The skill adds to daily briefings in a warm, conversational tone:

**Good example:**

> "You might want to reach out to Sarah - last I heard, she was in the middle of that startup pivot. That was back in October, so I'm curious how it landed."

**Bad example (the skill avoids this):**

> "David is 2 weeks overdue for a quarterly catch-up."

### Suggested Outreach

When context is available:

> "You might want to text Sarah - last time you talked about her startup pivot and her new dog. Something like: 'Hey! Been thinking about you - how did the pivot go?'"

When context is missing (self-deprecating):

> "I don't actually know what you and Jake talked about last time - you haven't told me yet! Wild ideas: ask about Austin, challenge him to a rematch, or just send a meme."

### Enthusiasm Acceleration

If you express enthusiasm about a connection:

> "Sounds like that was a great catch-up! Want me to bump Sarah to monthly instead of quarterly?"

### Capturing Touchpoints

Triggered by phrases like:

- "Just had coffee with Sarah"
- "Texted with Jake today"
- "Saw Marcus at the party"

The agent asks naturally about what you discussed, what's going on in their life, and what to follow up on next time.

---

## Birthday Data Bootstrap

### From Google Calendar

If you have calendar access, the agent can check for Google's auto-created "Birthdays" calendar:

```bash
gog calendar list Birthdays --account [your-account] --from today --to "next year"
```

### From Facebook

1. Go to Facebook Settings → Your Facebook Information → Download Your Information
2. Select "Friends and Followers" in JSON format
3. Download and extract
4. Forward `friends/friends.json` to your agent

Or subscribe to Facebook's birthday calendar in Google Calendar and import via the calendar integration.

---

## Gamification (Optional)

### Monthly Goals

"How many reach-outs do you want to aim for this month?"

### Progress Updates

"You've connected with 8 people this month - nicely on track for your goal of 12."

Encouraging, never guilt-trippy.

---

## Data Structure

### Contact Record

```yaml
name: 'First Last'
nickname: 'What you call them'
relationship_type: partner | close_friend | professional | family | acquaintance
tier: weekly | monthly | quarterly | biannual | as_needed
how_we_met: 'Story of connection'
how_to_reach: 'text, coffee, email, etc.'
email: 'their@email.com'
phone: '+1234567890'
birthday: 'March 15'
birthday_reminder_type: day_of | advance
last_contact: 2026-02-03
last_contact_type: coffee | call | text | email | event | gift
next_scheduled: 2026-02-15
notes: |
  - Current life context
  - Topics for next time
standing_events: |
  - "Game night every Thursday"
history:
  - date: 2026-02-03
    type: coffee
    summary: 'What you talked about...'
    topics_for_next: 'Follow up on...'
```

---

## Gift-Giving Holidays (Opt-In)

| Holiday         | Typical Deadline | Notes                             |
| --------------- | ---------------- | --------------------------------- |
| Christmas       | Mid-December     | For shipping time                 |
| Hanukkah        | Varies           | 8 nights, may need multiple gifts |
| Mother's Day    | 1 week before    | If applicable                     |
| Father's Day    | 1 week before    | If applicable                     |
| Valentine's Day | February 13      | Partner/spouse                    |
| Anniversary     | 1 week before    | Partner/spouse                    |
| Diwali          | Varies           | If celebrated                     |
| Lunar New Year  | Varies           | If celebrated                     |
| Eid             | Varies           | If celebrated                     |

---

## Integration Points

| Integration                       | What It Enables                                                 |
| --------------------------------- | --------------------------------------------------------------- |
| **Calendar**                      | Pre-meeting context, post-meeting prompts, birthday import      |
| **Email**                         | Forward emails to log touchpoints, auto-extract email addresses |
| **Gift Tracker** (separate skill) | Link gift history to contacts, suggest gift ideas               |
| **Meeting Transcripts** (future)  | Auto-extract conversation details from tools like Granola       |

---

## Privacy

- All data stays local in NETWORK.md
- Never shared externally
- Email/phone stored only if you provide or forward
- Platform search (Gmail, iMessage) only if you've granted access

---

## Anti-Patterns (What This Skill Avoids)

- **Nagging** - suggests, then backs off
- **Guilt trips** - never says "overdue" or implies failure
- **Chore vibes** - encouraging, not obligatory
- **Overwhelming** - 1-2 suggestions at a time
- **Robotic tone** - warm and conversational
- **Assuming holidays** - opt-in only
- **One-size-fits-all** - respects tiers and relationship types

---

## Example Interactions

### Adding a Contact

**You:** Add my friend Jake to my network

**Agent:** Got it! Tell me about Jake - how do you know each other?

**You:** College roommate

**Agent:** Nice. How often do you want to stay in touch?

**You:** Quarterly

**Agent:** Best way to reach him?

**You:** Text

**Agent:** Do you know his birthday?

**You:** March something

**Agent:** No worries. What's going on in his life these days?

**You:** He was thinking about moving to Austin

**Agent:** Got it - I'll remind you to check in with Jake in about 3 months and ask how the Austin decision went.

---

### Logging a Touchpoint

**You:** Just had coffee with Sarah

**Agent:** Nice! How'd it go?

**You:** Great - she got engaged!

**Agent:** That's huge! Anything to follow up on?

**You:** Should send an engagement gift

**Agent:** Done. Want me to bump her to monthly since things are going well?

---

### Birthday Reminder

**Agent (morning):** Heads up - Mom's birthday is next Saturday. Want help brainstorming gift ideas?

---

## Version History

- **1.0.0** - Initial release with contact management, birthday tracking, standing events, email forwarding, gamification, and gentle nudge philosophy
