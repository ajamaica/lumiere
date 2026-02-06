#!/usr/bin/env python3
"""
Neo Skill Update Script

Merges upstream updates while respecting user customizations:
- source: "upstream" + deleted: false → update normally
- source: "upstream" + deleted: true → skip (user removed)
- source: "custom" → never touch
- New upstream modules → add with source: "upstream"
"""

import json
import os
import shutil
import sys
from pathlib import Path

def load_registry(path):
    """Load registry.json"""
    if os.path.exists(path):
        with open(path) as f:
            return json.load(f)
    return {"version": "1.0.0", "modules": {}}

def save_registry(reg, path):
    """Save registry.json"""
    with open(path, 'w') as f:
        json.dump(reg, f, indent=2)

def merge_registries(local_reg, upstream_reg, local_lib_path, upstream_lib_path):
    """
    Merge upstream registry into local, respecting user decisions.
    Returns (updated_registry, stats)
    """
    stats = {
        'added': [],
        'updated': [],
        'skipped_deleted': [],
        'skipped_custom': [],
        'unchanged': []
    }
    
    local_modules = local_reg.get('modules', {})
    upstream_modules = upstream_reg.get('modules', {})
    
    for mid, upstream_mod in upstream_modules.items():
        if mid in local_modules:
            local_mod = local_modules[mid]
            
            # Skip custom modules
            if local_mod.get('source') == 'custom':
                stats['skipped_custom'].append(mid)
                continue
            
            # Skip deleted upstream modules
            if local_mod.get('deleted', False):
                stats['skipped_deleted'].append(mid)
                continue
            
            # Update upstream module
            # Preserve local adaptations log if exists
            local_path = local_lib_path / local_mod.get('path', f'{mid}.md')
            upstream_path = upstream_lib_path / upstream_mod.get('path', f'{mid}.md')
            
            if upstream_path.exists():
                # Could add smarter merge here (preserve Adaptations Log)
                shutil.copy2(upstream_path, local_path)
                stats['updated'].append(mid)
            else:
                stats['unchanged'].append(mid)
            
            # Update registry entry
            local_modules[mid].update({
                'path': upstream_mod.get('path'),
                'category': upstream_mod.get('category'),
                'description': upstream_mod.get('description'),
                'source': 'upstream',
            })
        else:
            # New module from upstream
            stats['added'].append(mid)
            local_modules[mid] = {
                **upstream_mod,
                'source': 'upstream',
                'deleted': False,
                'use_count': 0
            }
            
            # Copy the module file
            upstream_path = upstream_lib_path / upstream_mod.get('path', f'{mid}.md')
            local_path = local_lib_path / upstream_mod.get('path', f'{mid}.md')
            
            if upstream_path.exists():
                local_path.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(upstream_path, local_path)
    
    local_reg['modules'] = local_modules
    return local_reg, stats

def delete_module(registry_path, module_id):
    """Mark a module as deleted (won't be restored on update)"""
    reg = load_registry(registry_path)
    
    if module_id not in reg['modules']:
        print(f"Module '{module_id}' not found")
        return False
    
    mod = reg['modules'][module_id]
    
    if mod.get('source') == 'custom':
        # Actually delete custom modules
        print(f"Removing custom module '{module_id}'")
        del reg['modules'][module_id]
    else:
        # Mark upstream modules as deleted
        print(f"Marking upstream module '{module_id}' as deleted")
        mod['deleted'] = True
    
    save_registry(reg, registry_path)
    return True

def restore_module(registry_path, module_id):
    """Restore a previously deleted upstream module"""
    reg = load_registry(registry_path)
    
    if module_id not in reg['modules']:
        print(f"Module '{module_id}' not found")
        return False
    
    mod = reg['modules'][module_id]
    
    if mod.get('source') != 'upstream':
        print(f"Module '{module_id}' is not an upstream module")
        return False
    
    mod['deleted'] = False
    save_registry(reg, registry_path)
    print(f"Restored module '{module_id}'")
    return True

def print_stats(stats):
    """Print update statistics"""
    print("\n=== Neo Update Summary ===")
    if stats['added']:
        print(f"\n✅ Added ({len(stats['added'])}):")
        for m in stats['added']:
            print(f"   + {m}")
    if stats['updated']:
        print(f"\n🔄 Updated ({len(stats['updated'])}):")
        for m in stats['updated']:
            print(f"   ~ {m}")
    if stats['skipped_deleted']:
        print(f"\n⏭️  Skipped (user deleted) ({len(stats['skipped_deleted'])}):")
        for m in stats['skipped_deleted']:
            print(f"   - {m}")
    if stats['skipped_custom']:
        print(f"\n👤 Skipped (custom) ({len(stats['skipped_custom'])}):")
        for m in stats['skipped_custom']:
            print(f"   * {m}")
    print(f"\n📊 Total: {len(stats['added'])} added, {len(stats['updated'])} updated, {len(stats['skipped_deleted']) + len(stats['skipped_custom'])} skipped")

if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Neo Skill Update Manager')
    parser.add_argument('command', choices=['merge', 'delete', 'restore', 'status'],
                       help='Command to run')
    parser.add_argument('--upstream', help='Path to upstream skill directory')
    parser.add_argument('--module', help='Module ID for delete/restore')
    parser.add_argument('--local', default='.', help='Path to local skill directory')
    
    args = parser.parse_args()
    
    local_path = Path(args.local)
    local_reg_path = local_path / 'assets' / 'registry.json'
    local_lib_path = local_path / 'assets' / 'library'
    
    if args.command == 'status':
        reg = load_registry(local_reg_path)
        modules = reg.get('modules', {})
        
        upstream = [m for m, v in modules.items() if v.get('source') == 'upstream' and not v.get('deleted')]
        custom = [m for m, v in modules.items() if v.get('source') == 'custom']
        deleted = [m for m, v in modules.items() if v.get('deleted')]
        
        print(f"📚 Neo Library Status")
        print(f"   Upstream modules: {len(upstream)}")
        print(f"   Custom modules: {len(custom)}")
        print(f"   Deleted (hidden): {len(deleted)}")
        
        if custom:
            print(f"\n👤 Custom modules: {', '.join(custom)}")
        if deleted:
            print(f"\n🗑️  Deleted modules: {', '.join(deleted)}")
    
    elif args.command == 'delete':
        if not args.module:
            print("Error: --module required for delete")
            sys.exit(1)
        delete_module(local_reg_path, args.module)
    
    elif args.command == 'restore':
        if not args.module:
            print("Error: --module required for restore")
            sys.exit(1)
        restore_module(local_reg_path, args.module)
    
    elif args.command == 'merge':
        if not args.upstream:
            print("Error: --upstream required for merge")
            sys.exit(1)
        
        upstream_path = Path(args.upstream)
        upstream_reg_path = upstream_path / 'assets' / 'registry.json'
        upstream_lib_path = upstream_path / 'assets' / 'library'
        
        local_reg = load_registry(local_reg_path)
        upstream_reg = load_registry(upstream_reg_path)
        
        updated_reg, stats = merge_registries(
            local_reg, upstream_reg,
            local_lib_path, upstream_lib_path
        )
        
        save_registry(updated_reg, local_reg_path)
        print_stats(stats)
