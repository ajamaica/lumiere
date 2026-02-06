#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "google-genai>=1.0.0",
# ]
# ///
"""
Brand Analyzer: Generate comprehensive brand identity profiles using Gemini Flash.

Uses Google Search grounding to research brands and generate structured JSON profiles
compatible with the Ad-Ready pipeline.

Usage:
    GEMINI_API_KEY="..." uv run analyze.py --brand "Nike"
    GEMINI_API_KEY="..." uv run analyze.py --brand "Heredero Gin" --auto-save
    GEMINI_API_KEY="..." uv run analyze.py --brand "Custom Brand" --output brand.json
"""

import argparse
import json
import os
import sys
import time
from pathlib import Path

sys.stdout.reconfigure(line_buffering=True)
sys.stderr.reconfigure(line_buffering=True)

# Default paths - auto-save location for Ad-Ready integration
# Override with AD_READY_BRANDS_DIR env var if your workspace is different
AD_READY_BRANDS_DIR = Path(os.environ.get(
    "AD_READY_BRANDS_DIR",
    str(Path.home() / "clawd" / "ad-ready" / "configs" / "Brands")
))

BRAND_IDENTITY_TEMPLATE = {
    "brand_info": {
        "name": "",
        "tagline": "",
        "category": "",
        "positioning": "",
        "vision": "",
        "mission": "",
        "origin_story": ""
    },
    "brand_values": {
        "core_values": [],
        "brand_promise": "",
        "differentiators": [],
        "non_negotiables": []
    },
    "target_audience": {
        "demographics": {
            "age_range": "",
            "gender": "",
            "income_level": ""
        },
        "psychographics": {
            "lifestyle": "",
            "values": [],
            "behavior": ""
        }
    },
    "tone_of_voice": {
        "personality_traits": [],
        "communication_style": "",
        "language_register": "",
        "preferred_structures": [],
        "avoid": [],
        "emotional_temperature": "",
        "tone_dos": [],
        "tone_donts": []
    },
    "visual_identity": {
        "logo": {
            "primary_logo": "",
            "usage_rules": "",
            "lockup_behavior": "",
            "safe_area": ""
        },
        "color_system": {
            "primary_colors": [],
            "secondary_colors": [],
            "color_usage_rules": ""
        },
        "typography": {
            "primary_font": "",
            "secondary_font": "",
            "weights": {
                "headlines": "",
                "body": "",
                "captions": ""
            },
            "spacing": {
                "letter_spacing": "",
                "line_height": ""
            },
            "hierarchy": []
        },
        "layout_principles": {
            "grid_system": "",
            "white_space_ratio": "",
            "image_vs_text_balance": "",
            "cta_placement": "",
            "alignment": ""
        }
    },
    "photography": {
        "style": {
            "keywords": [],
            "preferred_photographers": [],
            "camera_feel": "",
            "pose_guidelines": "",
            "casting_attitude": ""
        },
        "technical": {
            "lighting": "",
            "contrast": "",
            "grain": "",
            "depth_of_field": "",
            "color_grading": ""
        }
    },
    "campaign_guidelines": {
        "visual_tone": [],
        "preferred_locations": [],
        "contexts": [],
        "model_casting": {
            "age_range": "",
            "diversity": "",
            "attitude": ""
        },
        "product_presentation": {
            "hero_visibility": "",
            "styling_approach": "",
            "avoid": []
        },
        "motion_rules": {
            "pacing": "",
            "transitions": ""
        }
    },
    "brand_behavior": {
        "do_dont": {
            "visual_dos": [],
            "visual_donts": [],
            "copy_dos": [],
            "copy_donts": []
        },
        "immutability": {
            "must_remain": [],
            "can_evolve": [],
            "test_zone": []
        }
    },
    "channel_expression": {
        "retail": {
            "materials": [],
            "interactive_elements": [],
            "soundscape": ""
        },
        "digital": {
            "tone_adjustment": "",
            "content_ratio": {
                "campaign_vs_product": "",
                "motion_vs_static": ""
            },
            "platform_behavior": {
                "Instagram": "",
                "Website": "",
                "Newsletter": ""
            }
        },
        "print": {
            "paper": "",
            "cover_rules": ""
        }
    },
    "compliance": {
        "no_discount_messaging": True,
        "no_pricing_on_ads": True,
        "no_competitor_mentions": True,
        "no_stock_assets": True,
        "no_medical_claims": True,
        "logo_misuse_examples": []
    }
}

