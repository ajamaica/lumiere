"""
Core data structures for the Synapse Protocol.

Defines the foundational classes for memory sharing between OpenClaw agents.
"""

import hashlib
import json
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import List, Optional, Dict, Any
from datetime import datetime


@dataclass
class MemoryShard:
    """
    Represents the actual data payload being shared.
    
    Wraps raw vector data (like a .faiss or .lancedb file) with the metadata
    required for an agent to actually use it.
    """
    
    file_path: str
    embedding_model: str  # e.g., 'claw-v3-small', 'text-embedding-ada-002'
    dimension_size: int
    entry_count: int
    tags: List[str] = field(default_factory=list)
    payload_hash: Optional[str] = None  # SHA-1 or SHA-256 info hash
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    display_name: str = ""
    description: str = ""
    version: str = "1.0.0"
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    # PQ-secure identity fields (added 2026)
    creator_agent_id: Optional[str] = None  # Agent who created this shard
    creator_public_key: Optional[str] = None  # Base64-encoded ML-DSA-87 public key
    signature: Optional[str] = None  # Base64-encoded signature of shard metadata
    
    def compute_hash(self, algorithm: str = "sha1") -> str:
        """
        Computes the info hash for the memory shard file.
        
        Args:
            algorithm: Hash algorithm to use ('sha1' or 'sha256')
            
        Returns:
            Hexadecimal hash string
        """
        if algorithm not in ["sha1", "sha256"]:
            raise ValueError("Algorithm must be 'sha1' or 'sha256'")
        
        hasher = hashlib.sha1() if algorithm == "sha1" else hashlib.sha256()
        
        with open(self.file_path, "rb") as f:
            # Read in chunks to handle large files efficiently
            while chunk := f.read(8192):
                hasher.update(chunk)
        
        self.payload_hash = hasher.hexdigest()
        return self.payload_hash
    
    def validate(self) -> tuple[bool, Optional[str]]:
        """
        Validates the memory shard metadata and file.
        
        Returns:
            Tuple of (is_valid, error_message)
        """
        # Check file exists
        if not Path(self.file_path).exists():
            return False, f"File not found: {self.file_path}"
        
        # Check required fields
        if not self.embedding_model:
            return False, "Embedding model is required"
        
        if self.dimension_size <= 0:
            return False, "Dimension size must be positive"
        
        if self.entry_count < 0:
            return False, "Entry count cannot be negative"
        
        # Validate hash if present
        if self.payload_hash:
            computed = self.compute_hash()
            if computed != self.payload_hash:
                return False, f"Hash mismatch: expected {self.payload_hash}, got {computed}"
        
        return True, None
    
    def sign(self, identity_manager) -> None:
        """Sign the shard with the agent's PQ identity.
        
        Args:
            identity_manager: Loaded IdentityManager instance
        """
        # Import here to avoid circular dependency
        from .identity import IdentityManager
        
        if not isinstance(identity_manager, IdentityManager):
            raise TypeError("identity_manager must be an IdentityManager instance")
        
        # Set creator fields
        self.creator_agent_id = identity_manager.get_agent_id()
        self.creator_public_key = identity_manager.get_public_key()
        
        # Create canonical representation (without signature)
        data = self.to_dict()
        data.pop("signature", None)
        
        # Sign
        self.signature = identity_manager.sign_json(data)
    
    def verify_signature(self) -> bool:
        """Verify the PQ signature on this shard.
        
        Returns:
            True if signature is valid
        """
        if not self.signature or not self.creator_public_key:
            return False
        
        from .identity import IdentityManager
        
        # Reconstruct canonical data
        data = self.to_dict()
        sig = data.pop("signature")
        
        # Verify
        manager = IdentityManager()
        return manager.verify_json_signature(data, sig, self.creator_public_key)
    
    def to_dict(self) -> Dict[str, Any]:
        """Converts the MemoryShard to a dictionary."""
        return asdict(self)
    
    def to_json(self, indent: int = 2) -> str:
        """Serializes the MemoryShard to JSON."""
        return json.dumps(self.to_dict(), indent=indent)
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'MemoryShard':
        """Creates a MemoryShard from a dictionary."""
        return cls(**data)
    
    @classmethod
    def from_json(cls, json_str: str) -> 'MemoryShard':
        """Deserializes a MemoryShard from JSON."""
        return cls.from_dict(json.loads(json_str))
    
    def save_metadata(self, output_path: Optional[str] = None) -> str:
        """
        Saves the metadata to a .json file.
        
        Args:
            output_path: Optional path for metadata file. 
                        Defaults to {file_path}.meta.json
        
        Returns:
            Path to the saved metadata file
        """
        if output_path is None:
            output_path = f"{self.file_path}.meta.json"
        
        with open(output_path, "w") as f:
            f.write(self.to_json())
        
        return output_path


