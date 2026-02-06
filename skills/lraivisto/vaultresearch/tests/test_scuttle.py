import scripts.scuttle as scuttle

def test_get_scuttler_moltbook():
    s = scuttle.get_scuttler("moltbook://post/abc123")
    assert isinstance(s, scuttle.MoltbookScuttler)

def test_moltbook_suspicion_protocol_confidence_and_tags():
    s = scuttle.MoltbookScuttler()
    result = s.scuttle("moltbook://post/abc123")

    assert result["source"] == "moltbook"
    assert result["confidence"] <= 0.55

    tags = result.get("tags", "")
    assert "unverified" in tags.split(",")

def test_moltbook_fetch_returns_artifact_draft():
    s = scuttle.MoltbookScuttler()
    draft = s.fetch("moltbook://post/abc123")
    
    assert isinstance(draft, scuttle.ArtifactDraft)
    assert draft.source == "moltbook"
    assert draft.confidence <= 0.55
    assert "unverified" in draft.tags
