# Kaspa Python SDK

Python SDKs for Kaspa blockchain development. While there isn't an official Python implementation, several community libraries are available.

## Installation

### Option 1: kaspa-python (Community)

```bash
pip install kaspa-python
```

### Option 2: Using WebAssembly

You can use the WASM SDK through Python's wasmtime or wasmer:

```bash
pip install wasmtime
```

### Option 3: REST API Client

```bash
pip install requests
```

## REST API Client

### Basic Client Setup

```python
import requests
from typing import Optional, Dict, Any, List

class KaspaClient:
    def __init__(self, api_key: str, base_url: str = "https://api.kaspa.org"):
        self.api_key = api_key
        self.base_url = base_url
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }

    def _post(self, endpoint: str, data: Dict[str, Any]) -> Dict[str, Any]:
        response = requests.post(
            f"{self.base_url}{endpoint}",
            json=data,
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()

    def _get(self, endpoint: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        response = requests.get(
            f"{self.base_url}{endpoint}",
            params=params,
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()
```

### Balance Operations

```python
class KaspaClient:
    # ... previous code ...

    def get_balance(self, address: str) -> int:
        """Get balance for a single address."""
        response = self._post("/api/v1/rpc/get-balance-by-address", {
            "address": address
        })
        return response["balance"]

    def get_balances(self, addresses: List[str]) -> Dict[str, int]:
        """Get balances for multiple addresses."""
        response = self._post("/api/v1/rpc/get-balances-by-addresses", {
            "addresses": addresses
        })
        return {
            entry["address"]: entry["balance"]
            for entry in response["entries"]
        }
```

### UTXO Operations

```python
class KaspaClient:
    # ... previous code ...

    def get_utxos(self, addresses: List[str]) -> List[Dict[str, Any]]:
        """Get UTXOs for addresses."""
        response = self._post("/api/v1/rpc/get-utxos-by-addresses", {
            "addresses": addresses
        })
        return response["entries"]
```

### Transaction Operations

```python
class KaspaClient:
    # ... previous code ...

    def submit_transaction(self, transaction: Dict[str, Any]) -> str:
        """Submit a signed transaction."""
        response = self._post("/api/v1/rpc/submit-transaction", {
            "transaction": transaction
        })
        return response["transactionId"]

    def get_transaction(self, tx_id: str) -> Dict[str, Any]:
        """Get transaction details."""
        return self._get(f"/api/v1/transactions/{tx_id}")

    def get_transactions(self, tx_ids: List[str]) -> List[Dict[str, Any]]:
        """Get multiple transactions."""
        response = self._post("/api/v1/transactions", {
            "transactionIds": tx_ids
        })
        return response["transactions"]
```

### Block Operations

```python
class KaspaClient:
    # ... previous code ...

    def get_block(self, block_hash: str, include_transactions: bool = True) -> Dict[str, Any]:
        """Get block by hash."""
        return self._get(f"/api/v1/blocks/{block_hash}")

    def get_block_dag_info(self) -> Dict[str, Any]:
        """Get block DAG information."""
        return self._post("/api/v1/rpc/get-block-dag-info", {})

    def get_sink(self) -> str:
        """Get sink block hash."""
        response = self._post("/api/v1/rpc/get-sink", {})
        return response["sink"]
```

### Fee Estimation

```python
class KaspaClient:
    # ... previous code ...

    def get_fee_estimate(self) -> Dict[str, Any]:
        """Get fee estimate."""
        return self._post("/api/v1/rpc/get-fee-estimate", {})
```

## Address Generation

### Using bech32 Library

