#!/usr/bin/env python3
"""
OpenClaw YouTube - AIsa API Client
YouTube SERP Scout for content research, competitor tracking, and trend discovery.

Usage:
    python youtube_client.py search --query <query> [--country <code>] [--lang <code>]
    python youtube_client.py search --query "AI agents tutorial" --country us --lang en
"""

import argparse
import json
import os
import sys
import urllib.request
import urllib.parse
import urllib.error
from typing import Any, Dict, List, Optional


class YouTubeClient:
    """OpenClaw YouTube - YouTube SERP Scout API Client."""
    
    BASE_URL = "https://api.aisa.one/apis/v1"
    
    def __init__(self, api_key: Optional[str] = None):
        """Initialize the client with an API key."""
        self.api_key = api_key or os.environ.get("AISA_API_KEY")
        if not self.api_key:
            raise ValueError(
                "AISA_API_KEY is required. Set it via environment variable or pass to constructor."
            )
    
    def _request(
        self, 
        method: str, 
        endpoint: str, 
        params: Optional[Dict[str, Any]] = None,
        data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Make an HTTP request to the AIsa API."""
        url = f"{self.BASE_URL}{endpoint}"
        
        if params:
            query_string = urllib.parse.urlencode(
                {k: v for k, v in params.items() if v is not None}
            )
            url = f"{url}?{query_string}"
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "User-Agent": "OpenClaw-YouTube/1.0",
            "Accept": "application/json"
        }
        
        request_data = None
        if data:
            request_data = json.dumps(data).encode("utf-8")
        
        if method == "POST" and request_data is None:
            request_data = b"{}"
        
        req = urllib.request.Request(url, data=request_data, headers=headers, method=method)
        
        try:
            with urllib.request.urlopen(req, timeout=60) as response:
                return json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            error_body = e.read().decode("utf-8")
            try:
                return json.loads(error_body)
            except json.JSONDecodeError:
                return {"success": False, "error": {"code": str(e.code), "message": error_body}}
        except urllib.error.URLError as e:
            return {"success": False, "error": {"code": "NETWORK_ERROR", "message": str(e.reason)}}
    
    # ==================== YouTube Search API ====================
    
    def search(
        self, 
        query: str, 
        country: Optional[str] = None,
        language: Optional[str] = None,
        filter_token: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Search YouTube SERP.
        
        Args:
            query: Search query string
            country: Country code (e.g., 'us', 'jp', 'uk')
            language: Interface language (e.g., 'en', 'ja', 'zh-CN')
            filter_token: YouTube filter token for pagination or advanced filters
            
        Returns:
            Search results with video information
        """
        params = {
            "engine": "youtube",
            "q": query
        }
        
        if country:
            params["gl"] = country.lower()
        if language:
            params["hl"] = language
        if filter_token:
            params["sp"] = filter_token
            
        return self._request("GET", "/youtube/search", params=params)
    
    def search_videos(
        self, 
        query: str, 
        country: Optional[str] = None,
        language: Optional[str] = None,
        max_results: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Search and return video list with simplified format.
        
        Args:
            query: Search query string
            country: Country code
            language: Interface language
            max_results: Maximum number of results to return
            
        Returns:
            List of video dictionaries
        """
        result = self.search(query, country, language)
        
        videos = []
        # Handle different response formats
        search_results = result.get("videos", result.get("search_results", result.get("video_results", [])))
        
        for item in search_results[:max_results]:
            # Handle nested channel object
            channel_info = item.get("channel", {})
            channel_name = item.get("channel_name") or channel_info.get("title") or channel_info.get("name")
            
            video = {
                "video_id": item.get("id", item.get("video_id")),
                "title": item.get("title"),
                "link": item.get("link"),
                "channel": channel_name,
                "views": item.get("views"),
                "duration": item.get("length", item.get("duration")),
                "published": item.get("published_time", item.get("published_date", item.get("published")))
            }
            videos.append(video)
            
        return videos
    
    def find_top_videos(
        self, 
        query: str, 
        count: int = 5,
        country: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Find top-ranking videos for a query.
        
        Args:
            query: Search query
            count: Number of top videos to return
            country: Country code
            
        Returns:
            Dictionary with query and top videos
        """
        videos = self.search_videos(query, country=country, max_results=count)
        
        return {
            "query": query,
            "country": country or "global",
            "top_videos": videos,
            "total_found": len(videos)
        }
    
    def competitor_research(
        self, 
        competitor_name: str, 
        topic: Optional[str] = None,
        country: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Research competitor's YouTube presence.
        
        Args:
            competitor_name: Competitor brand/channel name
            topic: Optional topic to filter
            country: Country code
            
        Returns:
            Competitor research results
        """
        query = competitor_name
        if topic:
            query = f"{competitor_name} {topic}"
            
        result = self.search(query, country=country)
        
        # Extract unique channels from results
        channels = {}
        videos = result.get("videos", result.get("search_results", result.get("video_results", [])))
        
        for item in videos:
            channel_info = item.get("channel", {})
            channel_name = item.get("channel_name") or channel_info.get("title") or channel_info.get("name") or "Unknown"
            if channel_name not in channels:
                channels[channel_name] = {
                    "name": channel_name,
                    "link": item.get("channel_link", item.get("channel", {}).get("link")),
                    "video_count": 0
                }
            channels[channel_name]["video_count"] += 1
        
        return {
            "competitor": competitor_name,
            "topic": topic,
            "total_videos_found": len(videos),
            "channels_found": list(channels.values()),
            "top_videos": videos[:5]
        }


def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        description="OpenClaw YouTube - YouTube SERP Scout",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    %(prog)s search --query "AI agents tutorial"
    %(prog)s search --query "machine learning" --country us
    %(prog)s search --query "python tutorial" --lang en
    %(prog)s search --query "GPT-5 news" --country us --lang en
        """
    )
    
    subparsers = parser.add_subparsers(dest="command", help="Command")
    
    # search
    search_parser = subparsers.add_parser("search", help="Search YouTube")
    search_parser.add_argument("--query", "-q", required=True, help="Search query")
    search_parser.add_argument("--country", "-c", help="Country code (e.g., us, jp, uk)")
    search_parser.add_argument("--lang", "-l", help="Interface language (e.g., en, ja, zh-CN)")
    search_parser.add_argument("--filter", "-f", help="YouTube filter token")
    
    # top-videos
    top_parser = subparsers.add_parser("top-videos", help="Find top-ranking videos")
    top_parser.add_argument("--query", "-q", required=True, help="Search query")
    top_parser.add_argument("--count", "-n", type=int, default=5, help="Number of videos")
    top_parser.add_argument("--country", "-c", help="Country code")
    
    # competitor
    comp_parser = subparsers.add_parser("competitor", help="Competitor research")
    comp_parser.add_argument("--name", "-n", required=True, help="Competitor name")
    comp_parser.add_argument("--topic", "-t", help="Topic filter")
    comp_parser.add_argument("--country", "-c", help="Country code")
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        sys.exit(1)
    
    try:
        client = YouTubeClient()
    except ValueError as e:
        print(json.dumps({"success": False, "error": {"code": "AUTH_ERROR", "message": str(e)}}))
        sys.exit(1)
    
    result = None
    
    if args.command == "search":
        result = client.search(
            args.query,
            country=args.country,
            language=args.lang,
            filter_token=args.filter
        )
    elif args.command == "top-videos":
        result = client.find_top_videos(
            args.query,
            count=args.count,
            country=args.country
        )
    elif args.command == "competitor":
        result = client.competitor_research(
            args.name,
            topic=args.topic,
            country=args.country
        )
    
    if result:
        output = json.dumps(result, indent=2, ensure_ascii=False)
        try:
            print(output)
        except UnicodeEncodeError:
            print(json.dumps(result, indent=2, ensure_ascii=True))
        sys.exit(0 if result.get("success", True) != False else 1)


if __name__ == "__main__":
    main()
