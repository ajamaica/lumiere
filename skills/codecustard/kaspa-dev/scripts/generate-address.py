#!/usr/bin/env python3
"""
Kaspa Address Generator

Generates Kaspa addresses with their corresponding private keys.
Supports mainnet, testnet, and devnet networks.

Usage:
    python generate-address.py [--network mainnet|testnet|devnet] [--count 1]

Example:
    python generate-address.py --network mainnet --count 3
"""

import argparse
import hashlib
import secrets
import sys
from typing import Tuple, Optional

try:
    import bech32
except ImportError:
    print("Error: bech32 library not found. Install with: pip install bech32")
    sys.exit(1)

try:
    import secp256k1
except ImportError:
    print("Warning: secp256k1 library not found. Install with: pip install secp256k1")
    secp256k1 = None


class KaspaAddressGenerator:
    """Generate Kaspa addresses and keys."""
    
    NETWORK_PREFIXES = {
        'mainnet': 'kaspa',
        'testnet': 'kaspatest',
        'devnet': 'kaspadev'
    }
    
    def __init__(self, network: str = 'mainnet'):
        """Initialize generator with network type."""
        if network not in self.NETWORK_PREFIXES:
            raise ValueError(f"Invalid network: {network}")
        self.network = network
        self.prefix = self.NETWORK_PREFIXES[network]
    
    def generate_private_key(self) -> bytes:
        """Generate a random 32-byte private key."""
        return secrets.token_bytes(32)
    
    def private_key_to_wif(self, private_key: bytes, compressed: bool = True) -> str:
        """Convert private key to Wallet Import Format (WIF)."""
        # Add version byte (0x80 for mainnet, 0xEF for testnet)
        version_byte = b'\x80' if self.network == 'mainnet' else b'\xef'
        
        # Add private key
        extended = version_byte + private_key
        
        # Add compression flag if needed
        if compressed:
            extended += b'\x01'
        
        # Double SHA256 checksum
        checksum = hashlib.sha256(hashlib.sha256(extended).digest()).digest()[:4]
        
        # Base58 encode
        import base58
        return base58.b58encode(extended + checksum).decode('ascii')
    
    def wif_to_private_key(self, wif: str) -> bytes:
        """Convert WIF to private key."""
        import base58
        
        decoded = base58.b58decode(wif)
        
        # Check checksum
        payload = decoded[:-4]
        checksum = decoded[-4:]
        calculated_checksum = hashlib.sha256(hashlib.sha256(payload).digest()).digest()[:4]
        
        if checksum != calculated_checksum:
            raise ValueError("Invalid WIF checksum")
        
        # Remove version byte and compression flag
        if len(payload) == 33:  # Uncompressed
            return payload[1:]
        elif len(payload) == 34:  # Compressed
            return payload[1:-1]
        else:
            raise ValueError("Invalid WIF length")
    
    def private_key_to_public_key(self, private_key: bytes, compressed: bool = True) -> bytes:
        """Convert private key to public key using secp256k1."""
        if secp256k1 is None:
            raise ImportError("secp256k1 library required for key derivation")
        
        privkey = secp256k1.PrivateKey(private_key)
        pubkey = privkey.pubkey
        
        if compressed:
            return pubkey.serialize()
        else:
            return pubkey.serialize(compressed=False)
    
    def public_key_to_address(self, public_key: bytes) -> str:
        """Convert public key to Kaspa address."""
        # SHA256 of public key
        sha256_hash = hashlib.sha256(public_key).digest()
        
        # RIPEMD160
        try:
            ripemd160 = hashlib.new('ripemd160')
            ripemd160.update(sha256_hash)
            hash160 = ripemd160.digest()
        except:
            # Fallback if ripemd160 not available
            import hashlib
            hash160 = hashlib.new('ripemd160', sha256_hash).digest()
        
        # Convert to 5-bit groups for bech32
        converted = bech32.convertbits(hash160, 8, 5)
        
        # Encode with bech32
        address = bech32.bech32_encode(self.prefix, converted)
        
        return address
    
    def generate_address(self, compressed: bool = True) -> Tuple[str, str, bytes]:
        """Generate a new address with its private key.
        
        Returns:
            Tuple of (address, wif_private_key, raw_private_key)
        """
        private_key = self.generate_private_key()
        public_key = self.private_key_to_public_key(private_key, compressed)
        address = self.public_key_to_address(public_key)
        wif = self.private_key_to_wif(private_key, compressed)
        
        return address, wif, private_key
    
    def validate_address(self, address: str) -> bool:
        """Validate a Kaspa address."""
        try:
            prefix, data = bech32.bech32_decode(address)
            
            # Check prefix matches network
            if prefix != self.prefix:
                return False
            
            # Check data is valid
            if data is None or len(data) == 0:
                return False
            
            return True
        except Exception:
            return False
    
    def get_address_info(self, address: str) -> dict:
        """Get information about an address."""
        try:
            prefix, data = bech32.bech32_decode(address)
            
            # Determine network from prefix
            network = None
            for net, pre in self.NETWORK_PREFIXES.items():
                if prefix == pre:
                    network = net
                    break
            
            if network is None:
                return {"valid": False, "error": "Unknown prefix"}
            
            # Convert back to hash160
            hash160_bytes = bytes(bech32.convertbits(data, 5, 8, False))
            
            return {
                "valid": True,
                "address": address,
                "network": network,
                "prefix": prefix,
                "hash160": hash160_bytes.hex(),
                "version": data[0] if data else None
            }
        except Exception as e:
            return {"valid": False, "error": str(e)}


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description='Generate Kaspa addresses and private keys'
    )
    parser.add_argument(
        '--network', '-n',
        choices=['mainnet', 'testnet', 'devnet'],
        default='mainnet',
        help='Network type (default: mainnet)'
    )
    parser.add_argument(
        '--count', '-c',
        type=int,
        default=1,
        help='Number of addresses to generate (default: 1)'
    )
    parser.add_argument(
        '--validate', '-v',
        type=str,
        help='Validate an existing address'
    )
    parser.add_argument(
        '--uncompressed', '-u',
        action='store_true',
        help='Generate uncompressed public keys'
    )
    parser.add_argument(
        '--output', '-o',
        type=str,
        help='Output file to save results'
    )
    parser.add_argument(
        '--format', '-f',
        choices=['text', 'json', 'csv'],
        default='text',
        help='Output format (default: text)'
    )
    
    args = parser.parse_args()
    
    generator = KaspaAddressGenerator(args.network)
    
    # Validate mode
    if args.validate:
        info = generator.get_address_info(args.validate)
        
        if info["valid"]:
            print(f"✓ Valid {info['network']} address")
            print(f"  Address: {info['address']}")
            print(f"  Prefix: {info['prefix']}")
            print(f"  Hash160: {info['hash160']}")
        else:
            print(f"✗ Invalid address: {info['error']}")
        
        return
    
    # Generate mode
    results = []
    compressed = not args.uncompressed
    
    print(f"Generating {args.count} address(es) for {args.network}...\n")
    
    for i in range(args.count):
        address, wif, private_key = generator.generate_address(compressed)
        
        result = {
            'index': i + 1,
            'address': address,
            'private_key_wif': wif,
            'private_key_hex': private_key.hex(),
            'network': args.network,
            'compressed': compressed
        }
        results.append(result)
        
        # Print to console
        if args.format == 'text':
            print(f"Address {i + 1}:")
            print(f"  Address:     {address}")
            print(f"  Private Key: {wif}")
            print(f"  Hex:         {private_key.hex()}")
            print()
    
    # Save to file if specified
    if args.output:
        if args.format == 'json':
            import json
            with open(args.output, 'w') as f:
                json.dump(results, f, indent=2)
        elif args.format == 'csv':
            import csv
            with open(args.output, 'w', newline='') as f:
                writer = csv.DictWriter(f, fieldnames=results[0].keys())
                writer.writeheader()
                writer.writerows(results)
        else:
            with open(args.output, 'w') as f:
                for result in results:
                    f.write(f"Address: {result['address']}\n")
                    f.write(f"Private Key: {result['private_key_wif']}\n")
                    f.write(f"Hex: {result['private_key_hex']}\n")
                    f.write("\n")
        
        print(f"Results saved to {args.output}")
    
    # Security warning
    print("⚠️  SECURITY WARNING:")
    print("   Keep your private keys secure and never share them!")
    print("   These keys are generated locally and are not stored anywhere.")


if __name__ == '__main__':
    main()
