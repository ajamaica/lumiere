#!/usr/bin/env python3
"""
AI-native workflow analyzer.
Takes extracted frames + transcript and builds a workflow understanding.

Uses multimodal LLM to:
1. Identify tools/applications in each frame
2. Understand actions being performed
3. Correlate with narration
4. Detect ambiguities and decision points
5. Build structured workflow definition
"""

import json
import sys
import os
import base64
from pathlib import Path
from dataclasses import dataclass, asdict
from typing import Optional
import subprocess

@dataclass
class WorkflowStep:
    id: int
    timestamp: float
    action: str
    tool: Optional[str]  # Detected application/tool
    ui_element: Optional[str]  # Button, field, menu clicked
    narration: Optional[str]  # What the narrator said
    confidence: float  # 0-1 how certain we are
    ambiguities: list[str]  # Unclear aspects
    requires_input: bool  # Needs human input to execute
    input_description: Optional[str]  # What input is needed

@dataclass
class WorkflowAnalysis:
    title: str
    language: str
    duration: float
    tools_detected: list[str]
    steps: list[WorkflowStep]
    decision_points: list[dict]  # Points where flow branches
    prerequisites: list[str]  # What's needed before running
    ambiguities: list[dict]  # Global unclear aspects
    automation_potential: float  # 0-1 how automatable

def encode_image(image_path: str) -> str:
    """Base64 encode an image for API calls."""
    with open(image_path, "rb") as f:
        return base64.b64encode(f.read()).decode()

def analyze_frame_batch(frames: list[dict], transcript_context: str) -> dict:
    """
    Analyze a batch of frames with transcript context.
    Uses the oracle CLI for LLM calls.
    """
    # Build the prompt
    prompt = f"""Analyze these workflow screenshots with their transcript context.

TRANSCRIPT CONTEXT:
{transcript_context}

For each frame, identify:
1. What application/tool is being used (be specific - Excel, Salesforce, Gmail, etc.)
2. What UI element is being interacted with
3. What action is being performed
4. Any ambiguities or unclear aspects
5. Whether this step needs human input/decision

Return JSON:
{{
  "frames": [
    {{
      "timestamp": <float>,
      "tool": "<application name>",
      "action": "<what is happening>",
      "ui_element": "<button/field/menu being used>",
      "confidence": <0-1>,
      "ambiguities": ["<unclear aspect>", ...],
      "requires_input": <bool>,
      "input_description": "<what input is needed if any>"
    }}
  ],
  "detected_tools": ["<tool1>", "<tool2>"],
  "workflow_segment": "<brief description of this segment>"
}}"""

    # For now, we'll use a simpler approach that works with available tools
    # In production, this would call a vision API
    
    # Placeholder - return structure for the orchestrator to fill
    return {
        "frames": [
            {
                "timestamp": f.get("timestamp", 0),
                "needs_vision_analysis": True,
                "transcript": f.get("transcript", "")
            }
            for f in frames
        ],
        "prompt": prompt
    }

def build_workflow_from_analysis(frame_analyses: list[dict], 
                                  full_transcript: list[dict]) -> WorkflowAnalysis:
    """
    Build final workflow definition from analyzed frames.
    """
    steps = []
    tools = set()
    all_ambiguities = []
    decision_points = []
    
    for i, analysis in enumerate(frame_analyses):
        if "tool" in analysis:
            tools.add(analysis["tool"])
        
        step = WorkflowStep(
            id=i,
            timestamp=analysis.get("timestamp", 0),
            action=analysis.get("action", "Unknown action"),
            tool=analysis.get("tool"),
            ui_element=analysis.get("ui_element"),
            narration=analysis.get("transcript"),
            confidence=analysis.get("confidence", 0.5),
            ambiguities=analysis.get("ambiguities", []),
            requires_input=analysis.get("requires_input", False),
            input_description=analysis.get("input_description")
        )
        steps.append(step)
        
        if step.ambiguities:
            all_ambiguities.append({
                "step_id": i,
                "timestamp": step.timestamp,
                "issues": step.ambiguities
            })
        
        # Detect decision points from narration
        if step.narration:
            decision_words = ["if", "when", "depending", "either", "or", "choose"]
            if any(word in step.narration.lower() for word in decision_words):
                decision_points.append({
                    "step_id": i,
                    "timestamp": step.timestamp,
                    "context": step.narration
                })
    
    # Calculate automation potential
    automatable_steps = sum(1 for s in steps if not s.requires_input and s.confidence > 0.7)
    automation_potential = automatable_steps / len(steps) if steps else 0
    
    return WorkflowAnalysis(
        title="Workflow Analysis",
        language="auto-detected",
        duration=max(s.timestamp for s in steps) if steps else 0,
        tools_detected=list(tools),
        steps=steps,
        decision_points=decision_points,
        prerequisites=[],
        ambiguities=all_ambiguities,
        automation_potential=automation_potential
    )

