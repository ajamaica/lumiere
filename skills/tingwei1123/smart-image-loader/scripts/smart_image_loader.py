#!/usr/bin/env python3
"""
Smart Image Loader - Handles both URLs and local files for image display.

Usage:
    python smart_image_loader.py <image_path_or_url>
    
    <image_path_or_url>: Either a local file path or a URL (http:// or https://)
"""

import os
import sys
import tempfile
import urllib.request
import urllib.error
from pathlib import Path


def is_url(input_str: str) -> bool:
    """Check if the input is a URL."""
    return input_str.startswith('http://') or input_str.startswith('https://')


def download_image(url: str, temp_dir: str) -> str:
    """
    Download an image from a URL to a temporary location.
    
    Args:
        url: The image URL to download
        temp_dir: Temporary directory to save the image
        
    Returns:
        Path to the downloaded file
        
    Raises:
        urllib.error.URLError: If the download fails
    """
    filename = url.split('/')[-1]
    if not filename:
        filename = 'downloaded_image'
    
    # Add extension if missing
    if not any(filename.lower().endswith(ext) for ext in ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp']):
        filename += '.jpg'
    
    filepath = os.path.join(temp_dir, filename)
    
    try:
        urllib.request.urlretrieve(url, filepath)
    except Exception:
        # Fallback to URLLib request with headers
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            with open(filepath, 'wb') as out_file:
                out_file.write(response.read())
    
    return filepath


def cleanup_file(filepath: str) -> None:
    """Remove a temporary file if it exists."""
    try:
        if os.path.exists(filepath):
            os.remove(filepath)
    except OSError:
        pass  # Ignore cleanup errors


def smart_load_image(input_str: str, cleanup: bool = True) -> dict:
    """
    Smart image loading - handles both URLs and local files.
    
    Args:
        input_str: Either a local file path or a URL
        cleanup: Whether to clean up temporary files after loading (default: True)
        
    Returns:
        dict with keys:
        - 'success': bool
        - 'type': 'url' or 'local'
        - 'file_path': str (local path that can be used with read tool)
        - 'message': str (status message)
        - 'cleanup_needed': bool (True if temp file needs cleanup)
    """
    if is_url(input_str):
        # Download URL to temporary location
        temp_dir = tempfile.mkdtemp()
        try:
            file_path = download_image(input_str, temp_dir)
            return {
                'success': True,
                'type': 'url',
                'file_path': file_path,
                'message': f'Downloaded image from URL: {input_str}',
                'cleanup_needed': True
            }
        except urllib.error.URLError as e:
            cleanup_file(os.path.join(temp_dir, '*'))  # Cleanup temp dir
            return {
                'success': False,
                'type': 'url',
                'file_path': None,
                'message': f'Failed to download image: {e}',
                'cleanup_needed': False
            }
        except Exception as e:
            return {
                'success': False,
                'type': 'url',
                'file_path': None,
                'message': f'Error downloading image: {e}',
                'cleanup_needed': False
            }
    else:
        # Check if local file exists
        file_path = input_str
        if not os.path.isabs(file_path):
            file_path = os.path.join(os.getcwd(), file_path)
        
        if os.path.exists(file_path):
            return {
                'success': True,
                'type': 'local',
                'file_path': file_path,
                'message': f'Local file found: {file_path}',
                'cleanup_needed': False
            }
        else:
            return {
                'success': False,
                'type': 'local',
                'file_path': None,
                'message': f'Local file not found: {file_path}',
                'cleanup_needed': False
            }


def main():
    if len(sys.argv) < 2:
        print("Usage: python smart_image_loader.py <image_path_or_url>")
        print("\nExamples:")
        print("  python smart_image_loader.py https://example.com/image.jpg")
        print("  python smart_image_loader.py ./local/image.png")
        print("  python smart_image_loader.py /absolute/path/to/image.gif")
        sys.exit(1)
    
    input_str = sys.argv[1]
    result = smart_load_image(input_str)
    
    print(f"Status: {'SUCCESS' if result['success'] else 'FAILED'}")
    print(f"Type: {result['type']}")
    print(f"File Path: {result['file_path']}")
    print(f"Message: {result['message']}")
    print(f"Cleanup Needed: {result['cleanup_needed']}")
    
    # Exit with appropriate code
    sys.exit(0 if result['success'] else 1)


if __name__ == '__main__':
    main()