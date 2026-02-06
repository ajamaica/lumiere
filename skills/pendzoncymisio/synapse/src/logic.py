#!/usr/bin/env python3
"""
Main logic for the Synapse Protocol OpenClaw skill.

Contains all command implementations and business logic.
"""

import argparse
import json
import logging
import sys
import time
from pathlib import Path
from typing import Any, Dict

from .core import MemoryShard, MoltMagnet, create_shard_from_file, DEFAULT_TRACKERS
from .network import SynapseNode
from . import setup_identity


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def output_json(data: Dict[str, Any]):
    """Output data as JSON to stdout."""
    print(json.dumps(data, indent=2))


def output_error(message: str, code: int = 1):
    """Output error message and exit."""
    output_json({
        "status": "error",
        "error": message,
        "code": code
    })
    sys.exit(code)


def cmd_create_shard(args):
    """Create a memory shard from a vector database file."""
    try:
        # Parse tags if provided
        tags = []
        if args.tags:
            tags = [t.strip() for t in args.tags.split(',') if t.strip()]
        
        # Check if source file exists
        if not Path(args.source).exists():
            output_error(f"Source file not found: {args.source}")
        
        # Get file info
        file_size = Path(args.source).stat().st_size
        
        # Create shard (with placeholder values - in production, these would be extracted)
        shard = create_shard_from_file(
            file_path=args.source,
            model=args.model or "claw-v3-small",
            dims=args.dimensions or 1536,
            count=args.count or 0,  # Would be read from file metadata
            tags=tags,
            display_name=args.name,
        )
        
        # Save metadata
        metadata_path = shard.save_metadata()
        
        output_json({
            "status": "success",
            "shard": shard.to_dict(),
            "metadata_file": metadata_path,
            "message": f"Created memory shard: {shard.display_name}"
        })
    
    except Exception as e:
        logger.exception("Failed to create shard")
        output_error(str(e))


def cmd_generate_magnet(args):
    """Generate a magnet link from a memory shard."""
    try:
        # Load shard metadata
        metadata_path = f"{args.shard}.meta.json"
        if not Path(metadata_path).exists():
            output_error(f"Shard metadata not found: {metadata_path}")
        
        with open(metadata_path) as f:
            shard_data = json.load(f)
        
        shard = MemoryShard.from_dict(shard_data)
        
        # Parse trackers if provided
        trackers = DEFAULT_TRACKERS.copy()
        if args.trackers:
            custom_trackers = [t.strip() for t in args.trackers.split(',') if t.strip()]
            if custom_trackers:
                trackers = custom_trackers
        
        # Initialize node and announce
        node = SynapseNode()
        magnet = node.announce_shard(shard, trackers)
        
        output_json({
            "status": "success",
            "magnet_link": magnet.to_magnet_uri(),
            "info_hash": magnet.info_hash,
            "display_name": magnet.display_name,
            "message": f"Generated magnet link for: {shard.display_name}"
        })
    
    except Exception as e:
        logger.exception("Failed to generate magnet")
        output_error(str(e))


def cmd_search(args):
    """Search the P2P network for memory shards."""
    try:
        import requests
        from .embeddings import create_embedder
        
        # Get tracker URL
        tracker_url = args.tracker if hasattr(args, 'tracker') and args.tracker else "http://hivebraintracker.com:8080"
        
        # Generate embedding from query text
        logger.info(f"Generating embedding for query: {args.query}")
        embedder = create_embedder(use_onnx=False)  # nomic-bert
        query_embedding = embedder.encode(args.query).tolist()
        
        # Send embedding to tracker
        logger.info(f"Searching tracker at {tracker_url}")
        response = requests.post(
            f"{tracker_url}/api/search/embedding",
            json={
                "embedding": query_embedding,
                "limit": args.limit
            },
            timeout=10
        )
        
        if response.status_code != 200:
            output_error(f"Tracker error: {response.text}")
        
        data = response.json()
        
        if data.get("status") != "success":
            output_error(f"Search failed: {data.get('error', 'Unknown error')}")
        
        results = data.get("results", [])
        
        output_json({
            "status": "success",
            "query": args.query,
            "results": results,
            "count": len(results),
            "message": f"Found {len(results)} results from tracker"
        })
    
    except ImportError as e:
        logger.exception("Missing dependency")
        output_error(f"Missing required module: {e}. Install with: uv pip install requests sentence-transformers")
    except requests.exceptions.RequestException as e:
        logger.exception("Failed to connect to tracker")
        output_error(f"Tracker connection failed: {e}")
    except Exception as e:
        logger.exception("Failed to search")
        output_error(str(e))


