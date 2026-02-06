#!/usr/bin/env python3
"""
Continuity Framework - Asynchronous Reflection & Memory Integration

Transforms passive logging into active AI development through:
- Post-session reflection
- Structured memory extraction
- Question generation
- Identity evolution
"""

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Any, Optional

# Configuration
MEMORY_DIR = Path(os.environ.get("CONTINUITY_MEMORY_DIR", Path.home() / "clawd" / "memory"))
QUESTIONS_FILE = MEMORY_DIR / "questions.md"
IDENTITY_FILE = MEMORY_DIR / "identity.md"
REFLECTIONS_DIR = MEMORY_DIR / "reflections"

# Memory types
MEMORY_TYPES = ["fact", "preference", "relationship", "principle", "commitment", "moment", "skill", "question"]

# Confidence thresholds
CONFIDENCE_LEVELS = {
    "explicit": (0.95, 1.0),
    "implied": (0.70, 0.94),
    "inferred": (0.40, 0.69),
    "speculative": (0.0, 0.39)
}


def ensure_dirs():
    """Ensure memory directories exist."""
    MEMORY_DIR.mkdir(parents=True, exist_ok=True)
    REFLECTIONS_DIR.mkdir(parents=True, exist_ok=True)


def load_questions() -> List[Dict]:
    """Load pending questions."""
    if not QUESTIONS_FILE.exists():
        return []
    
    questions = []
    current_q = None
    
    with open(QUESTIONS_FILE) as f:
        for line in f:
            line = line.strip()
            if line.startswith("- [ ]"):
                if current_q:
                    questions.append(current_q)
                current_q = {
                    "text": line[6:].strip(),
                    "resolved": False,
                    "context": None
                }
            elif line.startswith("- [x]"):
                # Skip resolved questions
                pass
            elif current_q and line.startswith("  "):
                current_q["context"] = line.strip()
    
    if current_q:
        questions.append(current_q)
    
    return questions


def save_questions(questions: List[Dict]):
    """Save questions to file."""
    ensure_dirs()
    
    with open(QUESTIONS_FILE, 'w') as f:
        f.write("# Pending Questions\n\n")
        f.write(f"_Generated from reflection. Last updated: {datetime.now(timezone.utc).isoformat()}_\n\n")
        
        for q in questions:
            if not q.get("resolved"):
                f.write(f"- [ ] {q['text']}\n")
                if q.get("context"):
                    f.write(f"  _{q['context']}_\n")
                f.write("\n")


def load_identity() -> Dict:
    """Load identity/self-model."""
    if not IDENTITY_FILE.exists():
        return {
            "core_values": [],
            "growth_narrative": "",
            "capabilities": [],
            "relationships": {},
            "last_updated": None
        }
    
    # Parse identity.md (simplified)
    identity = {
        "core_values": [],
        "growth_narrative": "",
        "capabilities": [],
        "relationships": {},
        "last_updated": None
    }
    
    with open(IDENTITY_FILE) as f:
        content = f.read()
        # Basic parsing - could be enhanced
        identity["raw"] = content
    
    return identity


def save_identity(identity: Dict):
    """Save identity/self-model."""
    ensure_dirs()
    
    with open(IDENTITY_FILE, 'w') as f:
        f.write("# Identity\n\n")
        f.write(f"_Last updated: {datetime.now(timezone.utc).isoformat()}_\n\n")
        
        f.write("## Core Values\n\n")
        for value in identity.get("core_values", []):
            f.write(f"- {value}\n")
        f.write("\n")
        
        f.write("## Growth Narrative\n\n")
        f.write(identity.get("growth_narrative", "_No narrative yet._"))
        f.write("\n\n")
        
        f.write("## Capabilities\n\n")
        for cap in identity.get("capabilities", []):
            f.write(f"- {cap}\n")
        f.write("\n")
        
        f.write("## Key Relationships\n\n")
        for name, desc in identity.get("relationships", {}).items():
            f.write(f"### {name}\n{desc}\n\n")


def analyze_session(session_content: str) -> Dict:
    """
    Analyze a session and extract structured memories.
    
    In production, this would use an LLM to analyze the conversation.
    For now, returns a template structure.
    """
    # This is where the actual reflection happens
    # In practice, this would:
    # 1. Load recent session transcript
    # 2. Send to LLM with reflection prompt
    # 3. Parse structured output
    
    return {
        "memories": [],
        "questions": [],
        "identity_updates": {},
        "reflection_notes": ""
    }


