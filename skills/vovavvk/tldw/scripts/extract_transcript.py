#!/usr/bin/env python3
"""
YouTube Transcript Extractor for OpenClaw tldw skill

Based on TL;DW (Too Long; Didn't Watch) by stong
https://github.com/stong/tldw
License: AGPL-3.0

Adapted for OpenClaw integration with the following changes:
- Removed Flask/HTTP API layer
- Added OpenClaw-specific error handling
- Enhanced cookie file support
- Configured for OpenClaw cache directory structure
"""

import argparse
import os
import sys
import json
import gzip
import re
from typing import Dict, Optional, Tuple
from urllib.parse import quote_plus

try:
    import yt_dlp
    from yt_dlp.utils import YoutubeDLError
except ImportError:
    print("Error: yt-dlp not installed. Install with: pip install yt-dlp")
    sys.exit(1)

try:
    import requests
except ImportError:
    print("Error: requests not installed. Install with: pip install requests")
    sys.exit(1)

try:
    import webvtt
except ImportError:
    print("Error: webvtt-py not installed. Install with: pip install webvtt-py")
    sys.exit(1)


def ensure_cache_dir(cache_dir: str):
    """Ensure cache directory exists."""
    if not os.path.exists(cache_dir):
        os.makedirs(cache_dir, exist_ok=True)
    if not os.path.isdir(cache_dir):
        raise ValueError(f'{cache_dir} is not a directory')


def validate_youtube_url(url: str) -> bool:
    """Validate if URL is a valid YouTube video URL."""
    try:
        video_id = yt_dlp.extractor.youtube.YoutubeIE.extract_id(url)
        return True
    except YoutubeDLError:
        return False


