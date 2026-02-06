#!/usr/bin/env python3
"""Verify LNURL-Auth signatures against a k1 challenge.

Usage:
  python scripts/verify_signature.py --k1 <hex> --signature <hex> --pubkey <hex>

Install dependency:
  pip install ecdsa
"""

import argparse
import sys


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Verify LNURL-Auth signatures.")
    parser.add_argument("--k1", required=True, help="k1 challenge hex string")
    parser.add_argument("--signature", required=True, help="signature hex string")
    parser.add_argument("--pubkey", required=True, help="compressed or raw pubkey hex string")
    parser.add_argument(
        "--signature-format",
        choices=("raw", "der"),
        default="raw",
        help="signature format: raw 64-byte or DER (default: raw)",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        import hashlib
        from ecdsa import SECP256k1, VerifyingKey
        from ecdsa.util import sigdecode_der, sigdecode_string
    except ImportError:
        print("Missing dependency: install with 'pip install ecdsa'", file=sys.stderr)
        return 2

    try:
        k1_bytes = bytes.fromhex(args.k1)
        sig_bytes = bytes.fromhex(args.signature)
        pub_bytes = bytes.fromhex(args.pubkey)
    except ValueError as exc:
        print(f"Invalid hex input: {exc}", file=sys.stderr)
        return 2

    if len(pub_bytes) in (33, 65):
        pub_bytes = pub_bytes[1:]

    if len(pub_bytes) != 64:
        print("Expected a 64-byte uncompressed public key", file=sys.stderr)
        return 2

    sigdecode = sigdecode_string if args.signature_format == "raw" else sigdecode_der

    try:
        vk = VerifyingKey.from_string(pub_bytes, curve=SECP256k1)
        vk.verify(sig_bytes, k1_bytes, hashfunc=hashlib.sha256, sigdecode=sigdecode)
    except Exception as exc:
        print(f"Signature invalid: {exc}", file=sys.stderr)
        return 1

    print("Signature valid")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