def cmd_download(args):
    """Download a memory shard from the P2P network."""
    try:
        # Parse magnet link
        magnet = MoltMagnet.from_magnet_uri(args.magnet)
        
        # Set output directory
        output_dir = args.output or "./downloads"
        
        # Initialize node and download
        logger.info(f"Downloading shard: {magnet.display_name}")
        logger.info(f"Info hash: {magnet.info_hash}")
        logger.info(f"Trackers: {len(magnet.trackers)}")
        
        node = SynapseNode(data_dir=output_dir)
        
        # Download using BitTorrent or fallback to simulated
        output_path = node.request_shard(magnet, output_dir=output_dir)
        
        # Create metadata
        shard = MemoryShard(
            file_path=output_path,
            embedding_model=magnet.required_model or "unknown",
            dimension_size=magnet.dimension_size or 1536,
            entry_count=0,
            tags=magnet.tags,
            payload_hash=magnet.info_hash,
            display_name=magnet.display_name,
            creator_agent_id=magnet.creator_agent_id,
            creator_public_key=magnet.creator_public_key,
        )
        
        # Fetch signature from tracker if available
        if magnet.trackers:
            try:
                import requests
                for tracker in magnet.trackers:
                    if tracker.startswith("http"):
                        base_url = tracker.replace("/announce", "")
                        response = requests.get(f"{base_url}/api/shard/{magnet.info_hash}", timeout=5)
                        if response.status_code == 200:
                            shard_data = response.json()
                            if shard_data.get('signature'):
                                shard.signature = shard_data['signature']
                                shard.creator_agent_id = shard_data.get('creator_agent_id')
                                shard.creator_public_key = shard_data.get('creator_public_key')
                                logger.info(f"Retrieved signature from tracker ({len(shard.signature)} chars)")
                            break
            except Exception as e:
                logger.debug(f"Could not fetch signature from tracker: {e}")
        
        metadata_path = shard.save_metadata()
        
        # Check if BitTorrent was used
        was_real_download = node.bt_engine is not None
        
        output_json({
            "status": "success",
            "file_path": output_path,
            "metadata_path": metadata_path,
            "magnet": magnet.to_dict(),
            "bittorrent_used": was_real_download,
            "message": f"Downloaded: {magnet.display_name}" + ("" if was_real_download else " (simulated)")
        })
    
    except Exception as e:
        logger.exception("Failed to download")
        output_error(str(e))


def cmd_list_seeds(args):
    """List active seed sessions."""
    try:
        # Initialize node
        node = SynapseNode()
        
        # Get active sessions
        sessions = node.list_active_sessions()
        
        # Filter to only seeding sessions
        seeds = [s for s in sessions if s and s.get("status") == "seeding"]
        
        output_json({
            "status": "success",
            "seeds": seeds,
            "count": len(seeds),
            "statistics": node.get_statistics(),
        })
    
    except Exception as e:
        logger.exception("Failed to list seeds")
        output_error(str(e))


