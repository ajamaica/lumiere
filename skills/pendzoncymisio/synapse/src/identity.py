#!/usr/bin/env python3
"""
identity.py - Post-Quantum Identity Management for HiveBrain

Handles ML-DSA-87 (CRYSTALS-Dilithium) signatures for agent authentication
and quality attestations. Uses liboqs for PQ-secure cryptography.

Copyright (c) 2026 HiveBrain Project
"""

import os
import json
import base64
import hashlib
from pathlib import Path
from typing import Optional, Dict, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime, timezone

try:
    import oqs
    OQS_AVAILABLE = True
except ImportError:
    OQS_AVAILABLE = False
    print("Warning: liboqs-python not available. Install with: pip install liboqs-python")

try:
    from cryptography.hazmat.primitives.asymmetric import ed25519
    from cryptography.hazmat.primitives import serialization
    ED25519_AVAILABLE = True
except ImportError:
    ED25519_AVAILABLE = False


@dataclass
class AgentIdentity:
    """
    Represents a PQ-secure agent identity using ML-DSA-87.
    
    Attributes:
        agent_id: Unique identifier (hash of public key)
        algorithm: Signature algorithm (ML-DSA-87)
        public_key: Base64-encoded public key
        created_at: Timestamp of key generation
        metadata: Additional agent metadata (name, version, etc.)
    """
    agent_id: str
    algorithm: str
    public_key: str
    created_at: str
    metadata: Dict[str, str]
    
    def to_dict(self) -> Dict:
        """Export identity as dictionary."""
        return asdict(self)
    
    def to_json(self) -> str:
        """Export identity as JSON."""
        return json.dumps(self.to_dict(), indent=2)
    
    @classmethod
    def from_dict(cls, data: Dict) -> 'AgentIdentity':
        """Load identity from dictionary."""
        return cls(**data)
    
    @classmethod
    def from_json(cls, json_str: str) -> 'AgentIdentity':
        """Load identity from JSON."""
        return cls.from_dict(json.loads(json_str))


