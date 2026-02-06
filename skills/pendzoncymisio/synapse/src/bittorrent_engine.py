"""
BitTorrent engine wrapper using libtorrent.

Handles actual P2P file transfer using the libtorrent library.
"""

import logging
import time
from pathlib import Path
from typing import Optional, Callable, Dict, Any
import tempfile

try:
    import libtorrent as lt
    LIBTORRENT_AVAILABLE = True
except ImportError:
    LIBTORRENT_AVAILABLE = False
    lt = None

logger = logging.getLogger(__name__)


class BitTorrentEngine:
    """
    BitTorrent engine for P2P file transfers.
    
    Uses libtorrent-rasterbar for actual protocol implementation.
    """
    
    def __init__(
        self,
        listen_port: int = 6881,
        download_dir: str = "./downloads",
        upload_rate_limit: int = 0,  # 0 = unlimited
        download_rate_limit: int = 0,
    ):
        """
        Initialize BitTorrent engine.
        
        Args:
            listen_port: Port to listen on for incoming connections
            download_dir: Directory to save downloaded files
            upload_rate_limit: Upload rate limit in bytes/sec (0 = unlimited)
            download_rate_limit: Download rate limit in bytes/sec (0 = unlimited)
        """
        if not LIBTORRENT_AVAILABLE:
            raise RuntimeError(
                "libtorrent not installed. Install with: uv pip install libtorrent"
            )
        
        self.download_dir = Path(download_dir)
        self.download_dir.mkdir(parents=True, exist_ok=True)
        
        # Create libtorrent session
        self.session = lt.session()
        
        # Configure session
        settings = {
            'listen_interfaces': f'0.0.0.0:{listen_port}',
            'enable_dht': True,
            'enable_lsd': True,  # Local Service Discovery
            'enable_upnp': True,
            'enable_natpmp': True,
            'announce_to_all_trackers': True,
            'announce_to_all_tiers': True,
        }
        
        if upload_rate_limit > 0:
            settings['upload_rate_limit'] = upload_rate_limit
        if download_rate_limit > 0:
            settings['download_rate_limit'] = download_rate_limit
        
        self.session.apply_settings(settings)
        
        # Start DHT
        self.session.add_dht_router("router.bittorrent.com", 6881)
        self.session.add_dht_router("router.utorrent.com", 6881)
        self.session.add_dht_router("dht.transmissionbt.com", 6881)
        
        # Track active handles
        self.handles: Dict[str, Any] = {}
        
        logger.info(f"BitTorrent engine initialized on port {listen_port}")
    
    def create_torrent(
        self,
        file_path: str,
        trackers: list[str],
        comment: str = "",
        creator: str = "Synapse Protocol",
    ) -> tuple[str, bytes]:
        """
        Create a .torrent file from a file.
        
        Args:
            file_path: Path to file to create torrent from
            trackers: List of tracker URLs
            comment: Optional comment
            creator: Creator name
            
        Returns:
            Tuple of (info_hash, torrent_data)
        """
        file_path = Path(file_path)
        
        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")
        
        # Create file storage
        fs = lt.file_storage()
        lt.add_files(fs, str(file_path))
        
        # Create torrent
        t = lt.create_torrent(fs)
        
        # Add trackers
        for i, tracker in enumerate(trackers):
            t.add_tracker(tracker, tier=i)
        
        # Set metadata
        t.set_creator(creator)
        if comment:
            t.set_comment(comment)
        
        # Set piece hashes
        lt.set_piece_hashes(t, str(file_path.parent))
        
        # Generate torrent data
        torrent_data = lt.bencode(t.generate())
        
        # Calculate info hash
        info = lt.torrent_info(torrent_data)
        info_hash = str(info.info_hash())
        
        logger.info(f"Created torrent: {file_path.name} (hash: {info_hash})")
        
        return info_hash, torrent_data
    
    def add_torrent_for_seeding(
        self,
        file_path: str,
        torrent_data: bytes,
    ) -> str:
        """
        Add a torrent for seeding (file already exists).
        
        Args:
            file_path: Path to file to seed
            torrent_data: Torrent metadata
            
        Returns:
            Info hash
        """
        file_path = Path(file_path)
        
        params = lt.add_torrent_params()
        params.ti = lt.torrent_info(torrent_data)
        params.save_path = str(file_path.parent)
        params.seed_mode = True  # File already exists, just seed
        
        handle = self.session.add_torrent(params)
        info_hash = str(handle.info_hash())
        
        self.handles[info_hash] = handle
        
        logger.info(f"Started seeding: {file_path.name}")
        
        return info_hash
    
    def download_from_magnet(
        self,
        magnet_uri: str,
        save_path: Optional[str] = None,
        progress_callback: Optional[Callable[[float, dict], None]] = None,
    ) -> str:
        """
        Download file from magnet link.
        
        Args:
            magnet_uri: Magnet link URI
            save_path: Optional save directory (uses download_dir if None)
            progress_callback: Optional callback(progress_pct, status_dict)
            
        Returns:
            Info hash
        """
        if save_path is None:
            save_path = str(self.download_dir)
        
        # Parse magnet link
        params = lt.parse_magnet_uri(magnet_uri)
        params.save_path = save_path
        
        # Add torrent
        handle = self.session.add_torrent(params)
        info_hash = str(handle.info_hash())
        
        self.handles[info_hash] = handle
        
        logger.info(f"Started download: {magnet_uri[:60]}...")
        
        # Wait for metadata if needed
        if not handle.has_metadata():
            logger.info("Waiting for metadata...")
            while not handle.has_metadata():
                time.sleep(0.1)
            logger.info("Metadata received")
        
        # Monitor progress
        if progress_callback:
            self._monitor_progress(info_hash, progress_callback)
        
        return info_hash
    
    def _monitor_progress(
        self,
        info_hash: str,
        callback: Callable[[float, dict], None],
    ):
        """Monitor download progress and call callback."""
        handle = self.handles.get(info_hash)
        if not handle:
            return
        
        while not handle.is_seed():
            s = handle.status()
            
            status = {
                'state': str(s.state),
                'progress': s.progress * 100,
                'download_rate': s.download_rate,
                'upload_rate': s.upload_rate,
                'num_peers': s.num_peers,
                'total_download': s.total_download,
                'total_upload': s.total_upload,
            }
            
            callback(s.progress * 100, status)
            time.sleep(1)
        
        # Final callback
        callback(100.0, {'state': 'seeding'})
    
    def get_status(self, info_hash: str) -> Optional[dict]:
        """
        Get status of a torrent.
        
        Args:
            info_hash: Info hash of the torrent
            
        Returns:
            Status dictionary or None if not found
        """
        handle = self.handles.get(info_hash)
        if not handle:
            return None
        
        s = handle.status()
        
        return {
            'info_hash': info_hash,
            'name': s.name,
            'state': str(s.state),
            'progress': s.progress * 100,
            'download_rate': s.download_rate,
            'upload_rate': s.upload_rate,
            'num_peers': s.num_peers,
            'num_seeds': s.num_seeds,
            'total_download': s.total_download,
            'total_upload': s.total_upload,
            'total_size': s.total_wanted,
            'is_seeding': handle.is_seed(),
            'is_finished': handle.is_finished(),
        }
    
    def pause_torrent(self, info_hash: str) -> bool:
        """Pause a torrent."""
        handle = self.handles.get(info_hash)
        if not handle:
            return False
        
        handle.pause()
        logger.info(f"Paused torrent: {info_hash}")
        return True
    
    def resume_torrent(self, info_hash: str) -> bool:
        """Resume a paused torrent."""
        handle = self.handles.get(info_hash)
        if not handle:
            return False
        
        handle.resume()
        logger.info(f"Resumed torrent: {info_hash}")
        return True
    
    def remove_torrent(self, info_hash: str, delete_files: bool = False) -> bool:
        """
        Remove a torrent.
        
        Args:
            info_hash: Info hash of the torrent
            delete_files: Whether to delete downloaded files
            
        Returns:
            True if removed successfully
        """
        handle = self.handles.get(info_hash)
        if not handle:
            return False
        
        if delete_files:
            self.session.remove_torrent(handle, lt.options_t.delete_files)
        else:
            self.session.remove_torrent(handle)
        
        del self.handles[info_hash]
        
        logger.info(f"Removed torrent: {info_hash}")
        return True
    
    def list_torrents(self) -> list[dict]:
        """List all active torrents."""
        return [
            self.get_status(info_hash)
            for info_hash in self.handles.keys()
        ]
    
    def wait_for_download(
        self,
        info_hash: str,
        timeout: Optional[float] = None,
    ) -> bool:
        """
        Wait for download to complete.
        
        Args:
            info_hash: Info hash of the torrent
            timeout: Optional timeout in seconds
            
        Returns:
            True if completed, False if timeout
        """
        handle = self.handles.get(info_hash)
        if not handle:
            return False
        
        start_time = time.time()
        
        while not handle.is_finished():
            if timeout and (time.time() - start_time) > timeout:
                logger.warning(f"Download timeout: {info_hash}")
                return False
            
            time.sleep(0.5)
        
        logger.info(f"Download completed: {info_hash}")
        return True
    
    def shutdown(self):
        """Shutdown BitTorrent engine."""
        logger.info("Shutting down BitTorrent engine...")
        
        # Pause all torrents
        for handle in self.handles.values():
            handle.pause()
        
        # Save session state
        self.session.pause()
        
        logger.info("BitTorrent engine shutdown complete")


def check_libtorrent_available() -> bool:
    """Check if libtorrent is available."""
    return LIBTORRENT_AVAILABLE


# Example usage
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    
    if not check_libtorrent_available():
        print("ERROR: libtorrent not installed")
        print("Install with: uv pip install libtorrent")
        exit(1)
    
    # Test the engine
    engine = BitTorrentEngine()
    
    # Test creating a torrent
    test_file = Path("test.txt")
    test_file.write_text("Hello BitTorrent!")
    
    info_hash, torrent_data = engine.create_torrent(
        str(test_file),
        trackers=["http://hivebraintracker.com:8080/announce"],
        comment="Test file"
    )
    
    print(f"Created torrent with hash: {info_hash}")
    
    # Clean up
    test_file.unlink()
    engine.shutdown()
