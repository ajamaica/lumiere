"""
Client helper for communicating with seeder daemon.
"""

import json
import socket
import subprocess
import time
import os
import signal
from pathlib import Path
from typing import Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)


class SeederClient:
    """
    Client for communicating with seeder daemon.
    """
    
    def __init__(self, socket_path: str = "/tmp/synapse-seeder.sock"):
        """
        Initialize seeder client.
        
        Args:
            socket_path: Path to daemon's Unix socket
        """
        self.socket_path = socket_path
        self.pid_file = Path.home() / ".openclaw" / "seeder.pid"
    
    def _send_request(self, request: Dict[str, Any], timeout: float = 5.0) -> Dict[str, Any]:
        """
        Send request to daemon and receive response.
        
        Args:
            request: Request dictionary
            timeout: Socket timeout
            
        Returns:
            Response dictionary
        """
        if not os.path.exists(self.socket_path):
            raise RuntimeError("Seeder daemon not running (socket not found)")
        
        client_socket = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        client_socket.settimeout(timeout)
        
        try:
            client_socket.connect(self.socket_path)
            client_socket.sendall(json.dumps(request).encode('utf-8'))
            
            response_data = client_socket.recv(131072).decode('utf-8')  # 128KB buffer for large signatures
            response = json.loads(response_data)
            
            return response
            
        finally:
            client_socket.close()
    
    def is_running(self) -> bool:
        """Check if daemon is running."""
        if not os.path.exists(self.socket_path):
            return False
        
        try:
            response = self._send_request({'action': 'get_status'}, timeout=1.0)
            return response.get('status') == 'success'
        except:
            return False
    
    def start_daemon(self, detach: bool = True) -> bool:
        """
        Start the seeder daemon.
        
        Args:
            detach: Run as background daemon
            
        Returns:
            True if started successfully
        """
        if self.is_running():
            logger.info("Seeder daemon already running")
            return True
        
        # Ensure directory exists
        self.pid_file.parent.mkdir(parents=True, exist_ok=True)
        
        if detach:
            # Start as daemon
            import sys
            daemon_script = Path(__file__).parent / "seeder_daemon.py"
            
            process = subprocess.Popen(
                [sys.executable, str(daemon_script)],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                start_new_session=True,
            )
            
            # Save PID
            with open(self.pid_file, 'w') as f:
                f.write(str(process.pid))
            
            # Wait for daemon to start
            for _ in range(10):
                time.sleep(0.5)
                if self.is_running():
                    logger.info(f"Seeder daemon started (PID: {process.pid})")
                    return True
            
            logger.error("Daemon failed to start")
            return False
        else:
            # Run in foreground (for debugging)
            from .seeder_daemon import main
            main()
            return True
    
    def stop_daemon(self) -> bool:
        """
        Stop the seeder daemon.
        
        Returns:
            True if stopped successfully
        """
        if not self.is_running():
            logger.info("Seeder daemon not running")
            return True
        
        try:
            response = self._send_request({'action': 'shutdown'}, timeout=2.0)
            
            if response.get('status') == 'success':
                # Wait for shutdown
                for _ in range(10):
                    time.sleep(0.5)
                    if not self.is_running():
                        logger.info("Seeder daemon stopped")
                        
                        # Remove PID file
                        if self.pid_file.exists():
                            self.pid_file.unlink()
                        
                        return True
                
                # Force kill if still running
                if self.pid_file.exists():
                    with open(self.pid_file) as f:
                        pid = int(f.read().strip())
                    
                    try:
                        os.kill(pid, signal.SIGTERM)
                        logger.warning(f"Force killed daemon (PID: {pid})")
                        self.pid_file.unlink()
                        return True
                    except:
                        pass
            
            return False
            
        except Exception as e:
            logger.error(f"Failed to stop daemon: {e}")
            return False
    
    def get_status(self) -> Optional[Dict[str, Any]]:
        """
        Get daemon status.
        
        Returns:
            Status dictionary or None if not running
        """
        if not self.is_running():
            return None
        
        try:
            response = self._send_request({'action': 'get_status'})
            return response if response.get('status') == 'success' else None
        except Exception as e:
            logger.error(f"Failed to get status: {e}")
            return None
    
    def add_shard(self, shard_dict: Dict[str, Any], trackers: Optional[list] = None) -> tuple[str, str]:
        """
        Add shard to daemon for seeding.
        
        Args:
            shard_dict: MemoryShard as dictionary
            trackers: Optional tracker list
            
        Returns:
            Tuple of (info_hash, magnet_uri)
        """
        # Ensure daemon is running
        if not self.is_running():
            logger.info("Starting seeder daemon...")
            if not self.start_daemon():
                raise RuntimeError("Failed to start seeder daemon")
        
        request = {
            'action': 'add_shard',
            'shard': shard_dict,
            'trackers': trackers,
        }
        
        response = self._send_request(request)
        
        if response.get('status') != 'success':
            raise RuntimeError(f"Failed to add shard: {response.get('message')}")
        
        return response['info_hash'], response['magnet_uri']
    
    def remove_shard(self, info_hash: str) -> bool:
        """
        Remove shard from seeding.
        
        Args:
            info_hash: Info hash of shard to remove
            
        Returns:
            True if removed successfully
        """
        if not self.is_running():
            return False
        
        request = {
            'action': 'remove_shard',
            'info_hash': info_hash,
        }
        
        response = self._send_request(request)
        return response.get('status') == 'success'
    
    def list_shards(self) -> list[dict]:
        """
        List all actively seeded shards.
        
        Returns:
            List of shard dictionaries
        """
        if not self.is_running():
            return []
        
        request = {'action': 'list_shards'}
        response = self._send_request(request)
        
        if response.get('status') == 'success':
            return response.get('shards', [])
        
        return []
