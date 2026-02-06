from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
import ipaddress
import socket
import urllib.parse
import requests
from bs4 import BeautifulSoup
import re
import json

class ScuttleError(Exception):
    pass

DEFAULT_TIMEOUT_S = 15

def _is_blocked_ip(ip: str) -> bool:
    try:
        address = ipaddress.ip_address(ip)
    except ValueError:
        return True
    return (
        address.is_private
        or address.is_loopback
        or address.is_link_local
        or address.is_multicast
        or address.is_reserved
        or address.is_unspecified
    )

def _is_blocked_host(hostname: str) -> bool:
    if hostname in {"localhost"} or hostname.endswith(".localhost") or hostname.endswith(".local"):
        return True
    try:
        addrinfo = socket.getaddrinfo(hostname, None)
    except socket.gaierror:
        return True
    for entry in addrinfo:
        ip = entry[4][0]
        if _is_blocked_ip(ip):
            return True
    return False

def _ensure_safe_url(url: str) -> None:
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme not in {"http", "https"}:
        raise ScuttleError("Only http/https URLs are allowed.")
    if not parsed.hostname:
        raise ScuttleError("URL must include a hostname.")
    if _is_blocked_host(parsed.hostname):
        raise ScuttleError("Blocked host: local/private addresses are not allowed.")

@dataclass
class ArtifactDraft:
    """Draft of a research artifact before ingestion."""
    title: str
    content: str
    source: str
    type: str
    confidence: float = 1.0
    tags: List[str] = field(default_factory=list)
    raw_payload: Dict[str, Any] = field(default_factory=dict)

@dataclass
class IngestResult:
    """Result of an ingestion operation."""
    success: bool
    artifact_id: Optional[str] = None
    error: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

class Connector(ABC):
    """Abstract base class for research data connectors."""
    
    @abstractmethod
    def can_handle(self, source: str) -> bool:
        """Return True if this connector can handle the given source (URL or ID)."""
        pass

    @abstractmethod
    def fetch(self, source: str) -> ArtifactDraft:
        """Fetch and parse content into an ArtifactDraft."""
        pass

class Scuttler(Connector):
    """Bridge for legacy Scuttler classes."""
    def can_handle(self, url: str) -> bool:
        return False

    def fetch(self, url: str) -> ArtifactDraft:
        data = self.scuttle(url)
        return ArtifactDraft(
            title=data["title"],
            content=data["content"],
            source=data["source"],
            type=data["type"],
            confidence=data["confidence"],
            tags=data.get("tags", "").split(",") if isinstance(data.get("tags"), str) else data.get("tags", [])
        )

    @abstractmethod
    def scuttle(self, url: str) -> Dict[str, Any]:
        """Legacy scuttle method returning a dict."""
        raise NotImplementedError

class RedditScuttler(Scuttler):
    def can_handle(self, url):
        return "reddit.com" in url or "redd.it" in url

    def scuttle(self, url):
        # Clean URL and append .json
        if "?" in url:
            url = url.split("?")[0]
        if not url.endswith(".json"):
            json_url = url.strip("/") + ".json"
        else:
            json_url = url

        headers = {"User-Agent": "ResearchVault/1.0.1"}
        try:
            _ensure_safe_url(json_url)
            resp = requests.get(json_url, headers=headers, timeout=DEFAULT_TIMEOUT_S)
            resp.raise_for_status()
            data = resp.json()
            
            # Reddit JSON structure: [listing_post, listing_comments]
            post_data = data[0]['data']['children'][0]['data']
            
            title = post_data.get('title', 'No Title')
            body = post_data.get('selftext', '')
            score = post_data.get('score', 0)
            subreddit = post_data.get('subreddit', 'unknown')
            
            content = f"Subreddit: r/{subreddit}\nScore: {score}\nBody: {body}\n"
            
            # Try to get top comment if available
            try:
                comments = data[1]['data']['children']
                if comments:
                    top_comment = comments[0]['data'].get('body', '')
                    if top_comment:
                        content += f"\n--- Top Comment ---\n{top_comment}"
            except (IndexError, KeyError):
                pass

            return {
                "source": f"reddit/r/{subreddit}",
                "type": "SCUTTLE_REDDIT",
                "title": title,
                "content": content,
                "confidence": 1.0 if score > 10 else 0.8,
                "tags": f"reddit,{subreddit}"
            }
        except Exception as e:
            raise ScuttleError(f"Reddit scuttle failed: {e}")

