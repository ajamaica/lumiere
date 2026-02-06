"""
Tests for embedding identity validation and config changes.
"""

import pytest
from pathlib import Path
from tempfile import TemporaryDirectory

from keep.config import (
    StoreConfig,
    ProviderConfig,
    EmbeddingIdentity,
    save_config,
    load_config,
    CONFIG_VERSION,
)


class TestEmbeddingIdentity:
    """Tests for EmbeddingIdentity dataclass."""
    
    def test_identity_creation(self) -> None:
        """EmbeddingIdentity stores provider, model, and dimension."""
        identity = EmbeddingIdentity(
            provider="sentence-transformers",
            model="all-MiniLM-L6-v2",
            dimension=384,
        )
        
        assert identity.provider == "sentence-transformers"
        assert identity.model == "all-MiniLM-L6-v2"
        assert identity.dimension == 384
    
    def test_identity_key_sentence_transformers(self) -> None:
        """Key generation for sentence-transformers."""
        identity = EmbeddingIdentity(
            provider="sentence-transformers",
            model="all-MiniLM-L6-v2",
            dimension=384,
        )
        
        key = identity.key
        assert "st_" in key
        assert "MiniLM" in key or "minilm" in key.lower()
    
    def test_identity_key_openai(self) -> None:
        """Key generation for OpenAI."""
        identity = EmbeddingIdentity(
            provider="openai",
            model="text-embedding-3-small",
            dimension=1536,
        )
        
        key = identity.key
        assert "openai_" in key


class TestConfigWithEmbeddingIdentity:
    """Tests for config save/load with embedding identity."""
    
    @pytest.fixture
    def temp_dir(self):
        with TemporaryDirectory() as tmpdir:
            yield Path(tmpdir)
    
    def test_save_config_without_identity(self, temp_dir: Path) -> None:
        """Config saves correctly without embedding identity."""
        config = StoreConfig(
            path=temp_dir,
            embedding=ProviderConfig("sentence-transformers"),
            embedding_identity=None,
        )
        
        save_config(config)
        
        # Config file should exist in the store directory
        assert (temp_dir / "keep.toml").exists()
        
        loaded = load_config(temp_dir)
        assert loaded.embedding_identity is None
    
    def test_save_config_with_identity(self, temp_dir: Path) -> None:
        """Config saves and loads embedding identity."""
        identity = EmbeddingIdentity(
            provider="sentence-transformers",
            model="all-MiniLM-L6-v2",
            dimension=384,
        )
        config = StoreConfig(
            path=temp_dir,
            embedding=ProviderConfig("sentence-transformers"),
            embedding_identity=identity,
        )
        
        save_config(config)
        loaded = load_config(temp_dir)
        
        assert loaded.embedding_identity is not None
        assert loaded.embedding_identity.provider == "sentence-transformers"
        assert loaded.embedding_identity.model == "all-MiniLM-L6-v2"
        assert loaded.embedding_identity.dimension == 384
    
    def test_config_version_bumped(self) -> None:
        """Config version is 2 for embedding identity support."""
        assert CONFIG_VERSION == 2


class TestEmbeddingIdentityValidation:
    """Tests for embedding identity validation in Keeper."""
    
    @pytest.fixture
    def temp_store(self):
        """Create a temporary store directory."""
        with TemporaryDirectory() as tmpdir:
            yield Path(tmpdir)
    
    def test_first_use_records_identity(self, temp_store: Path) -> None:
        """First Keeper use records embedding identity in config."""
        from keep.api import Keeper

        kp = Keeper(store_path=temp_store)

        # Identity not recorded yet (lazy loading)
        assert kp.embedding_identity is None

        # Trigger lazy loading by using an operation that needs embeddings
        kp.remember("test content")

        # Now should have recorded identity
        assert kp.embedding_identity is not None
        assert kp.embedding_identity.dimension > 0

        # Check it's in the saved config - config is saved to store_path directly
        assert (temp_store / "keep.toml").exists()
        loaded = load_config(temp_store)
        assert loaded.embedding_identity is not None
    
    def test_subsequent_use_validates_identity(self, temp_store: Path) -> None:
        """Subsequent Keeper use validates against stored identity."""
        from keep.api import Keeper
        
        # First use
        kp1 = Keeper(store_path=temp_store)
        original_identity = kp1.embedding_identity
        
        # Second use with same config should work
        kp2 = Keeper(store_path=temp_store)
        assert kp2.embedding_identity == original_identity
    
    def test_mismatched_identity_raises_error(self, temp_store: Path) -> None:
        """Mismatched embedding identity raises ValueError."""
        from keep.api import Keeper

        # Create store with one identity (trigger lazy loading)
        kp = Keeper(store_path=temp_store)
        kp.remember("test content")  # This records the identity
        kp.close()

        # Manually change the stored identity to simulate provider change
        config = load_config(temp_store)
        config.embedding_identity = EmbeddingIdentity(
            provider="openai",
            model="text-embedding-3-small",
            dimension=1536,
        )
        save_config(config)

        # Opening with different provider should fail when we try to use embeddings
        kp2 = Keeper(store_path=temp_store)
        with pytest.raises(ValueError) as exc_info:
            kp2.remember("trigger validation")  # This triggers lazy loading and validation

        assert "mismatch" in str(exc_info.value).lower()