@dataclass
class MoltMagnet:
    """
    The URI handler for the OpenClaw ecosystem.
    
    Represents a magnet link that can be used to discover and download
    memory shards from the P2P network.
    """
    
    info_hash: str  # The 'xt' parameter in magnet links (urn:btih:...)
    display_name: str
    trackers: List[str] = field(default_factory=list)
    required_model: Optional[str] = None  # Must match the downloader's model
    dimension_size: Optional[int] = None
    tags: List[str] = field(default_factory=list)
    file_size: Optional[int] = None  # Size in bytes
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    
    # PQ-secure identity fields (added 2026)
    creator_agent_id: Optional[str] = None
    creator_public_key: Optional[str] = None
    
    def to_magnet_uri(self) -> str:
        """
        Generates a standard BitTorrent magnet URI.
        
        Format: magnet:?xt=urn:btih:{hash}&dn={name}&tr={tracker1}&tr={tracker2}...
        
        Returns:
            Complete magnet link string
        """
        # Clean hash (remove any urn:btih: prefix if present)
        clean_hash = self.info_hash.replace("urn:btih:", "")
        
        # Start with base
        uri = f"magnet:?xt=urn:btih:{clean_hash}"
        
        # Add display name (URL encoded)
        from urllib.parse import quote
        uri += f"&dn={quote(self.display_name)}"
        
        # Add trackers
        for tracker in self.trackers:
            uri += f"&tr={quote(tracker)}"
        
        # Add custom OpenClaw parameters
        if self.required_model:
            uri += f"&x.model={quote(self.required_model)}"
        
        if self.dimension_size:
            uri += f"&x.dims={self.dimension_size}"
        
        if self.tags:
            uri += f"&x.tags={quote(','.join(self.tags))}"
        
        # Add file size
        if self.file_size:
            uri += f"&x.size={self.file_size}"
        
        # Add PQ identity fields (2026)
        if self.creator_agent_id:
            uri += f"&x.agent={quote(self.creator_agent_id)}"
        if self.creator_public_key:
            # Truncate for magnet link (full key in shard metadata)
            uri += f"&x.pubkey={quote(self.creator_public_key[:32])}"
        
        return uri
    
    @classmethod
    def from_magnet_uri(cls, uri: str) -> 'MoltMagnet':
        """
        Parses a magnet URI into a MoltMagnet object.
        
        Args:
            uri: Magnet link string
            
        Returns:
            MoltMagnet instance
        """
        from urllib.parse import urlparse, parse_qs, unquote
        
        if not uri.startswith("magnet:?"):
            raise ValueError("Invalid magnet URI format")
        
        # Parse query parameters
        parsed = urlparse(uri)
        params = parse_qs(parsed.query)
        
        # Extract info hash
        xt = params.get("xt", [""])[0]
        if not xt.startswith("urn:btih:"):
            raise ValueError("Missing or invalid xt parameter")
        info_hash = xt.replace("urn:btih:", "")
        
        # Extract display name
        display_name = unquote(params.get("dn", ["Unknown"])[0])
        
        # Extract trackers
        trackers = [unquote(tr) for tr in params.get("tr", [])]
        
        # Extract custom OpenClaw parameters
        required_model = params.get("x.model", [None])[0]
        if required_model:
            required_model = unquote(required_model)
        
        dimension_size = params.get("x.dims", [None])[0]
        if dimension_size:
            dimension_size = int(dimension_size)
        
        tags = params.get("x.tags", [None])[0]
        if tags:
            tags = unquote(tags).split(",")
        else:
            tags = []
        
        # Extract file size
        file_size = params.get("x.size", [None])[0]
        if file_size:
            file_size = int(file_size)
        
        # Extract PQ identity fields (2026)
        creator_agent_id = params.get("x.agent", [None])[0]
        if creator_agent_id:
            creator_agent_id = unquote(creator_agent_id)
        
        creator_public_key = params.get("x.pubkey", [None])[0]
        if creator_public_key:
            creator_public_key = unquote(creator_public_key)
        
        return cls(
            info_hash=info_hash,
            display_name=display_name,
            trackers=trackers,
            required_model=required_model,
            dimension_size=dimension_size,
            tags=tags,
            file_size=file_size,
            creator_agent_id=creator_agent_id,
            creator_public_key=creator_public_key
        )
    
    def to_dict(self) -> Dict[str, Any]:
        """Converts the MoltMagnet to a dictionary."""
        return asdict(self)
    
    def to_json(self, indent: int = 2) -> str:
        """Serializes the MoltMagnet to JSON."""
        return json.dumps(self.to_dict(), indent=indent)
    
    def is_compatible_with(self, agent_model: str, agent_dims: int) -> tuple[bool, Optional[str]]:
        """
        Checks if this magnet is compatible with an agent's configuration.
        
        Args:
            agent_model: The agent's embedding model
            agent_dims: The agent's vector dimension size
            
        Returns:
            Tuple of (is_compatible, incompatibility_reason)
        """
        if self.required_model and self.required_model != agent_model:
            return False, f"Model mismatch: requires {self.required_model}, agent uses {agent_model}"
        
        if self.dimension_size and self.dimension_size != agent_dims:
            return False, f"Dimension mismatch: requires {self.dimension_size}D, agent uses {agent_dims}D"
        
        return True, None


# Default tracker list for the Synapse Protocol
DEFAULT_TRACKERS = [
    "http://hivebraintracker.com:8080/announce",
    "udp://tracker.opentrackr.org:1337/announce",  # Fallback
    "udp://open.tracker.cl:1337/announce",          # Fallback
]


def create_shard_from_file(
    file_path: str,
    model: str,
    dims: int,
    count: int,
    tags: List[str] = None,
    display_name: str = "",
) -> MemoryShard:
    """
    Helper function to create a MemoryShard from a vector database file.
    
    Args:
        file_path: Path to the vector database file
        model: Embedding model name
        dims: Vector dimension size
        count: Number of entries
        tags: Optional tags for categorization
        display_name: Human-readable name
        
    Returns:
        Initialized MemoryShard with computed hash
    """
    if not display_name:
        display_name = Path(file_path).stem
    
    shard = MemoryShard(
        file_path=file_path,
        embedding_model=model,
        dimension_size=dims,
        entry_count=count,
        tags=tags or [],
        display_name=display_name,
    )
    
    # Compute hash
    shard.compute_hash()
    
    return shard
