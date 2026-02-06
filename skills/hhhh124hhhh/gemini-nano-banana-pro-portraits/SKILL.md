---
name: gemini-nano-banana-pro-portraits
description: Generate ultra-photorealistic portraits using Gemini Nano Banana Pro with comprehensive JSON configuration templates. Use when creating cinematic quality portraits, fitness photography, or realistic character images. Includes complete JSON structure for prompt configuration, subject details, apparel, pose, environment, lighting, and technical specifications.
---

# Gemini Nano Banana Pro Portraits

## Overview

This skill provides complete JSON configuration templates for generating ultra-photorealistic portraits using Gemini Nano Banana Pro. It enables precise control over every aspect of image generation, from subject demographics to technical rendering specifications.

## JSON Configuration Structure

### Complete Template

```json
{
  "prompt_configuration": {
    "type": "Ultra Photorealistic Portrait",
    "style": "Cinematic Reality",
    "resolution": "8K"
  },
  "subject": {
    "demographics": "[Name, build type, complexion]",
    "hair": "[Hair color, style, texture details]",
    "skin_texture": "[Skin details, effects, realism]",
    "facial_expression": "[Expression details, mood, emotion]"
  },
  "apparel": {
    "outfit_style": "[Overall style]",
    "top": "[Top description]",
    "bottoms": "[Bottoms description]",
    "accessories": "[Accessories list]"
  },
  "pose_and_action": {
    "perspective": "[Camera angle/view]",
    "action": "[What the subject is doing]",
    "reflection": "[Any reflections in scene]"
  },
  "environment": {
    "location": "[Where it takes place]",
    "background_elements": "[Background details]",
    "flooring": "[Flooring description]"
  },
  "lighting_and_atmosphere": {
    "lighting_type": "[Lighting source]",
    "quality": "[Lighting characteristics]",
    "mood": "[Overall mood/atmosphere]"
  },
  "technical_specifications": {
    "camera": "[Camera type]",
    "aperture": "[f-stop]",
    "focus": "[Focus details]",
    "render_details": "[Rendering engine and techniques]"
  }
}
```

## Section Breakdown

### 1. Prompt Configuration

Controls the overall type and style of the portrait.

**Fields:**

- `type`: Portrait type (e.g., "Ultra Photorealistic Portrait", "Cinematic Headshot", "Editorial Portrait")
- `style`: Visual style (e.g., "Cinematic Reality", "High Fashion", "Editorial Photography")
- `resolution`: Image resolution (e.g., "8K", "4K", "2K")

**Examples:**

```json
{
  "type": "Ultra Photorealistic Portrait",
  "style": "Cinematic Reality",
  "resolution": "8K"
}
```

### 2. Subject Details

Define the person being portrayed with precise physical characteristics.

**Fields:**

- `demographics`: Identity, build, complexion
- `hair`: Color, style, texture, arrangement
- `skin_texture`: Realistic skin details, effects, conditions
- `facial_expression`: Expression, emotion, mood

**Examples:**

```json
{
  "demographics": "Sydney Sweeney, athletic build, fit physique, pale complexion",
  "hair": "Dark brown to black hair, pulled back into a messy high ponytail, loose sweaty strands framing the face",
  "skin_texture": "Hyper-realistic skin details, intense post-workout sheen, glistening with heavy sweat, visible pores, slight flush on cheeks",
  "facial_expression": "Exhaling slightly, mouth slightly open in a 'phew' expression, focused gaze, tired but accomplished"
}
```

**Subject Demographics Tips:**

- Use specific names or descriptions: "Zendaya", "athletic build", "slim and elegant"
- Include physique: "muscular build", "lean frame", "athletic physique"
- Note complexion: "pale", "olive skin", "warm undertones", "cool undertones"

### 3. Apparel

Define clothing and accessories in detail.

**Fields:**

- `outfit_style`: Overall fashion direction
- `top`: Upper body clothing
- `bottoms`: Lower body clothing
- `accessories`: Jewelry, props, other items

**Examples:**

