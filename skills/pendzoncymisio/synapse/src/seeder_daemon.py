#!/usr/bin/env python3
"""
Persistent BitTorrent seeder daemon for Synapse Protocol.

Runs in the background, managing multiple torrent seeds via a single
libtorrent session. Communicates with clients via Unix socket.
"""

import json
import logging
import os
import signal
import socket
import sys
import time
from pathlib import Path
from typing import Dict, Optional, Any
from datetime import datetime
import threading

# Fix imports to work when run directly
if __name__ == "__main__":
    # Add parent directory to path
    sys.path.insert(0, str(Path(__file__).parent.parent))

from src.bittorrent_engine import BitTorrentEngine, check_libtorrent_available
from src.core import MemoryShard, DEFAULT_TRACKERS

logger = logging.getLogger(__name__)


class SeederDaemon:
    """
    Persistent seeder daemon.
    
    Manages multiple BitTorrent seeds in a single process, communicating
    with clients via Unix socket for control commands.
    """
    
    def __init__(
        self,
        socket_path: str = "/tmp/synapse-seeder.sock",
        state_file: Optional[str] = None,
        listen_port: int = 6881,
    ):
        """
        Initialize seeder daemon.
        
        Args:
            socket_path: Path to Unix socket for IPC
            state_file: Path to state persistence file
            listen_port: BitTorrent listen port
        """
        self.socket_path = socket_path
        self.state_file = state_file or str(Path.home() / ".openclaw" / "seeder_state.json")
        self.listen_port = listen_port
        
        # Ensure state directory exists
        Path(self.state_file).parent.mkdir(parents=True, exist_ok=True)
        
        # Initialize BitTorrent engine
        if not check_libtorrent_available():
            raise RuntimeError("libtorrent not available - cannot start seeder daemon")
        
        self.bt_engine = BitTorrentEngine(
            listen_port=listen_port,
            download_dir=str(Path.home() / ".openclaw" / "downloads")
        )
        
        # State management
        self.shards: Dict[str, Dict[str, Any]] = {}
        self.running = False
        self.server_socket: Optional[socket.socket] = None
        
        # Load previous state
        self._load_state()
        
        logger.info(f"SeederDaemon initialized (port {listen_port})")
    
    def _load_state(self):
        """Load persistent state from disk."""
        if not Path(self.state_file).exists():
            logger.info("No previous state found")
            return
        
        try:
            with open(self.state_file, 'r') as f:
                state = json.load(f)
            
            self.shards = state.get('shards', {})
            
            # Resume seeding for all shards
            for info_hash, shard_data in self.shards.items():
                try:
                    file_path = shard_data['file_path']
                    if not Path(file_path).exists():
                        logger.warning(f"File not found, skipping: {file_path}")
                        continue
                    
                    # Create torrent and start seeding
                    trackers = shard_data.get('trackers', DEFAULT_TRACKERS)
                    _, torrent_data = self.bt_engine.create_torrent(
                        file_path=file_path,
                        trackers=trackers,
                        comment=shard_data.get('display_name', ''),
                    )
                    
                    self.bt_engine.add_torrent_for_seeding(file_path, torrent_data)
                    logger.info(f"Resumed seeding: {shard_data['display_name']}")
                    
                except Exception as e:
                    logger.error(f"Failed to resume seeding {info_hash}: {e}")
            
            logger.info(f"Loaded state: {len(self.shards)} shards")
            
        except Exception as e:
            logger.error(f"Failed to load state: {e}")
    
    def _save_state(self):
        """Save current state to disk."""
        try:
            state = {
                'shards': self.shards,
                'updated_at': datetime.utcnow().isoformat(),
            }
            
            with open(self.state_file, 'w') as f:
                json.dump(state, f, indent=2)
            
            logger.debug("State saved")
            
        except Exception as e:
            logger.error(f"Failed to save state: {e}")
    
    def add_shard(
        self,
        shard: MemoryShard,
        trackers: Optional[list] = None,
    ) -> tuple[str, str]:
        """
        Add a shard for seeding.
        
        Args:
            shard: MemoryShard to seed
            trackers: Optional tracker list
            
        Returns:
            Tuple of (info_hash, magnet_uri)
        """
        file_path = shard.file_path
        
        if not Path(file_path).exists():
            raise FileNotFoundError(f"File not found: {file_path}")
        
        use_trackers = trackers or DEFAULT_TRACKERS
        
        # Create torrent
        info_hash, torrent_data = self.bt_engine.create_torrent(
            file_path=file_path,
            trackers=use_trackers,
            comment=shard.description or shard.display_name,
            creator=shard.creator_agent_id or "Synapse Protocol"
        )
        
        # Start seeding
        self.bt_engine.add_torrent_for_seeding(file_path, torrent_data)
        
        # Build magnet URI
        from src.core import MoltMagnet
        magnet = MoltMagnet(
            info_hash=info_hash,
            display_name=shard.display_name or Path(file_path).name,
            trackers=use_trackers,
            required_model=shard.embedding_model,
            dimension_size=shard.dimension_size,
            tags=shard.tags,
            file_size=Path(file_path).stat().st_size,
            creator_agent_id=shard.creator_agent_id,
            creator_public_key=shard.creator_public_key,
        )
        
        magnet_uri = magnet.to_magnet_uri()
        
        # Store state
        self.shards[info_hash] = {
            'file_path': file_path,
            'display_name': shard.display_name or Path(file_path).name,
            'trackers': use_trackers,
            'magnet_uri': magnet_uri,
            'added_at': datetime.utcnow().isoformat(),
            'embedding_model': shard.embedding_model,
            'dimension_size': shard.dimension_size,
            'tags': shard.tags,
        }
        
        self._save_state()
        
        logger.info(f"Added shard for seeding: {shard.display_name} ({info_hash})")
        
        return info_hash, magnet_uri
    
    def remove_shard(self, info_hash: str) -> bool:
        """
        Remove a shard from seeding.
        
        Args:
            info_hash: Info hash of shard to remove
            
        Returns:
            True if removed successfully
        """
        if info_hash not in self.shards:
            return False
        
        # Stop seeding
        self.bt_engine.remove_torrent(info_hash, delete_files=False)
        
        # Remove from state
        del self.shards[info_hash]
        self._save_state()
        
        logger.info(f"Removed shard from seeding: {info_hash}")
        
        return True
    
    def list_shards(self) -> list[dict]:
        """List all actively seeded shards."""
        result = []
        
        for info_hash, shard_data in self.shards.items():
            status = self.bt_engine.get_status(info_hash)
            
            result.append({
                'info_hash': info_hash,
                'display_name': shard_data['display_name'],
                'file_path': shard_data['file_path'],
                'magnet_uri': shard_data['magnet_uri'],
                'added_at': shard_data['added_at'],
                'status': status,
            })
        
        return result
    
    def get_status(self) -> dict:
        """Get daemon status."""
        return {
            'running': self.running,
            'listen_port': self.listen_port,
            'active_seeds': len(self.shards),
            'socket_path': self.socket_path,
            'state_file': self.state_file,
        }
    
    def _handle_client(self, client_socket: socket.socket):
        """Handle client connection."""
        try:
            data = client_socket.recv(131072).decode('utf-8')  # 128KB buffer for large signatures
            request = json.loads(data)
            
            action = request.get('action')
            
            if action == 'add_shard':
                shard_data = request.get('shard')
                shard = MemoryShard.from_dict(shard_data)
                trackers = request.get('trackers')
                
                info_hash, magnet_uri = self.add_shard(shard, trackers)
                
                response = {
                    'status': 'success',
                    'info_hash': info_hash,
                    'magnet_uri': magnet_uri,
                }
            
            elif action == 'remove_shard':
                info_hash = request.get('info_hash')
                success = self.remove_shard(info_hash)
                
                response = {
                    'status': 'success' if success else 'error',
                    'message': 'Removed' if success else 'Not found',
                }
            
            elif action == 'list_shards':
                shards = self.list_shards()
                response = {
                    'status': 'success',
                    'shards': shards,
                }
            
            elif action == 'get_status':
                status = self.get_status()
                response = {
                    'status': 'success',
                    **status,
                }
            
            elif action == 'shutdown':
                response = {
                    'status': 'success',
                    'message': 'Shutting down',
                }
                self.running = False
            
            else:
                response = {
                    'status': 'error',
                    'message': f'Unknown action: {action}',
                }
            
            client_socket.sendall(json.dumps(response).encode('utf-8'))
            
        except Exception as e:
            logger.error(f"Error handling client: {e}")
            response = {
                'status': 'error',
                'message': str(e),
            }
            try:
                client_socket.sendall(json.dumps(response).encode('utf-8'))
            except:
                pass
        
        finally:
            client_socket.close()
    
    def start(self):
        """Start the seeder daemon."""
        # Remove stale socket
        if os.path.exists(self.socket_path):
            os.unlink(self.socket_path)
        
        # Create Unix socket
        self.server_socket = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        self.server_socket.bind(self.socket_path)
        self.server_socket.listen(5)
        
        # Make socket accessible
        os.chmod(self.socket_path, 0o666)
        
        self.running = True
        
        logger.info(f"Seeder daemon started (socket: {self.socket_path})")
        
        # Handle shutdown signals
        def signal_handler(sig, frame):
            logger.info("Received shutdown signal")
            self.running = False
        
        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGTERM, signal_handler)
        
        # Accept connections
        while self.running:
            try:
                self.server_socket.settimeout(1.0)
                client_socket, _ = self.server_socket.accept()
                
                # Handle in separate thread
                thread = threading.Thread(target=self._handle_client, args=(client_socket,))
                thread.daemon = True
                thread.start()
                
            except socket.timeout:
                continue
            except Exception as e:
                if self.running:
                    logger.error(f"Error accepting connection: {e}")
        
        self.shutdown()
    
    def shutdown(self):
        """Shutdown the daemon."""
        logger.info("Shutting down seeder daemon...")
        
        # Save final state
        self._save_state()
        
        # Close socket
        if self.server_socket:
            self.server_socket.close()
        
        if os.path.exists(self.socket_path):
            os.unlink(self.socket_path)
        
        # Shutdown BitTorrent engine
        self.bt_engine.shutdown()
        
        logger.info("Seeder daemon stopped")


def main():
    """Main entry point for daemon."""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(Path.home() / ".openclaw" / "seeder.log"),
            logging.StreamHandler(),
        ]
    )
    
    daemon = SeederDaemon()
    daemon.start()


if __name__ == "__main__":
    main()
