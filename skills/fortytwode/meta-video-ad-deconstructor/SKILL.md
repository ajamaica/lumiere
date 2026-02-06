---
name: video-ad-deconstructor
version: 1.0.0
description: Deconstruct video ad creatives into marketing dimensions using Gemini AI. Extracts hooks, social proof, CTAs, target audience, emotional triggers, urgency tactics, and more. Use when analyzing competitor ads, generating creative briefs, or understanding what makes ads effective.
---

# Video Ad Deconstructor

AI-powered deconstruction of video ad creatives into actionable marketing insights.

## What This Skill Does

- **Generate Summaries**: Product, features, audience, CTA extraction
- **Deconstruct Marketing Dimensions**: Hooks, social proof, urgency, emotion, etc.
- **Support Multiple Content Types**: Consumer products and gaming ads
- **Progress Tracking**: Callback support for long analyses
- **JSON Output**: Structured data for downstream processing

## Setup

### 1. Environment Variables

```bash
# Required for Gemini
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

### 2. Dependencies

```bash
pip install vertexai
```

## Usage

### Basic Ad Deconstruction

```python
from scripts.deconstructor import AdDeconstructor
from scripts.models import ExtractedVideoContent
import vertexai
from vertexai.generative_models import GenerativeModel

# Initialize Vertex AI
vertexai.init(project="your-project-id", location="us-central1")
gemini_model = GenerativeModel("gemini-1.5-flash")

# Create deconstructor
deconstructor = AdDeconstructor(gemini_model=gemini_model)

# Create extracted content (from video-ad-analyzer or manually)
content = ExtractedVideoContent(
    video_path="ad.mp4",
    duration=30.0,
    transcript="Tired of messy cables? Meet CableFlow...",
    text_timeline=[{"at": 0.0, "text": ["50% OFF TODAY"]}],
    scene_timeline=[{"timestamp": 0.0, "description": "Person frustrated with tangled cables"}]
)

# Generate summary
summary = deconstructor.generate_summary(
    transcript=content.transcript,
    scenes="0.0s: Person frustrated with tangled cables",
    text_overlays="50% OFF TODAY"
)
print(summary)
```

### Full Deconstruction

```python
# Deconstruct all marketing dimensions
def on_progress(fraction, dimension):
    print(f"Progress: {fraction*100:.0f}% - Analyzed {dimension}")

analysis = deconstructor.deconstruct(
    extracted_content=content,
    summary=summary,
    is_gaming=False,  # Set True for gaming ads
    on_progress=on_progress
)

# Access dimensions
for dimension, data in analysis.dimensions.items():
    print(f"\n{dimension}:")
    print(data)
```

## Output Structure

### Summary Output

```
Product/App: CableFlow Cable Organizer

Key Features:
Magnetic design: Keeps cables organized automatically
Universal fit: Works with all cable types
Premium materials: Durable silicone construction

Target Audience: Tech users frustrated with cable management

Call to Action: Order now and get 50% off
```

### Deconstruction Output

```python
{
    "spoken_hooks": {
        "elements": [
            {
                "hook_text": "Tired of messy cables?",
                "timestamp": "0:00",
                "hook_type": "Problem Question",
                "effectiveness": "High - directly addresses pain point"
            }
        ]
    },
    "social_proof": {
        "elements": [
            {
                "proof_type": "User Count",
                "claim": "Over 1 million happy customers",
                "credibility_score": 7
            }
        ]
    },
    # ... more dimensions
}
```

## Marketing Dimensions Deconstructed

| Dimension            | What It Extracts                    |
| -------------------- | ----------------------------------- |
| `spoken_hooks`       | Opening hooks from transcript       |
| `visual_hooks`       | Attention-grabbing visuals          |
| `text_hooks`         | On-screen text hooks                |
| `social_proof`       | Testimonials, user counts, reviews  |
| `urgency_scarcity`   | Limited time offers, stock warnings |
| `emotional_triggers` | Fear, desire, belonging, etc.       |
| `problem_solution`   | Pain points and solutions           |
| `cta_analysis`       | Call-to-action effectiveness        |
| `target_audience`    | Who the ad targets                  |
| `unique_mechanism`   | What makes product special          |

## Customizing Prompts

Edit prompts in `prompts/marketing_analysis.md` to customize:

- What dimensions to analyze
- Output format
- Scoring criteria
- Gaming vs consumer product focus

## Common Questions This Answers

- "What hooks does this ad use?"
- "What's the emotional appeal?"
- "How does this ad create urgency?"
- "Who is this ad targeting?"
- "What social proof is shown?"
- "Deconstruct this competitor's ad"
