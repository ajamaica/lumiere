---
name: ad-ready
description: Generate professional advertising images from product URLs using the Ad-Ready pipeline on ComfyDeploy. Use when the user wants to create ads for any product by providing a URL, optionally with a brand profile (70+ brands) and funnel stage targeting. Supports model/talent integration, brand-aware creative direction, and multi-format output. Differs from Morpheus (manual fashion photography) — Ad-Ready is URL-driven, brand-intelligent, and funnel-stage aware.
---

# Ad-Ready: AI Advertising Image Generator

Generate professional advertising images from product URLs using a 4-phase AI pipeline on ComfyDeploy.

## ⚠️ CRITICAL: Required Inputs Checklist

Before running ANY ad generation, the agent MUST ensure ALL of these are provided:

| Input              | Required?      | How to Get It                                                                                 |
| ------------------ | -------------- | --------------------------------------------------------------------------------------------- |
| `--product-url`    | ✅ ALWAYS      | User provides the product page URL                                                            |
| `--product-image`  | ✅ ALWAYS      | Download from the product page, or user provides                                              |
| `--logo`           | ✅ ALWAYS      | Download from brand website or search online. MUST be an image file                           |
| `--reference`      | ✅ RECOMMENDED | An existing ad whose style we want to clone. Search online or use previously generated images |
| `--brand-profile`  | ✅ NEVER EMPTY | Pick from catalog or run brand-analyzer first. NEVER leave as "No Brand" if a brand is known  |
| `--prompt-profile` | ✅ ALWAYS      | Choose based on campaign objective                                                            |
| `--aspect-ratio`   | Default: 4:5   | Change if needed for platform                                                                 |
| `--model`          | Optional       | Model/talent face from catalog or user-provided                                               |

### 🚨 NEVER Skip These Steps:

1. **Product image** — Download the main product photo from the product URL. The scraper is fragile; always provide a product image explicitly.
2. **Brand logo** — Download the logo from the brand's official website or search for "{brand name} logo" online. Must be a clean logo image (PNG preferred).
3. **Brand profile** — If the brand doesn't exist in the catalog, run `brand-analyzer` skill FIRST to generate one. Never submit with "No Brand" when a brand is known.
4. **Reference image** — Search for an existing ad or visual with a style that matches what we're generating. Can be from previously generated images, the brand's campaigns, or found online. This dramatically improves output quality.

## Auto-Preparation Workflow

When the user asks to generate an ad, follow this workflow:

```
1. User provides: product URL + brand name + objective

2. CHECK brand profile exists:
   → ls ~/clawd/ad-ready/configs/Brands/ | grep -i "{brand}"
   → If not found: run brand-analyzer skill first

3. DOWNLOAD product image:
   → Visit the product URL in browser or fetch the page
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
   → Evaluation: deep dive, decision support
   → Conversion: purchase intent, CTAs (most common)
   → Retention: re-engagement
   → Loyalty: brand advocates
   → Advocacy: referral, community

7. RUN the generation with ALL inputs filled
```

## Usage

### Full command (recommended):

```bash
COMFY_DEPLOY_API_KEY="$KEY" uv run ~/.clawdbot/skills/ad-ready/scripts/generate.py \
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
COMFY_DEPLOY_API_KEY="$KEY" uv run ~/.clawdbot/skills/ad-ready/scripts/generate.py \
  --product-url "https://shop.example.com/product" \
  --brand-profile "Nike" \
  --prompt-profile "Master_prompt_05_Conversion" \
  --auto-fetch \
  --output "ad-output.png"
```

The `--auto-fetch` flag will:

- Download the main product image from the product URL
- Search and download the brand logo
- Both get uploaded to ComfyDeploy automatically

## API Details

**Endpoint:** `https://api.comfydeploy.com/api/run/deployment/queue`
**Deployment ID:** `e37318e6-ef21-4aab-bc90-8fb29624cd15`

## ComfyDeploy Input Variables

These are the exact variable names the ComfyDeploy deployment expects:

| Variable         | Type      | Description                             |
| ---------------- | --------- | --------------------------------------- |
| `product_url`    | string    | Product page URL to scrape              |
| `producto`       | image URL | Product image (uploaded to ComfyDeploy) |
| `model`          | image URL | Model/talent face reference             |
| `referencia`     | image URL | Style reference ad image                |
| `marca`          | image URL | Brand logo image                        |
| `brand_profile`  | enum      | Brand name from catalog                 |
| `prompt_profile` | enum      | Funnel stage prompt                     |
| `aspect_ratio`   | enum      | Output format                           |

## 4-Phase Pipeline (How It Works Internally)

