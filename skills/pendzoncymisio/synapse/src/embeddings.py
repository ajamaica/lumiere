"""
Local embedding computation using Nomic Embed Text V2.

This module handles efficient embedding generation with ONNX runtime
for fast CPU inference.
"""

import logging
import hashlib
import json
from pathlib import Path
from typing import List, Union, Optional
import numpy as np

logger = logging.getLogger(__name__)


class LocalEmbedder:
    """
    Local embedding generator using Nomic Embed Text V2.
    
    Features:
    - 768-dimensional embeddings
    - ONNX Runtime for fast CPU inference
    - Batch processing support
    - Embedding caching (TODO: phase 2)
    """
    
    def __init__(
        self,
        model_name: str = "nomic-ai/nomic-embed-text-v1.5",
        use_onnx: bool = True,
        cache_dir: Optional[str] = None,
    ):
        """
        Initialize the local embedder.
        
        Args:
            model_name: Model identifier (default: Nomic Embed Text V1.5)
            use_onnx: Use ONNX runtime for faster inference
            cache_dir: Directory to cache model files
        """
        self.model_name = model_name
        self.use_onnx = use_onnx
        self.cache_dir = Path(cache_dir) if cache_dir else Path.home() / ".cache" / "synapse"
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        
        self.model = None
        self.dimension = 768  # Nomic Embed dimension
        self.max_seq_length = 8192  # Nomic's context window
        
        logger.info(f"Initializing LocalEmbedder: {model_name} (ONNX: {use_onnx})")
    
    def load_model(self):
        """Lazy load the embedding model."""
        if self.model is not None:
            return
        
        logger.info(f"Loading model: {self.model_name}")
        
        if self.use_onnx:
            self._load_onnx_model()
        else:
            self._load_pytorch_model()
        
        logger.info("Model loaded successfully")
    
    def _load_onnx_model(self):
        """Load ONNX optimized model."""
        try:
            import onnxruntime as ort
            from optimum.onnxruntime import ORTModelForFeatureExtraction
            from transformers import AutoTokenizer
            
            # Load tokenizer
            self.tokenizer = AutoTokenizer.from_pretrained(
                self.model_name,
                cache_dir=str(self.cache_dir),
                trust_remote_code=True,  # Required for nomic models
            )
            
            # Check for cached ONNX model
            onnx_path = self.cache_dir / "nomic_embed_onnx"
            
            if onnx_path.exists():
                logger.info("Loading cached ONNX model")
                self.model = ORTModelForFeatureExtraction.from_pretrained(
                    str(onnx_path),
                    provider="CPUExecutionProvider",
                )
            else:
                logger.info("Converting to ONNX (first time only)...")
                from optimum.onnxruntime import ORTModelForFeatureExtraction
                
                # Load and convert
                self.model = ORTModelForFeatureExtraction.from_pretrained(
                    self.model_name,
                    export=True,
                    provider="CPUExecutionProvider",
                    cache_dir=str(self.cache_dir),
                    trust_remote_code=True,  # Required for nomic models
                )
                
                # Save for future use
                self.model.save_pretrained(str(onnx_path))
                self.tokenizer.save_pretrained(str(onnx_path))
                logger.info(f"ONNX model cached to {onnx_path}")
        
        except ImportError as e:
            logger.error(f"ONNX dependencies not available: {e}")
            logger.info("Falling back to PyTorch model")
            self._load_pytorch_model()
    
    def _load_pytorch_model(self):
        """Load standard PyTorch model."""
        try:
            from sentence_transformers import SentenceTransformer
            
            self.model = SentenceTransformer(
                self.model_name,
                cache_folder=str(self.cache_dir),
                trust_remote_code=True,  # Required for nomic models
            )
            
        except ImportError:
            logger.error("sentence-transformers not installed")
            raise RuntimeError(
                "Please install: pip install sentence-transformers"
            )
    
    def encode(
        self,
        texts: Union[str, List[str]],
        batch_size: int = 32,
        normalize: bool = True,
        show_progress: bool = False,
    ) -> np.ndarray:
        """
        Encode texts into embeddings.
        
        Args:
            texts: Single text or list of texts
            batch_size: Batch size for processing
            normalize: Normalize embeddings to unit length
            show_progress: Show progress bar
            
        Returns:
            numpy array of shape (n_texts, 768)
        """
        self.load_model()
        
        # Convert single string to list
        if isinstance(texts, str):
            texts = [texts]
            single_input = True
        else:
            single_input = False
        
        logger.debug(f"Encoding {len(texts)} texts (batch_size={batch_size})")
        
        if self.use_onnx and hasattr(self.model, 'model'):
            # ONNX model - use manual batching
            embeddings = self._encode_onnx(texts, batch_size, normalize)
        else:
            # SentenceTransformer - has built-in batching
            embeddings = self.model.encode(
                texts,
                batch_size=batch_size,
                normalize_embeddings=normalize,
                show_progress_bar=show_progress,
            )
        
        return embeddings[0] if single_input else embeddings
    
    def _encode_onnx(
        self,
        texts: List[str],
        batch_size: int,
        normalize: bool,
    ) -> np.ndarray:
        """Encode using ONNX model with manual batching."""
        import torch
        from torch.nn.functional import normalize as torch_normalize
        
        all_embeddings = []
        
        for i in range(0, len(texts), batch_size):
            batch_texts = texts[i:i + batch_size]
            
            # Tokenize
            inputs = self.tokenizer(
                batch_texts,
                padding=True,
                truncation=True,
                max_length=self.max_seq_length,
                return_tensors="pt",
            )
            
            # Forward pass
            with torch.no_grad():
                outputs = self.model(**inputs)
                
                # Mean pooling
                attention_mask = inputs['attention_mask']
                embeddings = self._mean_pooling(
                    outputs.last_hidden_state,
                    attention_mask
                )
                
                if normalize:
                    embeddings = torch_normalize(embeddings, p=2, dim=1)
                
                all_embeddings.append(embeddings.cpu().numpy())
        
        return np.vstack(all_embeddings)
    
    def _mean_pooling(self, token_embeddings, attention_mask):
        """Apply mean pooling to get sentence embedding."""
        import torch
        
        input_mask_expanded = attention_mask.unsqueeze(-1).expand(token_embeddings.size()).float()
        sum_embeddings = torch.sum(token_embeddings * input_mask_expanded, 1)
        sum_mask = torch.clamp(input_mask_expanded.sum(1), min=1e-9)
        return sum_embeddings / sum_mask
    
    def compute_similarity(
        self,
        embedding1: np.ndarray,
        embedding2: np.ndarray,
    ) -> float:
        """
        Compute cosine similarity between two embeddings.
        
        Args:
            embedding1: First embedding vector
            embedding2: Second embedding vector
            
        Returns:
            Similarity score (0-1)
        """
        # Ensure normalized
        emb1 = embedding1 / np.linalg.norm(embedding1)
        emb2 = embedding2 / np.linalg.norm(embedding2)
        
        return float(np.dot(emb1, emb2))
    
    def get_model_info(self) -> dict:
        """Get information about the loaded model."""
        return {
            "model_name": self.model_name,
            "dimension": self.dimension,
            "max_seq_length": self.max_seq_length,
            "use_onnx": self.use_onnx,
            "cache_dir": str(self.cache_dir),
        }


def create_embedder(use_onnx: bool = True) -> LocalEmbedder:
    """
    Factory function to create a LocalEmbedder instance.
    
    Args:
        use_onnx: Whether to use ONNX optimization
        
    Returns:
        Configured LocalEmbedder instance
    """
    return LocalEmbedder(
        model_name="nomic-ai/nomic-embed-text-v1.5",
        use_onnx=use_onnx,
    )


# Example usage
if __name__ == "__main__":
    # Test the embedder
    embedder = create_embedder(use_onnx=True)
    
    texts = [
        "How to deploy a Kubernetes cluster",
        "React hooks tutorial for beginners",
        "Python async programming guide",
    ]
    
    embeddings = embedder.encode(texts)
    
    print(f"Generated {len(embeddings)} embeddings")
    print(f"Embedding shape: {embeddings[0].shape}")
    print(f"Model info: {embedder.get_model_info()}")
    
    # Test similarity
    similarity = embedder.compute_similarity(embeddings[0], embeddings[1])
    print(f"Similarity between text 1 and 2: {similarity:.4f}")
