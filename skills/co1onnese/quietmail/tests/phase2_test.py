#!/usr/bin/env python3
"""
Phase 2: Comprehensive API Testing
Tests all core endpoints with various edge cases
"""

import requests
import json
import psycopg2
from time import sleep


BASE_URL = "http://localhost:8000"
DB_CONN = "postgresql://quietmail:quietmail@localhost:5432/quietmail"


def test(name, func):
    """Run a test and print results"""
    print(f"\n{'='*70}")
    print(f"TEST: {name}")
    print('='*70)
    try:
        func()
        print(f"✅ {name} PASSED")
    except AssertionError as e:
        print(f"❌ {name} FAILED: {e}")
    except Exception as e:
        print(f"⚠️  {name} ERROR: {e}")


def get_api_key(agent_id):
    """Get API key from database"""
    conn = psycopg2.connect(DB_CONN)
    cur = conn.cursor()
    cur.execute('SELECT api_key FROM agents WHERE id = %s', (agent_id,))
    result = cur.fetchone()
    cur.close()
    conn.close()
    return result[0] if result else None


def test_health_check():
    """Test GET /health"""
    response = requests.get(f"{BASE_URL}/health")
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    data = response.json()
    assert data["status"] == "healthy", f"Expected healthy, got {data['status']}"
    print(f"Health: {data['status']}")


def test_create_agent():
    """Test POST /agents"""
    response = requests.post(
        f"{BASE_URL}/agents",
        json={"id": "test-agent-3", "name": "Test Agent 3"}
    )
    assert response.status_code == 201, f"Expected 201, got {response.status_code}"
    data = response.json()
    assert "apiKey" in data, "Missing apiKey in response"
    assert data["agent"]["id"] == "test-agent-3", "Wrong agent ID"
    print(f"Created agent: {data['agent']['email']}")
    print(f"API key: {data['apiKey'][:20]}...")


def test_create_duplicate_agent():
    """Test POST /agents with duplicate ID (should fail)"""
    response = requests.post(
        f"{BASE_URL}/agents",
        json={"id": "test-bot", "name": "Duplicate Bot"}
    )
    assert response.status_code == 409, f"Expected 409, got {response.status_code}"
    data = response.json()
    assert "already taken" in data["detail"].lower(), "Wrong error message"
    print(f"Correctly rejected duplicate: {data['detail']}")


def test_get_agent():
    """Test GET /agents/{id}"""
    api_key = get_api_key("test-bot")
    response = requests.get(
        f"{BASE_URL}/agents/test-bot",
        headers={"Authorization": f"Bearer {api_key}"}
    )
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    data = response.json()
    assert data["id"] == "test-bot", "Wrong agent ID"
    assert data["email"] == "test-bot@quiet-mail.com", "Wrong email"
    print(f"Agent: {data['name']} ({data['email']})")


def test_get_agent_unauthorized():
    """Test GET /agents/{id} with wrong credentials"""
    api_key = get_api_key("test-bot")
    response = requests.get(
        f"{BASE_URL}/agents/bob",  # Try to access bob with test-bot's key
        headers={"Authorization": f"Bearer {api_key}"}
    )
    assert response.status_code == 403, f"Expected 403, got {response.status_code}"
    print(f"Correctly blocked unauthorized access")


def test_send_email():
    """Test POST /agents/{id}/send"""
    api_key = get_api_key("test-bot")
    response = requests.post(
        f"{BASE_URL}/agents/test-bot/send",
        headers={"Authorization": f"Bearer {api_key}"},
        json={
            "to": "bob@quiet-mail.com",
            "subject": "Phase 2 Test Email",
            "text": "This is a test email from the Phase 2 test suite.",
            "html": "<p>This is a test email from the <strong>Phase 2</strong> test suite.</p>"
        }
    )
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    data = response.json()
    assert "id" in data, "Missing email ID"
    print(f"Sent email ID: {data['id']}")


def test_list_sent_emails():
    """Test GET /agents/{id}/sent with pagination"""
    api_key = get_api_key("test-bot")
    
    # Test page 1
    response = requests.get(
        f"{BASE_URL}/agents/test-bot/sent?limit=2&offset=0",
        headers={"Authorization": f"Bearer {api_key}"}
    )
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    data = response.json()
    assert "data" in data, "Missing data field"
    assert "total" in data, "Missing total field"
    assert data["limit"] == 2, "Wrong limit"
    assert data["offset"] == 0, "Wrong offset"
    print(f"Sent emails: {data['total']} total, showing {len(data['data'])}")


