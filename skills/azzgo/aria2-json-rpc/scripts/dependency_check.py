#!/usr/bin/env python3
"""
Dependency check module for aria2-json-rpc skill.

Checks Python version and required builtin modules at startup.
Provides clear error messages for missing or incompatible dependencies.
"""

import sys


def check_python_version():
    """
    Check if Python version meets minimum requirement (3.6+).

    Returns:
        bool: True if version is compatible, False otherwise
    """
    if sys.version_info < (3, 6):
        print("ERROR: Python 3.6 or higher is required")
        print(f"Current version: {sys.version}")
        print("Please install Python 3.6+ from https://www.python.org/downloads/")
        return False
    return True


def check_builtin_modules():
    """
    Check if required builtin modules are available.

    These should always be present in Python 3.6+, but we check
    to detect corrupted installations.

    Returns:
        tuple: (bool, list) - Success status and list of missing modules
    """
    required_modules = ["urllib.request", "json", "base64", "os"]
    missing_modules = []

    for module in required_modules:
        try:
            __import__(module)
        except ImportError:
            missing_modules.append(module)

    if missing_modules:
        print(f"ERROR: Required builtin modules missing: {', '.join(missing_modules)}")
        print("This indicates a corrupted Python installation.")
        print("Please reinstall Python 3.6+ or report this as a Python bug.")
        return False, missing_modules

    return True, []


def check_optional_websockets():
    """
    Check if optional websockets library is available (Milestone 3).

    Returns:
        bool: True if websockets is available, False otherwise
    """
    try:
        import websockets

        return True
    except ImportError:
        return False


def check_all_dependencies(milestone=1, verbose=True):
    """
    Check all dependencies for the specified milestone.

    Args:
        milestone (int): Milestone number (1, 2, or 3)
        verbose (bool): Whether to print warnings for optional dependencies

    Returns:
        bool: True if all required dependencies are met, False otherwise
    """
    # Check Python version (mandatory for all milestones)
    if not check_python_version():
        sys.exit(1)

    # Check builtin modules (mandatory for all milestones)
    success, missing = check_builtin_modules()
    if not success:
        sys.exit(1)

    # Check optional websockets (Milestone 3 only)
    if milestone >= 3 and verbose:
        if not check_optional_websockets():
            print("WARNING: 'websockets' library not found")
            print(
                "WebSocket features will be disabled. Install with: pip install websockets"
            )
            print()

    return True


if __name__ == "__main__":
    # Run dependency checks when module is executed directly
    print("Checking aria2-json-rpc dependencies...")
    print()

    # Determine milestone from command line args if provided
    milestone = 1
    if len(sys.argv) > 1:
        try:
            milestone = int(sys.argv[1])
        except ValueError:
            print(f"Invalid milestone: {sys.argv[1]}, using default (1)")

    if check_all_dependencies(milestone=milestone):
        print("✓ All required dependencies are satisfied")
        print(
            f"✓ Python {sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"
        )

        # Show optional dependencies status
        if milestone >= 3:
            if check_optional_websockets():
                print("✓ Optional: websockets library available")
            else:
                print(
                    "✗ Optional: websockets library not available (WebSocket features disabled)"
                )

        sys.exit(0)
    else:
        print("✗ Dependency check failed")
        sys.exit(1)
