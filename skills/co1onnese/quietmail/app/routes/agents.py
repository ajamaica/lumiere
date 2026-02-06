"""
Agent management endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from ..database import get_db
from ..models import Agent
from ..schemas import (
    AgentCreate,
    AgentCreateResponse,
    AgentResponse,
    ErrorResponse
)
from ..auth import generate_api_key, generate_mailbox_password, get_current_agent
from ..integrations.mailcow import mailcow_client
from ..config import settings

router = APIRouter()


def agent_to_response(agent: Agent) -> AgentResponse:
    """Convert Agent model to AgentResponse schema"""
    return AgentResponse(
        id=agent.id,
        email=agent.email,
        name=agent.name,
        createdAt=int(agent.created_at.timestamp() * 1000),
        storageUsed=agent.storage_used
    )


@router.post(
    "",
    response_model=AgentCreateResponse,
    status_code=201,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid request"},
        409: {"model": ErrorResponse, "description": "Agent ID already exists"}
    }
)
async def create_agent(
    request: AgentCreate,
    db: Session = Depends(get_db)
):
    """
    Create a new agent with email inbox
    
    No authentication required - this is the signup endpoint
    
    Returns the agent details and API key (shown only once)
    """
    # Check if agent ID already exists
    existing = db.query(Agent).filter(Agent.id == request.id).first()
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"Agent ID '{request.id}' is already taken"
        )
    
    # Generate credentials
    api_key = generate_api_key()
    mailbox_password = generate_mailbox_password()
    email = f"{request.id}@{settings.MAILCOW_DOMAIN}"
    
    # Create mailbox in mailcow
    try:
        await mailcow_client.create_mailbox(
            local_part=request.id,
            password=mailbox_password,
            name=request.name,
            quota=settings.STORAGE_LIMIT_MB
        )
        
        # CRITICAL: Update mailbox password to match our stored password
        # mailcow doesn't always accept password during creation, so we update it
        import httpx
        async with httpx.AsyncClient(timeout=30.0) as client:
            await client.post(
                f"{settings.MAILCOW_API_URL}/api/v1/edit/mailbox",
                headers={"X-API-Key": settings.MAILCOW_API_KEY, "Content-Type": "application/json"},
                json={
                    "items": [email],
                    "attr": {
                        "password": mailbox_password,
                        "password2": mailbox_password
                    }
                }
            )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create mailbox: {str(e)}"
        )
    
    # Create agent in database
    agent = Agent(
        id=request.id,
        email=email,
        api_key=api_key,
        name=request.name,
        mailbox_password=mailbox_password,
        storage_used=0
    )
    
    db.add(agent)
    db.commit()
    db.refresh(agent)
    
    # Log agent creation for monitoring (first 100 signups)
    total_agents = db.query(Agent).count()
    if total_agents <= 100:
        print(f"[MONITOR] Agent #{total_agents} created: {agent.id} ({agent.email}) at {agent.created_at}")
    
    # Return response with API key
    return AgentCreateResponse(
        agent=agent_to_response(agent),
        apiKey=api_key
    )


@router.get(
    "/{agent_id}",
    response_model=AgentResponse,
    responses={
        401: {"model": ErrorResponse, "description": "Invalid API key"},
        404: {"model": ErrorResponse, "description": "Agent not found"}
    }
)
async def get_agent(
    agent_id: str,
    current_agent: Agent = Depends(get_current_agent),
    db: Session = Depends(get_db)
):
    """
    Get agent details
    
    Requires authentication - agent can only view their own details
    """
    # Verify the authenticated agent matches the requested agent
    if current_agent.id != agent_id:
        raise HTTPException(
            status_code=403,
            detail="You can only access your own agent details"
        )
    
    return agent_to_response(current_agent)


@router.delete(
    "/{agent_id}",
    status_code=204,
    responses={
        401: {"model": ErrorResponse, "description": "Invalid API key"},
        403: {"model": ErrorResponse, "description": "Access denied"}
    }
)
async def delete_agent(
    agent_id: str,
    current_agent: Agent = Depends(get_current_agent),
    db: Session = Depends(get_db)
):
    """
    Delete an agent and their mailbox
    
    WARNING: This permanently deletes the agent and all emails
    """
    # Verify the authenticated agent matches the requested agent
    if current_agent.id != agent_id:
        raise HTTPException(
            status_code=403,
            detail="You can only delete your own agent"
        )
    
    # Soft delete in database
    current_agent.deleted_at = datetime.utcnow()
    db.commit()
    
    # Delete mailbox in mailcow (async, best effort)
    try:
        await mailcow_client.delete_mailbox(current_agent.email)
    except Exception as e:
        # Log but don't fail - mailbox will be cleaned up later
        print(f"Warning: Failed to delete mailbox {current_agent.email}: {e}")
    
    return None  # 204 No Content
