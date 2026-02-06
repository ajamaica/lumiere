#!/usr/bin/env python3
"""
Kaspa Wallet Installer

Installs the Kaspa Python SDK in a virtual environment.
Works on macOS, Linux, and Windows.

Usage:
    python3 install.py

Requirements:
    - Python 3.8 or higher
    - pip (usually included with Python)
    - Internet connection (to download kaspa SDK from PyPI)
"""
from __future__ import annotations

import os
import platform
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
VENV_DIR = ROOT / ".venv"
REQ_FILE = ROOT / "requirements.txt"
MIN_PYTHON = (3, 8)


def log(msg: str) -> None:
    print(f"[kaspa-wallet] {msg}")


def error(msg: str) -> None:
    print(f"[kaspa-wallet] ERROR: {msg}", file=sys.stderr)


def get_python_info() -> dict:
    """Get detailed Python environment info for diagnostics."""
    return {
        "version": f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
        "executable": sys.executable,
        "platform": platform.system(),
        "arch": platform.machine(),
        "implementation": platform.python_implementation(),
    }


def check_python_version() -> bool:
    """Ensure Python version meets minimum requirements."""
    if sys.version_info < MIN_PYTHON:
        error(f"Python {MIN_PYTHON[0]}.{MIN_PYTHON[1]}+ required, found {sys.version_info.major}.{sys.version_info.minor}")
        error("Please install a newer Python version:")
        error("  macOS:   brew install python@3.12")
        error("  Ubuntu:  sudo apt install python3.12")
        error("  Windows: Download from python.org")
        return False
    return True


def find_best_python() -> str:
    """Find the best available Python executable."""
    # Allow override via environment
    custom = os.environ.get("KASPA_PYTHON")
    if custom:
        if shutil.which(custom) or os.path.isfile(custom):
            return custom
        error(f"KASPA_PYTHON={custom} not found, falling back to default")

    # Try newer versions first
    for ver in ("3.13", "3.12", "3.11", "3.10", "3.9", "3.8"):
        exe = shutil.which(f"python{ver}")
        if exe:
            return exe

    # Fallback to generic python3
    for name in ("python3", "python"):
        exe = shutil.which(name)
        if exe:
            return exe

    return sys.executable


def run_command(cmd: list[str], capture: bool = False) -> subprocess.CompletedProcess:
    """Run a command with proper error handling."""
    try:
        return subprocess.run(
            cmd,
            cwd=str(ROOT),
            capture_output=capture,
            text=True,
            check=True,
        )
    except subprocess.CalledProcessError as e:
        if capture and e.stderr:
            error(f"Command failed: {' '.join(cmd)}")
            error(f"Output: {e.stderr[:500]}")
        raise


def create_venv(python_exe: str) -> Path:
    """Create virtual environment."""
    if VENV_DIR.exists():
        log(f"Using existing venv: {VENV_DIR}")
        return VENV_DIR

    log(f"Creating virtual environment with {python_exe}...")
    try:
        run_command([python_exe, "-m", "venv", str(VENV_DIR)])
    except subprocess.CalledProcessError:
        error("Failed to create virtual environment")
        error("Try installing venv: sudo apt install python3-venv (Ubuntu/Debian)")
        raise

    return VENV_DIR


def get_venv_python() -> Path:
    """Get path to Python executable in venv."""
    if os.name == "nt":
        return VENV_DIR / "Scripts" / "python.exe"
    return VENV_DIR / "bin" / "python"


def install_dependencies(venv_python: Path) -> None:
    """Install dependencies from requirements.txt."""
    if not REQ_FILE.exists():
        error(f"requirements.txt not found at {REQ_FILE}")
        error("Create it with: kaspa")
        raise FileNotFoundError(str(REQ_FILE))

    # Set pip cache directory
    pip_cache = ROOT / ".pip-cache"
    os.environ["PIP_CACHE_DIR"] = str(pip_cache)

    log("Installing dependencies...")
    pip_cmd = [str(venv_python), "-m", "pip", "install", "--upgrade", "pip"]

    try:
        run_command(pip_cmd, capture=True)
    except subprocess.CalledProcessError:
        log("Warning: Could not upgrade pip, continuing anyway...")

    pip_install = [str(venv_python), "-m", "pip", "install", "-r", str(REQ_FILE)]

    try:
        run_command(pip_install)
    except subprocess.CalledProcessError as e:
        error("Failed to install dependencies")
        info = get_python_info()
        error(f"Python: {info['version']} ({info['implementation']})")
        error(f"Platform: {info['platform']} {info['arch']}")
        error("")
        error("Common fixes:")
        error("  1. Check internet connection")
        error("  2. Try a different Python version: KASPA_PYTHON=python3.12 python3 install.py")
        error("  3. Check if kaspa SDK supports your platform: https://pypi.org/project/kaspa/")
        raise


def verify_installation(venv_python: Path) -> bool:
    """Verify kaspa SDK is properly installed."""
    log("Verifying installation...")

    test_script = """
import sys
try:
    import kaspa
    version = getattr(kaspa, '__version__', 'unknown')
    # Test key classes exist
    for name in ['PrivateKey', 'Address', 'RpcClient', 'Generator']:
        if not hasattr(kaspa, name):
            print(f"MISSING: {name}", file=sys.stderr)
            sys.exit(1)
    print(f"OK:{version}")
except ImportError as e:
    print(f"IMPORT_ERROR:{e}", file=sys.stderr)
    sys.exit(1)
except Exception as e:
    print(f"ERROR:{e}", file=sys.stderr)
    sys.exit(1)
"""

    try:
        result = run_command([str(venv_python), "-c", test_script], capture=True)
        if result.stdout.startswith("OK:"):
            version = result.stdout.split(":")[1].strip()
            log(f"Kaspa SDK version: {version}")
            return True
    except subprocess.CalledProcessError as e:
        if "IMPORT_ERROR" in (e.stderr or ""):
            error("Kaspa SDK import failed")
            error("The SDK may not support your platform")
        elif "MISSING" in (e.stderr or ""):
            error("Kaspa SDK is incomplete")
            error("Try reinstalling: rm -rf .venv && python3 install.py")
        else:
            error(f"Verification failed: {e.stderr}")
        return False

    return False


def main() -> int:
    log("Kaspa Wallet Installer")
    log("=" * 40)

    # Check Python version
    if not check_python_version():
        return 1

    python_exe = find_best_python()
    info = get_python_info()
    log(f"Python: {info['version']} on {info['platform']} ({info['arch']})")

    try:
        # Create venv
        create_venv(python_exe)

        # Get venv python
        venv_python = get_venv_python()
        if not venv_python.exists():
            error(f"Venv Python not found at {venv_python}")
            error("Try: rm -rf .venv && python3 install.py")
            return 1

        # Install deps
        install_dependencies(venv_python)

        # Verify
        if not verify_installation(venv_python):
            return 1

        log("=" * 40)
        log("Installation complete!")
        log("")
        log("Quick test:")
        log("  ./kaswallet.sh help")
        log("")
        log("Set wallet credentials:")
        log("  export KASPA_PRIVATE_KEY='your-hex-key'")
        log("  # or")
        log("  export KASPA_MNEMONIC='your 12-24 word phrase'")
        log("")
        log("Then check balance:")
        log("  ./kaswallet.sh balance")

        return 0

    except Exception as e:
        error(f"Installation failed: {e}")
        error("")
        error("For help, see: https://github.com/anthropics/kaspa-wallet")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
