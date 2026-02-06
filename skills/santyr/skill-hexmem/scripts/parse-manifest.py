#!/usr/bin/env python3
"""
parse-manifest.py - Parse hex-reflect YAML manifest and commit to HexMem

Part of Epistemic Extraction Pipeline (Genealogy of Beliefs)
Handles: observations → facts, insights → lessons, meta_preferences → core_values
Supports supersession logic for belief evolution
"""

import sqlite3
import yaml
import sys
import argparse
from datetime import datetime
from pathlib import Path

# Database path
HEXMEM_DB = Path(__file__).parent.parent / "hexmem.db"

def parse_manifest(manifest_path):
    """Parse YAML manifest and extract approved items"""
    with open(manifest_path, 'r') as f:
        content = f.read()
    
    # Parse YAML (will only capture uncommented sections)
    try:
        data = yaml.safe_load(content)
    except yaml.YAMLError as e:
        print(f"Error parsing YAML: {e}", file=sys.stderr)
        return None
    
    if not data:
        return {'observations': [], 'insights': [], 'meta_preferences': []}
    
    return {
        'observations': data.get('observations') or [],
        'insights': data.get('insights') or [],
        'meta_preferences': data.get('meta_preferences') or []
    }

def check_fact_conflict(conn, subject, predicate, object_val):
    """Check if a similar fact exists"""
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, object_text, confidence 
        FROM facts 
        WHERE subject_text = ? 
          AND predicate = ? 
          AND valid_until IS NULL 
          AND status = 'active'
    """, (subject, predicate))
    return cursor.fetchone()

def check_lesson_conflict(conn, domain, lesson_text):
    """Check if a similar lesson exists"""
    cursor = conn.cursor()
    # Simplified: check exact domain match with similar text
    cursor.execute("""
        SELECT id, lesson, confidence
        FROM lessons
        WHERE domain = ?
          AND valid_until IS NULL
        LIMIT 5
    """, (domain,))
    return cursor.fetchall()

def supersede_fact(conn, old_id, new_id):
    """Mark old fact as superseded"""
    cursor = conn.cursor()
    now = datetime.now().isoformat()
    cursor.execute("""
        UPDATE facts 
        SET valid_until = ?, superseded_by = ?
        WHERE id = ?
    """, (now, new_id, old_id))
    conn.commit()
    print(f"   ✓ Superseded fact ID {old_id} with ID {new_id}")

def supersede_lesson(conn, old_id, new_id):
    """Mark old lesson as superseded"""
    cursor = conn.cursor()
    now = datetime.now().isoformat()
    cursor.execute("""
        UPDATE lessons
        SET valid_until = ?, superseded_by = ?
        WHERE id = ?
    """, (now, new_id, old_id))
    conn.commit()
    print(f"   ✓ Superseded lesson ID {old_id} with ID {new_id}")

def commit_observation(conn, obs, dry_run=False):
    """Commit observation as fact to database"""
    subject = obs.get('subject', 'hex')
    predicate = obs.get('predicate', 'observed')
    obj = obs.get('object', '')
    confidence = obs.get('confidence', 0.8)
    source_event_id = obs.get('source_event_id')
    action = obs.get('action', 'new')
    
    if dry_run:
        print(f"   [DRY RUN] Would add fact: {subject} | {predicate} | {obj}")
        return
    
    cursor = conn.cursor()
    
    # Check for conflicts
    conflict = check_fact_conflict(conn, subject, predicate, obj)
    
    # Insert new fact
    cursor.execute("""
        INSERT INTO facts (
            subject_text, predicate, object_text, object_type,
            confidence, source, source_session, created_at
        ) VALUES (?, ?, ?, 'string', ?, 'reflection', ?, datetime('now'))
    """, (subject, predicate, obj, confidence, f"event:{source_event_id}" if source_event_id else None))
    
    new_id = cursor.lastrowid
    conn.commit()
    
    print(f"   ✓ Added fact ID {new_id}: {subject} | {predicate} | {obj}")
    
    # Handle supersession if requested
    if conflict and action == 'supersede':
        old_id = conflict[0]
        supersede_fact(conn, old_id, new_id)
    
    return new_id

def commit_insight(conn, insight, dry_run=False):
    """Commit insight as lesson to database"""
    domain = insight.get('domain', 'general')
    lesson = insight.get('lesson', '')
    context = insight.get('context', '')
    confidence = insight.get('confidence', 0.7)
    source_event_id = insight.get('source_event_id')
    action = insight.get('action', 'new')
    
    if dry_run:
        print(f"   [DRY RUN] Would add lesson in '{domain}': {lesson}")
        return
    
    cursor = conn.cursor()
    
    # Insert new lesson
    cursor.execute("""
        INSERT INTO lessons (
            domain, lesson, context, confidence, source_event_id, created_at
        ) VALUES (?, ?, ?, ?, ?, datetime('now'))
    """, (domain, lesson, context, confidence, source_event_id))
    
    new_id = cursor.lastrowid
    conn.commit()
    
    print(f"   ✓ Added lesson ID {new_id} in '{domain}': {lesson}")
    
    # Check for conflicts (simplified - just report if similar lessons exist)
    conflicts = check_lesson_conflict(conn, domain, lesson)
    if conflicts and action == 'supersede':
        # For now, just report - user can manually supersede
        print(f"   ⚠️  Found {len(conflicts)} similar lesson(s) in '{domain}' - review for supersession")
    
    return new_id

def commit_meta_preference(conn, pref, dry_run=False):
    """Commit meta-preference as core_value to database"""
    name = pref.get('name', '')
    description = pref.get('description', '')
    priority = pref.get('priority', 50)
    source = pref.get('source', 'reflection')
    
    if dry_run:
        print(f"   [DRY RUN] Would add/update core value: {name}")
        return
    
    cursor = conn.cursor()
    
    # Check if value already exists
    cursor.execute("SELECT id FROM core_values WHERE name = ?", (name,))
    existing = cursor.fetchone()
    
    if existing:
        # Update existing
        cursor.execute("""
            UPDATE core_values 
            SET description = ?, priority = ?, source = ?, updated_at = datetime('now')
            WHERE name = ?
        """, (description, priority, source, name))
        print(f"   ✓ Updated core value: {name}")
    else:
        # Insert new
        cursor.execute("""
            INSERT INTO core_values (name, description, priority, source, created_at)
            VALUES (?, ?, ?, ?, datetime('now'))
        """, (name, description, priority, source))
        print(f"   ✓ Added core value: {name}")
    
    conn.commit()

def main():
    parser = argparse.ArgumentParser(description='Parse hex-reflect manifest and commit to HexMem')
    parser.add_argument('manifest', help='Path to YAML manifest file')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be committed without actually doing it')
    args = parser.parse_args()
    
    # Parse manifest
    data = parse_manifest(args.manifest)
    if data is None:
        sys.exit(1)
    
    obs_count = len(data['observations'])
    insight_count = len(data['insights'])
    pref_count = len(data['meta_preferences'])
    
    total = obs_count + insight_count + pref_count
    
    if total == 0:
        print("No items to commit in manifest")
        return
    
    print(f"📥 Committing {total} item(s) from manifest:")
    print(f"   - {obs_count} observation(s) → facts")
    print(f"   - {insight_count} insight(s) → lessons")
    print(f"   - {pref_count} meta-preference(s) → core_values")
    print()
    
    if args.dry_run:
        print("🏃 DRY RUN MODE - No database changes will be made")
        print()
    
    # Connect to database
    conn = sqlite3.connect(HEXMEM_DB)
    
    try:
        # Commit observations
        if obs_count > 0:
            print("📊 Observations:")
            for obs in data['observations']:
                commit_observation(conn, obs, args.dry_run)
            print()
        
        # Commit insights
        if insight_count > 0:
            print("💡 Insights:")
            for insight in data['insights']:
                commit_insight(conn, insight, args.dry_run)
            print()
        
        # Commit meta-preferences
        if pref_count > 0:
            print("⚙️  Meta-Preferences:")
            for pref in data['meta_preferences']:
                commit_meta_preference(conn, pref, args.dry_run)
            print()
        
        print("✅ Manifest processing complete")
        
    finally:
        conn.close()

if __name__ == '__main__':
    main()