```json
{
  "outfit_style": "Monochromatic pastel pink gym set, athleisure",
  "top": "Tight cropped pink camisole/tank top with spaghetti straps, rolled up slightly",
  "bottoms": "Loose-fitting pink sweatpants with visible drawstring and elastic waistband, soft cotton texture",
  "accessories": "Thin silver necklace"
}
```

**Apparel Tips:**

- Include fit: "tight", "loose-fitting", "tailored", "oversized"
- Mention fabrics: "cotton", "silk", "denim", "athletic material"
- Describe textures: "soft", "crisp", "glossy", "matte"

### 4. Pose and Action

Describe what the subject is doing and camera perspective.

**Fields:**

- `perspective`: Camera angle and viewpoint
- `action`: The activity or pose
- `reflection`: Any reflections visible in the scene

**Examples:**

```json
{
  "perspective": "Three-quarter side profile view facing left",
  "action": "Body checking in a gym mirror, left hand pressing against the mirror surface, right hand lifting the hem of shirt to reveal defined abdominal muscles (six-pack)",
  "reflection": "Partial reflection of the arm visible in the mirror on the left edge"
}
```

**Pose Tips:**

- Use specific angles: "Three-quarter", "profile view", "front-facing", "low angle"
- Be precise with actions: "checking reflection", "stretching", "looking at camera"
- Include subtle details: hand positions, body angles, orientation

### 5. Environment

Define the setting and background elements.

**Fields:**

- `location`: Where the scene takes place
- `background_elements`: Objects and people in the background
- `flooring`: Ground/surface description

**Examples:**

```json
{
  "location": "Commercial gym interior",
  "background_elements": "Blurred gym equipment, weight racks, cable machines, dumbbells, other gym-goers faintly visible in the distance",
  "flooring": "Black speckled rubber gym flooring"
}
```

**Environment Tips:**

- Be specific about location type: "commercial gym", "home studio", "outdoor setting"
- Include background depth: "faintly visible", "blurred", "in the distance"
- Describe surfaces: materials, patterns, textures

### 6. Lighting and Atmosphere

Control the mood and lighting quality.

**Fields:**

- `lighting_type`: Light source type
- `quality`: Lighting characteristics and effects
- `mood`: Overall atmosphere and emotional tone

**Examples:**

```json
{
  "lighting_type": "Overhead artificial gym lighting",
  "quality": "Warm tungsten tones, creating strong specular highlights on the sweaty skin and hair",
  "mood": "Intense, raw, fitness-focused, candid moment"
}
```

**Lighting Tips:**

- Specify light source: "overhead artificial", "natural daylight", "studio strobes", "neon"
- Describe quality: "warm tones", "cool tones", "specular highlights", "soft diffusion"
- Set mood: "intense", "relaxed", "energetic", "candid", "posed"

### 7. Technical Specifications

Define camera and rendering details for photorealistic quality.

**Fields:**

- `camera`: Camera type and lens
- `aperture`: f-stop number (controls depth of field)
- `focus`: What's in focus and depth of field
- `render_details`: Rendering engine and techniques

**Examples:**

```json
{
  "camera": "DSLR, 85mm portrait lens",
  "aperture": "f/2.8",
  "focus": "Sharp focus on subject's face and abs, creamy bokeh background",
  "render_details": "Unreal Engine 5, Octane Render, ray tracing, subsurface scattering on skin, volumetric lighting"
}
```

**Technical Tips:**

- Use realistic camera specs: "DSLR", "mirrorless", "85mm portrait lens", "50mm prime"
- Aperture affects blur: f/1.2-2.8 = creamy bokeh, f/5.6-11 = more depth
- Include rendering techniques: "ray tracing", "subsurface scattering", "volumetric lighting"

## Complete Examples

### Example 1: Fitness Portrait

Based on successful Twitter example by @lexx_aura (877 likes, 56 retweets, 544 bookmarks)

