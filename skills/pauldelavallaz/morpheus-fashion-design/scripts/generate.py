#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "httpx>=0.25.0",
# ]
# ///
"""
Generate fashion/product advertising images using Morpheus Fashion Design workflow.

Usage:
    uv run generate.py --product product.jpg --model model.jpg --brief "..." --target "..." --output output.png
"""

import argparse
import httpx
import os
import sys
import time
import base64
from pathlib import Path

# Force unbuffered output
sys.stdout.reconfigure(line_buffering=True)
sys.stderr.reconfigure(line_buffering=True)


DEPLOYMENT_ID = "79324c61-6bd4-4218-a438-73f1b28c24a7"
API_BASE = "https://api.comfydeploy.com/api"
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "AIzaSyBCa0WCDlc6XYU6ZlwbqLB5D0hyeIuGmqA")


def get_api_key(provided_key: str | None) -> str | None:
    """Get API key from argument or environment."""
    if provided_key:
        return provided_key
    return os.environ.get("COMFY_DEPLOY_API_KEY")


def upload_file(client: httpx.Client, api_key: str, file_path: str) -> str:
    """Upload a file to ComfyDeploy and return the URL."""
    path = Path(file_path)
    print(f"[DEBUG] upload_file called for: {file_path}", flush=True)
    
    if not path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")
    
    # Determine content type
    content_type = "image/jpeg" if path.suffix.lower() in [".jpg", ".jpeg"] else "image/png"
    print(f"[DEBUG] Content type: {content_type}", flush=True)
    
    # Upload file using multipart form
    print(f"[DEBUG] Opening file and preparing upload...", flush=True)
    with open(path, "rb") as f:
        files = {"file": (path.name, f, content_type)}
        print(f"[DEBUG] Sending POST to {API_BASE}/file/upload", flush=True)
        response = client.post(
            f"{API_BASE}/file/upload",
            headers={"Authorization": f"Bearer {api_key}"},
            files=files
        )
    
    print(f"[DEBUG] Response status: {response.status_code}", flush=True)
    print(f"[DEBUG] Response body: {response.text[:500]}", flush=True)
    
    if response.status_code != 200:
        raise Exception(f"Failed to upload file: {response.text}")
    
    upload_info = response.json()
    file_url = upload_info.get("file_url") or upload_info.get("url") or upload_info.get("download_url")
    
    if not file_url:
        raise Exception(f"No URL in response: {upload_info}")
    
    print(f"Uploaded: {path.name} -> {file_url}", flush=True)
    return file_url


def queue_run(client: httpx.Client, api_key: str, inputs: dict) -> str:
    """Queue a run and return the run_id."""
    response = client.post(
        f"{API_BASE}/run/deployment/queue",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        },
        json={
            "deployment_id": DEPLOYMENT_ID,
            "inputs": inputs
        }
    )
    
    if response.status_code != 200:
        raise Exception(f"Failed to queue run: {response.text}")
    
    data = response.json()
    run_id = data.get("run_id")
    print(f"Queued run: {run_id}")
    return run_id


def poll_run(client: httpx.Client, api_key: str, run_id: str, timeout: int = 300) -> dict:
    """Poll for run completion."""
    start_time = time.time()
    
    while time.time() - start_time < timeout:
        response = client.get(
            f"{API_BASE}/run/{run_id}",
            headers={"Authorization": f"Bearer {api_key}"}
        )
        
        if response.status_code != 200:
            raise Exception(f"Failed to get run status: {response.text}")
        
        data = response.json()
        status = data.get("status")
        
        if status == "success":
            print("Run completed successfully!")
            return data
        elif status in ["failed", "error"]:
            raise Exception(f"Run failed: {data}")
        
        print(f"Status: {status}... waiting")
        time.sleep(5)
    
    raise TimeoutError(f"Run timed out after {timeout}s")


def download_output(client: httpx.Client, output_url: str, output_path: str):
    """Download the output image."""
    response = client.get(output_url)
    if response.status_code != 200:
        raise Exception(f"Failed to download output: {response.text}")
    
    with open(output_path, "wb") as f:
        f.write(response.content)
    
    print(f"Saved: {output_path}")