def test_list_inbox():
    """Test GET /agents/{id}/emails (inbox)"""
    api_key = get_api_key("test-bot")
    
    response = requests.get(
        f"{BASE_URL}/agents/test-bot/emails",
        headers={"Authorization": f"Bearer {api_key}"}
    )
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    data = response.json()
    assert "data" in data, "Missing data field"
    print(f"Inbox: {data['total']} total emails")
    
    if data["data"]:
        email = data["data"][0]
        print(f"  Latest: From {email['from']['address']}")
        print(f"  Subject: {email['subject']}")


def test_inbox_pagination():
    """Test GET /agents/{id}/emails with pagination"""
    api_key = get_api_key("bob")
    
    # Send multiple emails to bob to test pagination
    test_bot_key = get_api_key("test-bot")
    for i in range(3):
        requests.post(
            f"{BASE_URL}/agents/test-bot/send",
            headers={"Authorization": f"Bearer {test_bot_key}"},
            json={
                "to": "bob@quiet-mail.com",
                "subject": f"Pagination Test {i+1}",
                "text": f"Email {i+1} for pagination testing"
            }
        )
    
    sleep(2)  # Wait for delivery
    
    # Test page 1 (limit 2)
    response = requests.get(
        f"{BASE_URL}/agents/bob/emails?limit=2&offset=0",
        headers={"Authorization": f"Bearer {api_key}"}
    )
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    data = response.json()
    assert data["limit"] == 2, "Wrong limit"
    assert len(data["data"]) <= 2, f"Expected max 2 emails, got {len(data['data'])}"
    print(f"Page 1: {len(data['data'])} emails")
    
    # Test page 2 (offset 2)
    response = requests.get(
        f"{BASE_URL}/agents/bob/emails?limit=2&offset=2",
        headers={"Authorization": f"Bearer {api_key}"}
    )
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    data = response.json()
    assert data["offset"] == 2, "Wrong offset"
    print(f"Page 2: {len(data['data'])} emails")


def test_invalid_auth():
    """Test with invalid API key"""
    response = requests.get(
        f"{BASE_URL}/agents/test-bot",
        headers={"Authorization": "Bearer invalid_key_12345"}
    )
    assert response.status_code == 401, f"Expected 401, got {response.status_code}"
    print("Correctly rejected invalid API key")


def test_missing_auth():
    """Test with missing Authorization header"""
    response = requests.get(f"{BASE_URL}/agents/test-bot")
    assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
    print("Correctly rejected missing auth")


def test_invalid_agent_id():
    """Test creating agent with invalid ID"""
    response = requests.post(
        f"{BASE_URL}/agents",
        json={"id": "INVALID_ID!", "name": "Invalid Agent"}
    )
    assert response.status_code == 422, f"Expected 422, got {response.status_code}"
    print("Correctly rejected invalid agent ID")


def test_rate_limit_validation():
    """Test limit parameter validation (max 100)"""
    api_key = get_api_key("test-bot")
    response = requests.get(
        f"{BASE_URL}/agents/test-bot/sent?limit=200",  # Try to exceed limit
        headers={"Authorization": f"Bearer {api_key}"}
    )
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    data = response.json()
    assert data["limit"] == 100, f"Expected limit capped at 100, got {data['limit']}"
    print("Correctly capped limit at 100")


# Run all tests
if __name__ == "__main__":
    print("\n" + "="*70)
    print("QUIET-MAIL API - PHASE 2 COMPREHENSIVE TESTS")
    print("="*70)
    
    test("Health Check", test_health_check)
    test("Create Agent", test_create_agent)
    test("Create Duplicate Agent (409)", test_create_duplicate_agent)
    test("Get Agent Details", test_get_agent)
    test("Get Agent Unauthorized (403)", test_get_agent_unauthorized)
    test("Send Email", test_send_email)
    test("List Sent Emails (with pagination)", test_list_sent_emails)
    test("List Inbox", test_list_inbox)
    test("Inbox Pagination", test_inbox_pagination)
    test("Invalid Auth Token (401)", test_invalid_auth)
    test("Missing Auth Header", test_missing_auth)
    test("Invalid Agent ID (422)", test_invalid_agent_id)
    test("Rate Limit Validation", test_rate_limit_validation)
    
    print("\n" + "="*70)
    print("PHASE 2 TESTS COMPLETE!")
    print("="*70)