### Phase 1: Product Scraping

- Gemini Flash visits the product URL
- Extracts: title, description, features, price, images
- ⚠️ Image scraping is the most fragile part — always provide product images manually

### Phase 2: Campaign Brief Generation (CRITICAL)

- Uses Brand Identity JSON + Product Data → 10-point brief
- **Everything downstream depends on brief quality**
- Brief covers: strategic objective, central message, visual tone, product role, photographer, art direction, environment, textures, signature

### Phase 3: Blueprint Generation

- Master Prompt (per funnel stage) + Brief + Product JSON + Keyword Bank + Format
- Gemini Flash generates complete Blueprint JSON
- Covers: scene, production, graphic design, lighting, composition, materials, CTA

### Phase 4: Image Generation

- Nano Banana Pro (Imagen 3.0) generates the final image
- Uses Blueprint JSON + all reference images (product, talent, logo, style ref)

### Supporting Reference Nodes

- `pose_ref` → enforce a specific pose (replicated exactly)
- `photo_style_ref` → replicate photographic style (⚠️ can be too literal, being optimized)
- `location_ref` → replicate location and color palette

## Brand Profiles

### Existing catalog (70+ brands):

```bash
ls ~/clawd/ad-ready/configs/Brands/*.json | sed 's/.*\///' | sed 's/\.json//'
```

### Creating new brand profiles:

Use the `brand-analyzer` skill:

```bash
GEMINI_API_KEY="$KEY" uv run ~/.clawdbot/skills/brand-analyzer/scripts/analyze.py \
  --brand "Brand Name" --auto-save
```

This generates a full Brand Identity JSON and saves it to the catalog automatically.

## Prompt Profiles (Funnel Stages)

| Profile                          | Stage         | Best For                           |
| -------------------------------- | ------------- | ---------------------------------- |
| `Master_prompt_01_Awareness`     | Awareness     | Brand discovery, first impressions |
| `Master_prompt_02_Interest`      | Interest      | Engagement, curiosity              |
| `Master_prompt_03_Consideration` | Consideration | Comparison, features               |
| `Master_prompt_04_Evaluation`    | Evaluation    | Deep dive, decision support        |
| `Master_prompt_05_Conversion`    | Conversion    | Purchase intent, CTAs              |
| `Master_prompt_06_Retention`     | Retention     | Re-engagement, loyalty             |
| `Master_prompt_07_Loyalty`       | Loyalty       | Brand advocates                    |
| `Master_prompt_08_Advocacy`      | Advocacy      | Referral, community                |

**How to choose:**

- Most ads → **Conversion** (purchase intent)
- New product launches → **Awareness**
- Retargeting → **Consideration** or **Evaluation**
- Existing customers → **Retention** or **Loyalty**

## Aspect Ratios

| Ratio  | Use Case                              |
| ------ | ------------------------------------- |
| `4:5`  | **Default.** Instagram feed, Facebook |
| `9:16` | Stories, Reels, TikTok                |
| `1:1`  | Square posts                          |
| `16:9` | YouTube, landscape banners            |
| `5:4`  | Alternative landscape                 |

## Model Catalog

Models for talent/face reference: `~/clawd/models-catalog/catalog/`

**Priority:** User-provided model > Catalog selection > No model (product-only ad)

## Known Limitations

1. **Product image scraping is fragile** — always provide product images manually when possible
2. **photo_style_ref can be too literal** — the style reference may be replicated too closely
3. **Some websites block scraping** — Armani works well, others may return incorrect data
4. **Auto 4-Format is alpha** — bugs and edge cases exist
5. **Gemini hallucinations** — occasional issues in complex reasoning steps

## Ad-Ready vs Morpheus

| Feature            | Ad-Ready                      | Morpheus                                |
| ------------------ | ----------------------------- | --------------------------------------- |
| Input              | Product URL (auto-scrapes)    | Manual product image                    |
| Brand intelligence | 70+ brand profiles            | None                                    |
| Funnel targeting   | 8 funnel stages               | None                                    |
| Creative direction | Auto-generated from brief     | Pack-based (camera, lens, etc.)         |
| Best for           | Product advertising campaigns | Fashion/lifestyle editorial photography |
| Control level      | High-level (objective-driven) | Granular (every visual parameter)       |

## Source Repository

- GitHub: https://github.com/PauldeLavallaz/ads_SV
- Local clone: ~/clawd/ad-ready/
- Patreon docs: https://www.patreon.com/posts/from-product-to-149933468

## API Key

Uses ComfyDeploy API key. Set via `COMFY_DEPLOY_API_KEY` environment variable.