def main():
    parser = argparse.ArgumentParser(description="Generate images with Morpheus Fashion Design")
    
    # Required inputs
    parser.add_argument("--product", "-p", required=True, help="Product image path")
    parser.add_argument("--model", "-m", required=True, help="Model face image path")
    parser.add_argument("--brief", "-b", required=True, help="Campaign brief")
    parser.add_argument("--target", "-t", required=True, help="Target audience")
    parser.add_argument("--output", "-o", required=True, help="Output filename")
    
    # Optional inputs
    parser.add_argument("--logo", help="Logo image path (optional)")
    parser.add_argument("--api-key", "-k", help="ComfyDeploy API key")
    
    # Packs
    parser.add_argument("--style-pack", default="auto", 
                       choices=["auto","premium_restraint","editorial_precision","cinematic_realism",
                               "cinematic_memory","campaign_hero","product_truth","clean_commercial",
                               "street_authentic","archive_fashion","experimental_authorial"])
    parser.add_argument("--shot-pack", default="auto")
    parser.add_argument("--camera-pack", default="auto")
    parser.add_argument("--lens-pack", default="auto")
    parser.add_argument("--lighting-pack", default="auto")
    parser.add_argument("--pose-pack", default="auto")
    parser.add_argument("--film-pack", default="auto")
    parser.add_argument("--color-pack", default="auto")
    parser.add_argument("--environment-pack", default="AUTO")
    parser.add_argument("--time-weather-pack", default="auto")
    parser.add_argument("--branding-pack", default="logo_none",
                       choices=["logo_none","logo_discreet_lower","logo_top_corner",
                               "logo_center_watermark","logo_integrated"])
    parser.add_argument("--intent", default="auto",
                       choices=["auto","awareness","consideration","conversion","retention"])
    parser.add_argument("--aspect-ratio", default="4:5",
                       choices=["9:16","16:9","1:1","4:5","5:4","3:4","4:3"])
    parser.add_argument("--seed", type=int, default=-1, help="Random seed (-1 for random)")
    
    args = parser.parse_args()
    
    # Warn about AUTO values - they produce boring results!
    auto_packs = []
    if args.style_pack == "auto":
        auto_packs.append("--style-pack")
    if args.camera_pack == "auto":
        auto_packs.append("--camera-pack")
    if args.lens_pack == "auto":
        auto_packs.append("--lens-pack")
    if args.lighting_pack == "auto":
        auto_packs.append("--lighting-pack")
    if args.pose_pack == "auto":
        auto_packs.append("--pose-pack")
    if args.film_pack == "auto":
        auto_packs.append("--film-pack")
    if args.color_pack == "auto":
        auto_packs.append("--color-pack")
    if args.environment_pack.upper() == "AUTO":
        auto_packs.append("--environment-pack")
    if args.time_weather_pack == "auto":
        auto_packs.append("--time-weather-pack")
    
    if auto_packs:
        print("\n" + "="*60, file=sys.stderr)
        print("⚠️  WARNING: AUTO VALUES DETECTED!", file=sys.stderr)
        print("="*60, file=sys.stderr)
        print(f"The following packs are set to 'auto': {', '.join(auto_packs)}", file=sys.stderr)
        print("AUTO = empty values = neutral, boring images!", file=sys.stderr)
        print("Always specify creative values aligned with the brief.", file=sys.stderr)
        print("="*60 + "\n", file=sys.stderr)
    
    # Get API key
    api_key = get_api_key(args.api_key)
    if not api_key:
        print("Error: No API key provided.", file=sys.stderr)
        print("Set COMFY_DEPLOY_API_KEY or use --api-key", file=sys.stderr)
        sys.exit(1)
    
    # Create HTTP client
    with httpx.Client(timeout=60.0) as client:
        # Upload images
        print("Uploading images...")
        product_url = upload_file(client, api_key, args.product)
        model_url = upload_file(client, api_key, args.model)
        
        logo_url = ""
        if args.logo:
            logo_url = upload_file(client, api_key, args.logo)
        
        # Build inputs
        inputs = {
            "product": product_url,
            "model": model_url,
            "logo": logo_url,
            "brief": args.brief,
            "target": args.target,
            "gemini_api_key": GEMINI_API_KEY,
            "input_seed": args.seed,
            "branding_pack": args.branding_pack,
            "aspect_ratio": args.aspect_ratio,
            "style_pack": args.style_pack,
            "camera_pack": args.camera_pack,
            "lens_pack": args.lens_pack,
            "film_texture_pack": args.film_pack,
            "color_science_pack": args.color_pack,
            "shot_pack": args.shot_pack,
            "pose_discipline_pack": args.pose_pack,
            "lighting_pack": args.lighting_pack,
            "time_weather_pack": args.time_weather_pack,
            "environment_pack": args.environment_pack,
            "intent": args.intent
        }
        
        # Queue run
        print("Queuing generation...")
        run_id = queue_run(client, api_key, inputs)
        
        # Poll for completion
        print("Waiting for completion...")
        result = poll_run(client, api_key, run_id)
        
        # Download output
        outputs = result.get("outputs", [])
        if outputs:
            output_url = outputs[0].get("url") or outputs[0].get("data", {}).get("images", [{}])[0].get("url")
            if output_url:
                download_output(client, output_url, args.output)
            else:
                print(f"Output data: {outputs}")
        else:
            print("No outputs in result")
            print(f"Full result: {result}")


if __name__ == "__main__":
    main()
