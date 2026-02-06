#!/usr/bin/env python3
"""
Kaspa Transaction Builder

Builds and signs Kaspa transactions. Supports sending KAS and KRC20 tokens.

Usage:
    python build-transaction.py --from-address ADDRESS --to-address ADDRESS --amount AMOUNT

Example:
    python build-transaction.py \
        --from-address kaspa:qqkqkzjvr7zwxxmjxjkmxx \
        --to-address kaspa:qqkqkzjvr7zwxxmjxjkmxy \
        --amount 100000000 \
        --private-key YOUR_PRIVATE_KEY_WIF
"""

import argparse
import json
import sys
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, asdict

try:
    import requests
except ImportError:
    print("Error: requests library not found. Install with: pip install requests")
    sys.exit(1)


@dataclass
class Outpoint:
    """Transaction outpoint reference."""
    transaction_id: str
    index: int
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "transactionId": self.transaction_id,
            "index": self.index
        }


@dataclass
class TransactionInput:
    """Transaction input (spending a UTXO)."""
    previous_outpoint: Outpoint
    signature_script: str
    sequence: int = 0
    sig_op_count: int = 1
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "previousOutpoint": self.previous_outpoint.to_dict(),
            "signatureScript": self.signature_script,
            "sequence": self.sequence,
            "sigOpCount": self.sig_op_count
        }


@dataclass
class ScriptPublicKey:
    """Script public key for outputs."""
    version: int
    script: str
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "version": self.version,
            "script": self.script
        }


@dataclass
class TransactionOutput:
    """Transaction output (creating a UTXO)."""
    amount: int
    script_public_key: ScriptPublicKey
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "amount": self.amount,
            "scriptPublicKey": self.script_public_key.to_dict()
        }


@dataclass
class Transaction:
    """Kaspa transaction."""
    version: int
    inputs: List[TransactionInput]
    outputs: List[TransactionOutput]
    lock_time: int = 0
    subnetwork_id: str = "00000000000000000000000000000000"
    gas: int = 0
    payload: str = ""
    
    def to_dict(self) -> Dict[str, Any]:
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
        return json.dumps(self.to_dict(), indent=2)


