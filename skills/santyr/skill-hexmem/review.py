#!/usr/bin/env python3
"""
HexMem Spaced Repetition Review System

Based on Ebbinghaus forgetting curve and SM-2 algorithm.
Helps maintain memory retention through scheduled reviews.

Usage:
  python review.py --due          # Show items due for review
  python review.py --review ID    # Review a specific item
  python review.py --stats        # Show retention statistics
  python review.py --decay        # Process memory decay
"""

import argparse
import json
import math
import os
import sqlite3
from datetime import datetime, timedelta

HEXMEM_DB = os.environ.get("HEXMEM_DB", os.path.expanduser("~/clawd/hexmem/hexmem.db"))

# SM-2 intervals in hours
INTERVALS = [0.33, 1, 24, 72, 168, 336, 720, 2160, 4320, 8760]


def get_db():
    return sqlite3.connect(HEXMEM_DB)


def calculate_retention(hours_since_review: float, memory_strength: float) -> float:
    """
    Calculate retention using Ebbinghaus forgetting curve: R = e^(-t/S)
    
    Args:
        hours_since_review: Time since last review in hours
        memory_strength: Memory strength factor (higher = slower decay)
    
    Returns:
        Retention value between 0 and 1
    """
    # S is memory_strength * 24 (base unit is days)
    s = memory_strength * 24
    return math.exp(-hours_since_review / s)


def get_next_interval(repetition_count: int, quality: int) -> float:
    """
    Calculate next review interval based on SM-2 algorithm.
    
    Args:
        repetition_count: Number of successful reviews
        quality: Review quality (0-5)
            0-2: Complete blackout, need to relearn
            3: Hard recall with serious difficulty
            4: Good recall with some hesitation
            5: Perfect recall
    
    Returns:
        Next interval in hours
    """
    if quality < 3:
        # Failed review - reset to beginning
        return INTERVALS[0]
    
    # Successful review - advance to next interval
    next_rep = min(repetition_count + 1, len(INTERVALS) - 1)
    base_interval = INTERVALS[next_rep]
    
    # Adjust based on quality
    if quality == 5:
        return base_interval * 1.3  # Easy - extend interval
    elif quality == 3:
        return base_interval * 0.8  # Hard - shorten interval
    return base_interval  # quality == 4, normal


def show_due_items(conn, limit: int = 10):
    """Show items due for review."""
    cur = conn.execute("""
        SELECT source_table, source_id, content_preview, importance, 
               current_retention, hours_since_review, priority
        FROM v_today_reviews
        LIMIT ?
    """, (limit,))
    
    rows = cur.fetchall()
    if not rows:
        print("✅ No items due for review!")
        return
    
    print(f"\n📚 Items Due for Review ({len(rows)})\n")
    print("-" * 70)
    
    for row in rows:
        source, sid, preview, importance, retention, hours, priority = row
        preview = (preview[:50] + '...') if len(preview or '') > 50 else preview
        
        priority_emoji = {'URGENT': '🔴', 'DUE': '🟡', 'OPTIONAL': '🟢'}.get(priority, '⚪')
        
        print(f"{priority_emoji} [{source}:{sid}] {preview}")
        print(f"   Retention: {retention*100:.0f}% | Importance: {importance:.1f} | Last review: {hours:.0f}h ago")
        print()


def review_item(conn, source_table: str, source_id: int, quality: int):
    """
    Record a review and update memory strength.
    
    Args:
        source_table: 'events' or 'lessons'
        source_id: ID of the item
        quality: 0-5 recall quality
    """
    now = datetime.utcnow().isoformat()
    
    # Get current state
    if source_table == 'events':
        cur = conn.execute("""
            SELECT memory_strength, repetition_count, last_reviewed_at, occurred_at,
                   retention_estimate
            FROM events WHERE id = ?
        """, (source_id,))
    else:
        cur = conn.execute("""
            SELECT memory_strength, repetition_count, last_reviewed_at, learned_at,
                   retention_estimate
            FROM lessons WHERE id = ?
        """, (source_id,))
    
    row = cur.fetchone()
    if not row:
        print(f"Item not found: {source_table}:{source_id}")
        return
    
    strength, rep_count, last_reviewed, created, retention = row
    last_reviewed = last_reviewed or created
    
    # Calculate time since last review
    last_dt = datetime.fromisoformat(last_reviewed.replace('Z', '+00:00').replace('+00:00', ''))
    hours_since = (datetime.utcnow() - last_dt).total_seconds() / 3600
    
    # Calculate current retention before review
    current_retention = calculate_retention(hours_since, strength)
    
    # Update memory strength based on quality
    if quality >= 3:
        # Successful recall - strengthen memory
        # Bonus for recalling at low retention (spaced repetition benefit)
        retention_bonus = 1.0 + (1.0 - current_retention) * 0.5
        strength_multiplier = 1.1 + (quality - 3) * 0.1  # 1.1 to 1.3
        new_strength = min(10.0, strength * strength_multiplier * retention_bonus)
        new_rep_count = rep_count + 1
    else:
        # Failed recall - weaken memory
        new_strength = max(0.5, strength * 0.7)
        new_rep_count = 0  # Reset repetition count
    
    # Calculate next review interval
    next_interval_hours = get_next_interval(new_rep_count, quality)
    next_review = (datetime.utcnow() + timedelta(hours=next_interval_hours)).isoformat()
    
    # Update the item
    if source_table == 'events':
        conn.execute("""
            UPDATE events SET
                memory_strength = ?,
                repetition_count = ?,
                last_reviewed_at = ?,
                next_review_at = ?,
                retention_estimate = 1.0
            WHERE id = ?
        """, (new_strength, new_rep_count, now, next_review, source_id))
    else:
        conn.execute("""
            UPDATE lessons SET
                memory_strength = ?,
                repetition_count = ?,
                last_reviewed_at = ?,
                next_review_at = ?,
                retention_estimate = 1.0
            WHERE id = ?
        """, (new_strength, new_rep_count, now, next_review, source_id))
    
    # Log the review
    conn.execute("""
        INSERT INTO review_log (source_table, source_id, retention_before, quality, time_since_last_review_hours)
        VALUES (?, ?, ?, ?, ?)
    """, (source_table, source_id, current_retention, quality, hours_since))
    
    conn.commit()
    
    # Format next review time
    next_dt = datetime.fromisoformat(next_review)
    if next_interval_hours < 24:
        next_str = f"{next_interval_hours:.1f} hours"
    else:
        next_str = f"{next_interval_hours/24:.1f} days"
    
    quality_labels = ['Blackout', 'Barely', 'Struggled', 'Hard', 'Good', 'Easy']
    print(f"\n✅ Review recorded: {quality_labels[quality]}")
    print(f"   Memory strength: {strength:.2f} → {new_strength:.2f}")
    print(f"   Next review in: {next_str}")


