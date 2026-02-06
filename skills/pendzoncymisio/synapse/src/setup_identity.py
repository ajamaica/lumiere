#!/usr/bin/env python3
# /// script
# dependencies = ["cryptography"]
# ///
"""
Generate identity for Synapse Protocol.

Tries ML-DSA-87 (post-quantum) via OpenSSL if available,
falls back to Ed25519 for broad compatibility.
"""

import os
import sys
import base64
import hashlib
import subprocess
from pathlib import Path


def check_openssl_mldsa_support() -> bool:
    """Check if OpenSSL supports ML-DSA-87."""
    try:
        result = subprocess.run(
            ["openssl", "list", "-public-key-algorithms"],
            capture_output=True,
            text=True,
            timeout=5
        )
        return "ML-DSA" in result.stdout or "MLDSA" in result.stdout
    except Exception:
        return False


def generate_identity_openssl_mldsa(identity_path: Path) -> dict:
    """Generate ML-DSA-87 identity using OpenSSL."""
    print("Generating ML-DSA-87 identity via OpenSSL...")
    
    private_key_path = identity_path / "agent_private.pem"
    public_key_path = identity_path / "agent_public.pem"
    
    # Generate private key
    result = subprocess.run(
        ["openssl", "genpkey", "-algorithm", "ML-DSA-87", "-out", str(private_key_path)],
        capture_output=True,
        text=True
    )
    
    if result.returncode != 0:
        raise RuntimeError(f"Failed to generate ML-DSA-87 key: {result.stderr}")
    
    # Extract public key
    result = subprocess.run(
        ["openssl", "pkey", "-in", str(private_key_path), "-pubout", "-out", str(public_key_path)],
        capture_output=True,
        text=True
    )
    
    if result.returncode != 0:
        raise RuntimeError(f"Failed to extract public key: {result.stderr}")
    
    # Set permissions
    os.chmod(private_key_path, 0o600)
    os.chmod(public_key_path, 0o644)
    
    # Generate agent ID from public key
    with open(public_key_path, "rb") as f:
        public_key = f.read()
    
    pubkey_hash = hashlib.sha256(public_key).digest()
    agent_id = base64.b32encode(pubkey_hash[:10]).decode().lower().rstrip("=")
    
    return {
        "algorithm": "ML-DSA-87",
        "private_key_path": private_key_path,
        "public_key_path": public_key_path,
        "agent_id": agent_id
    }


def generate_identity_ed25519(identity_path: Path) -> dict:
    """Generate Ed25519 identity using cryptography library."""
    print("Generating Ed25519 identity (fallback)...")
    
    try:
        from cryptography.hazmat.primitives.asymmetric import ed25519
        from cryptography.hazmat.primitives import serialization
    except ImportError:
        print("Error: cryptography library not installed")
        print("Install with: uv pip install cryptography")
        sys.exit(1)
    
    # Generate keypair
    private_key = ed25519.Ed25519PrivateKey.generate()
    public_key = private_key.public_key()
    
    # Serialize keys
    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption()
    )
    
    public_pem = public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    )
    
    # Save keys
    private_key_path = identity_path / "agent_private.pem"
    public_key_path = identity_path / "agent_public.pem"
    
    with open(private_key_path, "wb") as f:
        f.write(private_pem)
    os.chmod(private_key_path, 0o600)
    
    with open(public_key_path, "wb") as f:
        f.write(public_pem)
    os.chmod(public_key_path, 0o644)
    
    # Generate agent ID from public key
    pubkey_hash = hashlib.sha256(public_pem).digest()
    agent_id = base64.b32encode(pubkey_hash[:10]).decode().lower().rstrip("=")
    
    return {
        "algorithm": "Ed25519",
        "private_key_path": private_key_path,
        "public_key_path": public_key_path,
        "agent_id": agent_id
    }


def generate_identity(identity_dir: str = None):
    """
    Generate identity for agent - tries ML-DSA-87, falls back to Ed25519.
    
    Args:
        identity_dir: Directory to store keys (default: ~/.openclaw/identity)
    """
    # Default to OpenClaw identity directory
    if identity_dir is None:
        identity_dir = os.path.expanduser("~/.openclaw/identity")
    
    identity_path = Path(identity_dir)
    identity_path.mkdir(parents=True, exist_ok=True)
    
    try:
        # Try ML-DSA-87 first if OpenSSL supports it
        if check_openssl_mldsa_support():
            result = generate_identity_openssl_mldsa(identity_path)
            print("✅ Using ML-DSA-87 (post-quantum secure)")
        else:
            print("ℹ️  ML-DSA-87 not available, using Ed25519")
            result = generate_identity_ed25519(identity_path)
        
        # Save agent ID and algorithm metadata
        agent_id_path = identity_path / "agent_id.txt"
        with open(agent_id_path, "w") as f:
            f.write(result["agent_id"])
        
        algo_path = identity_path / "algorithm.txt"
        with open(algo_path, "w") as f:
            f.write(result["algorithm"])
        
        print(f"✅ Identity generated successfully!")
        print(f"   Algorithm:   {result['algorithm']}")
        print(f"   Private Key: {result['private_key_path']}")
        print(f"   Public Key:  {result['public_key_path']}")
        print(f"   Agent ID:    {result['agent_id']}")
        print()
        print("⚠️  KEEP YOUR PRIVATE KEY SECRET!")
        print(f"   Permissions set to 0600 on {result['private_key_path']}")
        
        return {
            "agent_id": result["agent_id"],
            "private_key_path": str(result["private_key_path"]),
            "public_key_path": str(result["public_key_path"]),
            "algorithm": result["algorithm"]
        }
        
    except Exception as e:
        print(f"❌ Failed to generate identity: {e}")
        sys.exit(1)


def check_identity_exists(identity_dir: str = None) -> bool:
    """Check if identity already exists."""
    if identity_dir is None:
        identity_dir = os.path.expanduser("~/.openclaw/identity")
    
    identity_path = Path(identity_dir)
    private_key = identity_path / "agent_private.pem"
    public_key = identity_path / "agent_public.pem"
    
    return private_key.exists() and public_key.exists()


def main():
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Generate identity for Synapse Protocol (ML-DSA-87 or Ed25519)"
    )
    parser.add_argument(
        "--identity-dir",
        default=None,
        help="Directory to store keys (default: ~/.openclaw/identity)"
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Overwrite existing identity"
    )
    
    args = parser.parse_args()
    
    # Check if identity already exists
    if check_identity_exists(args.identity_dir) and not args.force:
        print("⚠️  Identity already exists!")
        identity_dir = args.identity_dir or os.path.expanduser("~/.openclaw/identity")
        print(f"   Location: {identity_dir}")
        
        # Show algorithm if available
        algo_path = Path(identity_dir) / "algorithm.txt"
        if algo_path.exists():
            with open(algo_path) as f:
                print(f"   Algorithm: {f.read().strip()}")
        
        print()
        print("To regenerate, use: --force")
        print("WARNING: This will overwrite your existing keys!")
        sys.exit(0)
    
    # Generate new identity
    generate_identity(args.identity_dir)


if __name__ == "__main__":
    main()