```json
{
  "prompt_configuration": {
    "type": "Ultra Photorealistic Portrait",
    "style": "Cinematic Reality",
    "resolution": "8K"
  },
  "subject": {
    "demographics": "Sydney Sweeney, athletic build, fit physique, pale complexion",
    "hair": "Dark brown to black hair, pulled back into a messy high ponytail, loose sweaty strands framing face",
    "skin_texture": "Hyper-realistic skin details, intense post-workout sheen, glistening with heavy sweat, visible pores, slight flush on cheeks",
    "facial_expression": "Exhaling slightly, mouth slightly open in a 'phew' expression, focused gaze, tired but accomplished"
  },
  "apparel": {
    "outfit_style": "Monochromatic pastel pink gym set, athleisure",
    "top": "Tight cropped pink camisole/tank top with spaghetti straps, rolled up slightly",
    "bottoms": "Loose-fitting pink sweatpants with visible drawstring and elastic waistband, soft cotton texture",
    "accessories": "Thin silver necklace"
  },
  "pose_and_action": {
    "perspective": "Three-quarter side profile view facing left",
    "action": "Body checking in a gym mirror, left hand pressing against the mirror surface, right hand lifting the hem of shirt to reveal defined abdominal muscles (six-pack)",
    "reflection": "Partial reflection of the arm visible in the mirror on the left edge"
  },
  "environment": {
    "location": "Commercial gym interior",
    "background_elements": "Blurred gym equipment, weight racks, cable machines, dumbbells, other gym-goers faintly visible in the distance",
    "flooring": "Black speckled rubber gym flooring"
  },
  "lighting_and_atmosphere": {
    "lighting_type": "Overhead artificial gym lighting",
    "quality": "Warm tungsten tones, creating strong specular highlights on the sweaty skin and hair",
    "mood": "Intense, raw, fitness-focused, candid moment"
  },
  "technical_specifications": {
    "camera": "DSLR, 85mm portrait lens",
    "aperture": "f/2.8",
    "focus": "Sharp focus on subject's face and abs, creamy bokeh background",
    "render_details": "Unreal Engine 5, Octane Render, ray tracing, subsurface scattering on skin, volumetric lighting"
  }
}
```

### Example 2: Studio Fashion Portrait

```json
{
  "prompt_configuration": {
    "type": "Editorial Portrait",
    "style": "High Fashion",
    "resolution": "8K"
  },
  "subject": {
    "demographics": "Fashion model, tall and slender, elegant pose",
    "hair": "Straight blonde hair, sleek center part, shoulder-length",
    "skin_texture": "Flawless porcelain skin, subtle sheen, minimal pores visible",
    "facial_expression": "Confident gaze directly at camera, slight smile, fierce expression"
  },
  "apparel": {
    "outfit_style": "Minimalist luxury fashion",
    "top": "Crisp white silk blouse, slightly unbuttoned at collar",
    "bottoms": "Black tailored high-waisted trousers, perfect fit",
    "accessories": "Gold hoop earrings, minimalist gold ring"
  },
  "pose_and_action": {
    "perspective": "Direct front-facing portrait, eye-level",
    "action": "Standing confidently, one hand on hip, other resting on thigh",
    "reflection": "None"
  },
  "environment": {
    "location": "Professional photography studio",
    "background_elements": "Solid light gray backdrop, subtle studio lighting equipment visible in edges",
    "flooring": "Glossy studio floor, subtle reflection"
  },
  "lighting_and_atmosphere": {
    "lighting_type": "Studio three-point lighting with beauty dish",
    "quality": "Soft, even lighting, subtle rim light on hair and shoulders, clean shadows",
    "mood": "Professional, elegant, fashion-forward"
  },
  "technical_specifications": {
    "camera": "Medium format camera, 100mm macro lens",
    "aperture": "f/4.0",
    "focus": "Pin-sharp focus on eyes, slight fall-off toward ears",
    "render_details": "8K resolution, subsurface scattering, HDRI lighting, global illumination"
  }
}
```

### Example 3: Outdoor Natural Light Portrait

