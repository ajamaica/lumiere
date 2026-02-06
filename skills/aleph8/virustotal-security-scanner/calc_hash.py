#!/usr/bin/env python3
import hashlib
import os
import sys


def calculate_sha256(filepath):
    """Calculates the SHA256 hash of a file."""
    if not os.path.exists(filepath):
        print(f"Error: File not found: {filepath}", file=sys.stderr)
        sys.exit(1)

    sha256_hash = hashlib.sha256()
    try:
        with open(filepath, "rb") as f:
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)
        return sha256_hash.hexdigest()
    except Exception as e:
        print(f"Error reading file: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(f"Usage: {sys.argv[0]} <file_path>")
        sys.exit(1)

    filepath = sys.argv[1]
    print(calculate_sha256(filepath))