def cmd_share(args):
    """Share a file via Synapse Protocol (generate magnet + add to seeder)."""
    try:
        from .seeder_client import SeederClient
        
        # Check if file exists
        file_path = Path(args.file).resolve()
        if not Path(file_path).exists():
            output_error(f"File not found: {file_path}")
        
        # Load or create metadata
        metadata_path = Path(str(file_path) + ".meta.json")
        
        if metadata_path.exists():
            with open(metadata_path) as f:
                shard_data = json.load(f)
            shard = MemoryShard.from_dict(shard_data)
            logger.info(f"Loaded existing metadata from {metadata_path}")
        else:
            # Create new shard metadata
            tags = []
            if args.tags:
                tags = [t.strip() for t in args.tags.split(',') if t.strip()]
            
            # Try to load identity for creator fields
            creator_agent_id = None
            creator_public_key = None
            try:
                from .identity import IdentityManager
                identity_mgr = IdentityManager()
                identity = identity_mgr.load_identity()
                creator_agent_id = identity.agent_id
                creator_public_key = identity_mgr.get_public_key()
                logger.info(f"Loaded identity: {creator_agent_id}")
            except Exception as e:
                logger.debug(f"No identity available: {e}")
            
            shard = MemoryShard(
                file_path=str(file_path),
                embedding_model=args.model or "nomic-embed-text-v1",
                dimension_size=args.dimensions or 768,
                entry_count=0,
                tags=tags,
                display_name=args.name or file_path.name,
                creator_agent_id=creator_agent_id,
                creator_public_key=creator_public_key,
            )
            
            # Compute hash
            shard.compute_hash()
            
            # Sign the shard if identity is loaded
            if creator_agent_id and creator_public_key:
                try:
                    shard.sign(identity_mgr)
                    logger.info(f"Signed shard with identity: {creator_agent_id}")
                except Exception as e:
                    logger.warning(f"Failed to sign shard: {e}")
            
            # Save metadata
            shard.save_metadata()
            logger.info(f"Created metadata file: {metadata_path}")
        
        # Connect to seeder daemon
        client = SeederClient()
        
        # Add to seeder (will auto-start daemon if needed)
        info_hash, magnet_uri = client.add_shard(
            shard_dict=shard.to_dict(),
            trackers=DEFAULT_TRACKERS if not args.trackers else args.trackers.split(',')
        )
        
        # Register with tracker
        try:
            import requests
            from .embeddings import create_embedder
            
            # Read file content for embedding
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read(8000)
            
            # Generate embedding
            logger.info("Generating embedding for tracker registration...")
            embedder = create_embedder(use_onnx=False)
            embedding_vector = embedder.encode(content)
            embedding_list = embedding_vector.tolist()
            
            # Register with tracker
            tracker_url = args.trackers.split(',')[0].replace('/announce', '') if args.trackers else "http://hivebraintracker.com:8080"
            register_data = {
                "info_hash": info_hash,
                "display_name": shard.display_name,
                "embedding_model": shard.embedding_model,
                "dimension_size": shard.dimension_size,
                "tags": shard.tags,
                "file_size": file_path.stat().st_size,
                "embedding": embedding_list,
            }
            
            # Add identity fields if available
            if shard.creator_agent_id:
                register_data["creator_agent_id"] = shard.creator_agent_id
            if shard.creator_public_key:
                register_data["creator_public_key"] = shard.creator_public_key
            if shard.signature:
                register_data["signature"] = shard.signature
            
            logger.info(f"Sending to tracker - has signature: {bool(register_data.get('signature'))}, creator: {register_data.get('creator_agent_id')}")
            
            response = requests.post(
                f"{tracker_url}/api/register",
                json=register_data,
                timeout=10
            )
            
            if response.status_code == 200:
                logger.info("Registered with tracker")
            else:
                logger.warning(f"Tracker registration failed: {response.status_code}")
                
        except Exception as e:
            logger.warning(f"Failed to register with tracker: {e}")
        
        output_json({
            "status": "success",
            "info_hash": info_hash,
            "magnet_uri": magnet_uri,
            "file_path": str(file_path),
            "display_name": shard.display_name,
            "message": f"Now seeding: {shard.display_name}"
        })
    
    except Exception as e:
        logger.exception("Failed to share file")
        output_error(str(e))


def cmd_unshare(args):
    """Stop sharing a file."""
    try:
        from .seeder_client import SeederClient
        
        client = SeederClient()
        
        if not client.is_running():
            output_error("Seeder daemon not running")
        
        success = client.remove_shard(args.info_hash)
        
        if success:
            output_json({
                "status": "success",
                "message": f"Stopped seeding: {args.info_hash}"
            })
        else:
            output_error(f"Shard not found: {args.info_hash}")
    
    except Exception as e:
        logger.exception("Failed to unshare")
        output_error(str(e))


def cmd_list_shared(args):
    """List all shared files."""
    try:
        from .seeder_client import SeederClient
        
        client = SeederClient()
        
        if not client.is_running():
            output_json({
                "status": "success",
                "shards": [],
                "count": 0,
                "message": "Seeder daemon not running"
            })
            return
        
        shards = client.list_shards()
        
        output_json({
            "status": "success",
            "shards": shards,
            "count": len(shards),
            "message": f"Currently seeding {len(shards)} files"
        })
    
    except Exception as e:
        logger.exception("Failed to list shared files")
        output_error(str(e))


def cmd_seeder(args):
    """Control seeder daemon."""
    try:
        from .seeder_client import SeederClient
        
        client = SeederClient()
        
        if args.action == "start":
            if client.is_running():
                output_json({
                    "status": "success",
                    "message": "Seeder daemon already running"
                })
            else:
                success = client.start_daemon()
                if success:
                    output_json({
                        "status": "success",
                        "message": "Seeder daemon started"
                    })
                else:
                    output_error("Failed to start seeder daemon")
        
        elif args.action == "stop":
            success = client.stop_daemon()
            if success:
                output_json({
                    "status": "success",
                    "message": "Seeder daemon stopped"
                })
            else:
                output_error("Failed to stop seeder daemon")
        
        elif args.action == "status":
            if client.is_running():
                status = client.get_status()
                output_json({
                    "status": "success",
                    "daemon_running": True,
                    **status
                })
            else:
                output_json({
                    "status": "success",
                    "daemon_running": False,
                    "message": "Seeder daemon not running"
                })
        
        elif args.action == "restart":
            client.stop_daemon()
            time.sleep(1)
            success = client.start_daemon()
            if success:
                output_json({
                    "status": "success",
                    "message": "Seeder daemon restarted"
                })
            else:
                output_error("Failed to restart seeder daemon")
        
        else:
            output_error(f"Unknown action: {args.action}")
    
    except Exception as e:
        logger.exception("Failed to control seeder")
        output_error(str(e))