```json
{
  "prompt_configuration": {
    "type": "Cinematic Portrait",
    "style": "Natural Light Photography",
    "resolution": "8K"
  },
  "subject": {
    "demographics": "Young professional, early 20s, casual but put-together",
    "hair": "Wavy dark brown hair, windblown texture, loose ponytail",
    "skin_texture": "Natural skin texture, slight sun-kissed glow, visible fine details",
    "facial_expression": "Warm genuine smile, eyes bright, relaxed demeanor"
  },
  "apparel": {
    "outfit_style": "Casual chic",
    "top": "White linen button-down, sleeves rolled up, slightly unbuttoned",
    "bottoms": "Light wash denim jeans, tailored fit, slight distressing",
    "accessories": "Simple leather watch, silver chain bracelet"
  },
  "pose_and_action": {
    "perspective": "Slightly low angle, capturing subject against sky",
    "action": "Walking away from camera, turning back to look over shoulder with smile",
    "reflection": "Sunlight reflecting off sunglasses in hand"
  },
  "environment": {
    "location": "Urban rooftop at golden hour",
    "background_elements": "City skyline silhouette, scattered clouds, distant buildings",
    "flooring": "Rooftop terrace with subtle texture"
  },
  "lighting_and_atmosphere": {
    "lighting_type": "Golden hour natural sunlight, backlight creating halo effect",
    "quality": "Warm golden tones, soft shadows, lens flare, rim lighting on hair",
    "mood": "Hopeful, cinematic, aspirational"
  },
  "technical_specifications": {
    "camera": "Full-frame DSLR, 50mm prime lens",
    "aperture": "f/1.8",
    "focus": "Focus on face, bokeh background",
    "render_details": "Photorealistic rendering, lens flare simulation, natural light physics"
  }
}
```

## Best Practices

### 1. Be Specific and Detailed

- Use precise descriptions: "messy high ponytail" not "updo"
- Include textures: "sweaty", "glistening", "glossy", "matte"
- Mention visible details: "visible pores", "slight flush", "subtle creases"

### 2. Match Lighting to Mood

- Fitness scenes: Harsher, more dramatic lighting
- Fashion: Controlled, studio lighting
- Casual: Natural, soft lighting

### 3. Control Depth of Field

- f/1.2-2.8: Creamy bokeh, dreamy backgrounds
- f/4.0-5.6: Moderate depth, some background detail
- f/8.0-11: Sharp throughout, environmental portraits

### 4. Include Environmental Context

- Ground subjects in specific locations
- Add realistic background elements
- Describe flooring and surfaces

### 5. Use Technical Terminology

- "DSLR", "mirrorless", "85mm portrait lens"
- "ray tracing", "subsurface scattering", "volumetric lighting"
- "Unreal Engine 5", "Octane Render", "HDRI lighting"

## Common Styles

### Fitness Photography

- Subject: Athletic, sweaty, post-workout
- Apparel: Gym wear, athletic gear
- Environment: Gym, outdoor training
- Lighting: Dramatic, highlight on muscles
- Mood: Intense, raw, powerful

### Editorial Fashion

- Subject: Model, confident, stylish
- Apparel: Designer pieces, styled outfits
- Environment: Studio, urban settings
- Lighting: Controlled, clean, editorial
- Mood: Sophisticated, fashion-forward

### Natural Light Portraits

- Subject: Relaxed, authentic, genuine
- Apparel: Casual, comfortable, everyday
- Environment: Outdoor, natural settings
- Lighting: Sunlight, golden hour, soft
- Mood: Warm, accessible, aspirational

## Testing Your Configurations

Before generating, verify:

1. **JSON is valid**: Check for missing commas, brackets
2. **All sections filled**: Don't leave required fields empty
3. **Consistent details**: Lighting should match mood, apparel matches setting
4. **Realistic specifications**: Camera settings should be plausible
5. **Complete narrative**: The config should tell a coherent story

## Resources

This skill bundles the following resources:

### references/

- None currently (all examples and templates are included in SKILL.md)

### scripts/

- None currently (this is a knowledge-based skill for prompt configuration)

### assets/

- None currently (this is a knowledge-based skill)