def show_stats(conn):
    """Show retention statistics."""
    cur = conn.execute("SELECT * FROM v_retention_stats")
    rows = cur.fetchall()
    
    print("\n📊 Memory Retention Statistics\n")
    print("-" * 60)
    
    for row in rows:
        state, count, avg_strength, avg_reps, avg_importance, overdue = row
        print(f"{state}:")
        print(f"  Count: {count} | Avg Strength: {avg_strength} | Avg Reps: {avg_reps}")
        print(f"  Avg Importance: {avg_importance} | Overdue: {overdue}")
        print()
    
    # Show forgetting candidates
    cur = conn.execute("SELECT COUNT(*) FROM v_forgetting_soon")
    at_risk = cur.fetchone()[0]
    print(f"⚠️ Memories at risk of forgetting: {at_risk}")


def process_decay(conn, dry_run: bool = True):
    """
    Process memory decay - mark very low retention items as forgotten.
    """
    # Find items with very low retention that haven't been reviewed in a long time
    cur = conn.execute("""
        SELECT id, summary, importance,
               ROUND(EXP(-((JULIANDAY('now') - JULIANDAY(COALESCE(last_reviewed_at, occurred_at))) * 24) / (memory_strength * 24)), 3) as retention
        FROM events
        WHERE consolidation_state != 'forgotten'
          AND importance < 0.3
          AND EXP(-((JULIANDAY('now') - JULIANDAY(COALESCE(last_reviewed_at, occurred_at))) * 24) / (memory_strength * 24)) < 0.1
    """)
    
    candidates = cur.fetchall()
    
    if not candidates:
        print("No memories ready for forgetting.")
        return
    
    print(f"\n🗑️ Forgetting Candidates ({len(candidates)})\n")
    
    for id, summary, importance, retention in candidates:
        preview = (summary[:40] + '...') if len(summary) > 40 else summary
        print(f"  [{id}] {preview}")
        print(f"      Importance: {importance:.2f} | Retention: {retention*100:.0f}%")
    
    if dry_run:
        print("\n(Dry run - no changes made. Use --decay --apply to forget.)")
    else:
        conn.execute("""
            UPDATE events SET consolidation_state = 'forgotten'
            WHERE id IN (
                SELECT id FROM events
                WHERE consolidation_state != 'forgotten'
                  AND importance < 0.3
                  AND EXP(-((JULIANDAY('now') - JULIANDAY(COALESCE(last_reviewed_at, occurred_at))) * 24) / (memory_strength * 24)) < 0.1
            )
        """)
        conn.commit()
        print(f"\n✅ Marked {len(candidates)} items as forgotten.")


def main():
    parser = argparse.ArgumentParser(description='HexMem Spaced Repetition Review')
    parser.add_argument('--due', action='store_true', help='Show items due for review')
    parser.add_argument('--review', type=str, help='Review an item (format: events:ID or lessons:ID)')
    parser.add_argument('--quality', '-q', type=int, choices=[0,1,2,3,4,5], default=4,
                       help='Review quality (0=blackout, 5=perfect)')
    parser.add_argument('--stats', action='store_true', help='Show retention statistics')
    parser.add_argument('--decay', action='store_true', help='Process memory decay')
    parser.add_argument('--apply', action='store_true', help='Apply decay changes (not dry run)')
    parser.add_argument('--limit', type=int, default=10, help='Limit results')
    
    args = parser.parse_args()
    conn = get_db()
    
    if args.due:
        show_due_items(conn, args.limit)
    elif args.review:
        parts = args.review.split(':')
        if len(parts) != 2:
            print("Format: --review events:ID or --review lessons:ID")
            return
        source_table, source_id = parts[0], int(parts[1])
        review_item(conn, source_table, source_id, args.quality)
    elif args.stats:
        show_stats(conn)
    elif args.decay:
        process_decay(conn, dry_run=not args.apply)
    else:
        parser.print_help()
    
    conn.close()


if __name__ == '__main__':
    main()