class KaspaRPCClient:
    """RPC client for Kaspa Developer Platform API."""
    
    def __init__(self, api_key: str, base_url: str = "https://api.kaspa.org"):
        self.api_key = api_key
        self.base_url = base_url
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
    
    def _post(self, endpoint: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Make POST request to API."""
        response = requests.post(
            f"{self.base_url}{endpoint}",
            json=data,
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()
    
    def _get(self, endpoint: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Make GET request to API."""
        response = requests.get(
            f"{self.base_url}{endpoint}",
            params=params,
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()
    
    def get_balance(self, address: str) -> int:
        """Get balance for an address."""
        response = self._post("/api/v1/rpc/get-balance-by-address", {
            "address": address
        })
        return response["balance"]
    
    def get_utxos(self, addresses: List[str]) -> List[Dict[str, Any]]:
        """Get UTXOs for addresses."""
        response = self._post("/api/v1/rpc/get-utxos-by-addresses", {
            "addresses": addresses
        })
        return response["entries"]
    
    def get_fee_estimate(self) -> Dict[str, Any]:
        """Get fee estimate from network."""
        return self._post("/api/v1/rpc/get-fee-estimate", {})
    
    def submit_transaction(self, transaction: Dict[str, Any]) -> str:
        """Submit a signed transaction."""
        response = self._post("/api/v1/rpc/submit-transaction", {
            "transaction": transaction
        })
        return response["transactionId"]


class TransactionBuilder:
    """Build Kaspa transactions."""
    
    DUST_THRESHOLD = 546  # Minimum amount for non-dust output
    
    def __init__(self, rpc_client: KaspaRPCClient):
        self.rpc = rpc_client
    
    def build_transaction(
        self,
        sender_address: str,
        recipient_address: str,
        amount: int,
        private_key_wif: Optional[str] = None,
        fee_rate: Optional[int] = None
    ) -> Transaction:
        """Build a simple KAS transfer transaction.
        
        Args:
            sender_address: Sender's Kaspa address
            recipient_address: Recipient's Kaspa address
            amount: Amount to send in sompi (1 KAS = 100,000,000 sompi)
            private_key_wif: Optional private key for signing
            fee_rate: Optional custom fee rate (uses network estimate if not provided)
        
        Returns:
            Unsigned or signed Transaction object
        """
        # Get UTXOs for sender
        utxos = self.rpc.get_utxos([sender_address])
        
        if not utxos:
            raise ValueError(f"No UTXOs found for address {sender_address}")
        
        # Select UTXOs
        selected_utxos, total_input = self._select_utxos(utxos, amount)
        
        if total_input < amount:
            raise ValueError(
                f"Insufficient funds. Have: {total_input}, Need: {amount}"
            )
        
        # Get fee estimate
        if fee_rate is None:
            fee_estimate = self.rpc.get_fee_estimate()
            fee_rate = fee_estimate["normalBucket"]["feeRate"]
        
        # Calculate fee (simplified estimation)
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
        
        # Add change output if needed
        change = total_input - amount - fee
        if change > self.DUST_THRESHOLD:
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
                    signature_script=""  # To be filled during signing
                )
            )
        
        # Create transaction
        transaction = Transaction(
            version=0,
            inputs=inputs,
            outputs=outputs
        )
        
        # Sign if private key provided
        if private_key_wif:
            transaction = self._sign_transaction(transaction, private_key_wif)
        
        return transaction
    
    def build_krc20_transfer(
        self,
        sender_address: str,
        recipient_address: str,
        ticker: str,
        amount: str,
        private_key_wif: Optional[str] = None
    ) -> Transaction:
        """Build a KRC20 token transfer transaction.
        
        Args:
            sender_address: Sender's Kaspa address
            recipient_address: Recipient's Kaspa address
            ticker: KRC20 token ticker (e.g., "KASPER")
            amount: Token amount (as string for precision)
            private_key_wif: Optional private key for signing
        
        Returns:
            Unsigned or signed Transaction object
        """
        # Build KRC20 payload
        payload = f"krc20|transfer|tick={ticker}|amt={amount}|to={recipient_address}"
        
        # Get UTXOs for gas
        utxos = self.rpc.get_utxos([sender_address])
        
        if not utxos:
            raise ValueError(f"No UTXOs found for address {sender_address}")
        
        # Select UTXO for gas (need minimal amount)
        selected_utxos = [utxos[0]]
        total_input = utxos[0]["utxoEntry"]["amount"]
        
        # Get fee estimate
        fee_estimate = self.rpc.get_fee_estimate()
        fee_rate = fee_estimate["normalBucket"]["feeRate"]
        
        # Calculate fee (KRC20 transactions are slightly larger)
        estimated_size = 300 + len(payload)
        fee = fee_rate * estimated_size
        
        # Create output (0 amount for KRC20)
        sender_script = self._address_to_script(sender_address)
        outputs = [
            TransactionOutput(
                amount=0,
                script_public_key=ScriptPublicKey(
                    version=0,
                    script=sender_script
                )
            )
        ]
        
        # Add change output
        change = total_input - fee
        if change > self.DUST_THRESHOLD:
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
        inputs = [
            TransactionInput(
                previous_outpoint=Outpoint(
                    transaction_id=utxos[0]["outpoint"]["transactionId"],
                    index=utxos[0]["outpoint"]["index"]
                ),
                signature_script=""
            )
        ]
        
        # Create transaction with KRC20 payload
        transaction = Transaction(
            version=0,
            inputs=inputs,
            outputs=outputs,
            payload=payload.encode().hex()
        )
        
        # Sign if private key provided
        if private_key_wif:
            transaction = self._sign_transaction(transaction, private_key_wif)
        
        return transaction
    
    def _select_utxos(
        self,
        utxos: List[Dict[str, Any]],
        target_amount: int
    ) -> Tuple[List[Dict[str, Any]], int]:
        """Select UTXOs to meet target amount.
        
        Uses a simple largest-first selection strategy.
        """
        # Sort by amount (largest first)
        sorted_utxos = sorted(
            utxos,
            key=lambda u: u["utxoEntry"]["amount"],
            reverse=True
        )
        
        selected = []
        total = 0
        
        for utxo in sorted_utxos:
            selected.append(utxo)
            total += utxo["utxoEntry"]["amount"]
            
            if total >= target_amount:
                break
        
        return selected, total
    
    def _address_to_script(self, address: str) -> str:
        """Convert address to script public key.
        
        This is a simplified version. In production, use proper script building.
        """
        try:
            import bech32
            
            # Decode bech32 address
            prefix, data = bech32.bech32_decode(address)
            
            if data is None:
                raise ValueError(f"Invalid address: {address}")
            
            # Convert from 5-bit to 8-bit
            hash160 = bytes(bech32.convertbits(data, 5, 8, False))
            
            # P2PKH script: OP_DUP OP_HASH160 <pubKeyHash> OP_EQUALVERIFY OP_CHECKSIG
            # 76a914{hash160}88ac
            script = f"76a914{hash160.hex()}88ac"
            
            return script
        except ImportError:
            raise ImportError("bech32 library required. Install with: pip install bech32")
    
    def _sign_transaction(
        self,
        transaction: Transaction,
        private_key_wif: str
    ) -> Transaction:
        """Sign a transaction with a private key.
        
        Note: This is a placeholder. Real signing requires:
        1. secp256k1 library for ECDSA signatures
        2. Proper sighash calculation
        3. Schnorr signature support (Kaspa uses Schnorr)
        
        For production use, use the official SDKs or a proper signing library.
        """
        print("WARNING: Transaction signing not fully implemented in this script.")
        print("Please use official Kaspa SDKs for production signing:")
        print("  - JavaScript: kaspa-wasm")
        print("  - Rust: kaspa-wallet-core")
        print("  - Go: github.com/kaspanet/kaspad")
        
        # Return unsigned transaction
        return transaction


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description='Build Kaspa transactions'
    )
    parser.add_argument(
        '--api-key', '-k',
        required=True,
        help='Kaspa Developer Platform API key'
    )
    parser.add_argument(
        '--from-address', '-f',
        required=True,
        help='Sender address'
    )
    parser.add_argument(
        '--to-address', '-t',
        required=True,
        help='Recipient address'
    )
    parser.add_argument(
        '--amount', '-a',
        required=True,
        type=int,
        help='Amount in sompi (1 KAS = 100,000,000 sompi)'
    )
    parser.add_argument(
        '--private-key', '-p',
        help='Private key in WIF format (optional, for signing)'
    )
    parser.add_argument(
        '--krc20-ticker',
        help='KRC20 token ticker (for token transfers)'
    )
    parser.add_argument(
        '--fee-rate',
        type=int,
        help='Custom fee rate (optional)'
    )
    parser.add_argument(
        '--submit', '-s',
        action='store_true',
        help='Submit transaction after building'
    )
    parser.add_argument(
        '--output', '-o',
        help='Output file for transaction JSON'
    )
    
    args = parser.parse_args()
    
    # Initialize RPC client
    rpc = KaspaRPCClient(args.api_key)
    builder = TransactionBuilder(rpc)
    
    try:
        # Build transaction
        if args.krc20_ticker:
            # KRC20 token transfer
            print(f"Building KRC20 transfer...")
            print(f"  Token: {args.krc20_ticker}")
            print(f"  Amount: {args.amount}")
            
            transaction = builder.build_krc20_transfer(
                sender_address=args.from_address,
                recipient_address=args.to_address,
                ticker=args.krc20_ticker,
                amount=str(args.amount),
                private_key_wif=args.private_key
            )
        else:
            # KAS transfer
            print(f"Building KAS transfer...")
            print(f"  Amount: {args.amount} sompi ({args.amount / 100_000_000} KAS)")
            
            transaction = builder.build_transaction(
                sender_address=args.from_address,
                recipient_address=args.to_address,
                amount=args.amount,
                private_key_wif=args.private_key,
                fee_rate=args.fee_rate
            )
        
        print(f"\nTransaction built successfully!")
        print(f"Inputs: {len(transaction.inputs)}")
        print(f"Outputs: {len(transaction.outputs)}")
        
        # Display transaction
        tx_json = transaction.to_json()
        print(f"\nTransaction JSON:\n{tx_json}")
        
        # Save to file if specified
        if args.output:
            with open(args.output, 'w') as f:
                f.write(tx_json)
            print(f"\nTransaction saved to {args.output}")
        
        # Submit if requested
        if args.submit:
            if not args.private_key:
                print("\nError: Cannot submit unsigned transaction. Provide --private-key")
                sys.exit(1)
            
            print("\nSubmitting transaction...")
            tx_id = rpc.submit_transaction(transaction.to_dict())
            print(f"Transaction submitted! ID: {tx_id}")
        
    except ValueError as e:
        print(f"\nError: {e}")
        sys.exit(1)
    except requests.exceptions.RequestException as e:
        print(f"\nAPI Error: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()
