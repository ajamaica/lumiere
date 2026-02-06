import pytest
import requests
from scripts.scuttle import YouTubeConnector, ArtifactDraft

def test_youtube_can_handle():
    connector = YouTubeConnector()
    assert connector.can_handle("https://www.youtube.com/watch?v=dQw4w9WgXcQ")
    assert connector.can_handle("https://youtu.be/dQw4w9WgXcQ")
    assert not connector.can_handle("https://vimeo.com/123")

def test_youtube_fetch_success(mocker):
    mock_resp = mocker.Mock()
    mock_resp.status_code = 200
    mock_resp.text = """
    <html>
    <head>
        <title>Never Gonna Give You Up - YouTube</title>
        <meta property="og:description" content="Official music video for Never Gonna Give You Up.">
        <link itemprop="name" content="Rick Astley">
    </head>
    </html>
    """
    mocker.patch("scripts.scuttle.socket.getaddrinfo", return_value=[(None, None, None, None, ("93.184.216.34", 0))])
    mocker.patch("requests.get", return_value=mock_resp)
    
    connector = YouTubeConnector()
    draft = connector.fetch("https://www.youtube.com/watch?v=dQw4w9WgXcQ")
    
    assert isinstance(draft, ArtifactDraft)
    assert draft.title == "Never Gonna Give You Up"
    assert "Rick Astley" in draft.content
    assert "Official music video" in draft.content
    assert draft.source == "youtube"
    assert draft.confidence == 0.9
