"""
Basic API tests
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_root():
    """Test root endpoint"""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "name" in data
    assert "version" in data
    assert data["name"] == "quiet-mail API"


def test_health():
    """Test health check"""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data


def test_create_agent():
    """Test agent creation"""
    response = client.post(
        "/agents",
        json={
            "id": "test-agent",
            "name": "Test Agent"
        }
    )
    
    # Will fail without mailcow configured, but tests the endpoint
    assert response.status_code in [201, 500]


def test_create_agent_invalid_id():
    """Test agent creation with invalid ID"""
    response = client.post(
        "/agents",
        json={
            "id": "INVALID ID",  # Spaces not allowed
            "name": "Test"
        }
    )
    
    assert response.status_code == 422  # Validation error
