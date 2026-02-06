---
name: image2prompt
description: Analyze images and generate detailed prompts for image generation. Supports portrait, landscape, product, animal, illustration categories with structured or natural output.
homepage: https://docs.openclaw.ai/tools/image2prompt
user-invocable: true
metadata: {"openclaw":{"emoji":"🖼️","primaryEnv":"OPENAI_API_KEY","requires":{"anyBins":["openclaw"]}}}
---

# Image to Prompt

Analyze images and generate detailed, reproduction-quality prompts for AI image generation.

## Workflow

**Step 1: Category Detection**
First, classify the image into one of these categories:
- `portrait` — People as main subject (photos, artwork, digital art)
- `landscape` — Natural scenery, cityscapes, architecture, outdoor environments
- `product` — Commercial product photos, merchandise
- `animal` — Animals as main subject
- `illustration` — Diagrams, infographics, UI mockups, technical drawings
- `other` — Images that don't fit above categories

**Step 2: Category-Specific Analysis**
Generate a detailed prompt based on the detected category.

## Usage

### Basic Analysis

```bash
# Analyze an image (auto-detect category)
openclaw message send --image /path/to/image.jpg "Analyze this image and generate a detailed prompt for reproduction"
```

### Specify Output Format

**Natural Language (default):**
```
Analyze this image and write a detailed, flowing prompt description (600-1000 words for portraits, 400-600 for others).
```

**Structured JSON:**
```
Analyze this image and output a structured JSON description with all visual elements categorized.
```

### With Dimensions Extraction

Request dimension highlights to get tagged phrases for each visual aspect:
```
Analyze this image with dimension extraction. Tag phrases for: backgrounds, objects, characters, styles, actions, colors, moods, lighting, compositions, themes.
```

## Category-Specific Elements

### Portrait Analysis Covers:
- **Model/Style**: Photography type, quality level, visual style
- **Subject**: Gender, age, ethnicity, skin tone, body type
- **Facial Features**: Eyes, lips, face shape, expression
- **Hair**: Color, length, style, part
- **Pose**: Body position, orientation, leg/hand positions, gaze
- **Clothing**: Type, color, pattern, fit, material, style
- **Accessories**: Jewelry, bags, hats, etc.
- **Environment**: Location, ground, background, atmosphere
- **Lighting**: Type, time of day, shadows, contrast, color temperature
- **Camera**: Angle, height, shot type, lens, depth of field, perspective
- **Technical**: Realism, post-processing, resolution

### Landscape Analysis Covers:
- Terrain and water features
- Sky and atmospheric elements
- Foreground/background composition
- Natural lighting and atmosphere
- Color palette and photography style

### Product Analysis Covers:
- Product features and materials
- Design elements and shape
- Staging and background
- Studio lighting setup
- Commercial photography style

### Animal Analysis Covers:
- Species identification and markings
- Pose and behavior
- Expression and character
- Habitat and setting
- Wildlife/pet photography style

### Illustration Analysis Covers:
- Diagram type (flowchart, infographic, UI, etc.)
- Visual elements (icons, shapes, connectors)
- Layout and hierarchy
- Design style (flat, isometric, etc.)
- Color scheme and meaning

## Output Examples

### Natural Language Output (Portrait)
```json
{
  "prompt": "A stunning photorealistic portrait of a young woman in her mid-20s with fair porcelain skin and warm pink undertones. She has striking emerald green almond-shaped eyes with long dark lashes, full rose-colored lips curved in a subtle confident smile, and an oval face with high cheekbones..."
}
```

### Structured Output (Portrait)
```json
{
  "structured": {
    "model": "photorealistic",
    "quality": "ultra high",
    "style": "cinematic natural light photography",
    "subject": {
      "identity": "young beautiful woman",
      "gender": "female",
      "age": "mid 20s",
      "ethnicity": "European",
      "skin_tone": "fair porcelain with pink undertones",
      "body_type": "slim athletic",
      "facial_features": {
        "eyes": "emerald green, almond-shaped, intense gaze",
        "lips": "full, rose pink, subtle smile",
        "face_shape": "oval with high cheekbones",
        "expression": "confident and serene"
      },
      "hair": {
        "color": "warm honey blonde",
        "length": "long",
        "style": "soft waves",
        "part": "center"
      }
    },
    "pose": {
      "position": "standing",
      "body_orientation": "three-quarter turn to camera",
      "legs": "weight on right leg, relaxed stance",
      "hands": {
        "right_hand": "resting on hip",
        "left_hand": "hanging naturally at side"
      },
      "gaze": "direct eye contact with camera"
    },
    "clothing": {
      "type": "flowing maxi dress",
      "color": "dusty rose",
      "pattern": "solid",
      "details": "V-neckline, cinched waist, silk material",
      "style": "romantic feminine"
    },
    "accessories": ["delicate gold necklace", "small hoop earrings"],
    "environment": {
      "location": "outdoor garden",
      "ground": "cobblestone path",
      "background": "blooming roses, soft bokeh",
      "atmosphere": "dreamy and romantic"
    },
    "lighting": {
      "type": "natural sunlight",
      "time": "golden hour",
      "shadow_quality": "soft diffused shadows",
      "contrast": "medium",
      "color_temperature": "warm"
    },
    "camera": {
      "angle": "slightly below eye level",
      "camera_height": "chest height",
      "shot_type": "medium shot",
      "lens": "85mm",
      "depth_of_field": "shallow",
      "perspective": "slight compression, flattering"
    },
    "mood": "romantic, confident, ethereal",
    "realism": "highly photorealistic",
    "post_processing": "soft color grading, subtle glow",
    "resolution": "8k"
  }
}
```

### With Dimensions
```json
{
  "prompt": "...",
  "dimensions": {
    "backgrounds": ["outdoor garden", "blooming roses", "soft bokeh"],
    "objects": ["delicate gold necklace", "small hoop earrings"],
    "characters": ["young beautiful woman", "mid 20s", "European"],
    "styles": ["photorealistic", "cinematic natural light photography"],
    "actions": ["standing", "three-quarter turn", "direct eye contact"],
    "colors": ["dusty rose", "honey blonde", "emerald green"],
    "moods": ["romantic", "confident", "ethereal", "dreamy"],
    "lighting": ["golden hour", "natural sunlight", "soft diffused shadows"],
    "compositions": ["medium shot", "85mm", "shallow depth of field"],
    "themes": ["romantic feminine", "portrait photography"]
  }
}
```

## Tips for Best Results

1. **High-resolution images** produce more detailed prompts
2. **Clear, well-lit images** yield better category detection
3. **Request structured output** when you need programmatic access to individual elements
4. **Use dimensions extraction** when building prompt databases or training data
5. **Specify word count expectations** for natural language output if needed

## Integration

This skill works with any vision-capable model. For best results, use:
- GPT-4 Vision
- Claude 3 (Opus/Sonnet)
- Gemini Pro Vision