class MoltbookScuttler(Scuttler):
    def can_handle(self, url):
        return "moltbook" in url

    def scuttle(self, url):
        # Mock implementation for the fictional platform
        # URL format: moltbook://post/<id>
        # Suspicion Protocol: treat Moltbook as low-confidence unless corroborated.
        return {
            "source": "moltbook",
            "type": "SCUTTLE_MOLTBOOK",
            "title": "State Management in Autonomous Agents",
            "content": "Modular state management is the missing piece. Persistent SQLite vault + multi-source scuttling = agents that can actually remember and learn across sessions.",
            "confidence": 0.55,
            "tags": "moltbook,agents,state,unverified"
        }

class WebScuttler(Scuttler):
    def can_handle(self, url):
        return True # Fallback

    def scuttle(self, url):
        headers = {"User-Agent": "ResearchVault/1.0.1"}
        try:
            _ensure_safe_url(url)
            resp = requests.get(url, headers=headers, timeout=DEFAULT_TIMEOUT_S)
            resp.raise_for_status()
            
            soup = BeautifulSoup(resp.text, 'html.parser')
            
            title = soup.title.string if soup.title else url
            
            # Very basic extraction: get all paragraphs
            # In a real tool this would be more sophisticated (readability.js style)
            paragraphs = soup.find_all('p')
            text_content = "\n\n".join([p.get_text().strip() for p in paragraphs if len(p.get_text().strip()) > 50])
            
            if not text_content:
                text_content = soup.get_text()[:2000] # Fallback to raw text, truncated

            return {
                "source": "web",
                "type": "SCUTTLE_WEB",
                "title": title.strip(),
                "content": text_content[:5000], # Limit payload
                "confidence": 0.7,
                "tags": "web,scraping"
            }
        except Exception as e:
            raise ScuttleError(f"Web scuttle failed: {e}")

class GrokipediaConnector(Connector):
    def can_handle(self, source: str) -> bool:
        return "grokipedia.com" in source or source.startswith("grokipedia://")

    def fetch(self, source: str) -> ArtifactDraft:
        # Extract slug from URL or ID
        if "/" in source:
            slug = source.split("/")[-1]
        else:
            slug = source
            
        api_url = f"https://grokipedia-api.com/page/{slug}"
        try:
            _ensure_safe_url(api_url)
            resp = requests.get(api_url, timeout=DEFAULT_TIMEOUT_S)
            resp.raise_for_status()
            data = resp.json()
            
            return ArtifactDraft(
                title=data.get("title", slug),
                content=data.get("content_text", ""),
                source="grokipedia",
                type="KNOWLEDGE_BASE",
                confidence=0.95,
                tags=["grokipedia", "knowledge-base"],
                raw_payload=data
            )
        except Exception as e:
            raise ScuttleError(f"Grokipedia fetch failed: {e}")

class YouTubeConnector(Connector):
    def can_handle(self, source: str) -> bool:
        return "youtube.com" in source or "youtu.be" in source

    def fetch(self, source: str) -> ArtifactDraft:
        headers = {"User-Agent": "ResearchVault/1.1.0"}
        try:
            _ensure_safe_url(source)
            resp = requests.get(source, headers=headers, timeout=DEFAULT_TIMEOUT_S)
            resp.raise_for_status()
            
            soup = BeautifulSoup(resp.text, 'html.parser')
            title = soup.title.string.replace(" - YouTube", "") if soup.title else source
            
            # Metadata-only: extract from meta tags
            desc = ""
            desc_tag = soup.find("meta", property="og:description") or soup.find("meta", name="description")
            if desc_tag:
                desc = desc_tag.get("content", "")

            channel = ""
            channel_tag = soup.find("link", itemprop="name") or soup.find("meta", property="og:video:tag")
            if channel_tag:
                channel = channel_tag.get("content", "")

            content = f"Channel: {channel}\n\nDescription:\n{desc}"
            
            return ArtifactDraft(
                title=title.strip(),
                content=content,
                source="youtube",
                type="VIDEO_METADATA",
                confidence=0.9,
                tags=["youtube", "video"],
                raw_payload={"channel": channel, "description": desc}
            )
        except Exception as e:
            raise ScuttleError(f"YouTube fetch failed: {e}")

def get_scuttler(url):
    scuttlers = [RedditScuttler(), MoltbookScuttler(), GrokipediaConnector(), YouTubeConnector(), WebScuttler()]
    for s in scuttlers:
        if s.can_handle(url):
            return s
    return WebScuttler() # Should not be reached due to fallback, but safe