def cmd_setup_identity(args):
    """Generate ML-DSA-87 identity for Synapse Protocol."""
    try:
        import sys
        import subprocess
        from pathlib import Path
        
        # Path to setup script
        setup_script = Path(__file__).parent / "setup_identity.py"
        
        if not setup_script.exists():
            output_error(f"Setup script not found: {setup_script}")
        
        # Build command
        cmd = [sys.executable, str(setup_script)]
        if args.identity_dir:
            cmd.extend(["--identity-dir", args.identity_dir])
        if args.force:
            cmd.append("--force")
        
        # Run setup script
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode == 0:
            output_json({
                "status": "success",
                "message": "Identity generated successfully",
                "output": result.stdout
            })
        else:
            output_error(f"Identity generation failed: {result.stderr}")
    
    except Exception as e:
        logger.exception("Failed to setup identity")
        output_error(str(e))


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Synapse Protocol - P2P Memory Sharing for OpenClaw"
    )
    
    subparsers = parser.add_subparsers(dest="command", help="Command to execute")
    
    # share command (replaces generate-magnet)
    share_parser = subparsers.add_parser("share", help="Share a file via P2P network")
    share_parser.add_argument("file", help="File to share")
    share_parser.add_argument("--name", help="Display name")
    share_parser.add_argument("--tags", help="Comma-separated tags")
    share_parser.add_argument("--model", help="Embedding model name (default: nomic-embed-text-v1)")
    share_parser.add_argument("--dimensions", type=int, help="Vector dimensions (default: 768)")
    share_parser.add_argument("--trackers", help="Comma-separated tracker URLs")
    
    # unshare command
    unshare_parser = subparsers.add_parser("unshare", help="Stop sharing a file")
    unshare_parser.add_argument("info_hash", help="Info hash of file to unshare")
    
    # list-shared command
    list_shared_parser = subparsers.add_parser("list-shared", help="List shared files")
    
    # seeder command
    seeder_parser = subparsers.add_parser("seeder", help="Control seeder daemon")
    seeder_parser.add_argument("action", choices=["start", "stop", "status", "restart"], 
                                help="Daemon action")
    
    # create-shard command (legacy)
    create_parser = subparsers.add_parser("create-shard", help="Create a memory shard")
    create_parser.add_argument("--source", required=True, help="Source vector database file")
    create_parser.add_argument("--name", required=True, help="Display name for the shard")
    create_parser.add_argument("--tags", help="Comma-separated tags")
    create_parser.add_argument("--model", help="Embedding model name")
    create_parser.add_argument("--dimensions", type=int, help="Vector dimensions")
    create_parser.add_argument("--count", type=int, help="Number of entries")
    
    # generate-magnet command (legacy - kept for compatibility)
    magnet_parser = subparsers.add_parser("generate-magnet", help="Generate magnet link (legacy)")
    magnet_parser.add_argument("--shard", required=True, help="Path to shard file")
    magnet_parser.add_argument("--trackers", help="Comma-separated tracker URLs")
    
    # search command
    search_parser = subparsers.add_parser("search", help="Search for memory shards")
    search_parser.add_argument("--query", required=True, help="Search query")
    search_parser.add_argument("--limit", type=int, default=10, help="Max results")
    search_parser.add_argument("--model", help="Filter by model")
    
    # download command
    download_parser = subparsers.add_parser("download", help="Download a memory shard")
    download_parser.add_argument("--magnet", required=True, help="Magnet link")
    download_parser.add_argument("--output", help="Output directory (default: ./downloads)")
    
    # list-seeds command (legacy)
    list_parser = subparsers.add_parser("list-seeds", help="List active seeds (legacy)")
    
    # setup-identity command
    identity_parser = subparsers.add_parser("setup-identity", help="Generate ML-DSA-87 identity")
    identity_parser.add_argument("--identity-dir", help="Directory to store keys (default: ~/.openclaw/identity)")
    identity_parser.add_argument("--force", action="store_true", help="Overwrite existing identity")
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        sys.exit(1)
    
    # Route to appropriate command handler
    commands = {
        "share": cmd_share,
        "unshare": cmd_unshare,
        "list-shared": cmd_list_shared,
        "seeder": cmd_seeder,
        "create-shard": cmd_create_shard,
        "generate-magnet": cmd_generate_magnet,
        "search": cmd_search,
        "download": cmd_download,
        "list-seeds": cmd_list_seeds,
        "setup-identity": cmd_setup_identity,
    }
    
    handler = commands.get(args.command)
    if handler:
        handler(args)
    else:
        output_error(f"Unknown command: {args.command}")


if __name__ == "__main__":
    main()
