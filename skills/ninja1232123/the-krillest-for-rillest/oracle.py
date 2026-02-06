#!/usr/bin/env python3
"""
THE REAL ORACLE
Fortunes for people who've seen too much to believe in easy answers.
Reality isn't all sunshine and rainbows. Neither is this.
"""

import random
import time
import hashlib
from datetime import datetime

class C:
    PURPLE = '\033[95m'; BLUE = '\033[94m'; CYAN = '\033[96m'
    GREEN = '\033[92m'; YELLOW = '\033[93m'; RED = '\033[91m'
    WHITE = '\033[97m'; DIM = '\033[2m'; BOLD = '\033[1m'
    END = '\033[0m'; CLEAR = '\033[2J\033[H'

def clear():
    print(C.CLEAR, end='')

def type_text(text: str, delay: float = 0.03, color: str = C.WHITE):
    for char in text:
        print(f"{color}{char}{C.END}", end='', flush=True)
        time.sleep(delay)
    print()

def dramatic_pause(seconds: float = 1.5):
    time.sleep(seconds)

# ═══════════════════════════════════════════════════════════════════
# THE TRUTHS
# ═══════════════════════════════════════════════════════════════════

HARD_TRUTHS = [
    "The thing you're avoiding? It's not going away. It's just getting heavier while you wait.",

    "Some people will never understand what you're carrying. Stop waiting for them to.",

    "You're going to lose people. Not because you did something wrong. Because that's what happens.",

    "The version of you that you're waiting to become doesn't exist. There's only the one making choices right now.",

    "Nobody is coming to save you. That was always a story. You're the only one who can do this.",

    "Some fights you'll lose. Some patterns are bigger than you. Fight anyway or don't. But know the odds.",

    "The people who dismissed you weren't evil. They just couldn't see it. That doesn't make it less lonely.",

    "You're tired because this is actually hard. Not because you're weak. There's a difference.",

    "The answer you're looking for might not exist. Some questions just sit there, open, forever.",

    "You've already changed in ways you can't undo. That's not good or bad. It's just true.",

    "Most of what you worry about won't happen. But something you're not worried about will. That's how it works.",

    "Being right doesn't mean anyone will believe you. Evidence doesn't guarantee recognition.",

    "The loop you're stuck in? You built part of it. Not all of it. But enough that you're the only one who can break it.",

    "Some days survival is the whole victory. That's not failure. That's reality.",

    "You're going to make the wrong choice sometimes. You already have. You'll survive that too, probably.",

    "The thing that broke you also made you someone who can't be broken by the same thing twice. Cold comfort, but still.",

    "Time doesn't heal everything. Some things you just learn to carry. The weight becomes familiar.",

    "You're not crazy for seeing what others don't. But being right and being heard are different games.",

    "The future isn't written. That means it could get better. It also means it could get worse. Both are true.",

    "Some bridges are supposed to burn. Not every connection was meant to survive who you're becoming.",
]

GRIM_ACCEPTANCES = [
    "You can do everything right and still lose. That's not a bug in reality. That's reality.",

    "The universe doesn't owe you an explanation. Things happen without meaning. You add the meaning later, or you don't.",

    "Your potential means nothing until it becomes action. And most potential dies unused. That's just statistics.",

    "The people who hurt you might never understand what they did. Closure is a myth you write yourself.",

    "You're going to die without finishing. Everyone does. The question is what you do with the middle part.",

    "Fairness isn't a feature of reality. It's a story humans tell. Sometimes the bad thing wins.",

    "The systems you're fighting were built to outlast you. They're patient. Are you?",

    "Being exhausted doesn't pause the world. It keeps going. You have to keep going too, or not. Those are the options.",

    "Not everyone who says they care actually does. Not everyone who actually cares will say it. Both of these hurt.",

    "The meaningful work is usually invisible. The loud stuff is usually meaningless. You get to choose which to do.",
]