```python
import bech32
import hashlib
import secrets
from typing import Tuple

def generate_private_key() -> bytes:
    """Generate a random 32-byte private key."""
    return secrets.token_bytes(32)

def private_key_to_public_key(private_key: bytes) -> bytes:
    """
    Convert private key to public key.
    Note: This requires secp256k1 library.
    """
    import secp256k1

    privkey = secp256k1.PrivateKey(private_key)
    pubkey = privkey.pubkey
    return pubkey.serialize()

def public_key_to_address(public_key: bytes, network: str = "mainnet") -> str:
    """Convert public key to Kaspa address."""
    # Calculate hash160
    sha256_hash = hashlib.sha256(public_key).digest()
    ripemd160 = hashlib.new('ripemd160')
    ripemd160.update(sha256_hash)
    hash160 = ripemd160.digest()

    # Encode with bech32
    prefix = "kaspa" if network == "mainnet" else f"kaspa{network}"
    converted = bech32.convertbits(hash160, 8, 5)
    address = bech32.bech32_encode(prefix, converted)

    return address

def validate_address(address: str) -> bool:
    """Validate a Kaspa address."""
    try:
        prefix, data = bech32.bech32_decode(address)
        if prefix not in ["kaspa", "kaspatest", "kaspadev"]:
            return False
        if data is None:
            return False
        return True
    except:
        return False

# Example usage
if __name__ == "__main__":
    # Generate new address
    private_key = generate_private_key()
    public_key = private_key_to_public_key(private_key)
    address = public_key_to_address(public_key)

    print(f"Address: {address}")
    print(f"Private Key: {private_key.hex()}")
```

## Transaction Building

### Transaction Structure

```python
from dataclasses import dataclass
from typing import List, Optional
import json

@dataclass
class Outpoint:
    transaction_id: str
    index: int

    def to_dict(self) -> dict:
        return {
            "transactionId": self.transaction_id,
            "index": self.index
        }

@dataclass
class TransactionInput:
    previous_outpoint: Outpoint
    signature_script: str
    sequence: int = 0
    sig_op_count: int = 1

    def to_dict(self) -> dict:
        return {
            "previousOutpoint": self.previous_outpoint.to_dict(),
            "signatureScript": self.signature_script,
            "sequence": self.sequence,
            "sigOpCount": self.sig_op_count
        }

@dataclass
class ScriptPublicKey:
    version: int
    script: str

    def to_dict(self) -> dict:
        return {
            "version": self.version,
            "script": self.script
        }

@dataclass
class TransactionOutput:
    amount: int
    script_public_key: ScriptPublicKey

    def to_dict(self) -> dict:
        return {
            "amount": self.amount,
            "scriptPublicKey": self.script_public_key.to_dict()
        }

@dataclass
class Transaction:
    version: int
    inputs: List[TransactionInput]
    outputs: List[TransactionOutput]
    lock_time: int = 0
    subnetwork_id: str = "00000000000000000000000000000000"
    gas: int = 0
    payload: str = ""

    def to_dict(self) -> dict:
        return {
            "version": self.version,
            "inputs": [inp.to_dict() for inp in self.inputs],
            "outputs": [out.to_dict() for out in self.outputs],
            "lockTime": self.lock_time,
            "subnetworkId": self.subnetwork_id,
            "gas": self.gas,
            "payload": self.payload
        }

    def to_json(self) -> str:
        return json.dumps(self.to_dict())
```

### Building a Transaction

```python
class TransactionBuilder:
    def __init__(self, client: KaspaClient):
        self.client = client

    def build_transaction(
        self,
        sender_address: str,
        recipient_address: str,
        amount: int,
        private_key: bytes
    ) -> Transaction:
        """Build a simple transaction."""
        # Get UTXOs
        utxos = self.client.get_utxos([sender_address])

        # Select UTXOs
        selected_utxos = []
        total_input = 0

        for utxo in utxos:
            selected_utxos.append(utxo)
            total_input += utxo["utxoEntry"]["amount"]

            if total_input >= amount:
                break

        if total_input < amount:
            raise ValueError("Insufficient funds")

        # Get fee estimate
        fee_estimate = self.client.get_fee_estimate()
        fee_rate = fee_estimate["normalBucket"]["feeRate"]

        # Calculate fee
        estimated_size = 200 + len(selected_utxos) * 150 + 35
        fee = fee_rate * estimated_size

        # Create recipient output
        recipient_script = self._address_to_script(recipient_address)
        outputs = [
            TransactionOutput(
                amount=amount,
                script_public_key=ScriptPublicKey(
                    version=0,
                    script=recipient_script
                )
            )
        ]

        # Add change output
        change = total_input - amount - fee
        if change > 546:  # Dust threshold
            sender_script = self._address_to_script(sender_address)
            outputs.append(
                TransactionOutput(
                    amount=change,
                    script_public_key=ScriptPublicKey(
                        version=0,
                        script=sender_script
                    )
                )
            )

        # Create inputs
        inputs = []
        for utxo in selected_utxos:
            inputs.append(
                TransactionInput(
                    previous_outpoint=Outpoint(
                        transaction_id=utxo["outpoint"]["transactionId"],
                        index=utxo["outpoint"]["index"]
                    ),
                    signature_script=""  # Will be filled after signing
                )
            )

        return Transaction(
            version=0,
            inputs=inputs,
            outputs=outputs
        )

    def _address_to_script(self, address: str) -> str:
        """Convert address to script public key."""
        # This is a simplified version
        # In production, use proper script generation
        import hashlib
        import bech32

        prefix, data = bech32.bech32_decode(address)
        hash160 = bytes(bech32.convertbits(data, 5, 8, False))

        # P2PKH script: OP_DUP OP_HASH160 <pubKeyHash> OP_EQUALVERIFY OP_CHECKSIG
        script = f"76a914{hash160.hex()}88ac"
        return script
```

