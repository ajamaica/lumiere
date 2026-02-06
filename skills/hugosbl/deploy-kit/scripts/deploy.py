#!/usr/bin/env python3
"""Deploy Kit — Helper script for web app deployment.

Usage:
    python3 deploy.py detect <path>              # Detect project type
    python3 deploy.py check                      # Check installed CLIs
    python3 deploy.py recommend <path>            # Recommend a platform
    python3 deploy.py deploy <path> --platform X  # Deploy (with confirmation)
"""

import json
import os
import subprocess
import sys
from pathlib import Path

# --- Detection ---

FRAMEWORK_SIGNALS = [
    ("next.config.js", "Next.js", "frontend"),
    ("next.config.mjs", "Next.js", "frontend"),
    ("next.config.ts", "Next.js", "frontend"),
    ("astro.config.mjs", "Astro", "frontend"),
    ("astro.config.ts", "Astro", "frontend"),
    ("vite.config.js", "Vite", "frontend"),
    ("vite.config.ts", "Vite", "frontend"),
    ("svelte.config.js", "SvelteKit", "frontend"),
    ("nuxt.config.js", "Nuxt", "frontend"),
    ("nuxt.config.ts", "Nuxt", "frontend"),
    ("remix.config.js", "Remix", "frontend"),
    ("angular.json", "Angular", "frontend"),
    ("gatsby-config.js", "Gatsby", "frontend"),
    ("manage.py", "Django", "backend"),
    ("Dockerfile", "Docker", "container"),
    ("docker-compose.yml", "Docker Compose", "container"),
    ("docker-compose.yaml", "Docker Compose", "container"),
    ("supabase/config.toml", "Supabase", "database"),
]


def detect_project(project_path: str) -> dict:
    """Detect the project type by scanning files."""
    p = Path(project_path).resolve()
    if not p.exists():
        return {"error": f"Path not found: {p}"}

    result = {
        "path": str(p),
        "frameworks": [],
        "languages": [],
        "category": "unknown",
        "files_found": [],
    }

    # Check framework signals
    for filename, framework, category in FRAMEWORK_SIGNALS:
        if (p / filename).exists():
            result["frameworks"].append(framework)
            result["files_found"].append(filename)
            if result["category"] == "unknown":
                result["category"] = category

    # Check package.json
    pkg_path = p / "package.json"
    if pkg_path.exists():
        result["files_found"].append("package.json")
        if "javascript" not in result["languages"]:
            result["languages"].append("javascript")
        try:
            with open(pkg_path) as f:
                pkg = json.load(f)
            deps = {**pkg.get("dependencies", {}), **pkg.get("devDependencies", {})}
            # Detect from deps if no framework found yet
            dep_signals = [
                ("next", "Next.js", "frontend"),
                ("astro", "Astro", "frontend"),
                ("svelte", "SvelteKit", "frontend"),
                ("nuxt", "Nuxt", "frontend"),
                ("@remix-run/node", "Remix", "frontend"),
                ("express", "Express", "backend"),
                ("fastify", "Fastify", "backend"),
                ("koa", "Koa", "backend"),
                ("hono", "Hono", "backend"),
                ("@supabase/supabase-js", "Supabase Client", "database"),
            ]
            for dep, fw, cat in dep_signals:
                if dep in deps and fw not in result["frameworks"]:
                    result["frameworks"].append(fw)
                    if result["category"] == "unknown":
                        result["category"] = cat
            if "typescript" in deps or "ts-node" in deps:
                result["languages"].append("typescript")
            # Check for start script (indicates a server)
            scripts = pkg.get("scripts", {})
            if "start" in scripts and result["category"] == "unknown":
                result["category"] = "backend"
        except (json.JSONDecodeError, KeyError):
            pass

    # Check Python
    if (p / "requirements.txt").exists():
        result["files_found"].append("requirements.txt")
        result["languages"].append("python")
        if result["category"] == "unknown":
            result["category"] = "backend"
        # Scan for frameworks
        try:
            reqs = (p / "requirements.txt").read_text().lower()
            if "flask" in reqs:
                result["frameworks"].append("Flask")
            if "fastapi" in reqs:
                result["frameworks"].append("FastAPI")
            if "django" in reqs:
                result["frameworks"].append("Django")
        except OSError:
            pass

    if (p / "Pipfile").exists():
        result["files_found"].append("Pipfile")
        if "python" not in result["languages"]:
            result["languages"].append("python")

    if (p / "pyproject.toml").exists():
        result["files_found"].append("pyproject.toml")
        if "python" not in result["languages"]:
            result["languages"].append("python")

    # Check Go
    if (p / "go.mod").exists():
        result["files_found"].append("go.mod")
        result["languages"].append("go")
        if result["category"] == "unknown":
            result["category"] = "backend"

    # Check Rust
    if (p / "Cargo.toml").exists():
        result["files_found"].append("Cargo.toml")
        result["languages"].append("rust")
        if result["category"] == "unknown":
            result["category"] = "backend"

    # Deduplicate frameworks
    result["frameworks"] = list(dict.fromkeys(result["frameworks"]))

    return result