def generate_analysis_prompt(manifest_path: str) -> str:
    """
    Generate a prompt for multimodal analysis.
    This will be used with vision-capable models.
    """
    with open(manifest_path) as f:
        manifest = json.load(f)
    
    frames = manifest["frames"]
    
    prompt = """You are analyzing a workflow recording to create an automation.

FRAMES AND TRANSCRIPT:
"""
    for i, frame in enumerate(frames):
        prompt += f"\n[Frame {i} at {frame['timestamp']:.1f}s]\n"
        prompt += f"Reason captured: {frame['reason']}\n"
        if frame.get('transcript'):
            prompt += f"Narrator says: \"{frame['transcript']}\"\n"
        prompt += f"Image: {frame['path']}\n"
    
    prompt += """

ANALYZE AND RETURN JSON:
{
  "title": "<workflow title>",
  "language": "<language of narration>",
  "summary": "<2-3 sentence summary>",
  "tools": ["<tool1>", "<tool2>"],
  "steps": [
    {
      "id": <int>,
      "timestamp": <float>,
      "action": "<what is being done>",
      "tool": "<application being used>",
      "ui_element": "<what is clicked/typed>",
      "narration_summary": "<what narrator explained>",
      "confidence": <0.0-1.0>,
      "ambiguities": ["<unclear thing>"],
      "requires_input": <true if needs human decision>,
      "input_description": "<what input is needed>"
    }
  ],
  "decision_points": [
    {
      "step_id": <int>,
      "condition": "<when this branches>",
      "options": ["<option1>", "<option2>"]
    }
  ],
  "prerequisites": ["<what's needed before running>"],
  "overall_ambiguities": ["<global unclear aspects>"],
  "automation_potential": <0.0-1.0>
}
"""
    return prompt

def main():
    if len(sys.argv) < 2:
        print("Usage: analyze-workflow.py <manifest.json> [output.json]")
        print("       analyze-workflow.py --generate-prompt <manifest.json>")
        sys.exit(1)
    
    if sys.argv[1] == "--generate-prompt":
        manifest_path = sys.argv[2]
        prompt = generate_analysis_prompt(manifest_path)
        print(prompt)
        sys.exit(0)
    
    manifest_path = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) > 2 else "workflow-analysis.json"
    
    with open(manifest_path) as f:
        manifest = json.load(f)
    
    # Generate the prompt for manual/API analysis
    prompt = generate_analysis_prompt(manifest_path)
    
    prompt_path = output_path.replace(".json", "-prompt.md")
    with open(prompt_path, "w") as f:
        f.write(prompt)
    
    print(f"[analyze] Generated analysis prompt: {prompt_path}")
    print(f"[analyze] Use this prompt with a vision-capable model")
    print(f"[analyze] Attach the frame images from: {manifest['frames'][0]['path'].rsplit('/', 1)[0] if manifest['frames'] else 'N/A'}")
    
    # Create placeholder analysis structure
    placeholder = {
        "status": "pending_vision_analysis",
        "manifest": manifest_path,
        "prompt_file": prompt_path,
        "frames_count": len(manifest["frames"]),
        "instructions": "Run vision analysis with the prompt and frames, then update this file"
    }
    
    with open(output_path, "w") as f:
        json.dump(placeholder, f, indent=2)
    
    print(f"[analyze] Placeholder output: {output_path}")

if __name__ == "__main__":
    main()