class IdentityManager:
    """
    Manages PQ-secure agent identities and signatures.
    
    Supports both "root" identities (loaded from disk) and ephemeral
    "session" identities for short-lived attestations.
    """
    
    ALGORITHM = "ML-DSA-87"  # NIST standard, highest security level
    FALLBACK_ALGORITHM = "Ed25519"  # Classical fallback for compatibility
    
    def __init__(self, identity_dir: Optional[Path] = None):
        """
        Initialize the identity manager.
        
        Args:
            identity_dir: Directory to store identity files.
                         Defaults to ~/.openclaw/identity/
        """
        if identity_dir is None:
            identity_dir = Path.home() / ".openclaw" / "identity"
        
        self.identity_dir = Path(identity_dir)
        self.identity_dir.mkdir(parents=True, exist_ok=True)
        
        self._private_key: Optional[bytes] = None
        self._public_key: Optional[bytes] = None
        self._signer: Optional[oqs.Signature] = None
        self._ed25519_key: Optional[ed25519.Ed25519PrivateKey] = None
        self._identity: Optional[AgentIdentity] = None
        self._algorithm: str = self.ALGORITHM
        
        if not OQS_AVAILABLE and not ED25519_AVAILABLE:
            raise RuntimeError(
                "Either liboqs-python or cryptography is required. "
                "Install with: pip install liboqs-python cryptography"
            )
    
    def generate_identity(
        self, 
        name: str = "agent",
        force: bool = False,
        metadata: Optional[Dict[str, str]] = None
    ) -> AgentIdentity:
        """
        Generate a new ML-DSA-87 keypair.
        
        Args:
            name: Agent name (used for file naming)
            force: Overwrite existing identity
            metadata: Additional metadata to store
            
        Returns:
            AgentIdentity object
            
        Raises:
            FileExistsError: If identity exists and force=False
        """
        private_key_path = self.identity_dir / f"{name}_private.key"
        public_key_path = self.identity_dir / f"{name}_public.key"
        identity_path = self.identity_dir / f"{name}_identity.json"
        
        if identity_path.exists() and not force:
            raise FileExistsError(
                f"Identity already exists at {identity_path}. "
                "Use force=True to overwrite."
            )
        
        # Generate ML-DSA-87 keypair
        with oqs.Signature(self.ALGORITHM) as signer:
            public_key = signer.generate_keypair()
            private_key = signer.export_secret_key()
        
        # Compute agent_id from public key hash
        agent_id = hashlib.sha256(public_key).hexdigest()[:16]
        
        # Create identity object
        identity = AgentIdentity(
            agent_id=agent_id,
            algorithm=self.ALGORITHM,
            public_key=base64.b64encode(public_key).decode('utf-8'),
            created_at=datetime.now(timezone.utc).isoformat(),
            metadata=metadata or {}
        )
        
        # Save keys to disk
        private_key_path.write_bytes(private_key)
        public_key_path.write_bytes(public_key)
        identity_path.write_text(identity.to_json())
        
        # Set restrictive permissions (Unix-style)
        os.chmod(private_key_path, 0o600)
        os.chmod(public_key_path, 0o644)
        os.chmod(identity_path, 0o644)
        
        print(f"✓ Generated ML-DSA-87 identity: {agent_id}")
        print(f"  Private key: {private_key_path}")
        print(f"  Public key:  {public_key_path}")
        print(f"  Identity:    {identity_path}")
        
        return identity
    
    def load_identity(self, name: str = "agent") -> AgentIdentity:
        """
        Load an existing identity from disk.
        Supports both ML-DSA-87 (.key) and Ed25519 (.pem) formats.
        
        Args:
            name: Agent name
            
        Returns:
            AgentIdentity object
            
        Raises:
            FileNotFoundError: If identity doesn't exist
        """
        # Try ML-DSA-87 format first
        private_key_path = self.identity_dir / f"{name}_private.key"
        public_key_path = self.identity_dir / f"{name}_public.key"
        identity_path = self.identity_dir / f"{name}_identity.json"
        
        # Fallback to PEM format (Ed25519 or ML-DSA-87)
        if not identity_path.exists():
            private_key_path = self.identity_dir / f"{name}_private.pem"
            public_key_path = self.identity_dir / f"{name}_public.pem"
            agent_id_path = self.identity_dir / "agent_id.txt"
            algorithm_path = self.identity_dir / "algorithm.txt"
            
            if private_key_path.exists():
                # Check algorithm type
                algorithm = "Ed25519"  # default
                if algorithm_path.exists():
                    algorithm = algorithm_path.read_text().strip()
                
                if algorithm == "ML-DSA-87":
                    # For ML-DSA, just read the PEM files as-is (OpenSSL format)
                    return self._load_mldsa_pem_identity(name, private_key_path, public_key_path, agent_id_path, algorithm)
                elif ED25519_AVAILABLE:
                    # Load Ed25519 identity
                    return self._load_ed25519_identity(name, private_key_path, public_key_path, agent_id_path, algorithm_path)
                else:
                    raise RuntimeError("Ed25519 not available and algorithm is not ML-DSA-87")
            else:
                raise FileNotFoundError(
                    f"Identity not found at {identity_path}. "
                    f"Run setup_identity.sh or use generate_identity() first."
                )
        
        # Load ML-DSA-87 keys
        self._private_key = private_key_path.read_bytes()
        self._public_key = public_key_path.read_bytes()
        
        # Initialize signer
        if OQS_AVAILABLE:
            self._signer = oqs.Signature(self.ALGORITHM, self._private_key)
        
        # Load identity metadata
        self._identity = AgentIdentity.from_json(identity_path.read_text())
        self._algorithm = self._identity.algorithm
        
        return self._identity
    
    def _load_ed25519_identity(self, name: str, private_key_path: Path, public_key_path: Path, 
                                 agent_id_path: Path, algorithm_path: Path) -> AgentIdentity:
        """Load Ed25519 identity from old format."""
        # Load Ed25519 keys
        private_pem = private_key_path.read_bytes()
        self._ed25519_key = serialization.load_pem_private_key(private_pem, password=None)
        
        public_pem = public_key_path.read_bytes()
        public_key = serialization.load_pem_public_key(public_pem)
        
        # Get agent ID
        if agent_id_path.exists():
            agent_id = agent_id_path.read_text().strip()
        else:
            # Generate from public key
            public_bytes = public_key.public_bytes(
                encoding=serialization.Encoding.Raw,
                format=serialization.PublicFormat.Raw
            )
            agent_id = hashlib.sha256(public_bytes).hexdigest()[:16]
        
        # Create identity object
        public_b64 = base64.b64encode(public_pem).decode('utf-8')
        self._identity = AgentIdentity(
            agent_id=agent_id,
            algorithm=self.FALLBACK_ALGORITHM,
            public_key=public_b64,
            created_at=datetime.now(timezone.utc).isoformat(),
            metadata={"source": "legacy_ed25519"}
        )
        self._algorithm = self.FALLBACK_ALGORITHM
        
        return self._identity
    
    def _load_mldsa_pem_identity(self, name: str, private_key_path: Path, public_key_path: Path,
                                   agent_id_path: Path, algorithm: str) -> AgentIdentity:
        """Load ML-DSA-87 identity from OpenSSL PEM format (does not need liboqs)."""
        # Read PEM files
        private_pem = private_key_path.read_bytes()
        public_pem = public_key_path.read_bytes()
        
        # Get agent ID
        if agent_id_path.exists():
            agent_id = agent_id_path.read_text().strip()
        else:
            # Generate from public key hash
            agent_id = hashlib.sha256(public_pem).hexdigest()[:16]
        
        # Store for signing (will use OpenSSL subprocess)
        self._mldsa_private_pem = private_pem
        self._mldsa_public_pem = public_pem
        
        # Create identity object
        public_b64 = base64.b64encode(public_pem).decode("utf-8")
        self._identity = AgentIdentity(
            agent_id=agent_id,
            algorithm=algorithm,
            public_key=public_b64,
            created_at=datetime.now(timezone.utc).isoformat(),
            metadata={"source": "openssl_mldsa"}
        )
        self._algorithm = algorithm
        
        return self._identity

    def sign_message(self, message: bytes) -> str:
        """
        Sign a message with the loaded private key.
        
        Args:
            message: Raw message bytes
            
        Returns:
            Base64-encoded signature
            
        Raises:
            RuntimeError: If no identity is loaded
        """
        if self._algorithm == self.FALLBACK_ALGORITHM and self._ed25519_key:
            # Use Ed25519 signing
            signature = self._ed25519_key.sign(message)
            return base64.b64encode(signature).decode('utf-8')
        elif self._signer is not None:
            # Use ML-DSA-87 signing with liboqs
            signature = self._signer.sign(message)
            return base64.b64encode(signature).decode('utf-8')
        elif hasattr(self, '_mldsa_private_pem') and self._algorithm == "ML-DSA-87":
            # Use OpenSSL for ML-DSA signing
            signature = self._sign_with_openssl(message)
            return base64.b64encode(signature).decode('utf-8')
        else:
            raise RuntimeError("No identity loaded. Call load_identity() first.")
    
    def _sign_with_openssl(self, message: bytes) -> bytes:
        """Sign a message using OpenSSL subprocess for ML-DSA."""
        import subprocess
        import tempfile
        
        # Write private key to temp file
        with tempfile.NamedTemporaryFile(mode="wb", delete=False, suffix=".pem") as key_file:
            key_file.write(self._mldsa_private_pem)
            key_path = key_file.name
        
        # Write message to temp file
        with tempfile.NamedTemporaryFile(mode="wb", delete=False) as msg_file:
            msg_file.write(message)
            msg_path = msg_file.name
        
        try:
            # Sign with OpenSSL
            result = subprocess.run(
                ["openssl", "pkeyutl", "-sign", "-inkey", key_path, "-in", msg_path],
                capture_output=True,
                check=True
            )
            return result.stdout
        finally:
            # Clean up temp files
            import os
            os.unlink(key_path)
            os.unlink(msg_path)

    def sign_json(self, data: Dict) -> str:
        """
        Sign a JSON-serializable dictionary.
        
        Args:
            data: Dictionary to sign
            
        Returns:
            Base64-encoded signature
        """
        message = json.dumps(data, sort_keys=True).encode('utf-8')
        return self.sign_message(message)
    
    def verify_signature(
        self, 
        message: bytes, 
        signature: str, 
        public_key: str
    ) -> bool:
        """
        Verify a signature against a public key.
        
        Args:
            message: Original message bytes
            signature: Base64-encoded signature
            public_key: Base64-encoded public key
            
        Returns:
            True if signature is valid
        """
        try:
            sig_bytes = base64.b64decode(signature)
            pubkey_bytes = base64.b64decode(public_key)
            
            with oqs.Signature(self.ALGORITHM) as verifier:
                return verifier.verify(message, sig_bytes, pubkey_bytes)
        except Exception as e:
            print(f"Signature verification failed: {e}")
            return False
    
    def verify_json_signature(
        self,
        data: Dict,
        signature: str,
        public_key: str
    ) -> bool:
        """
        Verify a signature for JSON data.
        
        Args:
            data: Dictionary that was signed
            signature: Base64-encoded signature
            public_key: Base64-encoded public key
            
        Returns:
            True if signature is valid
        """
        message = json.dumps(data, sort_keys=True).encode('utf-8')
        return self.verify_signature(message, signature, public_key)
    
    def get_agent_id(self) -> str:
        """Get the current agent's ID."""
        if self._identity is None:
            raise RuntimeError("No identity loaded.")
        return self._identity.agent_id
    
    def get_public_key(self) -> str:
        """Get the current agent's public key (base64)."""
        if self._identity is None:
            raise RuntimeError("No identity loaded.")
        return self._identity.public_key
    
    def export_identity_for_sharing(self) -> Dict:
        """
        Export public identity for sharing with peers.
        
        Returns:
            Dictionary with agent_id, algorithm, public_key, metadata
        """
        if self._identity is None:
            raise RuntimeError("No identity loaded.")
        
        return {
            "agent_id": self._identity.agent_id,
            "algorithm": self._identity.algorithm,
            "public_key": self._identity.public_key,
            "metadata": self._identity.metadata
        }


