#!/usr/bin/env python3
"""
WordPress Publisher - Complete REST API client with category management,
tag generation, preview support, and Gutenberg block publishing.

Usage:
    python wp_publisher.py --url https://site.com --user admin --password "app pass" --test
    python wp_publisher.py --url https://site.com --user admin --password "app pass" --list-categories
    python wp_publisher.py --url https://site.com --user admin --password "app pass" --publish article.html --title "Title"
"""

import requests
import base64
import json
import time
import re
import argparse
from typing import Optional, Dict, List, Any, Tuple
from urllib.parse import urljoin
from datetime import datetime


class WordPressPublisher:
    """WordPress REST API client for publishing content with full category and tag support."""
    
    def __init__(self, site_url: str, username: str, password: str):
        """
        Initialize WordPress publisher.
        
        Args:
            site_url: WordPress site URL (e.g., https://example.com)
            username: WordPress username
            password: Application password (NOT regular password)
        """
        self.site_url = site_url.rstrip('/').replace('http://', 'https://')
        self.api_base = f"{self.site_url}/wp-json/wp/v2"
        
        # Create auth header - application password can have spaces
        clean_password = password.replace(' ', '')  # Remove spaces if user copied with them
        auth_string = base64.b64encode(f"{username}:{password}".encode()).decode()
        self.headers = {
            "Authorization": f"Basic {auth_string}",
            "Content-Type": "application/json"
        }
        self.username = username
        
        # Cache for categories and tags
        self._categories_cache = None
        self._tags_cache = None
    
    def _request(self, method: str, endpoint: str, data: Dict = None, 
                 files: Dict = None, params: Dict = None, max_retries: int = 3) -> Any:
        """
        Make API request with retry logic.
        
        Args:
            method: HTTP method (GET, POST, PUT, DELETE)
            endpoint: API endpoint (without /wp-json/wp/v2 prefix)
            data: JSON data for POST/PUT
            files: Files for upload
            params: Query parameters for GET
            max_retries: Number of retry attempts
            
        Returns:
            API response as dict or list
            
        Raises:
            AuthenticationError: Invalid credentials
            PermissionError: Insufficient permissions
            NotFoundError: Endpoint or resource not found
            APIError: Other API errors
        """
        url = f"{self.api_base}/{endpoint}"
        
        for attempt in range(max_retries):
            try:
                if method == 'GET':
                    response = requests.get(url, headers=self.headers, params=params, timeout=30)
                elif method == 'POST':
                    if files:
                        upload_headers = {"Authorization": self.headers["Authorization"]}
                        response = requests.post(url, headers=upload_headers, files=files, data=data, timeout=60)
                    else:
                        response = requests.post(url, headers=self.headers, json=data, timeout=30)
                elif method == 'PUT':
                    response = requests.put(url, headers=self.headers, json=data, timeout=30)
                elif method == 'DELETE':
                    response = requests.delete(url, headers=self.headers, params=params, timeout=30)
                else:
                    raise ValueError(f"Unsupported HTTP method: {method}")
                
                # Handle response
                if response.status_code in [200, 201]:
                    return response.json()
                elif response.status_code == 401:
                    raise AuthenticationError(
                        "Authentication failed. Verify:\n"
                        "1. Username is correct\n"
                        "2. Using Application Password (not regular password)\n"
                        "3. Application Password has no extra spaces\n"
                        "4. REST API is enabled on the site"
                    )
                elif response.status_code == 403:
                    raise PermissionError(
                        "Permission denied. User needs Editor or Administrator role."
                    )
                elif response.status_code == 404:
                    raise NotFoundError(f"Not found: {url}")
                elif response.status_code >= 500:
                    if attempt < max_retries - 1:
                        time.sleep(2 ** attempt)
                        continue
                    raise ServerError(f"Server error ({response.status_code}): {response.text}")
                else:
                    try:
                        error_msg = response.json().get('message', response.text)
                    except:
                        error_msg = response.text
                    raise APIError(f"API error ({response.status_code}): {error_msg}")
                    
            except requests.exceptions.Timeout:
                if attempt < max_retries - 1:
                    time.sleep(2 ** attempt)
                    continue
                raise ConnectionError("Request timed out")
            except requests.exceptions.RequestException as e:
                if attempt < max_retries - 1:
                    time.sleep(2 ** attempt)
                    continue
                raise ConnectionError(f"Connection failed: {e}")
        
        raise APIError("Max retries exceeded")
    
    # ============================================================
    # CONNECTION TESTING
    # ============================================================
    
    def test_connection(self) -> Dict:
        """
        Test API connection and return current user info.
        
        Returns:
            User info dict with name, roles, etc.
        """
        return self._request('GET', 'users/me')
    
    # ============================================================
    # CATEGORY MANAGEMENT
    # ============================================================
    
    def get_categories(self, per_page: int = 100, force_refresh: bool = False) -> List[Dict]:
        """
        Get all categories from WordPress site.
        
        Args:
            per_page: Number of categories to fetch
            force_refresh: Bypass cache and fetch fresh data
            
        Returns:
            List of category dicts
        """
        if self._categories_cache is None or force_refresh:
            self._categories_cache = self._request('GET', 'categories', params={'per_page': per_page})
        return self._categories_cache
    
    def get_categories_with_details(self) -> List[Dict]:
        """
        Get categories with full details formatted for display.
        
        Returns:
            List of dicts with id, name, slug, count, parent, description
        """
        categories = self.get_categories()
        return [
            {
                'id': cat['id'],
                'name': cat['name'],
                'slug': cat['slug'],
                'count': cat.get('count', 0),
                'parent': cat.get('parent', 0),
                'description': cat.get('description', '')
            }
            for cat in categories
        ]
    
    def create_category(self, name: str, slug: str = None, 
                       description: str = None, parent: int = None) -> Dict:
        """
        Create a new category.
        
        Args:
            name: Category name
            slug: URL slug (auto-generated if not provided)
            description: Category description
            parent: Parent category ID
            
        Returns:
            Created category dict
        """
        data = {"name": name}
        if slug:
            data["slug"] = slug
        if description:
            data["description"] = description
        if parent:
            data["parent"] = parent
        
        result = self._request('POST', 'categories', data)
        self._categories_cache = None  # Clear cache
        return result
    
    def get_or_create_category(self, name: str) -> int:
        """
        Get category ID by name, creating if it doesn't exist.
        
        Args:
            name: Category name to find or create
            
        Returns:
            Category ID
        """
        categories = self.get_categories()
        for cat in categories:
            if cat['name'].lower() == name.lower():
                return cat['id']
        
        new_cat = self.create_category(name)
        return new_cat['id']
    
    def suggest_category(self, content: str, title: str, 
                        available_categories: List[Dict] = None) -> Dict:
        """
        Analyze content and suggest the best matching category.
        
        Args:
            content: Article content
            title: Article title
            available_categories: List of categories (fetched if not provided)
            
        Returns:
            Best matching category dict, or None if no good match
        """
        if available_categories is None:
            available_categories = self.get_categories_with_details()
        
        # Skip 'Uncategorized'
        categories = [c for c in available_categories if c['slug'] != 'uncategorized']
        
        if not categories:
            return available_categories[0] if available_categories else None
        
        # Combine title and content for matching
        text = f"{title} {content}".lower()
        
        # Score each category
        scores = []
        for cat in categories:
            score = 0
            
            # Exact name match in title (highest priority)
            if cat['name'].lower() in title.lower():
                score += 100
            
            # Name match in content
            if cat['name'].lower() in text:
                score += 50
            
            # Slug word matches
            slug_words = cat['slug'].replace('-', ' ').split()
            for word in slug_words:
                if len(word) > 3 and word in text:
                    score += 10
            
            # Boost categories with more existing posts (established categories)
            score += min(cat['count'], 10)
            
            scores.append((cat, score))
        
        # Sort by score descending
        scores.sort(key=lambda x: x[1], reverse=True)
        
        # Return best match if score > 0, else first category
        if scores[0][1] > 0:
            return scores[0][0]
        return categories[0]
    
    # ============================================================
    # TAG MANAGEMENT
    # ============================================================
    
    def get_tags(self, per_page: int = 100, force_refresh: bool = False) -> List[Dict]:
        """
        Get all tags from WordPress site.
        
        Args:
            per_page: Number of tags to fetch
            force_refresh: Bypass cache
            
        Returns:
            List of tag dicts
        """
        if self._tags_cache is None or force_refresh:
            self._tags_cache = self._request('GET', 'tags', params={'per_page': per_page})
        return self._tags_cache
    
    def create_tag(self, name: str, slug: str = None, description: str = None) -> Dict:
        """
        Create a new tag.
        
        Args:
            name: Tag name
            slug: URL slug
            description: Tag description
            
        Returns:
            Created tag dict
        """
        data = {"name": name}
        if slug:
            data["slug"] = slug
        if description:
            data["description"] = description
        
        result = self._request('POST', 'tags', data)
        self._tags_cache = None  # Clear cache
        return result
    
    def get_or_create_tag(self, name: str) -> int:
        """
        Get tag ID by name, creating if it doesn't exist.
        
        Args:
            name: Tag name
            
        Returns:
            Tag ID
        """
        tags = self.get_tags()
        for tag in tags:
            if tag['name'].lower() == name.lower():
                return tag['id']
        
        new_tag = self.create_tag(name)
        return new_tag['id']
    
    def get_or_create_tags(self, names: List[str]) -> List[int]:
        """
        Get or create multiple tags.
        
        Args:
            names: List of tag names
            
        Returns:
            List of tag IDs
        """
        return [self.get_or_create_tag(name) for name in names]
    
    def generate_seo_tags(self, content: str, title: str, 
                         primary_keyword: str = None, max_tags: int = 10) -> List[str]:
        """
        Generate SEO-optimized tags based on content analysis.
        
        Args:
            content: Article content
            title: Article title
            primary_keyword: Main keyword (extracted from title if not provided)
            max_tags: Maximum number of tags to generate
            
        Returns:
            List of tag strings
        """
        tags = []
        
        # 1. Primary keyword (from title or provided)
        if primary_keyword:
            tags.append(primary_keyword)
        else:
            # Extract primary keyword from title
            # Remove common words and year
            title_clean = re.sub(r'\b(in|the|a|an|for|to|of|and|or|with|best|top|\d{4})\b', 
                                '', title, flags=re.IGNORECASE)
            title_clean = re.sub(r'[^\w\s]', '', title_clean)
            title_words = [w.strip() for w in title_clean.split() if len(w.strip()) > 2]
            if title_words:
                # Use first meaningful phrase
                tags.append(' '.join(title_words[:3]).lower())
        
        # 2. Extract entities (capitalized phrases, brand names)
        entities = re.findall(r'\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b', content)
        entity_counts = {}
        for entity in entities:
            if len(entity) > 2 and entity.lower() not in ['the', 'this', 'that', 'these']:
                entity_counts[entity] = entity_counts.get(entity, 0) + 1
        
        # Add top entities as tags
        sorted_entities = sorted(entity_counts.items(), key=lambda x: x[1], reverse=True)
        for entity, count in sorted_entities[:3]:
            if entity.lower() not in [t.lower() for t in tags]:
                tags.append(entity.lower())
        
        # 3. Extract key phrases (2-3 word combinations that appear multiple times)
        # Look for patterns like "hosting provider", "workflow automation"
        phrases = re.findall(r'\b([a-z]+\s+[a-z]+(?:\s+[a-z]+)?)\b', content.lower())
        phrase_counts = {}
        stop_words = {'the', 'and', 'for', 'that', 'this', 'with', 'from', 'have', 'has', 'are', 'was', 'were', 'been'}
        for phrase in phrases:
            words = phrase.split()
            if all(w not in stop_words and len(w) > 2 for w in words):
                phrase_counts[phrase] = phrase_counts.get(phrase, 0) + 1
        
        sorted_phrases = sorted(phrase_counts.items(), key=lambda x: x[1], reverse=True)
        for phrase, count in sorted_phrases:
            if count >= 2 and phrase not in [t.lower() for t in tags]:
                tags.append(phrase)
                if len(tags) >= max_tags:
                    break
        
        # 4. Add topic-related tags from common patterns
        topic_patterns = {
            r'\bhosting\b': 'hosting',
            r'\bwordpress\b': 'wordpress',
            r'\bn8n\b': 'n8n',
            r'\bdocker\b': 'docker',
            r'\bkubernetes\b': 'kubernetes',
            r'\bseo\b': 'seo',
            r'\becommerce\b': 'ecommerce',
            r'\bshopify\b': 'shopify',
            r'\bautomation\b': 'automation',
            r'\bapi\b': 'api',
            r'\bcloud\b': 'cloud hosting',
            r'\bvps\b': 'vps hosting',
            r'\bself.?hosted?\b': 'self-hosted',
            r'\bopen.?source\b': 'open source',
        }
        
        content_lower = content.lower()
        for pattern, tag in topic_patterns.items():
            if re.search(pattern, content_lower) and tag not in [t.lower() for t in tags]:
                tags.append(tag)
                if len(tags) >= max_tags:
                    break
        
        return tags[:max_tags]
    
    # ============================================================
    # MEDIA MANAGEMENT
    # ============================================================
    
    def upload_media(self, file_path: str, title: str = None, 
                    alt_text: str = None, caption: str = None) -> Dict:
        """
        Upload media file to WordPress.
        
        Args:
            file_path: Path to local file
            title: Media title
            alt_text: Alt text for images
            caption: Media caption
            
        Returns:
            Media dict with id, url, etc.
        """
        import os
        filename = os.path.basename(file_path)
        
        # Determine content type
        ext = os.path.splitext(filename)[1].lower()
        content_types = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.pdf': 'application/pdf',
        }
        content_type = content_types.get(ext, 'application/octet-stream')
        
        with open(file_path, 'rb') as f:
            files = {'file': (filename, f, content_type)}
            data = {}
            if title:
                data['title'] = title
            if alt_text:
                data['alt_text'] = alt_text
            if caption:
                data['caption'] = caption
            
            return self._request('POST', 'media', data=data, files=files)
    
    def get_media(self, media_id: int) -> Dict:
        """Get media item by ID."""
        return self._request('GET', f'media/{media_id}')
    
    # ============================================================
    # POST MANAGEMENT
    # ============================================================
    
    def create_post(self, title: str, content: str, status: str = 'draft',
                   categories: List[int] = None, tags: List[int] = None,
                   featured_media: int = None, excerpt: str = None,
                   slug: str = None, date: str = None, meta: Dict = None) -> Dict:
        """
        Create a new post.
        
        Args:
            title: Post title
            content: Post content (Gutenberg blocks)
            status: Post status (draft, publish, pending, private, future)
            categories: List of category IDs
            tags: List of tag IDs
            featured_media: Featured image media ID
            excerpt: Custom excerpt
            slug: Custom URL slug
            date: Publication date (ISO format, for scheduled posts)
            meta: Custom meta fields
            
        Returns:
            Created post dict
        """
        data = {
            "title": title,
            "content": content,
            "status": status
        }
        
        if categories:
            data["categories"] = categories
        if tags:
            data["tags"] = tags
        if featured_media:
            data["featured_media"] = featured_media
        if excerpt:
            data["excerpt"] = excerpt
        if slug:
            data["slug"] = slug
        if date:
            data["date"] = date
        if meta:
            data["meta"] = meta
        
        return self._request('POST', 'posts', data)
    
    def update_post(self, post_id: int, **kwargs) -> Dict:
        """
        Update an existing post.
        
        Args:
            post_id: Post ID to update
            **kwargs: Fields to update (title, content, status, etc.)
            
        Returns:
            Updated post dict
        """
        return self._request('PUT', f'posts/{post_id}', kwargs)
    
    def get_post(self, post_id: int, context: str = 'view') -> Dict:
        """
        Get post by ID.
        
        Args:
            post_id: Post ID
            context: Context (view, edit)
            
        Returns:
            Post dict
        """
        return self._request('GET', f'posts/{post_id}', params={'context': context})
    
    def delete_post(self, post_id: int, force: bool = False) -> Dict:
        """Delete a post."""
        return self._request('DELETE', f'posts/{post_id}', params={'force': force})
    
    def get_posts(self, per_page: int = 10, page: int = 1, 
                 status: str = None, categories: List[int] = None,
                 search: str = None) -> List[Dict]:
        """Get list of posts with filters."""
        params = {'per_page': per_page, 'page': page}
        if status:
            params['status'] = status
        if categories:
            params['categories'] = ','.join(map(str, categories))
        if search:
            params['search'] = search
        return self._request('GET', 'posts', params=params)
    
    # ============================================================
    # PAGE MANAGEMENT
    # ============================================================
    
    def create_page(self, title: str, content: str, status: str = 'draft',
                   parent: int = None, slug: str = None) -> Dict:
        """Create a new page."""
        data = {
            "title": title,
            "content": content,
            "status": status
        }
        if parent:
            data["parent"] = parent
        if slug:
            data["slug"] = slug
        return self._request('POST', 'pages', data)
    
    def update_page(self, page_id: int, **kwargs) -> Dict:
        """Update an existing page."""
        return self._request('PUT', f'pages/{page_id}', kwargs)
    
    # ============================================================
    # PREVIEW AND VERIFICATION
    # ============================================================
    
    def get_preview_url(self, post: Dict) -> str:
        """
        Get preview URL for a post.
        
        Args:
            post: Post dict from API
            
        Returns:
            Preview URL string
        """
        if post.get('status') == 'publish':
            return post.get('link', '')
        
        # For drafts, construct preview URL
        post_id = post.get('id')
        return f"{self.site_url}/?p={post_id}&preview=true"
    
    def get_edit_url(self, post_id: int) -> str:
        """Get WordPress admin edit URL."""
        return f"{self.site_url}/wp-admin/post.php?post={post_id}&action=edit"
    
    def create_draft(self, title: str, content: str,
                    categories: List[int] = None, tags: List[int] = None,
                    excerpt: str = None, slug: str = None,
                    featured_media: int = None) -> Dict:
        """
        Create a draft post for preview.
        
        Args:
            title: Post title
            content: Gutenberg block content
            categories: Category IDs
            tags: Tag IDs
            excerpt: Custom excerpt
            slug: URL slug
            featured_media: Featured image ID
            
        Returns:
            Dict with post_id, preview_url, edit_url
        """
        post = self.create_post(
            title=title,
            content=content,
            status='draft',
            categories=categories,
            tags=tags,
            excerpt=excerpt,
            slug=slug,
            featured_media=featured_media
        )
        
        return {
            'post': post,
            'post_id': post['id'],
            'preview_url': self.get_preview_url(post),
            'edit_url': self.get_edit_url(post['id']),
            'status': 'draft'
        }
    
    def publish_post(self, post_id: int) -> Dict:
        """
        Publish a draft post.
        
        Args:
            post_id: Post ID to publish
            
        Returns:
            Dict with post info and live URL
        """
        post = self.update_post(post_id, status='publish')
        
        return {
            'post': post,
            'post_id': post['id'],
            'live_url': post.get('link', ''),
            'edit_url': self.get_edit_url(post['id']),
            'status': 'publish'
        }
    
    def verify_published_post(self, post_id: int) -> Dict:
        """
        Verify a published post and get its details.
        
        Args:
            post_id: Post ID to verify
            
        Returns:
            Dict with URL, status, categories, tags
        """
        post = self.get_post(post_id, context='edit')
        
        # Get category names
        cat_ids = post.get('categories', [])
        categories = self.get_categories()
        cat_names = [c['name'] for c in categories if c['id'] in cat_ids]
        
        # Get tag names
        tag_ids = post.get('tags', [])
        tags = self.get_tags()
        tag_names = [t['name'] for t in tags if t['id'] in tag_ids]
        
        return {
            'post_id': post['id'],
            'title': post.get('title', {}).get('rendered', ''),
            'url': post.get('link', ''),
            'status': post.get('status', ''),
            'categories': cat_names,
            'tags': tag_names,
            'edit_url': self.get_edit_url(post['id'])
        }
    
    # ============================================================
    # HIGH-LEVEL PUBLISH METHOD
    # ============================================================
    
    def publish_content(self, title: str, content: str,
                       category_names: List[str] = None,
                       tag_names: List[str] = None,
                       auto_generate_tags: bool = False,
                       featured_image_path: str = None,
                       status: str = 'draft',
                       excerpt: str = None,
                       slug: str = None,
                       date: str = None) -> Dict:
        """
        High-level method to publish content with categories and tags by name.
        
        Args:
            title: Post title
            content: Gutenberg block content
            category_names: List of category names (created if don't exist)
            tag_names: List of tag names (created if don't exist)
            auto_generate_tags: Generate SEO tags automatically if no tags provided
            featured_image_path: Path to featured image file
            status: Post status (draft, publish, pending, private, future)
            excerpt: Custom excerpt
            slug: Custom URL slug
            date: Publication date for scheduled posts
            
        Returns:
            Dict with post info, URLs, and IDs
        """
        # Handle categories
        category_ids = None
        if category_names:
            category_ids = [self.get_or_create_category(name) for name in category_names]
        
        # Handle tags
        tag_ids = None
        if tag_names:
            tag_ids = self.get_or_create_tags(tag_names)
        elif auto_generate_tags:
            generated_tags = self.generate_seo_tags(content, title)
            if generated_tags:
                tag_ids = self.get_or_create_tags(generated_tags)
        
        # Handle featured image
        featured_media_id = None
        if featured_image_path:
            media = self.upload_media(featured_image_path, title=title)
            featured_media_id = media['id']
        
        # Create post
        post = self.create_post(
            title=title,
            content=content,
            status=status,
            categories=category_ids,
            tags=tag_ids,
            featured_media=featured_media_id,
            excerpt=excerpt,
            slug=slug,
            date=date
        )
        
        return {
            'post': post,
            'post_id': post['id'],
            'live_url': post.get('link', '') if status == 'publish' else '',
            'preview_url': self.get_preview_url(post),
            'edit_url': self.get_edit_url(post['id']),
            'status': post.get('status'),
            'categories_used': category_names or [],
            'tags_used': tag_names or (self.generate_seo_tags(content, title) if auto_generate_tags else [])
        }


