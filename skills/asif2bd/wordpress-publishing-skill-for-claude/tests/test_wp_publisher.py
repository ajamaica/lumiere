"""
Tests for WordPress Publisher

Run with: pytest tests/test_wp_publisher.py -v
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
import json

# Import the modules to test
import sys
sys.path.insert(0, 'scripts')

from wp_publisher import (
    WordPressPublisher,
    APIError,
    AuthenticationError,
    PermissionError,
    NotFoundError,
    ServerError
)


class TestWordPressPublisher:
    """Tests for WordPressPublisher class."""

    @pytest.fixture
    def publisher(self):
        """Create a publisher instance for testing."""
        return WordPressPublisher(
            site_url="https://example.com",
            username="testuser",
            password="xxxx xxxx xxxx xxxx"
        )

    def test_init_normalizes_url(self):
        """Test that URLs are normalized to https."""
        wp = WordPressPublisher(
            site_url="http://example.com/",
            username="user",
            password="pass"
        )
        assert wp.site_url == "https://example.com"
        assert wp.api_base == "https://example.com/wp-json/wp/v2"

    def test_init_creates_auth_header(self, publisher):
        """Test that auth header is created correctly."""
        assert "Authorization" in publisher.headers
        assert publisher.headers["Authorization"].startswith("Basic ")

    @patch('wp_publisher.requests.get')
    def test_test_connection_success(self, mock_get, publisher):
        """Test successful connection test."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "id": 1,
            "name": "Test User",
            "roles": ["administrator"]
        }
        mock_get.return_value = mock_response

        result = publisher.test_connection()

        assert result["name"] == "Test User"
        assert "administrator" in result["roles"]
        mock_get.assert_called_once()

    @patch('wp_publisher.requests.get')
    def test_test_connection_auth_failure(self, mock_get, publisher):
        """Test authentication failure handling."""
        mock_response = Mock()
        mock_response.status_code = 401
        mock_get.return_value = mock_response

        with pytest.raises(AuthenticationError):
            publisher.test_connection()

    @patch('wp_publisher.requests.get')
    def test_test_connection_permission_denied(self, mock_get, publisher):
        """Test permission denied handling."""
        mock_response = Mock()
        mock_response.status_code = 403
        mock_get.return_value = mock_response

        with pytest.raises(PermissionError):
            publisher.test_connection()

    @patch('wp_publisher.requests.get')
    def test_get_categories(self, mock_get, publisher):
        """Test fetching categories."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = [
            {"id": 1, "name": "Uncategorized", "slug": "uncategorized", "count": 5},
            {"id": 2, "name": "Tutorials", "slug": "tutorials", "count": 10},
        ]
        mock_get.return_value = mock_response

        categories = publisher.get_categories()

        assert len(categories) == 2
        assert categories[0]["name"] == "Uncategorized"
        assert categories[1]["slug"] == "tutorials"

    @patch('wp_publisher.requests.get')
    def test_get_categories_caching(self, mock_get, publisher):
        """Test that categories are cached."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = [{"id": 1, "name": "Test"}]
        mock_get.return_value = mock_response

        # First call
        publisher.get_categories()
        # Second call (should use cache)
        publisher.get_categories()

        # Should only call API once
        assert mock_get.call_count == 1

    @patch('wp_publisher.requests.get')
    def test_get_categories_force_refresh(self, mock_get, publisher):
        """Test force refresh bypasses cache."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = [{"id": 1, "name": "Test"}]
        mock_get.return_value = mock_response

        publisher.get_categories()
        publisher.get_categories(force_refresh=True)

        assert mock_get.call_count == 2

    def test_suggest_category_exact_match(self, publisher):
        """Test category suggestion with exact title match."""
        categories = [
            {"id": 1, "name": "Uncategorized", "slug": "uncategorized", "count": 5},
            {"id": 2, "name": "Cloud Hosting", "slug": "cloud-hosting", "count": 10},
        ]

        result = publisher.suggest_category(
            content="This article is about hosting services.",
            title="Best Cloud Hosting Providers",
            available_categories=categories
        )

        assert result["name"] == "Cloud Hosting"

    def test_generate_seo_tags(self, publisher):
        """Test SEO tag generation."""
        content = """
        n8n is a powerful workflow automation tool. 
        With n8n hosting, you can automate your business processes.
        Docker deployment makes it easy to self-host n8n.
        """
        title = "Best n8n Hosting Providers in 2026"

        tags = publisher.generate_seo_tags(content, title, max_tags=5)

        assert len(tags) <= 5
        assert isinstance(tags, list)
        # Should contain some relevant tags
        assert any('n8n' in tag.lower() for tag in tags)

    @patch('wp_publisher.requests.post')
    def test_create_post_draft(self, mock_post, publisher):
        """Test creating a draft post."""
        mock_response = Mock()
        mock_response.status_code = 201
        mock_response.json.return_value = {
            "id": 123,
            "title": {"rendered": "Test Post"},
            "status": "draft",
            "link": "https://example.com/?p=123"
        }
        mock_post.return_value = mock_response

        result = publisher.create_post(
            title="Test Post",
            content="<!-- wp:paragraph --><p>Content</p><!-- /wp:paragraph -->",
            status="draft"
        )

        assert result["id"] == 123
        assert result["status"] == "draft"

    @patch('wp_publisher.requests.put')
    def test_publish_post(self, mock_put, publisher):
        """Test publishing a draft post."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "id": 123,
            "status": "publish",
            "link": "https://example.com/test-post/"
        }
        mock_put.return_value = mock_response

        result = publisher.publish_post(123)

        assert result["status"] == "publish"
        assert "live_url" in result

    def test_get_preview_url_draft(self, publisher):
        """Test preview URL generation for draft."""
        post = {"id": 123, "status": "draft"}
        url = publisher.get_preview_url(post)
        assert "?p=123" in url
        assert "preview=true" in url

    def test_get_preview_url_published(self, publisher):
        """Test preview URL generation for published post."""
        post = {"id": 123, "status": "publish", "link": "https://example.com/my-post/"}
        url = publisher.get_preview_url(post)
        assert url == "https://example.com/my-post/"

    def test_get_edit_url(self, publisher):
        """Test edit URL generation."""
        url = publisher.get_edit_url(123)
        assert "wp-admin/post.php" in url
        assert "post=123" in url
        assert "action=edit" in url