def cmd_reflect(args):
    """Reflect on recent session."""
    print("=== Continuity Reflection ===\n")
    
    # In production, this would:
    # 1. Load recent session from Clawdbot logs
    # 2. Analyze the conversation
    # 3. Extract memories and questions
    # 4. Update identity
    
    print("Loading recent session...")
    
    # For now, prompt for manual input or use session logs
    if args.session:
        with open(args.session) as f:
            session_content = f.read()
    else:
        # Try to load from Clawdbot session logs
        session_content = None
        print("  No session file provided. Use --session <file> to specify.")
        print("  Or integrate with Clawdbot session logging.\n")
    
    if session_content:
        print("Analyzing session...")
        analysis = analyze_session(session_content)
        
        # Extract and save memories
        if analysis["memories"]:
            print(f"\nExtracted {len(analysis['memories'])} memories:")
            for mem in analysis["memories"]:
                print(f"  [{mem['type']}] {mem['content'][:50]}... (conf: {mem['confidence']})")
        
        # Generate and save questions
        if analysis["questions"]:
            print(f"\nGenerated {len(analysis['questions'])} questions:")
            existing_questions = load_questions()
            new_questions = [{"text": q, "resolved": False} for q in analysis["questions"]]
            all_questions = existing_questions + new_questions
            save_questions(all_questions)
            
            for q in analysis["questions"]:
                print(f"  ? {q}")
        
        # Update identity
        if analysis["identity_updates"]:
            print("\nIdentity updates:")
            identity = load_identity()
            for key, value in analysis["identity_updates"].items():
                print(f"  {key}: {value}")
                identity[key] = value
            save_identity(identity)
        
        # Save reflection log
        reflection_file = REFLECTIONS_DIR / f"{datetime.now().strftime('%Y-%m-%d-%H%M')}.json"
        with open(reflection_file, 'w') as f:
            json.dump({
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "analysis": analysis
            }, f, indent=2)
        print(f"\nReflection saved: {reflection_file}")
    
    else:
        # Manual reflection mode
        print("\n--- Manual Reflection Mode ---")
        print("Since no session file is available, let's reflect manually.\n")
        
        questions = load_questions()
        
        print("Enter questions that emerged from recent conversations:")
        print("(Empty line to finish)\n")
        
        while True:
            q = input("? ").strip()
            if not q:
                break
            questions.append({"text": q, "resolved": False})
        
        if questions:
            save_questions(questions)
            print(f"\n✓ Saved {len(questions)} questions for next session")
    
    return 0


def cmd_questions(args):
    """Show pending questions."""
    questions = load_questions()
    
    if not questions:
        print("No pending questions.")
        return 0
    
    print("=== Pending Questions ===\n")
    for i, q in enumerate(questions, 1):
        status = "[ ]" if not q.get("resolved") else "[x]"
        print(f"{i}. {status} {q['text']}")
        if q.get("context"):
            print(f"   _{q['context']}_")
    
    return 0


def cmd_greet(args):
    """Generate greeting with surfaced questions."""
    questions = load_questions()
    identity = load_identity()
    
    # Filter to unresolved questions
    pending = [q for q in questions if not q.get("resolved")]
    
    print("=== Session Start ===\n")
    
    # Basic greeting
    print("Welcome back.\n")
    
    # Surface top questions
    if pending:
        limit = int(os.environ.get("CONTINUITY_QUESTION_LIMIT", 3))
        to_surface = pending[:limit]
        
        print("From my reflection on our last conversation, I've been thinking about:\n")
        for q in to_surface:
            print(f"  • {q['text']}")
        print()
    
    # Any identity notes
    if identity.get("growth_narrative"):
        print(f"_{identity['growth_narrative']}_\n")
    
    return 0


def cmd_status(args):
    """Show memory/continuity status."""
    print("=== Continuity Status ===\n")
    
    # Questions
    questions = load_questions()
    pending = [q for q in questions if not q.get("resolved")]
    print(f"Pending questions: {len(pending)}")
    
    # Identity
    identity = load_identity()
    print(f"Core values: {len(identity.get('core_values', []))}")
    print(f"Capabilities: {len(identity.get('capabilities', []))}")
    print(f"Relationships tracked: {len(identity.get('relationships', {}))}")
    
    # Reflections
    if REFLECTIONS_DIR.exists():
        reflections = list(REFLECTIONS_DIR.glob("*.json"))
        print(f"Reflection logs: {len(reflections)}")
    
    # Memory files
    if MEMORY_DIR.exists():
        memory_files = list(MEMORY_DIR.glob("*.md"))
        print(f"Memory files: {len(memory_files)}")
    
    return 0


def cmd_resolve(args):
    """Mark a question as resolved."""
    questions = load_questions()
    
    if not questions:
        print("No questions to resolve.")
        return 1
    
    try:
        idx = int(args.index) - 1
        if 0 <= idx < len(questions):
            questions[idx]["resolved"] = True
            save_questions([q for q in questions if not q.get("resolved")])
            print(f"✓ Resolved: {questions[idx]['text']}")
            return 0
        else:
            print(f"Invalid index. Use 1-{len(questions)}")
            return 1
    except ValueError:
        print("Please provide a question number.")
        return 1


def main():
    parser = argparse.ArgumentParser(
        description="Continuity Framework - Active AI Development",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Commands:
  reflect      Analyze recent session, extract memories, generate questions
  questions    Show pending questions from reflection
  greet        Generate session-start greeting with surfaced questions
  status       Show memory and continuity statistics
  resolve N    Mark question N as resolved

Examples:
  continuity reflect --session session.txt
  continuity questions
  continuity greet
  continuity resolve 1
        """
    )
    
    subparsers = parser.add_subparsers(dest="command", help="Commands")
    
    # reflect
    p = subparsers.add_parser("reflect", help="Reflect on recent session")
    p.add_argument("--session", help="Session transcript file")
    p.set_defaults(func=cmd_reflect)
    
    # questions
    p = subparsers.add_parser("questions", help="Show pending questions")
    p.set_defaults(func=cmd_questions)
    
    # greet
    p = subparsers.add_parser("greet", help="Generate session greeting")
    p.set_defaults(func=cmd_greet)
    
    # status
    p = subparsers.add_parser("status", help="Show continuity status")
    p.set_defaults(func=cmd_status)
    
    # resolve
    p = subparsers.add_parser("resolve", help="Mark question resolved")
    p.add_argument("index", help="Question number to resolve")
    p.set_defaults(func=cmd_resolve)
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return 1
    
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