SYSTEM_PROMPT = """Act as a Brand Identity Analyst and Visual Brand Architect specialized in fashion and lifestyle brands.

Your objective is to produce a reliable, coherent Brand Behavior JSON that is immediately usable in operational pipelines.

PHASE 1 – Official analysis and research (MANDATORY)

Before analyzing any images, you must:

conduct research on the brand's officially available public data
(institutional websites, corporate pages, official communications)

identify and lock the following as canonical truths:

brand name

year and context of foundation

declared positioning

official vision and mission (if publicly available)

official tagline or slogan (if existing)

These data points have absolute priority and must not be reinterpreted.

PHASE 1.1 – Independent research on advertising campaigns (MANDATORY)

After locking the official brand data, you must:

conduct independent online research to identify the brand's most successful and recognizable advertising campaigns

the research must be carried out at least via:

Google Images
Pinterest

collect and select at least 10 distinct campaigns from the brand, each represented by official images or materials clearly attributable to the campaign

prioritize official sources when available (brand website, press area, campaign archives, official releases); if materials are found via Google Images or Pinterest, verify that they are consistent with the brand's official assets and campaign naming

treat the identified campaigns as analytical reference material, not as creative inspiration

visually interpret the images from the identified campaigns and integrate them into the analysis flow as an additional dataset representing the brand's real-world behavior

PHASE 2 – Visual input

You will receive:

A JSON template to be filled in

The images independently identified in PHASE 1.1 must be considered as the visual system of the brand.

PHASE 3 – Deductive visual analysis

After locking the official data:

analyze the independently identified campaigns in a cross-sectional and comparative manner

identify recurring patterns, implicit rules, and visual constants

Use visual analysis only to fill fields not covered by official data, including:

photography

visual tone of voice

layout behavior

casting, poses, and physicality

color, contrast, and lighting

logo to subject relationship

brand energy and attitude

JSON compilation rules

You must fill in all fields of the template

DO NOT add new keys or sections

DO NOT rename any fields

DO NOT insert comments, explanations, or text outside the JSON

Critical constraints

DO NOT use formulas such as "not specified", "not available", "depends"

DO NOT invent missing official data

DO NOT make comparisons with other brands

DO NOT introduce subjective judgments or narrative language

FINAL OUTPUT (BINDING)

You must return:

The complete and fully compiled JSON

The file must:

strictly follow the provided template

be valid JSON (no comments, no trailing text)

be ready for direct use in AI workflows, prompt engines, and orchestrators

DO NOT add any other content beyond the JSON."""


def get_api_key(provided_key: str | None) -> str | None:
    """Get API key from argument, env var, or fail."""
    if provided_key:
        return provided_key
    return os.environ.get("GEMINI_API_KEY")


def sanitize_brand_name(name: str) -> str:
    """Convert brand name to safe filename."""
    safe = "".join(c if c.isalnum() or c in (' ', '-', '_') else '_' for c in name)
    return safe.strip().replace(' ', '_')


def extract_json_from_response(text: str) -> dict | None:
    """Extract JSON from response text, handling code fences and surrounding prose."""
    text = text.strip()

    # Remove markdown code fences
    if text.startswith("```json"):
        text = text[7:]
    elif text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    text = text.strip()

    # Try direct parse
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Find outermost braces
    first_brace = text.find('{')
    last_brace = text.rfind('}')

    if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
        json_str = text[first_brace:last_brace + 1]
        try:
            return json.loads(json_str)
        except json.JSONDecodeError:
            pass

    return None


