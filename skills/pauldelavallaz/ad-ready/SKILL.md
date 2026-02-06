---
name: ad-ready
description: Generate professional advertising images from product URLs using the Ad-Ready pipeline on ComfyDeploy. Use when the user wants to create ads for any product by providing a URL, optionally with a brand profile (70+ brands) and funnel stage targeting. Supports model/talent integration, brand-aware creative direction, and multi-format output. Differs from Morpheus (manual fashion photography) — Ad-Ready is URL-driven, brand-intelligent, and funnel-stage aware.
---

# Ad-Ready: AI Advertising Image Generator

Generate professional advertising images from product URLs using a 4-phase AI pipeline on ComfyDeploy.

**Source:** [github.com/PauldeLavallaz/ads_SV](https://github.com/PauldeLavallaz/ads_SV)

---

## Pipeline Architecture

The pipeline runs as a ComfyUI custom node deployed on ComfyDeploy. A single `ProductToAds_Manual` node executes 4 phases internally:

```
┌─────────────────────────────────────────────────────────────┐
│                  ProductToAds_Manual Node                     │
│                                                             │
│  PHASE 1: Product Scraping (Gemini Flash)                   │
│  ─────────────────────────────────────────                   │
│  Scrapes product URL → extracts title, description,         │
│  features, price, materials, image URLs                      │
│  Also scrapes HTML for high-res product images (≥1000px)    │
│                                                             │
│  PHASE 2: Campaign Brief Generation (Gemini Flash)          │
│  ────────────────────────────────────────────────            │
│  Brand Identity + Product Data + References →                │
│  10-point Campaign Brief (creative direction)                │
│                                                             │
│  PHASE 3: Blueprint Generation (Gemini Flash)               │
│  ──────────────────────────────────────────────              │
│  Master Prompt (funnel stage) + Brief + Keywords →           │
│  Production-Ready JSON Blueprint                             │
│                                                             │
│  PHASE 4: Image Generation (Nano Banana Pro / Imagen 3)     │
│  ──────────────────────────────────────────────────          │
│  Blueprint + all reference images → final ad image           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Phase 2: Campaign Brief (The Creative Brain)

The Brief Generator is the most critical intermediate step. It acts as a "Senior Art Director" that translates raw data into actionable creative direction using a 10-point framework:

1. **Strategic Objective** — Why this campaign exists (awareness/positioning/launch)
2. **Central Message** — One idea perceivable without text
3. **Visual Tone of Voice** — Register: calm/energetic/intimate/monumental
4. **Product Role** — Hero vs co-protagonist vs implicit presence
5. **Visual Language & Brand Coherence** — Non-negotiable brand codes
6. **Photographer & Equipment** — Photography as concept, not execution
7. **Extended Art Direction** — Styling, casting, poses, hair/makeup, layout
8. **Environment & Context** — Where and why (conceptual, never decorative)
9. **Texture, Material & Product Render** — How surfaces are perceived
10. **Final Image Signature** — Finish, grain, temporal positioning

Without the brief, the Master Prompt must guess creative strategy. With it, the Master Prompt only executes.

The brief prompt template is included at `{baseDir}/configs/Brief_Generator/brief_prompt.json`.

### Phase 3: Master Prompts (8 Funnel Stages)

Each funnel stage has a specialized Master Prompt that generates a production-ready JSON Blueprint. All share the same internal simulation:

- **ROUND -1: Brand Identity Forensics** (stages 03+) — Unified Brand Style Manifest
- **ROUND 0: Fidelity Lock** — Product geometry & talent identity are IMMUTABLE
- **ROUND 1: Stage Strategy** — Strategic approach specific to funnel position
- **ROUND 2: Graphic Design** — UI, typography, CTA engineering

The Blueprint JSON covers: scene production, talent lock, camera perspective, subject action/pose/wardrobe, lighting, product constraints, layout architecture, typography, CTA engineering, and brand asset placement.

Master prompt files are included at `{baseDir}/configs/Product_to_Ads/`.

### Reference Analyzer

When reference images (pose, style, location) are provided, they're analyzed with forensic precision:

- **POSE_REF** → Body position, limbs, weight, gaze, micro-gestures → replicated EXACTLY
- **PHOTO_STYLE_REF** → Camera, lens, lighting, grading, grain → derived parameters
- **LOCATION_REF** → Setting, materials, colors, mood → similar but creatively enhanced

The reference analysis prompt is at `{baseDir}/configs/Reference_Analyzer/reference_analysis_prompt.txt`.

---

## ⚠️ CRITICAL: Required Inputs Checklist

Before running ANY ad generation, ensure ALL of these are provided:

| Input              | Required?      | How to Get It                                                                                 |
| ------------------ | -------------- | --------------------------------------------------------------------------------------------- |
| `--product-url`    | ✅ ALWAYS      | User provides the product page URL                                                            |
| `--product-image`  | ✅ ALWAYS      | Download from the product page, or user provides                                              |
| `--logo`           | ✅ ALWAYS      | Download from brand website or search online. MUST be an image file                           |
| `--reference`      | ✅ RECOMMENDED | An existing ad whose style we want to clone. Search online or use previously generated images |
| `--brand-profile`  | ✅ NEVER EMPTY | Pick from catalog or run brand-analyzer first. NEVER leave as "No Brand" if a brand is known  |
| `--prompt-profile` | ✅ ALWAYS      | Choose based on campaign objective                                                            |
| `--aspect-ratio`   | Default: 4:5   | Change if needed for platform                                                                 |
| `--model`          | ✅ RECOMMENDED | Model/talent face. Ads with talent perform much better                                        |

### 🚨 NEVER Skip These Steps:

1. **Product image** — Download the main product photo from the product URL. The scraper is fragile; always provide a product image explicitly.
2. **Brand logo** — Download the logo from the brand's official website or search for "{brand name} logo" online. Must be a clean logo image (PNG preferred).
3. **Brand profile** — If the brand doesn't exist in the catalog, run `brand-analyzer` skill FIRST to generate one. Never submit with "No Brand" when a brand is known.
4. **Reference image** — Search for an existing ad or visual with a style that matches what we're generating. This dramatically improves output quality.

---

## Auto-Preparation Workflow

When the user asks to generate an ad:

```
1. User provides: product URL + brand name + objective

2. CHECK brand profile exists:
   → ls ~/clawd/ad-ready/configs/Brands/ | grep -i "{brand}"
   → If not found: run brand-analyzer skill first

3. DOWNLOAD product image:
   → Visit the product URL or fetch the page
   → Find and download the main product image
   → Save to /tmp/ad-ready-product.jpg

4. DOWNLOAD brand logo:
   → Search "{brand name} logo PNG" or fetch from brand website
   → Download clean logo image
   → Save to /tmp/ad-ready-logo.png

5. FIND reference image:
   → Search for "{brand name} advertisement" or similar
   → Or use a previously generated ad that has the right style
   → Save to /tmp/ad-ready-reference.jpg

6. SELECT prompt profile based on objective:
   → Awareness: brand discovery, first impressions
   → Interest: engagement, curiosity
   → Consideration: comparison, features
   → Evaluation: deep dive, trust, proof
   → Conversion: purchase intent, CTAs (most common)
   → Retention: post-purchase confidence
   → Loyalty: emotional bond, lifestyle
   → Advocacy: social amplification, community

7. RUN the generation with ALL inputs filled
```

---

## Usage

### Full command (recommended):

```bash
COMFY_DEPLOY_API_KEY="$KEY" uv run {baseDir}/scripts/generate.py \
  --product-url "https://shop.example.com/product" \
  --product-image "/tmp/product-photo.jpg" \
  --logo "/tmp/brand-logo.png" \
  --reference "/tmp/reference-ad.jpg" \
  --model "models-catalog/catalog/images/model_15.jpg" \
  --brand-profile "Nike" \
  --prompt-profile "Master_prompt_05_Conversion" \
  --aspect-ratio "4:5" \
  --output "ad-output.png"
```

### Auto-fetch mode (downloads product image and logo automatically):

```bash
COMFY_DEPLOY_API_KEY="$KEY" uv run {baseDir}/scripts/generate.py \
  --product-url "https://shop.example.com/product" \
  --brand-profile "Nike" \
  --prompt-profile "Master_prompt_05_Conversion" \
  --auto-fetch \
  --output "ad-output.png"
```

### List available brands:

```bash
uv run {baseDir}/scripts/generate.py --list-brands
```

---

## API Details

**Endpoint:** `https://api.comfydeploy.com/api/run/deployment/queue`
**Deployment ID:** `e37318e6-ef21-4aab-bc90-8fb29624cd15`

### ComfyDeploy Input Variables

| Variable         | Type      | Description                                              |
| ---------------- | --------- | -------------------------------------------------------- |
| `product_url`    | string    | Product page URL to scrape                               |
| `producto`       | image URL | Product image (uploaded to ComfyDeploy)                  |
| `model`          | image URL | Model/talent face reference                              |
| `referencia`     | image URL | Style reference ad image (used for both pose + location) |
| `marca`          | image URL | Brand logo image                                         |
| `brand_profile`  | enum      | Brand name from catalog (70+ brands)                     |
| `prompt_profile` | enum      | Funnel stage master prompt                               |
| `aspect_ratio`   | enum      | Output format (1:1, 4:5, 5:4, 9:16, etc.)                |

---

## Funnel Stages — Strategic Detail

### 01 — Awareness

**Goal:** Scroll-stop, curiosity, brand introduction
**Reject:** Generic "product on table" concepts
**Strategy:** Dynamic camera angles, world-building environments, high-concept creativity
**CTA:** Soft or optional
**Visual Hierarchy:** Talent → Product → Optional CTA

### 02 — Interest

**Goal:** Sustained attention, introduce value proposition
**Reject:** Abstract visuals that hide the product
**Strategy:** One clear visual idea, believable micro-world hinting at use-case
**CTA:** Learn More, Discover, See Details
**Visual Hierarchy:** Talent → Product → Headline → CTA

### 03 — Consideration

**Goal:** Informed evaluation, reduce uncertainty
**Reject:** Pure mood storytelling, vague emotional content
**Strategy:** Communicate WHAT product does, ONE primary differentiator, ONE proof cue
**CTA:** Compare, See Details, Explore
**Visual Hierarchy:** Talent → Product → Key Benefit → Proof Cue → CTA
**New:** Adds Brand Identity Manifest to Blueprint JSON

### 04 — Evaluation

**Goal:** Validate purchase decision, proof & trust
**Reject:** Pure mood, unsupportable claims, visual clutter
**Strategy:** One trust anchor (quality/legitimacy/authority), one proof cue (reviews/certification)
**CTA:** See Reviews, Verified Quality, Learn More
**Visual Hierarchy:** Trust Anchor → Proof Cue → Product → Talent → CTA

### 05 — Conversion

**Goal:** Trigger decisive action, remove friction
**Reject:** New hesitation-inducing info, complex compositions
**Strategy:** One hero (product), one action, optional micro-reassurance
**CTA:** Buy Now, Get Yours, Complete Order (PRIMARY visual element)
**Visual Hierarchy:** Product → CTA → Optional Reassurance → Brand → Talent

### 06 — Retention

**Goal:** Post-purchase confidence, reduce churn
**Reject:** Hard-sell, urgency, price talk
**Strategy:** "You made the right choice" + "Here is the next step"
**CTA:** Start, Set Up, Learn, Track (guidance, not purchase)
**Visual Hierarchy:** Confirmation → Next Step → Product → Talent

### 07 — Loyalty

**Goal:** Strengthen emotional bond over time
**Reject:** Sales layouts, instructional tone, aggressive CTAs
**Strategy:** "This brand is part of who you are" — habitual engagement
**CTA:** Optional: Explore, Be Part Of, Continue
**Visual Hierarchy:** Brand World/Mood → Talent (identity mirror) → Product → Brand

### 08 — Advocacy

**Goal:** Turn customers into voluntary brand ambassadors
**Reject:** Sales language, instructional tone, forced testimonials
**Strategy:** Signal belonging, create share-worthy imagery, enable organic sharing
**CTA:** Optional or absent: Join the Movement, Part of Us
**Visual Hierarchy:** Mood → Talent (identity proxy) → Product (symbol) → Brand

---

## Creating New Ad Types

To create a new funnel stage or specialized ad type:

1. **Copy** the closest existing Master Prompt from `{baseDir}/configs/Product_to_Ads/`
2. **Redefine ROUND 1** with the new strategic objective
3. **Adjust ROUND 2** UI hierarchy accordingly
4. **Shift** talent/product narrative roles
5. **Modify** CTA philosophy and copy voice
6. **Keep** the JSON output structure identical for pipeline compatibility
7. **Maintain** the Fidelity Lock (ROUND 0) — product and talent are always immutable
8. **Save** as `Master_prompt_XX_NewStage.json` — the node auto-discovers new profiles

### Key Evolution Pattern Across Stages:

| Aspect         | Early (01-02)    | Mid (03-05)            | Late (06-08)        |
| -------------- | ---------------- | ---------------------- | ------------------- |
| Talent role    | Attention anchor | Credibility anchor     | Identity mirror     |
| Product role   | Secondary hero   | Evaluation hero        | Familiar symbol     |
| CTA            | Soft/exploratory | Proof-led → Decisive   | Guidance → Optional |
| Copy voice     | Intriguing       | Clarity, proof, action | Supportive → Proud  |
| Visual density | High-concept     | Structured, scannable  | Editorial, spacious |
| Environment    | World-building   | Context-rich           | Lifestyle, intimate |

---

## Image Input Types

### Binding Images (strict fidelity — immutable)

- **talent**: Face/body locked, no deviation in facial structure, ethnicity, proportions
- **product_1-4**: Shape, label text, material, proportions preserved 1:1
- **brand_logo**: UI/button style derived from logo geometry

### Soft References (creative guidance)

- **pose_ref**: Body position replicated EXACTLY (spine, limbs, weight, gaze, micro-gestures)
- **photo_style_ref**: Camera/lighting/grading/grain derived (can be too literal)
- **location_ref**: Environment inspired but creatively enhanced

In the live deployment, the **same reference image** feeds both `pose_ref` and `location_ref`.

---

## Brand Profiles

### Catalog (70+ brands):

```bash
ls ~/clawd/ad-ready/configs/Brands/*.json | sed 's/.*\///' | sed 's/\.json//'
```

### Creating new brand profiles:

Use the `brand-analyzer` skill:

```bash
GEMINI_API_KEY="$KEY" uv run ~/.clawdbot/skills/brand-analyzer/scripts/analyze.py \
  --brand "Brand Name" --auto-save
```

The Brand Analyzer uses a 3-phase methodology:

1. **Phase 1:** Official research via Google Search (canonical data: name, founding, positioning, vision, mission, tagline)
2. **Phase 1.1:** Independent campaign research (10+ distinct campaigns via Google Images/Pinterest)
3. **Phase 2-3:** Visual analysis → JSON profile following the standard template

Output covers: brand_info, brand_values, target_audience, tone_of_voice, visual_identity, photography, campaign_guidelines, brand_behavior, channel_expression, compliance.

---

## Aspect Ratios

| Ratio  | Use Case                              |
| ------ | ------------------------------------- |
| `4:5`  | **Default.** Instagram feed, Facebook |
| `9:16` | Stories, Reels, TikTok                |
| `1:1`  | Square posts                          |
| `16:9` | YouTube, landscape banners            |
| `5:4`  | Alternative landscape                 |
| `2:3`  | Pinterest                             |
| `3:4`  | Portrait                              |

---

## Config Files Reference

The skill includes reference copies of all pipeline configuration files:

```
{baseDir}/configs/
├── Brief_Generator/
│   └── brief_prompt.json              # 10-point campaign brief framework
├── Product_to_Ads/
│   ├── Master_prompt_01_Awareness.json
│   ├── Master_prompt_02_Interest.json
│   ├── Master_prompt_03_Consideration.json
│   ├── Master_prompt_04_Evaluation.json
│   ├── Master_prompt_05_Conversion.json
│   ├── Master_prompt_06_Retention.json
│   ├── Master_prompt_07_Loyalty.json
│   └── Master_prompt_08_Advocacy.json
└── Reference_Analyzer/
    └── reference_analysis_prompt.txt   # Pose/style/location analysis prompt
```

These configs are the canonical reference for the pipeline's behavior. The actual live configs are stored in the ComfyUI deployment at `ads_SV/configs/`.

---

## Known Limitations

1. **Product image scraping is fragile** — always provide product images manually
2. **photo_style_ref can be too literal** — style reference may be replicated too closely
3. **Some websites block scraping** — provide product data manually when scraping fails
4. **Single reference = pose + location** — live deployment uses one image for both
5. **Gemini hallucinations** — occasional issues in complex reasoning steps
6. **No brief editing** — brief is generated automatically; manual override not yet supported

---

## Ad-Ready vs Morpheus

| Feature            | Ad-Ready                             | Morpheus                                |
| ------------------ | ------------------------------------ | --------------------------------------- |
| Input              | Product URL (auto-scrapes)           | Manual product image                    |
| Brand intelligence | 70+ brand profiles                   | None                                    |
| Funnel targeting   | 8 funnel stages                      | None                                    |
| Brief generation   | Auto (10-point creative direction)   | None                                    |
| Creative direction | Objective-driven (brief → blueprint) | Pack-based (camera, lens, lighting)     |
| Best for           | Product advertising campaigns        | Fashion/lifestyle editorial photography |
| Control level      | High-level (strategy-first)          | Granular (every visual parameter)       |

---

## API Key

Uses ComfyDeploy API key. Set via `COMFY_DEPLOY_API_KEY` environment variable.

## Source Repository

- GitHub: [PauldeLavallaz/ads_SV](https://github.com/PauldeLavallaz/ads_SV)
- Architecture: ComfyUI custom node package with 3 nodes:
  - `ProductToAds_Manual` — Full manual control, single format
  - `ProductToAds_Auto` — Auto-downloads images, generates 4 formats
  - `BrandIdentityAnalyzer` — Analyzes brands via Gemini + Google Search