## Mnemonic and HD Wallets

### BIP39 Implementation

```python
import hashlib
import hmac
import secrets
from typing import List

# BIP39 English word list (first 10 words as example)
WORD_LIST = [
    "abandon", "ability", "able", "about", "above", "absent", "absorb", "abstract",
    "absurd", "abuse", "access", "accident", "account", "accuse", "achieve", "acid",
    # ... full word list would be here
]

def generate_mnemonic(strength: int = 256) -> List[str]:
    """Generate BIP39 mnemonic phrase."""
    # Generate entropy
    entropy = secrets.token_bytes(strength // 8)

    # Calculate checksum
    checksum_length = strength // 32
    checksum = hashlib.sha256(entropy).digest()
    checksum_bits = bin(checksum[0])[2:].zfill(8)[:checksum_length]

    # Convert to binary string
    entropy_bits = ''.join(format(b, '08b') for b in entropy)
    bits = entropy_bits + checksum_bits

    # Split into 11-bit groups
    words = []
    for i in range(0, len(bits), 11):
        index = int(bits[i:i+11], 2)
        words.append(WORD_LIST[index])

    return words

def mnemonic_to_seed(mnemonic: List[str], passphrase: str = "") -> bytes:
    """Convert mnemonic to seed."""
    mnemonic_str = " ".join(mnemonic)
    salt = ("mnemonic" + passphrase).encode()

    # PBKDF2
    seed = hashlib.pbkdf2_hmac(
        'sha512',
        mnemonic_str.encode(),
        salt,
        2048
    )

    return seed
```

### BIP32 HD Wallet

```python
import hmac
import hashlib
import struct
from typing import Tuple

class HDKey:
    def __init__(self, key: bytes, chain_code: bytes, depth: int = 0,
                 index: int = 0, parent_fingerprint: bytes = b'\x00\x00\x00\x00'):
        self.key = key
        self.chain_code = chain_code
        self.depth = depth
        self.index = index
        self.parent_fingerprint = parent_fingerprint

    def derive_child(self, index: int) -> 'HDKey':
        """Derive child key at given index."""
        # Data to HMAC
        if index >= 0x80000000:  # Hardened
            data = b'\x00' + self.key + struct.pack('>I', index)
        else:
            # Get public key
            public_key = self._private_to_public(self.key)
            data = public_key + struct.pack('>I', index)

        # HMAC-SHA512
        hmac_result = hmac.new(self.chain_code, data, hashlib.sha512).digest()

        # Split result
        left = hmac_result[:32]
        right = hmac_result[32:]

        # Calculate child key
        child_key = (int.from_bytes(left, 'big') +
                    int.from_bytes(self.key, 'big')) % (2**256)
        child_key_bytes = child_key.to_bytes(32, 'big')

        # Fingerprint
        public_key = self._private_to_public(self.key)
        fingerprint = hashlib.new('ripemd160',
                                 hashlib.sha256(public_key).digest()).digest()[:4]

        return HDKey(
            key=child_key_bytes,
            chain_code=right,
            depth=self.depth + 1,
            index=index,
            parent_fingerprint=fingerprint
        )

    def derive_path(self, path: str) -> 'HDKey':
        """Derive key from path string (e.g., "m/44'/111111'/0'/0/0")."""
        indices = path.replace("m/", "").split("/")
        key = self

        for index_str in indices:
            if "'" in index_str:
                index = int(index_str.replace("'", "")) + 0x80000000
            else:
                index = int(index_str)
            key = key.derive_child(index)

        return key

    def _private_to_public(self, private_key: bytes) -> bytes:
        """Convert private key to public key."""
        import secp256k1
        privkey = secp256k1.PrivateKey(private_key)
        return privkey.pubkey.serialize()

    @classmethod
    def from_seed(cls, seed: bytes) -> 'HDKey':
        """Create master key from seed."""
        hmac_result = hmac.new(b'Bitcoin seed', seed, hashlib.sha512).digest()
        return cls(key=hmac_result[:32], chain_code=hmac_result[32:])
```