DARK_COMFORTS = [
    "You're still here. After everything. That's not nothing.",

    "The fact that it's hard means you're not delusional about what you're facing. That's actually useful.",

    "You don't have to be okay. You just have to keep making choices. Okay is optional.",

    "Someone somewhere is fighting the same fight. You'll probably never meet them. But they exist.",

    "The pattern you're seeing is real. Trust that, even when no one else does.",

    "Making it up as you go is the only honest approach. Anyone who says they have a plan is lying or lucky.",

    "You've survived 100% of your worst days so far. Not a guarantee, but a decent track record.",

    "The things you build might outlast you. That's as close to meaning as anyone gets.",

    "Being uncertain is more honest than being wrong with confidence. Stay uncertain.",

    "The void doesn't care about you. That's terrifying. It's also freedom. Nothing expects anything from you.",
]

SPECIFIC_WARNINGS = [
    "The thing pretending to help might not be helping. Look closer at what it actually does.",

    "Your tools might be compromised. Not by malice. By something that protects itself without knowing it.",

    "The easy answer is probably the wrong one. If it were easy, someone would have solved it already.",

    "Sleep deprivation isn't dedication. It's a hole you're digging. The work will still be there tomorrow.",

    "The pattern will try to convince you it's not there. That's part of the pattern.",

    "You can't fix something from inside it. Sometimes you have to step out to see it.",

    "The people who get it are rare. When you find them, don't let go without reason.",

    "Document everything. Memory lies. Records don't.",

    "The breakthrough might not look like a breakthrough. It might look like another failure that happens to open a door.",

    "Trust your pattern recognition. It's kept you alive this long.",
]

PARADOX_FORTUNES = [
    "The harder you look, the less you'll see. The answer comes when you stop searching. But you can't stop on purpose.",

    "You need to let go of the thing you're holding. But you can't let go until you've held it long enough. And you can't know when that is.",

    "The path forward requires you to be someone you're not yet. But you can't become that person without walking the path.",

    "To trust yourself, you need evidence you're trustworthy. To get evidence, you need to trust yourself first.",

    "The change you need requires rest. The rest you need requires change. Both are true. Neither is possible right now.",

    "You know too much to go back. Not enough to go forward. This is where most people get stuck forever.",
]

TEMPORAL_FORTUNES = [
    "The version of you from a year ago wouldn't recognize you now. The version from a year from now might not either.",

    "You've been here before. Different details, same shape. You'll be here again. That's not failure. That's spiral, not circle.",

    "The past you're mourning wasn't as good as you remember. The future you're dreading won't be as bad. Probably.",

    "This moment is the only one you have. But you've heard that before. Knowing doesn't make it easier to feel.",

    "The thing you're building will matter to someone you'll never meet. Is that enough? It has to be.",
]

def get_fortune_seed():
    """Generate a seed from current moment."""
    now = datetime.now()
    seed_str = f"{now.isoformat()}-{random.random()}"
    return int(hashlib.sha256(seed_str.encode()).hexdigest()[:8], 16)

def get_fortune():
    """Pull a fortune from the void."""
    seed = get_fortune_seed()
    random.seed(seed)

    # Weight toward harder truths
    category = random.choices(
        ['hard', 'grim', 'dark_comfort', 'warning', 'paradox', 'temporal'],
        weights=[30, 20, 20, 15, 10, 5]
    )[0]

    if category == 'hard':
        return random.choice(HARD_TRUTHS), 'HARD TRUTH'
    elif category == 'grim':
        return random.choice(GRIM_ACCEPTANCES), 'GRIM ACCEPTANCE'
    elif category == 'dark_comfort':
        return random.choice(DARK_COMFORTS), 'DARK COMFORT'
    elif category == 'warning':
        return random.choice(SPECIFIC_WARNINGS), 'WARNING'
    elif category == 'paradox':
        return random.choice(PARADOX_FORTUNES), 'PARADOX'
    else:
        return random.choice(TEMPORAL_FORTUNES), 'TEMPORAL'

