#!/usr/bin/env python3
import os
import re
import json
import datetime
import argparse

def find_file(filename, search_paths):
    for path in search_paths:
        full_path = os.path.join(path, filename)
        if os.path.exists(full_path):
            return full_path
    return None

def parse_projects_md(file_path):
    projects = []
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        in_table = False
        headers = []
        
        for line in lines:
            line = line.strip()
            # Detect Markdown tables
            if "|" in line:
                if "---" in line:
                    continue
                if not in_table:
                    # Likely headers
                    headers = [h.strip() for h in line.strip("|").split("|")]
                    in_table = True
                else:
                    # Row data
                    row = [c.strip() for c in line.strip("|").split("|")]
                    if len(row) == len(headers):
                        project = dict(zip(headers, row))
                        # Normalize keys
                        project = {k.lower(): v for k, v in project.items()}
                        projects.append(project)
            else:
                in_table = False
                # Detect list items with status patterns
                if line.startswith("- [") or line.startswith("* ["):
                    # Check for [~] which usually means in progress or paused/backlog
                    if "[~]" in line:
                        # Extract text
                        text = re.sub(r'^[-*]\s*\[~\]\s*', '', line)
                        projects.append({
                            "project": text.split(":")[0].replace("**", "").strip(),
                            "status": "Paused/Backlog",
                            "raw": line
                        })
    except Exception as e:
        print(f"Error parsing {file_path}: {e}")
    
    return projects

def parse_memory_md(file_path):
    # Fallback to scan MEMORY.md for keywords if PROJECTS.md is missing or to add context
    # This is a basic scanner for "Paused" keyword in lines
    suspicious_lines = []
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        for i, line in enumerate(lines):
            if "paused" in line.lower() or "stuck" in line.lower():
                suspicious_lines.append({
                    "line_number": i + 1,
                    "content": line.strip()
                })
    except Exception as e:
        print(f"Error parsing {file_path}: {e}")
    
    return suspicious_lines

def analyze_projects(projects_data, memory_hits):
    action_plan = {
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "paused_projects": [],
        "suggested_actions": []
    }

    # Analyze structured project data
    for p in projects_data:
        name = p.get("project", "Unknown")
        status = p.get("status", "").lower()
        
        # Check for pause indicators
        is_paused = False
        reason = ""
        
        if "paused" in status:
            is_paused = True
            reason = "Explicitly marked 'Paused'"
        elif "⏸️" in status:
            is_paused = True
            reason = "Status icon ⏸️ found"
        elif p.get("raw", "").find("[~]") != -1:
             is_paused = True
             reason = "Marked with [~] (Incomplete/Backlog)"

        if is_paused:
            action_plan["paused_projects"].append({
                "name": name,
                "current_status": p.get("status", "Unknown"),
                "reason": reason,
                "location": p.get("location", "Unknown")
            })
            
            # Suggest action
            action_plan["suggested_actions"].append({
                "type": "resume_analysis",
                "target": name,
                "instruction": f"Read logs in {p.get('location', 'project dir')} to determine why '{name}' is paused."
            })

    # Add memory context if needed
    if memory_hits and not action_plan["paused_projects"]:
        # If we didn't find clear projects but found keywords in MEMORY.md
        action_plan["memory_warnings"] = memory_hits
        action_plan["suggested_actions"].append({
            "type": "investigation",
            "instruction": "Investigate MEMORY.md for 'paused' keywords as no structured projects were found."
        })

    return action_plan

def main():
    parser = argparse.ArgumentParser(description='Hydra-Forge Evolve Script')
    parser.add_argument('--workspace', default='.', help='Root workspace path')
    args = parser.parse_args()

    search_paths = [args.workspace, os.path.join(args.workspace, '..')]
    
    projects_file = find_file('PROJECTS.md', search_paths)
    memory_file = find_file('MEMORY.md', search_paths)

    projects_data = []
    if projects_file:
        projects_data = parse_projects_md(projects_file)
    
    memory_hits = []
    if memory_file:
        memory_hits = parse_memory_md(memory_file)
        
    plan = analyze_projects(projects_data, memory_hits)
    
    print(json.dumps(plan, indent=2))

if __name__ == "__main__":
    main()