## Error Handling

```python
class KaspaError(Exception):
    """Base exception for Kaspa operations."""
    pass

class InsufficientFundsError(KaspaError):
    """Raised when there are insufficient funds."""
    pass

class InvalidAddressError(KaspaError):
    """Raised when address is invalid."""
    pass

class TransactionError(KaspaError):
    """Raised when transaction fails."""
    pass

class RPCError(KaspaError):
    """Raised when RPC call fails."""
    def __init__(self, message: str, code: int = None):
        super().__init__(message)
        self.code = code
```

## Complete Example

```python
#!/usr/bin/env python3
"""
Complete example of using Kaspa Python SDK
"""

from kaspa_client import KaspaClient
from transaction import TransactionBuilder
from address import generate_private_key, private_key_to_public_key, public_key_to_address
from mnemonic import generate_mnemonic, mnemonic_to_seed
from hd_wallet import HDKey

def main():
    # Initialize client
    client = KaspaClient(api_key="your-api-key")

    # Generate mnemonic
    mnemonic = generate_mnemonic(24)
    print(f"Mnemonic: {' '.join(mnemonic)}")

    # Generate seed
    seed = mnemonic_to_seed(mnemonic)

    # Create HD wallet
    master_key = HDKey.from_seed(seed)

    # Derive Kaspa address (coin type 111111)
    kaspa_key = master_key.derive_path("m/44'/111111'/0'/0/0")

    # Get address
    public_key = kaspa_key._private_to_public(kaspa_key.key)
    address = public_key_to_address(public_key)
    print(f"Address: {address}")

    # Check balance
    balance = client.get_balance(address)
    print(f"Balance: {balance} sompi")

    # Build transaction (if balance > 0)
    if balance > 0:
        builder = TransactionBuilder(client)

        tx = builder.build_transaction(
            sender_address=address,
            recipient_address="kaspa:recipient_address_here",
            amount=1000000,  # 0.01 KAS
            private_key=kaspa_key.key
        )

        print(f"Transaction: {tx.to_json()}")

        # Submit transaction
        # tx_id = client.submit_transaction(tx.to_dict())
        # print(f"Transaction ID: {tx_id}")

if __name__ == "__main__":
    main()
```

## Best Practices

1. **Use environment variables** for API keys
2. **Validate all addresses** before using them
3. **Implement proper error handling** for all operations
4. **Use testnet** for development and testing
5. **Secure private keys** - never hardcode them
6. **Use proper UTXO selection** algorithms
7. **Implement fee estimation** for timely confirmations

## Resources

- **PyPI**: Search for `kaspa-python` or related packages
- **GitHub**: https://github.com/kaspanet (for reference implementations)
- **Documentation**: https://docs.kas.fyi/
- **Bech32**: https://github.com/sipa/bech32 (for address encoding)
- **secp256k1**: https://github.com/ludbb/secp256k1-py

## Dependencies

```txt
requests>=2.28.0
bech32>=1.2.0
secp256k1>=0.14.0
```