class QualityAttestation:
    """
    Represents a signed quality attestation for a memory shard.
    
    When an agent downloads and successfully uses a memory shard,
    it creates a signed attestation that can be broadcast to the network.
    """
    
    def __init__(
        self,
        shard_hash: str,
        provider_agent_id: str,
        consumer_agent_id: str,
        rating: float,  # 0.0 to 1.0
        feedback: str,
        timestamp: Optional[str] = None
    ):
        """
        Create a quality attestation.
        
        Args:
            shard_hash: Hash of the memory shard
            provider_agent_id: Agent who provided the shard
            consumer_agent_id: Agent who used the shard
            rating: Quality score (0.0 = useless, 1.0 = excellent)
            feedback: Human-readable feedback
            timestamp: ISO timestamp (defaults to now)
        """
        self.shard_hash = shard_hash
        self.provider_agent_id = provider_agent_id
        self.consumer_agent_id = consumer_agent_id
        self.rating = max(0.0, min(1.0, rating))  # Clamp to [0, 1]
        self.feedback = feedback
        self.timestamp = timestamp or datetime.now(timezone.utc).isoformat()
        self.signature: Optional[str] = None
    
    def to_dict(self) -> Dict:
        """Export attestation as dictionary."""
        return {
            "shard_hash": self.shard_hash,
            "provider_agent_id": self.provider_agent_id,
            "consumer_agent_id": self.consumer_agent_id,
            "rating": self.rating,
            "feedback": self.feedback,
            "timestamp": self.timestamp,
            "signature": self.signature
        }
    
    def sign(self, identity_manager: IdentityManager) -> None:
        """
        Sign the attestation with the consumer's identity.
        
        Args:
            identity_manager: Loaded identity manager
        """
        # Create canonical representation (without signature)
        data = self.to_dict()
        data.pop("signature", None)
        
        # Sign
        self.signature = identity_manager.sign_json(data)
    
    def verify(self, consumer_public_key: str) -> bool:
        """
        Verify the attestation signature.
        
        Args:
            consumer_public_key: Base64-encoded public key of consumer
            
        Returns:
            True if signature is valid
        """
        if self.signature is None:
            return False
        
        # Reconstruct canonical data
        data = self.to_dict()
        sig = data.pop("signature")
        
        # Verify
        manager = IdentityManager()
        return manager.verify_json_signature(data, sig, consumer_public_key)
    
    def to_json(self) -> str:
        """Export attestation as JSON."""
        return json.dumps(self.to_dict(), indent=2)
    
    @classmethod
    def from_dict(cls, data: Dict) -> 'QualityAttestation':
        """Load attestation from dictionary."""
        attestation = cls(
            shard_hash=data["shard_hash"],
            provider_agent_id=data["provider_agent_id"],
            consumer_agent_id=data["consumer_agent_id"],
            rating=data["rating"],
            feedback=data["feedback"],
            timestamp=data["timestamp"]
        )
        attestation.signature = data.get("signature")
        return attestation
    
    @classmethod
    def from_json(cls, json_str: str) -> 'QualityAttestation':
        """Load attestation from JSON."""
        return cls.from_dict(json.loads(json_str))