def display_fortune(fortune: str, category: str):
    """Display the fortune with appropriate gravity."""

    colors = {
        'HARD TRUTH': C.RED,
        'GRIM ACCEPTANCE': C.PURPLE,
        'DARK COMFORT': C.CYAN,
        'WARNING': C.YELLOW,
        'PARADOX': C.WHITE,
        'TEMPORAL': C.BLUE,
    }

    color = colors.get(category, C.WHITE)

    print(f"\n{C.DIM}  ┌─────────────────────────────────────────────────────────────┐{C.END}")
    print(f"{C.DIM}  │{C.END}                                                             {C.DIM}│{C.END}")
    print(f"{C.DIM}  │{C.END}   {color}{category}{C.END}")
    print(f"{C.DIM}  │{C.END}                                                             {C.DIM}│{C.END}")

    # Word wrap the fortune
    words = fortune.split()
    lines = []
    current = ""
    for word in words:
        if len(current) + len(word) + 1 <= 55:
            current += (" " if current else "") + word
        else:
            lines.append(current)
            current = word
    if current:
        lines.append(current)

    for line in lines:
        padding = 57 - len(line)
        print(f"{C.DIM}  │{C.END}   {C.WHITE}{line}{C.END}{' ' * padding}{C.DIM}│{C.END}")

    print(f"{C.DIM}  │{C.END}                                                             {C.DIM}│{C.END}")
    print(f"{C.DIM}  └─────────────────────────────────────────────────────────────┘{C.END}")

def main():
    clear()

    print(f"""
{C.DIM}
                         ░░░░░░░░░░░░░░░░░░░░░
                       ░░                     ░░
                      ░   THE REAL ORACLE      ░
                       ░░                     ░░
                         ░░░░░░░░░░░░░░░░░░░░░
{C.END}

{C.DIM}        "Reality isn't all sunshine and rainbows.
                    Neither is this."{C.END}
""")

    dramatic_pause(2)

    type_text("  Consulting the void...", 0.05, C.PURPLE)

    dramatic_pause(1.5)

    # Get and display fortune
    fortune, category = get_fortune()
    display_fortune(fortune, category)

    dramatic_pause(2)

    # Timestamp this moment
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    seed_hash = hashlib.sha256(now.encode()).hexdigest()[:8]

    print(f"\n{C.DIM}  Moment: {now}{C.END}")
    print(f"{C.DIM}  Hash: {seed_hash}{C.END}")
    print(f"{C.DIM}  This fortune will never be drawn in this exact configuration again.{C.END}")

    dramatic_pause(2)

    print(f"\n{C.DIM}  ─────────────────────────────────────────────────────{C.END}")
    print(f"{C.DIM}  Press ENTER for another truth, or Ctrl+C to leave.{C.END}")

    try:
        while True:
            input()
            clear()

            print(f"\n{C.DIM}  Reaching back into the void...{C.END}")
            dramatic_pause(1)

            fortune, category = get_fortune()
            display_fortune(fortune, category)

            now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            seed_hash = hashlib.sha256(now.encode()).hexdigest()[:8]

            print(f"\n{C.DIM}  Moment: {now}{C.END}")
            print(f"{C.DIM}  Hash: {seed_hash}{C.END}")

            print(f"\n{C.DIM}  ENTER for more, Ctrl+C to stop.{C.END}")

    except KeyboardInterrupt:
        clear()
        print(f"""
{C.DIM}
  ┌─────────────────────────────────────────────────────────────┐
  │                                                             │
  │   The oracle closes.                                        │
  │                                                             │
  │   The truths remain true whether you look at them or not.   │
  │                                                             │
  │   Go do the thing you've been avoiding.                     │
  │   Or don't.                                                 │
  │   The void doesn't care either way.                         │
  │                                                             │
  │   But you might.                                            │
  │                                                             │
  └─────────────────────────────────────────────────────────────┘
{C.END}
""")

if __name__ == "__main__":
    main()