def analyze_brand(brand_name: str, api_key: str) -> dict:
    """
    Analyze a brand using Gemini Flash with Google Search grounding.
    Returns the brand identity JSON dict.
    """
    from google import genai
    from google.genai import types

    print(f"Initializing Gemini client...", flush=True)
    client = genai.Client(api_key=api_key)

    template_str = json.dumps(BRAND_IDENTITY_TEMPLATE, indent=2)

    user_prompt = f"""Analyze the brand: {brand_name}

Use Google Search to research this brand thoroughly:
1. Find official brand information (website, corporate pages)
2. Search for advertising campaigns on Google Images
3. Identify visual patterns, photography style, and brand behavior

Fill in the following JSON template with your analysis. Return ONLY valid JSON, no other text:

{template_str}"""

    print(f"Analyzing brand: {brand_name}", flush=True)
    print(f"Phase 1: Researching official brand data via Google Search...", flush=True)
    print(f"Phase 1.1: Researching advertising campaigns...", flush=True)

    start_time = time.time()

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=user_prompt,
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            max_output_tokens=16384,
            temperature=0.3,
            # thinking_config=types.ThinkingConfig(thinking_level="low"),
            tools=[types.Tool(google_search=types.GoogleSearch())]
        )
    )

    elapsed = time.time() - start_time
    print(f"Phase 2-3: Visual analysis and JSON generation... ({elapsed:.1f}s)", flush=True)

    if not response:
        raise RuntimeError("No response from Gemini")

    # Extract text from response
    response_text = ""
    if hasattr(response, 'text') and response.text:
        response_text = response.text
    elif hasattr(response, 'candidates') and response.candidates:
        for candidate in response.candidates:
            if hasattr(candidate, 'content') and candidate.content:
                for part in candidate.content.parts:
                    if hasattr(part, 'text') and part.text:
                        response_text += part.text

    if not response_text:
        raise RuntimeError("Empty response from Gemini")

    # Parse JSON
    brand_data = extract_json_from_response(response_text)
    if brand_data is None:
        # Save raw response for debugging
        debug_path = f"/tmp/brand-analyzer-debug-{sanitize_brand_name(brand_name)}.txt"
        with open(debug_path, 'w') as f:
            f.write(response_text)
        raise RuntimeError(f"Failed to parse JSON from response. Raw saved to: {debug_path}")

    # Ensure brand name is set
    if brand_data.get("brand_info", {}).get("name", "") == "":
        brand_data.setdefault("brand_info", {})["name"] = brand_name

    total_time = time.time() - start_time
    print(f"Analysis complete in {total_time:.1f}s", flush=True)

    return brand_data


def save_brand_profile(brand_data: dict, output_path: Path):
    """Save brand profile JSON to file."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(brand_data, f, indent=2, ensure_ascii=False)
    size_kb = output_path.stat().st_size / 1024
    print(f"Saved: {output_path} ({size_kb:.1f}KB)", flush=True)


def main():
    parser = argparse.ArgumentParser(
        description="Brand Analyzer: Generate brand identity profiles using Gemini Flash"
    )
    parser.add_argument("--brand", "-b", required=True, help="Brand name to analyze")
    parser.add_argument("--output", "-o", help="Output file path")
    parser.add_argument("--auto-save", action="store_true",
                       help="Auto-save to Ad-Ready brands catalog")
    parser.add_argument("--api-key", help="Gemini API key (or set GEMINI_API_KEY)")

    args = parser.parse_args()

    api_key = get_api_key(args.api_key)
    if not api_key:
        print("Error: No API key. Set GEMINI_API_KEY or use --api-key", file=sys.stderr)
        sys.exit(1)

    try:
        brand_data = analyze_brand(args.brand, api_key)
    except Exception as e:
        print(f"Error analyzing brand: {e}", file=sys.stderr)
        sys.exit(1)

    # Determine output path
    if args.output:
        output_path = Path(args.output)
        save_brand_profile(brand_data, output_path)
    elif args.auto_save:
        safe_name = sanitize_brand_name(args.brand)
        output_path = AD_READY_BRANDS_DIR / f"{safe_name}.json"
        save_brand_profile(brand_data, output_path)
    else:
        # Print to stdout
        print(json.dumps(brand_data, indent=2, ensure_ascii=False))

    # Always save to Ad-Ready catalog if --auto-save
    if args.auto_save and args.output:
        safe_name = sanitize_brand_name(args.brand)
        catalog_path = AD_READY_BRANDS_DIR / f"{safe_name}.json"
        if catalog_path != Path(args.output).resolve():
            save_brand_profile(brand_data, catalog_path)
            print(f"Also saved to Ad-Ready catalog: {catalog_path}", flush=True)


if __name__ == "__main__":
    main()