class TestErrorHandling:
    """Tests for error handling."""

    @pytest.fixture
    def publisher(self):
        return WordPressPublisher(
            site_url="https://example.com",
            username="user",
            password="pass"
        )

    @patch('wp_publisher.requests.get')
    def test_404_raises_not_found(self, mock_get, publisher):
        """Test 404 response raises NotFoundError."""
        mock_response = Mock()
        mock_response.status_code = 404
        mock_get.return_value = mock_response

        with pytest.raises(NotFoundError):
            publisher.test_connection()

    @patch('wp_publisher.requests.get')
    def test_500_raises_server_error(self, mock_get, publisher):
        """Test 500 response raises ServerError after retries."""
        mock_response = Mock()
        mock_response.status_code = 500
        mock_response.text = "Internal Server Error"
        mock_get.return_value = mock_response

        with pytest.raises(ServerError):
            publisher._request('GET', 'test', max_retries=1)


class TestCLI:
    """Tests for CLI functionality."""

    def test_cli_help(self, capsys):
        """Test CLI help output."""
        from wp_publisher import main
        import sys

        # Capture the help output
        old_argv = sys.argv
        sys.argv = ['wp_publisher.py', '--help']

        try:
            with pytest.raises(SystemExit) as exc_info:
                main()
            assert exc_info.value.code == 0
        finally:
            sys.argv = old_argv


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
