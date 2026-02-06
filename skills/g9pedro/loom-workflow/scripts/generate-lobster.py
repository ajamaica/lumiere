#!/usr/bin/env python3
"""
Generate Lobster workflow files from analyzed workflow.
Creates .lobster YAML with approval gates at decision points.
"""

import json
import sys
import yaml
from pathlib import Path
from typing import Optional

def generate_lobster_workflow(analysis: dict) -> dict:
    """
    Convert workflow analysis to Lobster YAML format.
    """
    workflow = {
        "name": analysis.get("title", "untitled-workflow").lower().replace(" ", "-"),
        "description": analysis.get("summary", "Auto-generated workflow from Loom recording"),
        "args": {},
        "steps": []
    }
    
    # Collect required inputs as args
    for step in analysis.get("steps", []):
        if step.get("requires_input") and step.get("input_description"):
            arg_name = f"input_{step['id']}"
            workflow["args"][arg_name] = {
                "description": step["input_description"],
                "required": True
            }
    
    # Generate steps
    for step in analysis.get("steps", []):
        lobster_step = {
            "id": f"step_{step['id']}",
            "name": step.get("action", f"Step {step['id']}"),
        }
        
        # Determine the command based on tool detected
        tool = step.get("tool", "").lower()
        
        if "browser" in tool or "chrome" in tool or "firefox" in tool:
            lobster_step["command"] = generate_browser_command(step)
        elif "excel" in tool or "sheets" in tool:
            lobster_step["command"] = generate_spreadsheet_command(step)
        elif "email" in tool or "gmail" in tool or "outlook" in tool:
            lobster_step["command"] = generate_email_command(step)
        else:
            # Generic placeholder
            lobster_step["command"] = f"echo 'TODO: Implement {step.get('action', 'action')}'"
            lobster_step["_todo"] = f"Tool: {step.get('tool')} | Action: {step.get('action')}"
        
        # Add approval gate for ambiguous or input-required steps
        if step.get("requires_input") or step.get("ambiguities"):
            lobster_step["approval"] = "required"
            if step.get("ambiguities"):
                lobster_step["_ambiguities"] = step["ambiguities"]
        
        # Add conditions for decision points
        decision_points = analysis.get("decision_points", [])
        for dp in decision_points:
            if dp.get("step_id") == step["id"]:
                lobster_step["_decision_point"] = {
                    "condition": dp.get("condition"),
                    "options": dp.get("options", [])
                }
                lobster_step["approval"] = "required"
        
        workflow["steps"].append(lobster_step)
    
    return workflow

def generate_browser_command(step: dict) -> str:
    """Generate browser automation command."""
    action = step.get("action", "").lower()
    ui_element = step.get("ui_element", "")
    
    if "click" in action:
        return f"openclaw.invoke --tool browser --action act --args-json '{{\"kind\": \"click\", \"ref\": \"{ui_element}\"}}'"
    elif "type" in action or "enter" in action:
        return f"openclaw.invoke --tool browser --action act --args-json '{{\"kind\": \"type\", \"ref\": \"{ui_element}\", \"text\": \"${{input}}\"}}'"
    elif "navigate" in action:
        return f"openclaw.invoke --tool browser --action navigate --args-json '{{\"url\": \"${{url}}\"}}'"
    else:
        return f"# Browser action: {action} on {ui_element}"

def generate_spreadsheet_command(step: dict) -> str:
    """Generate spreadsheet automation command."""
    return f"# Spreadsheet action: {step.get('action', 'unknown')}"

def generate_email_command(step: dict) -> str:
    """Generate email automation command."""
    action = step.get("action", "").lower()
    if "send" in action:
        return "openclaw.invoke --tool message --action send --args-json '${email_params}'"
    elif "read" in action:
        return "gog.gmail.list --query 'is:unread' --limit 10"
    else:
        return f"# Email action: {action}"

def generate_summary_markdown(analysis: dict, workflow: dict) -> str:
    """Generate human-readable summary of the workflow."""
    md = f"""# Workflow: {analysis.get('title', 'Untitled')}

## Summary
{analysis.get('summary', 'No summary available.')}

## Language
{analysis.get('language', 'Unknown')}

## Tools Detected
"""
    for tool in analysis.get('tools', []):
        md += f"- {tool}\n"
    
    md += f"""
## Automation Potential
{analysis.get('automation_potential', 0) * 100:.0f}%

## Steps

| # | Action | Tool | Needs Input | Confidence |
|---|--------|------|-------------|------------|
"""
    for step in analysis.get('steps', []):
        needs_input = "✅" if step.get('requires_input') else ""
        confidence = f"{step.get('confidence', 0) * 100:.0f}%"
        md += f"| {step['id']} | {step.get('action', 'N/A')[:40]} | {step.get('tool', 'N/A')} | {needs_input} | {confidence} |\n"
    
    if analysis.get('decision_points'):
        md += "\n## Decision Points\n"
        for dp in analysis['decision_points']:
            md += f"- **Step {dp['step_id']}**: {dp.get('condition', 'Unknown condition')}\n"
            for opt in dp.get('options', []):
                md += f"  - {opt}\n"
    
    if analysis.get('overall_ambiguities'):
        md += "\n## ⚠️ Ambiguities (Need Clarification)\n"
        for amb in analysis['overall_ambiguities']:
            md += f"- {amb}\n"
    
    if analysis.get('prerequisites'):
        md += "\n## Prerequisites\n"
        for prereq in analysis['prerequisites']:
            md += f"- {prereq}\n"
    
    return md

def main():
    if len(sys.argv) < 2:
        print("Usage: generate-lobster.py <analysis.json> [output-dir]")
        sys.exit(1)
    
    analysis_path = sys.argv[1]
    output_dir = sys.argv[2] if len(sys.argv) > 2 else "."
    
    with open(analysis_path) as f:
        analysis = json.load(f)
    
    if analysis.get("status") == "pending_vision_analysis":
        print("[error] Analysis not complete - run vision analysis first")
        print(f"[error] See: {analysis.get('prompt_file')}")
        sys.exit(1)
    
    # Generate Lobster workflow
    workflow = generate_lobster_workflow(analysis)
    
    workflow_name = workflow["name"]
    lobster_path = Path(output_dir) / f"{workflow_name}.lobster"
    
    with open(lobster_path, "w") as f:
        yaml.dump(workflow, f, default_flow_style=False, sort_keys=False)
    
    print(f"[lobster] Generated: {lobster_path}")
    
    # Generate summary markdown
    summary = generate_summary_markdown(analysis, workflow)
    summary_path = Path(output_dir) / f"{workflow_name}-summary.md"
    
    with open(summary_path, "w") as f:
        f.write(summary)
    
    print(f"[summary] Generated: {summary_path}")
    
    # Print next steps
    print(f"""
[done] Workflow generated!

Next steps:
1. Review {summary_path} for accuracy
2. Edit {lobster_path} to fill in TODOs
3. Test with: lobster run {lobster_path} --dry-run
4. Run for real: lobster run {lobster_path}
""")

if __name__ == "__main__":
    main()