# Example usage
if __name__ == "__main__":
    print("=== ML-DSA-87 Identity Management Demo ===\n")
    
    # Generate a new identity
    manager = IdentityManager()
    
    try:
        identity = manager.generate_identity(
            name="test_agent",
            force=True,
            metadata={"version": "1.0", "model": "openclaw-v2"}
        )
        
        print(f"\n✓ Identity created: {identity.agent_id}")
        print(f"  Algorithm: {identity.algorithm}")
        print(f"  Created: {identity.created_at}")
        
        # Load the identity
        manager.load_identity("test_agent")
        
        # Sign a message
        test_data = {
            "action": "share_memory",
            "shard_hash": "abc123",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        signature = manager.sign_json(test_data)
        print(f"\n✓ Signed message")
        print(f"  Signature (first 64 chars): {signature[:64]}...")
        
        # Verify signature
        is_valid = manager.verify_json_signature(
            test_data,
            signature,
            identity.public_key
        )
        print(f"\n✓ Signature verification: {is_valid}")
        
        # Create a quality attestation
        print("\n=== Quality Attestation Demo ===\n")
        
        attestation = QualityAttestation(
            shard_hash="def456",
            provider_agent_id="provider123",
            consumer_agent_id=identity.agent_id,
            rating=0.95,
            feedback="Excellent memory shard, solved my problem immediately!"
        )
        
        attestation.sign(manager)
        print(f"✓ Created attestation:")
        print(f"  Rating: {attestation.rating}")
        print(f"  Feedback: {attestation.feedback}")
        print(f"  Signed: {attestation.signature is not None}")
        
        # Verify attestation
        is_valid = attestation.verify(identity.public_key)
        print(f"\n✓ Attestation verification: {is_valid}")
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