# --- CLI Check ---

CLIS = {
    "vercel": {"check": ["vercel", "--version"], "install": "npm i -g vercel"},
    "railway": {"check": ["railway", "--version"], "install": "npm i -g @railway/cli"},
    "supabase": {"check": ["supabase", "--version"], "install": "npm i -g supabase"},
}


def check_cli(name: str) -> dict:
    """Check if a CLI is installed and return version info."""
    info = CLIS.get(name)
    if not info:
        return {"name": name, "installed": False, "error": "Unknown CLI"}
    try:
        result = subprocess.run(
            info["check"], capture_output=True, text=True, timeout=10
        )
        version = result.stdout.strip() or result.stderr.strip()
        return {"name": name, "installed": True, "version": version}
    except FileNotFoundError:
        return {
            "name": name,
            "installed": False,
            "install_cmd": info["install"],
        }
    except subprocess.TimeoutExpired:
        return {"name": name, "installed": False, "error": "Timeout"}


def check_all_clis() -> list:
    """Check all supported CLIs."""
    return [check_cli(name) for name in CLIS]


# --- Recommend ---

PLATFORM_MAP = {
    "frontend": "vercel",
    "backend": "railway",
    "container": "railway",
    "database": "supabase",
}

FRAMEWORK_PLATFORM = {
    "Next.js": "vercel",
    "Astro": "vercel",
    "Vite": "vercel",
    "SvelteKit": "vercel",
    "Nuxt": "vercel",
    "Remix": "vercel",
    "Angular": "vercel",
    "Gatsby": "vercel",
    "Express": "railway",
    "Fastify": "railway",
    "Koa": "railway",
    "Hono": "railway",
    "Flask": "railway",
    "FastAPI": "railway",
    "Django": "railway",
    "Docker": "railway",
    "Supabase": "supabase",
}


def recommend_platform(project_path: str) -> dict:
    """Recommend the best deployment platform for a project."""
    detection = detect_project(project_path)
    if "error" in detection:
        return detection

    recommendations = []

    # Framework-specific recommendations
    for fw in detection["frameworks"]:
        if fw in FRAMEWORK_PLATFORM:
            platform = FRAMEWORK_PLATFORM[fw]
            reason = f"{fw} works best on {platform}"
            if not any(r["platform"] == platform for r in recommendations):
                recommendations.append({"platform": platform, "reason": reason})

    # Category fallback
    if not recommendations:
        platform = PLATFORM_MAP.get(detection["category"], "vercel")
        recommendations.append(
            {"platform": platform, "reason": f"Based on project category: {detection['category']}"}
        )

    # Check if Supabase client is used → suggest Supabase for DB
    if "Supabase Client" in detection["frameworks"]:
        if not any(r["platform"] == "supabase" for r in recommendations):
            recommendations.append(
                {"platform": "supabase", "reason": "Supabase client detected — use Supabase for backend services"}
            )

    return {
        "detection": detection,
        "recommendations": recommendations,
        "primary": recommendations[0]["platform"] if recommendations else "vercel",
    }