# ============================================================
# EXCEPTIONS
# ============================================================

class APIError(Exception):
    """Base API error."""
    pass

class AuthenticationError(APIError):
    """Authentication failed."""
    pass

class PermissionError(APIError):
    """Insufficient permissions."""
    pass

class NotFoundError(APIError):
    """Resource not found."""
    pass

class ServerError(APIError):
    """Server error."""
    pass


# ============================================================
# CLI INTERFACE
# ============================================================

def main():
    parser = argparse.ArgumentParser(
        description='WordPress Publisher - Publish content via REST API',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  Test connection:
    python wp_publisher.py --url https://site.com --user admin --password "xxxx xxxx" --test
  
  List categories:
    python wp_publisher.py --url https://site.com --user admin --password "xxxx" --list-categories
  
  Publish article:
    python wp_publisher.py --url https://site.com --user admin --password "xxxx" \\
        --publish article.html --title "My Article" --category "Tutorials" --auto-tags
        """
    )
    
    # Connection arguments
    parser.add_argument('--url', '-u', required=True, help='WordPress site URL')
    parser.add_argument('--user', '-U', required=True, help='WordPress username')
    parser.add_argument('--password', '-p', required=True, help='Application password')
    
    # Actions
    parser.add_argument('--test', '-t', action='store_true', help='Test connection')
    parser.add_argument('--list-categories', action='store_true', help='List all categories')
    parser.add_argument('--list-tags', action='store_true', help='List all tags')
    parser.add_argument('--publish', '-P', help='File to publish (HTML with Gutenberg blocks)')
    
    # Post options
    parser.add_argument('--title', '-T', help='Post title')
    parser.add_argument('--category', '-c', action='append', help='Category name (can use multiple)')
    parser.add_argument('--tag', '-g', action='append', help='Tag name (can use multiple)')
    parser.add_argument('--auto-tags', action='store_true', help='Auto-generate SEO tags')
    parser.add_argument('--status', '-s', default='draft',
                       choices=['draft', 'publish', 'pending', 'private'],
                       help='Post status (default: draft)')
    parser.add_argument('--excerpt', '-e', help='Custom excerpt')
    parser.add_argument('--slug', help='Custom URL slug')
    
    args = parser.parse_args()
    
    try:
        wp = WordPressPublisher(args.url, args.user, args.password)
        
        if args.test:
            user = wp.test_connection()
            print(f"✅ Connected successfully!")
            print(f"   User: {user.get('name')}")
            roles = user.get('roles', ['unknown'])
            print(f"   Role: {roles[0] if roles else 'unknown'}")
            print(f"   Site: {args.url}")
            
            # Also show category and tag counts
            categories = wp.get_categories()
            tags = wp.get_tags()
            print(f"   Categories: {len(categories)}")
            print(f"   Tags: {len(tags)}")
        
        elif args.list_categories:
            categories = wp.get_categories_with_details()
            print("Categories:")
            for cat in categories:
                print(f"  [{cat['id']:3d}] {cat['name']} ({cat['count']} posts)")
        
        elif args.list_tags:
            tags = wp.get_tags()
            print("Tags:")
            for tag in tags:
                print(f"  [{tag['id']:3d}] {tag['name']} ({tag.get('count', 0)} posts)")
        
        elif args.publish:
            if not args.title:
                print("❌ Error: --title required for publishing")
                return 1
            
            with open(args.publish, 'r', encoding='utf-8') as f:
                content = f.read()
            
            result = wp.publish_content(
                title=args.title,
                content=content,
                category_names=args.category,
                tag_names=args.tag,
                auto_generate_tags=args.auto_tags,
                status=args.status,
                excerpt=args.excerpt,
                slug=args.slug
            )
            
            print(f"✅ Post created successfully!")
            print(f"   Post ID: {result['post_id']}")
            print(f"   Status: {result['status']}")
            print(f"   Preview: {result['preview_url']}")
            print(f"   Edit: {result['edit_url']}")
            if result['status'] == 'publish':
                print(f"   Live URL: {result['live_url']}")
            if result.get('categories_used'):
                print(f"   Categories: {', '.join(result['categories_used'])}")
            if result.get('tags_used'):
                print(f"   Tags: {', '.join(result['tags_used'])}")
        
        else:
            parser.print_help()
        
        return 0
        
    except AuthenticationError as e:
        print(f"❌ Authentication failed:\n{e}")
        return 1
    except PermissionError as e:
        print(f"❌ Permission denied: {e}")
        return 1
    except NotFoundError as e:
        print(f"❌ Not found: {e}")
        return 1
    except APIError as e:
        print(f"❌ API error: {e}")
        return 1
    except FileNotFoundError as e:
        print(f"❌ File not found: {e}")
        return 1
    except Exception as e:
        print(f"❌ Error: {e}")
        return 1


if __name__ == '__main__':
    exit(main())