class VideoExtractor:
    """Extract transcripts from YouTube videos with intelligent caption handling."""
    
    def __init__(self, cache_dir: str = './cache', cookies_path: Optional[str] = None):
        """
        Initialize the video extractor.
        
        Args:
            cache_dir: Directory for caching video metadata and captions
            cookies_path: Optional path to cookies.txt file for authenticated access
        """
        ensure_cache_dir(cache_dir)
        self.cache_dir = cache_dir

        self.ydl_opts = {
            'writesubtitles': True,
            'writeannotations': True,
            'writeautomaticsub': True,
            'subtitleslangs': ['en', 'en-US', 'en-CA'],  # Focus on English captions
            'skip_download': True,  # Don't download the video file
            'quiet': False,
            'no_warnings': False,
            'no_playlist': True,
            
            # Enhanced reliability (from user's yt-dlp config)
            'nocheckcertificate': True,  # Bypass SSL issues
            'retries': 100,              # Connection retries
            'fragment_retries': 100,     # Fragment retries
            'continuedl': True,          # Resume interrupted downloads
        }

        # Add cookies if provided and file exists
        if cookies_path and os.path.isfile(cookies_path):
            print(f'Using cookies from: {cookies_path}')
            self.ydl_opts['cookiefile'] = cookies_path
        elif cookies_path:
            print(f'Warning: Cookie file not found at {cookies_path}')

    def get_captions_by_priority(self, info: Dict) -> Optional[Dict]:
        """
        Get captions based on priority order:
        1. Manual subtitles (en-US, en-CA, en-*)
        2. Automatic captions (en-orig, en-US, en-CA, en)
        
        Args:
            info: Video information dictionary from yt-dlp
            
        Returns:
            Caption json blob (fields ext, url, name)
        """
        # Priority order for subtitle languages
        subtitle_priorities = ['en-US', 'en-CA', 'en']
        auto_caption_priorities = ['en-orig', 'en-US', 'en-CA', 'en']
        format_priorities = ['vtt', 'srt', 'ttml']
        
        caption_track = None

        # Check manual subtitles first
        if info.get('subtitles'):
            # Check specific language variants first
            for lang in subtitle_priorities:
                if lang in info['subtitles']:
                    caption_track = info['subtitles'][lang]
                    break
            
            # Then check for any other en-* variants
            else:
                for lang in info['subtitles'].keys():
                    if lang.startswith('en-'):
                        caption_track = info['subtitles'][lang]
                        break

        # Check automatic captions if no manual subtitles found
        if not caption_track:
            if info.get('automatic_captions'):
                for lang in auto_caption_priorities:
                    if lang in info['automatic_captions']:
                        caption_track = info['automatic_captions'][lang]
                        break

        if not caption_track:
            return None

        # Find the preferred format
        for format_type in format_priorities:
            for track in caption_track:
                if not 'name' in track or track.get('protocol') == 'm3u8_native':  # skip weird m3u8 captions
                    continue
                if track.get('ext') == format_type:
                    return track
        
        # If no compatible format found, fail
        return None

    def download_captions(self, video_id: str, caption_obj: Dict) -> str:
        """
        Download caption content with caching.
        
        Args:
            video_id: YouTube video ID
            caption_obj: Caption object from get_captions_by_priority()
            
        Returns:
            Caption content as string
        """
        ext = caption_obj['ext']
        url = caption_obj['url']
        cache_file = os.path.join(self.cache_dir, video_id + '.' + ext + '.gz')

        if os.path.isfile(cache_file):
            print(f'Using cached captions: {cache_file}')
            return gzip.open(cache_file, 'rt').read()

        # Download caption content
        print(f'Downloading captions from: {url}')
        response = requests.get(url)
        response.raise_for_status()
        content = response.text

        # Cache the content
        with gzip.open(cache_file, 'wt') as f:
            f.write(content)

        return content

    def _timestamp_to_seconds(self, timestamp: str) -> float:
        """
        Convert WebVTT timestamp to seconds.
        
        Args:
            timestamp: WebVTT timestamp in format "HH:MM:SS.mmm"
            
        Returns:
            Float representing total seconds
        """
        time_parts = timestamp.split(':')
        hours = float(time_parts[0])
        minutes = float(time_parts[1])
        seconds = float(time_parts[2])
        
        return hours * 3600 + minutes * 60 + seconds

    def _seconds_to_timestamp(self, total_seconds: float) -> str:
        """
        Convert seconds to WebVTT timestamp.
        
        Args:
            total_seconds: Float representing total seconds
                
        Returns:
            WebVTT timestamp in format "HH:MM:SS.mmm"
        """
        hours = int(total_seconds // 3600)
        remaining = total_seconds % 3600
        minutes = int(remaining // 60)
        seconds = remaining % 60
        
        # Format with leading zeros and exactly 3 decimal places
        return f"{hours:02d}:{minutes:02d}:{seconds:06.3f}"

    def _ts_to_secs(self, timestamp):
        """
        Convert webvtt timestamp to seconds including milliseconds.
        
        Note: webvtt library doesn't include fractional part properly,
        so we need this workaround.
        """
        return timestamp.in_seconds() + (timestamp.milliseconds / 1000)

    def dedupe_yt_captions(self, subs_iter):
        """
        Deduplicate YouTube auto-generated captions.
        
        YouTube's auto-captions often have duplicate/overlapping text
        across consecutive subtitle entries. This function merges and
        cleans up the captions to produce readable text.
        
        Adapted from: https://github.com/bindestriche/srt_fix/
        
        Args:
            subs_iter: Iterator of webvtt caption objects
            
        Yields:
            Cleaned caption objects
        """
        previous_subtitle = None
        text = ""
        
        for subtitle in subs_iter:

            if previous_subtitle is None:  # first iteration set previous subtitle for comparison
                previous_subtitle = subtitle
                continue

            subtitle.text = subtitle.text.strip()  # remove trailing linebreaks

            if len(subtitle.text) == 0:  # skip over empty subtitles
                continue

            if (self._ts_to_secs(subtitle.start_time) - self._ts_to_secs(subtitle.end_time) < 0.15 and  # very short
                    subtitle.text in previous_subtitle.text):  # same text as previous
                previous_subtitle.end = subtitle.end  # lengthen previous subtitle
                continue

            current_lines = subtitle.text.split("\n")
            last_lines = previous_subtitle.text.split("\n")

            singleword = False

            if current_lines[0] == last_lines[-1]:  # if first current is last previous
                if len(last_lines) == 1:
                    if len(last_lines[0].split(" ")) < 2 and len(last_lines[0]) > 2:  # if is just one word            
                        singleword = True
                        subtitle.text = current_lines[0] + " " + "\n".join(current_lines[1:])  # remove line break after single word
                    else:
                        subtitle.text = "\n".join(current_lines[1:])  # discard first line of current            
                else:        
                    subtitle.text = "\n".join(current_lines[1:])  # discard first line of current
            else:  # not fusing two lines
                if len(subtitle.text.split(" ")) <= 2:  # only one word in subtitle
                    previous_subtitle.end = subtitle.end  # lengthen previous subtitle
                    title_text = subtitle.text
                    if title_text[0] != " ":
                        title_text = " " + title_text

                    previous_subtitle.text += title_text  # add text to previous
                    continue  # drop this subtitle

            if self._ts_to_secs(subtitle.start_time) <= self._ts_to_secs(previous_subtitle.end_time):  # remove overlap and let 1ms gap
                new_time = max(self._ts_to_secs(subtitle.start_time) - 0.001, 0)
                previous_subtitle.end = self._seconds_to_timestamp(new_time)
            if self._ts_to_secs(subtitle.start_time) >= self._ts_to_secs(subtitle.end_time):  # swap start and end if wrong order
                subtitle.start, subtitle.end = subtitle.end, subtitle.start

            if not singleword:
                yield previous_subtitle
            previous_subtitle = subtitle
        
        yield previous_subtitle

    def parse_captions(self, ext: str, content: str) -> str:
        """
        Parse caption content with formatting based on timing.
        
        Args:
            ext: Captions file extension
            content: Downloaded captions content
            
        Returns:
            Plain text of the captions with paragraph breaks for pauses > 2 seconds
            
        Raises:
            ValueError: If caption format is not supported
        """
        
        if ext == 'vtt':
            captions = webvtt.from_string(content)
            result = ''

            captions = list(self.dedupe_yt_captions(captions))
            
            for i, caption in enumerate(captions):
                # Clean up the current caption text
                current_text = caption.text.replace('\n', ' ').strip()
                
                if i > 0:
                    # Calculate time difference with previous caption
                    prev_end = self._timestamp_to_seconds(captions[i-1].end)
                    current_start = self._timestamp_to_seconds(caption.start)
                    time_diff = current_start - prev_end

                    # Add double newline for pauses > 2 seconds, single newline for > 1 second
                    if time_diff >= 2:
                        result += '\n\n'
                    elif time_diff >= 1:
                        result += '\n'
                    else:
                        result += ' '
                
                result += current_text
        else:
            raise ValueError(f"Unsupported caption format: {ext}")
        
        # Final cleanup to remove any multiple spaces
        result = ' '.join(re.split(' +', result))

        return result

    def extract_video_info(self, url: str) -> Optional[Dict]:
        """
        Extract video metadata from a YouTube URL.
        
        Args:
            url: YouTube video URL
            
        Returns:
            Dictionary with video information (title, description, duration, etc.)
        """

        video_id = yt_dlp.extractor.youtube.YoutubeIE.extract_id(url)

        cache_file = os.path.join(self.cache_dir, video_id + '.json.gz')
        if os.path.isfile(cache_file):
            print(f'Using cached video info: {cache_file}')
            return json.load(gzip.open(cache_file, 'rt'))

        try:
            with yt_dlp.YoutubeDL(self.ydl_opts) as ydl:
                # Get video info
                print(f'Extracting video info for: {url}')
                video_info = ydl.extract_info(f'https://youtube.com/watch?v={video_id}', download=False)
                video_id = video_info['id']
        except YoutubeDLError as e:
            print(f"Error extracting video information: {str(e)}")
            return None
        
        # Cache the metadata
        with gzip.open(cache_file, 'wt') as f:
            json.dump(video_info, f, indent=4)

        return video_info

    def extract_transcript(self, url: str) -> Tuple[Optional[str], Optional[Dict]]:
        """
        Extract complete transcript from a YouTube video.
        
        Args:
            url: YouTube video URL
            
        Returns:
            Tuple of (transcript_text, video_info)
        """
        # Get video metadata
        video_info = self.extract_video_info(url)
        if not video_info:
            return None, None

        video_id = video_info['id']
        duration = video_info.get('duration', 0)
        
        print(f'Video: {video_info.get("title", "Unknown")}')
        print(f'Duration: {duration//60}:{duration%60:02}')

        # Get captions
        caption_track = self.get_captions_by_priority(video_info)
        if not caption_track:
            print('Error: Captions are not available for this video')
            return None, video_info
        
        ext = caption_track['ext']
        print(f'Using captions: {caption_track["name"]} ({ext})')
        
        # Download captions
        downloaded_content = self.download_captions(video_id, caption_track)
        
        # Parse captions
        caption_text = self.parse_captions(ext, downloaded_content)

        print(f'Transcript length: {len(caption_text)} characters')

        return caption_text, video_info


def main():
    """Command-line interface for transcript extraction."""
    parser = argparse.ArgumentParser(
        description='Extract YouTube video transcripts',
        epilog='Part of the OpenClaw tldw skill. Based on https://github.com/stong/tldw'
    )
    parser.add_argument('url', help='YouTube video URL')
    parser.add_argument('--output', '-o', help='Output file path (optional, default: stdout)')
    parser.add_argument('--cache-dir', '-c', default='./cache', help='Cache directory (default: ./cache)')
    parser.add_argument('--cookies', '-k', help='Path to cookies.txt file (optional)')
    parser.add_argument('--json', action='store_true', help='Output as JSON with metadata')
    args = parser.parse_args()

    # Validate URL
    if not validate_youtube_url(args.url):
        print('Error: Invalid YouTube URL')
        sys.exit(1)

    # Extract transcript
    extractor = VideoExtractor(cache_dir=args.cache_dir, cookies_path=args.cookies)
    transcript, video_info = extractor.extract_transcript(args.url)

    if transcript is None:
        print('Error: Failed to extract transcript')
        sys.exit(1)

    # Prepare output
    if args.json:
        output_data = {
            'transcript': transcript,
            'video_id': video_info.get('id'),
            'title': video_info.get('title'),
            'description': video_info.get('description'),
            'duration': video_info.get('duration'),
            'uploader': video_info.get('uploader'),
            'upload_date': video_info.get('upload_date'),
            'view_count': video_info.get('view_count'),
            'webpage_url': video_info.get('webpage_url')
        }
        output_text = json.dumps(output_data, indent=2, ensure_ascii=False)
    else:
        output_text = transcript

    # Write output
    if args.output:
        with open(args.output, 'w', encoding='utf-8') as f:
            f.write(output_text)
        print(f'Transcript saved to: {args.output}')
    else:
        print('\n--- TRANSCRIPT ---')
        print(output_text)


if __name__ == "__main__":
    main()
