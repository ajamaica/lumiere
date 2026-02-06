#!/usr/bin/env python3
"""
Example usage of the Synapse Protocol components.

Demonstrates the complete workflow from creating a shard to assimilation.
"""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from .core import MemoryShard, MoltMagnet, create_shard_from_file, DEFAULT_TRACKERS
from .network import SynapseNode
from .assimilation import AssimilationEngine
from .config import SynapseConfig, load_config


def example_create_and_share_shard():
    """Example: Create a memory shard and generate a magnet link."""
    print("=== Example 1: Create and Share a Memory Shard ===\n")
    
    # Create a dummy shard file for demonstration
    test_file = Path("./test_knowledge.dat")
    test_file.write_text("This is simulated vector data")
    
    # Create a memory shard
    shard = create_shard_from_file(
        file_path=str(test_file),
        model="claw-v3-small",
        dims=1536,
        count=100,
        tags=["kubernetes", "devops", "migration"],
        display_name="Kubernetes Migration Guide",
    )
    
    print(f"Created shard: {shard.display_name}")
    print(f"Hash: {shard.payload_hash}")
    print(f"Model: {shard.embedding_model}")
    print(f"Dimensions: {shard.dimension_size}")
    print(f"Entries: {shard.entry_count}")
    print(f"Tags: {', '.join(shard.tags)}\n")
    
    # Save metadata
    metadata_path = shard.save_metadata()
    print(f"Metadata saved to: {metadata_path}\n")
    
    # Initialize P2P node and announce
    node = SynapseNode()
    magnet = node.announce_shard(shard)
    
    print(f"Magnet link generated:")
    print(f"{magnet.to_magnet_uri()}\n")
    
    # Cleanup
    test_file.unlink()
    Path(metadata_path).unlink()
    
    return magnet


def example_download_and_assimilate(magnet: MoltMagnet):
    """Example: Download and assimilate a memory shard."""
    print("\n=== Example 2: Download and Assimilate a Shard ===\n")
    
    # Initialize P2P node
    node = SynapseNode(data_dir="./example_downloads")
    
    print(f"Downloading: {magnet.display_name}")
    print(f"Info hash: {magnet.info_hash}\n")
    
    # Download (simulated in current implementation)
    try:
        output_path = node.request_shard(magnet)
        print(f"Downloaded to: {output_path}\n")
        
        # Load the downloaded shard
        metadata_path = f"{output_path}.meta.json"
        with open(metadata_path) as f:
            import json
            shard_data = json.load(f)
        
        shard = MemoryShard.from_dict(shard_data)
        
        # Create assimilation engine
        engine = AssimilationEngine(
            agent_model="claw-v3-small",
            agent_dimension=1536,
            strict_mode=True,
        )
        
        # Check compatibility
        print("Checking model alignment...")
        is_compatible, error = engine.check_model_alignment(shard)
        if is_compatible:
            print("✓ Model alignment check passed\n")
        else:
            print(f"✗ Model alignment check failed: {error}\n")
            return
        
        # Run safety scan
        print("Running safety scan...")
        safety_report = engine.scan_for_injections(shard)
        print(f"Risk level: {safety_report.risk_level}")
        print(f"Threats detected: {len(safety_report.detected_threats)}")
        print(f"Warnings: {len(safety_report.warnings)}")
        
        if safety_report.is_safe:
            print("✓ Safety scan passed\n")
        else:
            print(f"✗ Safety scan failed")
            for threat in safety_report.detected_threats:
                print(f"  - {threat}")
            return
        
        # Assimilate (merge into local database)
        print("Assimilating shard into agent memory...")
        result = engine.assimilate(
            shard=shard,
            target_db_path="./my_agent_memory.db",
            skip_safety_check=False,
        )
        
        print(f"✓ Assimilation complete!")
        print(f"Entries merged: {result['merge_result']['entries_merged']}\n")
        
        # Cleanup
        Path(output_path).unlink(missing_ok=True)
        Path(metadata_path).unlink(missing_ok=True)
        
    except Exception as e:
        print(f"Error: {e}\n")


def example_configuration():
    """Example: Load and use configuration."""
    print("\n=== Example 3: Configuration Management ===\n")
    
    # Load configuration
    config = load_config()
    
    print("Current configuration:")
    print(f"Node ID: {config.node_id}")
    print(f"Listen Port: {config.listen_port}")
    print(f"Data Directory: {config.data_dir}")
    print(f"Agent Model: {config.agent_model}")
    print(f"Agent Dimensions: {config.agent_dimension}")
    print(f"Strict Mode: {config.strict_mode}")
    print(f"Default Trackers: {len(config.default_trackers)} configured\n")
    
    # Show as JSON
    print("JSON representation:")
    print(config.to_json())


def example_magnet_parsing():
    """Example: Parse a magnet link."""
    print("\n=== Example 4: Magnet Link Parsing ===\n")
    
    # Create a sample magnet link
    sample_magnet = (
        "magnet:?xt=urn:btih:abcdef1234567890abcdef1234567890abcdef12"
        "&dn=React%20Hooks%20Guide"
        "&tr=udp://tracker.example.com:1337/announce"
        "&x.model=claw-v3-small"
        "&x.dims=1536"
        "&x.tags=react,javascript,hooks"
    )
    
    print(f"Parsing magnet link:\n{sample_magnet}\n")
    
    # Parse it
    magnet = MoltMagnet.from_magnet_uri(sample_magnet)
    
    print("Parsed components:")
    print(f"Info Hash: {magnet.info_hash}")
    print(f"Display Name: {magnet.display_name}")
    print(f"Required Model: {magnet.required_model}")
    print(f"Dimensions: {magnet.dimension_size}")
    print(f"Tags: {', '.join(magnet.tags)}")
    print(f"Trackers: {len(magnet.trackers)}\n")
    
    # Check compatibility
    is_compatible, reason = magnet.is_compatible_with(
        agent_model="claw-v3-small",
        agent_dims=1536
    )
    
    if is_compatible:
        print("✓ Compatible with agent configuration")
    else:
        print(f"✗ Incompatible: {reason}")


def main():
    """Run all examples."""
    print("╔════════════════════════════════════════════════════════╗")
    print("║     Synapse Protocol - Usage Examples                 ║")
    print("║     HiveBrain Torrentlike Skill for OpenClaw          ║")
    print("╚════════════════════════════════════════════════════════╝\n")
    
    # Example 1: Create and share
    magnet = example_create_and_share_shard()
    
    # Example 2: Download and assimilate
    example_download_and_assimilate(magnet)
    
    # Example 3: Configuration
    example_configuration()
    
    # Example 4: Magnet parsing
    example_magnet_parsing()
    
    print("\n" + "="*60)
    print("Examples complete! Check the code in examples.py for details.")
    print("="*60)


if __name__ == "__main__":
    main()
