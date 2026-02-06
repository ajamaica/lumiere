"""Entry point for running as a module: python -m pocketsmith"""

from .cli import main

if __name__ == "__main__":
    raise SystemExit(main())
