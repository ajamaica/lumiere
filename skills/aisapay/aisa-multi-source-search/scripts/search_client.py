#!/usr/bin/env python3
"""
OpenClaw Search - AIsa API Client
Web and academic search for autonomous agents with confidence scoring.

Usage:
    python search_client.py web --query <query> [--count <n>]
    python search_client.py scholar --query <query> [--count <n>] [--year-from <y>] [--year-to <y>]
    python search_client.py smart --query <query> [--count <n>]
    python search_client.py full --query <query> [--count <n>]
    python search_client.py tavily-search --query <query>
    python search_client.py tavily-extract --urls <url1,url2,...>
    python search_client.py verity --query <query> [--count <n>]  # Multi-source with confidence scoring
"""

import argparse
import json
import os
import sys
import urllib.request
import urllib.parse
import urllib.error
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any, Dict, List, Optional


class SearchClient:
    """OpenClaw Search - Web and Academic Search API Client with Confidence Scoring."""
    
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
            "User-Agent": "OpenClaw-Search/1.0"
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
    
    # ==================== Search APIs ====================
    
    def web_search(self, query: str, max_results: int = 10) -> Dict[str, Any]:
        """Perform a web search."""
        return self._request("POST", "/scholar/search/web", params={
            "query": query,
            "max_num_results": max_results
        })
    
    def scholar_search(
        self, 
        query: str, 
        max_results: int = 10, 
        year_from: int = None, 
        year_to: int = None
    ) -> Dict[str, Any]:
        """Search academic papers."""
        params = {
            "query": query,
            "max_num_results": max_results
        }
        if year_from:
            params["as_ylo"] = year_from
        if year_to:
            params["as_yhi"] = year_to
        return self._request("POST", "/scholar/search/scholar", params=params)
    
    def smart_search(self, query: str, max_results: int = 10) -> Dict[str, Any]:
        """Perform intelligent search combining web and academic results."""
        return self._request("POST", "/scholar/search/smart", params={
            "query": query,
            "max_num_results": max_results
        })
    
    def full_search(self, query: str, max_results: int = 10) -> Dict[str, Any]:
        """Perform full text search with page content."""
        return self._request("POST", "/search/full", params={
            "query": query,
            "max_num_results": max_results
        })
    
    def explain_results(self, results: List[Dict], language: str = "en", format: str = "summary") -> Dict[str, Any]:
        """Generate explanations for search results."""
        return self._request("POST", "/scholar/explain", data={
            "results": results,
            "language": language,
            "format": format
        })
    
    # ==================== Tavily APIs ====================
    
    def tavily_search(self, query: str) -> Dict[str, Any]:
        """Tavily search integration."""
        return self._request("POST", "/tavily/search", data={"query": query})
    
    def tavily_extract(self, urls: List[str]) -> Dict[str, Any]:
        """Extract content from URLs."""
        return self._request("POST", "/tavily/extract", data={"urls": urls})
    
    def tavily_crawl(self, url: str, max_depth: int = 2) -> Dict[str, Any]:
        """Crawl web pages."""
        return self._request("POST", "/tavily/crawl", data={"url": url, "max_depth": max_depth})
    
    def tavily_map(self, url: str) -> Dict[str, Any]:
        """Generate site map."""
        return self._request("POST", "/tavily/map", data={"url": url})
    
    # ==================== Verity-Style Multi-Source Search ====================
    
    def verity_search(self, query: str, max_results: int = 10) -> Dict[str, Any]:
        """
        Multi-source search with confidence scoring (Verity-style).
        
        Phase 1: Parallel retrieval from Scholar, Web, Smart, Tavily
        Phase 2: Meta-analysis with confidence scoring
        """
        # Phase 1: Parallel Discovery
        sources = {}
        errors = []
        
        def fetch_scholar():
            return ("scholar", self.scholar_search(query, max_results))
        
        def fetch_web():
            return ("web", self.web_search(query, max_results))
        
        def fetch_smart():
            return ("smart", self.smart_search(query, max_results))
        
        def fetch_tavily():
            return ("tavily", self.tavily_search(query))
        
        with ThreadPoolExecutor(max_workers=4) as executor:
            futures = [
                executor.submit(fetch_scholar),
                executor.submit(fetch_web),
                executor.submit(fetch_smart),
                executor.submit(fetch_tavily)
            ]
            
            for future in as_completed(futures):
                try:
                    source_name, result = future.result()
                    sources[source_name] = result
                except Exception as e:
                    errors.append(str(e))
        
        # Phase 2: Confidence Scoring
        confidence = self._calculate_confidence(sources)
        
        # Collect all results for explanation
        all_results = []
        for source_name, source_data in sources.items():
            if isinstance(source_data, dict):
                # Handle different response formats
                if "results" in source_data:
                    for item in source_data.get("results", []):
                        item["_source"] = source_name
                        all_results.append(item)
                elif "data" in source_data:
                    for item in source_data.get("data", []):
                        item["_source"] = source_name
                        all_results.append(item)
        
        return {
            "query": query,
            "confidence": confidence,
            "confidence_level": self._confidence_level(confidence["score"]),
            "sources": sources,
            "result_count": {
                source: len(data.get("results", data.get("data", []))) 
                if isinstance(data, dict) else 0
                for source, data in sources.items()
            },
            "errors": errors if errors else None
        }
    
    def _calculate_confidence(self, sources: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate deterministic confidence score based on source data."""
        score = 0.0
        breakdown = {}
        
        # Source Quality (40% weight)
        # Academic > Smart/Web > External
        source_quality = 0.0
        
        scholar_data = sources.get("scholar", {})
        if isinstance(scholar_data, dict) and scholar_data.get("results"):
            scholar_count = len(scholar_data.get("results", []))
            source_quality += min(40, scholar_count * 8)  # Max 40 points
            breakdown["scholar_results"] = scholar_count
        
        web_data = sources.get("web", {})
        if isinstance(web_data, dict) and web_data.get("results"):
            web_count = len(web_data.get("results", []))
            source_quality += min(20, web_count * 2)  # Max 20 points
            breakdown["web_results"] = web_count
        
        smart_data = sources.get("smart", {})
        if isinstance(smart_data, dict) and smart_data.get("results"):
            smart_count = len(smart_data.get("results", []))
            source_quality += min(20, smart_count * 2)  # Max 20 points
            breakdown["smart_results"] = smart_count
        
        tavily_data = sources.get("tavily", {})
        if isinstance(tavily_data, dict) and tavily_data.get("results"):
            tavily_count = len(tavily_data.get("results", []))
            source_quality += min(10, tavily_count * 1)  # Max 10 points
            breakdown["tavily_results"] = tavily_count
        
        # Normalize source quality to 40% weight
        source_quality_score = min(40, source_quality * 0.4)
        breakdown["source_quality"] = round(source_quality_score, 2)
        score += source_quality_score
        
        # Multi-source Agreement (35% weight)
        # More sources with results = higher agreement potential
        sources_with_data = sum(1 for s in sources.values() 
                               if isinstance(s, dict) and (s.get("results") or s.get("data")))
        agreement_score = (sources_with_data / 4) * 35
        breakdown["agreement"] = round(agreement_score, 2)
        breakdown["sources_responding"] = sources_with_data
        score += agreement_score
        
        # Data Availability (15% weight)
        total_results = sum(
            len(s.get("results", s.get("data", []))) 
            for s in sources.values() 
            if isinstance(s, dict)
        )
        data_score = min(15, total_results * 0.5)
        breakdown["data_availability"] = round(data_score, 2)
        breakdown["total_results"] = total_results
        score += data_score
        
        # No Errors (10% weight)
        no_errors = all(
            isinstance(s, dict) and s.get("success", True) != False 
            for s in sources.values()
        )
        error_score = 10 if no_errors else 0
        breakdown["no_errors"] = error_score
        score += error_score
        
        return {
            "score": round(min(100, score), 1),
            "breakdown": breakdown
        }
    
    def _confidence_level(self, score: float) -> str:
        """Convert score to human-readable confidence level."""
        if score >= 90:
            return "Very High"
        elif score >= 70:
            return "High"
        elif score >= 50:
            return "Medium"
        elif score >= 30:
            return "Low"
        else:
            return "Very Low"


def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        description="OpenClaw Search - Web and academic search with confidence scoring",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    %(prog)s web --query "AI frameworks"
    %(prog)s scholar --query "transformer models" --year-from 2024
    %(prog)s verity --query "Is quantum computing enterprise-ready?"
        """
    )
    
    subparsers = parser.add_subparsers(dest="command", help="Search type")
    
    # web search
    web = subparsers.add_parser("web", help="Web search")
    web.add_argument("--query", "-q", required=True, help="Search query")
    web.add_argument("--count", "-c", type=int, default=10, help="Max results")
    
    # scholar search
    scholar = subparsers.add_parser("scholar", help="Academic paper search")
    scholar.add_argument("--query", "-q", required=True, help="Search query")
    scholar.add_argument("--count", "-c", type=int, default=10, help="Max results")
    scholar.add_argument("--year-from", type=int, help="Year lower bound")
    scholar.add_argument("--year-to", type=int, help="Year upper bound")
    
    # smart search
    smart = subparsers.add_parser("smart", help="Smart search (web + academic)")
    smart.add_argument("--query", "-q", required=True, help="Search query")
    smart.add_argument("--count", "-c", type=int, default=10, help="Max results")
    
    # full text search
    full = subparsers.add_parser("full", help="Full text search with content")
    full.add_argument("--query", "-q", required=True, help="Search query")
    full.add_argument("--count", "-c", type=int, default=10, help="Max results")
    
    # tavily search
    tavily_search = subparsers.add_parser("tavily-search", help="Tavily search")
    tavily_search.add_argument("--query", "-q", required=True, help="Search query")
    
    # tavily extract
    tavily_extract = subparsers.add_parser("tavily-extract", help="Extract content from URLs")
    tavily_extract.add_argument("--urls", "-u", required=True, help="URLs (comma-separated)")
    
    # tavily crawl
    tavily_crawl = subparsers.add_parser("tavily-crawl", help="Crawl web pages")
    tavily_crawl.add_argument("--url", "-u", required=True, help="URL to crawl")
    tavily_crawl.add_argument("--depth", "-d", type=int, default=2, help="Max crawl depth")
    
    # tavily map
    tavily_map = subparsers.add_parser("tavily-map", help="Generate site map")
    tavily_map.add_argument("--url", "-u", required=True, help="URL to map")
    
    # verity search (multi-source with confidence)
    verity = subparsers.add_parser("verity", help="Multi-source search with confidence scoring")
    verity.add_argument("--query", "-q", required=True, help="Search query")
    verity.add_argument("--count", "-c", type=int, default=10, help="Max results per source")
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        sys.exit(1)
    
    try:
        client = SearchClient()
    except ValueError as e:
        print(json.dumps({"success": False, "error": {"code": "AUTH_ERROR", "message": str(e)}}))
        sys.exit(1)
    
    result = None
    
    if args.command == "web":
        result = client.web_search(args.query, args.count)
    elif args.command == "scholar":
        result = client.scholar_search(args.query, args.count, args.year_from, args.year_to)
    elif args.command == "smart":
        result = client.smart_search(args.query, args.count)
    elif args.command == "full":
        result = client.full_search(args.query, args.count)
    elif args.command == "tavily-search":
        result = client.tavily_search(args.query)
    elif args.command == "tavily-extract":
        urls = [u.strip() for u in args.urls.split(",")]
        result = client.tavily_extract(urls)
    elif args.command == "tavily-crawl":
        result = client.tavily_crawl(args.url, args.depth)
    elif args.command == "tavily-map":
        result = client.tavily_map(args.url)
    elif args.command == "verity":
        result = client.verity_search(args.query, args.count)
    
    if result:
        output = json.dumps(result, indent=2, ensure_ascii=False)
        try:
            print(output)
        except UnicodeEncodeError:
            print(json.dumps(result, indent=2, ensure_ascii=True))
        sys.exit(0 if result.get("success", True) else 1)


if __name__ == "__main__":
    main()
