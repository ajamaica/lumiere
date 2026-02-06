import pytest
from scripts.core import IngestService
from scripts.scuttle import Connector, ArtifactDraft, IngestResult

class MockConnector(Connector):
    def can_handle(self, source: str) -> bool:
        return source.startswith("mock://")

    def fetch(self, source: str) -> ArtifactDraft:
        return ArtifactDraft(
            title="Mock Title",
            content="Mock Content",
            source="mock-source",
            type="MOCK",
            confidence=0.9,
            tags=["mock", "test"]
        )

def test_ingest_service_registration():
    service = IngestService()
    connector = MockConnector()
    service.register_connector(connector)
    assert service.get_connector_for("mock://test") == connector
    assert service.get_connector_for("http://other") is None

def test_ingest_service_routing(mocker):
    # Mock database functions used by ingest
    import scripts.core as core
    mocker.patch("scripts.core.add_insight")
    mocker.patch("scripts.core.log_event")
    
    service = IngestService()
    connector = MockConnector()
    service.register_connector(connector)
    
    result = service.ingest("proj-123", "mock://test")
    
    assert result.success is True
    assert result.metadata["title"] == "Mock Title"
    assert core.add_insight.called
    assert core.log_event.called

def test_ingest_service_no_connector():
    service = IngestService()
    result = service.ingest("proj-123", "http://unknown")
    assert result.success is False
    assert "No connector found" in result.error
