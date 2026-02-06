import scripts.core as core
import pytest
import json

def test_start_project(db_conn):
    """Test project initialization."""
    core.start_project("p1", "Project 1", "Objective 1", priority=5)
    
    conn = db_conn
    c = conn.cursor()
    c.execute("SELECT id, name, priority FROM projects WHERE id='p1'")
    row = c.fetchone()
    
    assert row is not None
    assert row[0] == "p1"
    assert row[1] == "Project 1"
    assert row[2] == 5

def test_log_event(db_conn):
    """Test event logging."""
    core.start_project("p1", "Project 1", "Obj")
    
    payload = {"data": "test"}
    core.log_event("p1", "SEARCH", 1, payload, confidence=0.9, tags="test,ai")
    
    conn = db_conn
    c = conn.cursor()
    c.execute("SELECT event_type, payload, confidence, tags FROM events WHERE project_id='p1'")
    row = c.fetchone()
    
    assert row is not None
    assert row[0] == "SEARCH"
    assert json.loads(row[1]) == payload
    assert row[2] == 0.9
    assert row[3] == "test,ai"

def test_get_status(db_conn):
    """Test status retrieval hierarchy."""
    core.start_project("p1", "Project 1", "Obj")
    core.log_event("p1", "E1", 1, {})
    core.log_event("p1", "E2", 2, {})
    
    status = core.get_status("p1")
    assert status['project'][0] == "p1"
    assert len(status['recent_events']) == 2
    assert status['recent_events'][0][0] == "E2"  # ORDER BY id DESC

def test_search_cache(db_conn):
    """Test search logging and checking."""
    query = "test query"
    result = {"foo": "bar"}
    
    # Cache miss
    assert core.check_search(query) is None
    
    # Cache hit
    core.log_search(query, result)
    cached = core.check_search(query)
    assert cached == result

def test_insights_to_findings(db_conn):
    """Test that insights are correctly stored in and retrieved from the findings table."""
    core.start_project("p1", "Project 1", "Obj")
    
    # Add an insight (which should go to 'findings' table)
    core.add_insight("p1", "Insight 1", "Content 1", source_url="http://test.com", tags="t1", confidence=0.8)
    
    # Retrieve insights
    insights = core.get_insights("p1")
    
    assert len(insights) == 1
    assert insights[0][0] == "Insight 1"
    assert insights[0][1] == "Content 1"
    assert json.loads(insights[0][2]) == {"source_url": "http://test.com"}
    assert insights[0][3] == "t1"
    assert insights[0][5] == 0.8
