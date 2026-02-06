import pytest
import requests
from scripts.scuttle import GrokipediaConnector, ArtifactDraft

def test_grokipedia_can_handle():
    connector = GrokipediaConnector()
    assert connector.can_handle("https://grokipedia.com/page/Elon_Musk")
    assert connector.can_handle("grokipedia://Elon_Musk")
    assert not connector.can_handle("https://wikipedia.org/wiki/Elon_Musk")

def test_grokipedia_fetch_success(mocker):
    mock_resp = mocker.Mock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "title": "Artificial Intelligence",
        "content_text": "AI is the simulation of human intelligence...",
        "references": []
    }
    mocker.patch("scripts.scuttle.socket.getaddrinfo", return_value=[(None, None, None, None, ("93.184.216.34", 0))])
    mocker.patch("requests.get", return_value=mock_resp)
    
    connector = GrokipediaConnector()
    draft = connector.fetch("grokipedia://Artificial_intelligence")
    
    assert isinstance(draft, ArtifactDraft)
    assert draft.title == "Artificial Intelligence"
    assert "simulation of human intelligence" in draft.content
    assert draft.source == "grokipedia"
    assert draft.confidence == 0.95
