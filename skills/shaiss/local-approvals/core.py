"""
Local Approvals Core Module

Core functions for managing local agent approval workflows.
Handles auto-approve lists, pending requests, and learning from decisions.
"""

import json
import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional


# Paths for state and pending files
STATE_DIR = Path(os.path.expanduser("~/.openclaw/skills/local-approvals"))
STATE_FILE = STATE_DIR / "state.json"
PENDING_FILE = STATE_DIR / "pending.json"


def _ensure_state_dir() -> None:
    """Ensure the state directory exists."""
    STATE_DIR.mkdir(parents=True, exist_ok=True)


def _load_state() -> Dict[str, Any]:
    """Load the state.json file, creating it if it doesn't exist."""
    _ensure_state_dir()
    if not STATE_FILE.exists():
        default_state = {
            "auto_approve": {},  # agent -> [categories]
            "last_updated": None
        }
        _save_state(default_state)
        return default_state
    
    with open(STATE_FILE, 'r') as f:
        return json.load(f)


def _save_state(state: Dict[str, Any]) -> None:
    """Save state to state.json."""
    _ensure_state_dir()
    state["last_updated"] = datetime.now().isoformat()
    with open(STATE_FILE, 'w') as f:
        json.dump(state, f, indent=2)


def _load_pending() -> Dict[str, Any]:
    """Load the pending.json file, creating it if it doesn't exist."""
    _ensure_state_dir()
    if not PENDING_FILE.exists():
        pending = {
            "requests": {}  # request_id -> request details
        }
        with open(PENDING_FILE, 'w') as f:
            json.dump(pending, f, indent=2)
        return pending
    
    with open(PENDING_FILE, 'r') as f:
        return json.load(f)


def _save_pending(pending: Dict[str, Any]) -> None:
    """Save pending requests to pending.json."""
    _ensure_state_dir()
    pending["last_updated"] = datetime.now().isoformat()
    with open(PENDING_FILE, 'w') as f:
        json.dump(pending, f, indent=2)


def check_auto_approve(agent: str, category: str) -> bool:
    """
    Check if a category is in an agent's auto-approve list.
    
    Args:
        agent: The agent identifier (e.g., 'assistant', 'planner', etc.)
        category: The category to check (e.g., 'file_write', 'network', etc.)
    
    Returns:
        True if the category is auto-approved for this agent, False otherwise.
    """
    state = _load_state()
    
    # Get the auto-approve list for this agent
    agent_approvals = state.get("auto_approve", {}).get(agent, [])
    
    # Check if category is in the list
    return category in agent_approvals


def submit_request(agent: str, category: str, operation: str, reasoning: str) -> str:
    """
    Submit a pending approval request.
    
    Args:
        agent: The agent requesting approval
        category: The category of the operation
        operation: The operation being requested (e.g., 'write file', 'network request')
        reasoning: The reasoning or justification for the operation
    
    Returns:
        The unique request ID for tracking
    """
    pending = _load_pending()
    
    # Generate a unique request ID
    request_id = str(uuid.uuid4())[:8]  # Short UUID for readability
    
    # Create the request entry
    request = {
        "id": request_id,
        "agent": agent,
        "category": category,
        "operation": operation,
        "reasoning": reasoning,
        "status": "pending",
        "submitted_at": datetime.now().isoformat(),
        "updated_at": None,
        "decision": None,
        "reviewer": None
    }
    
    # Store the request
    pending["requests"][request_id] = request
    _save_pending(pending)
    
    return request_id


def learn_category(agent: str, category: str) -> bool:
    """
    Add a category to an agent's auto-approve list.
    
    This enables learning from approved decisions - once a category is
    trusted for an agent, it gets auto-approved in the future.
    
    Args:
        agent: The agent identifier
        category: The category to add to auto-approve
    
    Returns:
        True if category was added, False if already present
    """
    state = _load_state()
    
    # Initialize auto_approve dict if needed
    if "auto_approve" not in state:
        state["auto_approve"] = {}
    
    # Initialize agent's list if needed
    if agent not in state["auto_approve"]:
        state["auto_approve"][agent] = []
    
    # Add category if not already present
    if category not in state["auto_approve"][agent]:
        state["auto_approve"][agent].append(category)
        _save_state(state)
        return True
    
    return False


def get_request(request_id: str) -> Optional[Dict[str, Any]]:
    """
    Retrieve a pending request by ID.
    
    Args:
        request_id: The request ID to look up
    
    Returns:
        The request details, or None if not found
    """
    pending = _load_pending()
    return pending["requests"].get(request_id)


def update_request(request_id: str, decision: str, reviewer: str) -> Optional[Dict[str, Any]]:
    """
    Update a request with a decision.
    
    Args:
        request_id: The request ID to update
        decision: The decision ('approved' or 'denied')
        reviewer: Who made the decision
    
    Returns:
        The updated request, or None if not found
    """
    pending = _load_pending()
    
    if request_id not in pending["requests"]:
        return None
    
    request = pending["requests"][request_id]
    request["status"] = "decided"
    request["decision"] = decision
    request["reviewer"] = reviewer
    request["updated_at"] = datetime.now().isoformat()
    
    _save_pending(pending)
    return request


def list_pending(agent: Optional[str] = None) -> Dict[str, Dict[str, Any]]:
    """
    List all pending requests, optionally filtered by agent.
    
    Args:
        agent: If provided, only show requests from this agent
    
    Returns:
        Dictionary of request_id -> request details
    """
    pending = _load_pending()
    
    if agent is None:
        return {k: v for k, v in pending["requests"].items() if v["status"] == "pending"}
    else:
        return {k: v for k, v in pending["requests"].items() 
                if v["status"] == "pending" and v["agent"] == agent}


def get_agent_approvals(agent: str) -> list:
    """
    Get the list of auto-approved categories for an agent.
    
    Args:
        agent: The agent identifier
    
    Returns:
        List of auto-approved categories
    """
    state = _load_state()
    return state.get("auto_approve", {}).get(agent, []).copy()