# --- Deploy ---


def deploy(project_path: str, platform: str) -> None:
    """Deploy a project to the specified platform (interactive, with confirmation)."""
    p = Path(project_path).resolve()
    if not p.exists():
        print(f"❌ Path not found: {p}")
        sys.exit(1)

    # Check CLI
    cli_status = check_cli(platform)
    if not cli_status["installed"]:
        print(f"❌ {platform} CLI not installed.")
        print(f"   Install with: {cli_status.get('install_cmd', '???')}")
        sys.exit(1)

    print(f"📦 Project: {p}")
    print(f"🚀 Platform: {platform}")
    print(f"🔧 CLI version: {cli_status.get('version', 'unknown')}")
    print()

    # Confirmation
    confirm = input("⚠️  Proceed with deployment? [y/N] ").strip().lower()
    if confirm not in ("y", "yes"):
        print("❌ Deployment cancelled.")
        sys.exit(0)

    # Deploy commands
    commands = {
        "vercel": ["vercel"],
        "railway": ["railway", "up"],
        "supabase": ["supabase", "db", "push"],
    }

    cmd = commands.get(platform)
    if not cmd:
        print(f"❌ Unknown platform: {platform}")
        sys.exit(1)

    print(f"\n▶ Running: {' '.join(cmd)}")
    try:
        subprocess.run(cmd, cwd=str(p), check=True)
        print(f"\n✅ Deployment to {platform} complete!")
    except subprocess.CalledProcessError as e:
        print(f"\n❌ Deployment failed (exit code {e.returncode})")
        sys.exit(1)


# --- CLI ---


def print_detection(det: dict) -> None:
    """Pretty-print detection results."""
    if "error" in det:
        print(f"❌ {det['error']}")
        return
    print(f"📁 Path: {det['path']}")
    print(f"🔍 Frameworks: {', '.join(det['frameworks']) or 'none detected'}")
    print(f"💬 Languages: {', '.join(det['languages']) or 'none detected'}")
    print(f"📂 Category: {det['category']}")
    print(f"📄 Key files: {', '.join(det['files_found']) or 'none'}")


def print_cli_status(results: list) -> None:
    """Pretty-print CLI check results."""
    for r in results:
        if r["installed"]:
            print(f"  ✅ {r['name']}: {r['version']}")
        else:
            cmd = r.get("install_cmd", "???")
            print(f"  ❌ {r['name']}: not installed → {cmd}")


def print_recommendation(rec: dict) -> None:
    """Pretty-print recommendation."""
    if "error" in rec:
        print(f"❌ {rec['error']}")
        return
    print_detection(rec["detection"])
    print()
    print(f"🎯 Recommended: {rec['primary']}")
    for r in rec["recommendations"]:
        print(f"   → {r['platform']}: {r['reason']}")


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    command = sys.argv[1]

    if command == "detect":
        path = sys.argv[2] if len(sys.argv) > 2 else "."
        print_detection(detect_project(path))

    elif command == "check":
        print("🔧 CLI Status:")
        print_cli_status(check_all_clis())

    elif command == "recommend":
        path = sys.argv[2] if len(sys.argv) > 2 else "."
        print_recommendation(recommend_platform(path))

    elif command == "deploy":
        path = sys.argv[2] if len(sys.argv) > 2 else "."
        platform = None
        for i, arg in enumerate(sys.argv):
            if arg == "--platform" and i + 1 < len(sys.argv):
                platform = sys.argv[i + 1]
        if not platform:
            # Auto-recommend
            rec = recommend_platform(path)
            platform = rec.get("primary", "vercel")
            print(f"ℹ️  No platform specified, using recommendation: {platform}")
        deploy(path, platform)

    else:
        print(f"Unknown command: {command}")
        print(__doc__)
        sys.exit(1)


if __name__ == "__main__":
    main()
