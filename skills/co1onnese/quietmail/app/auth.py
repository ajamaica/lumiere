"""
Authentication and API key management
"""
import secrets
from fastapi import Security, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from .database import get_db
from .models import Agent
from .config import settings


security = HTTPBearer()


def generate_api_key() -> str:
    """Generate a secure API key"""
    random_part = secrets.token_urlsafe(settings.API_KEY_LENGTH)
    return f"{settings.API_KEY_PREFIX}{random_part}"


def generate_mailbox_password() -> str:
    """Generate a secure password for mailbox"""
    return secrets.token_urlsafe(32)


async def get_current_agent(
    credentials: HTTPAuthorizationCredentials = Security(security),
    db: Session = Depends(get_db)
) -> Agent:
    """
    Verify API key and return the associated agent
    
    Raises HTTPException if:
    - API key is invalid
    - Agent is deleted
    """
    token = credentials.credentials
    
    # Query database for agent
    agent = db.query(Agent).filter(
        Agent.api_key == token,
        Agent.deleted_at.is_(None)  # Not deleted
    ).first()
    
    if not agent:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired API key",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    return agent


async def get_optional_agent(
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials | None = Depends(lambda: None)
) -> Agent | None:
    """
    Optional authentication - returns None if no valid credentials
    Used for endpoints that work with or without auth
    """
    if not credentials:
        return None
    
    try:
        token = credentials.credentials
        agent = db.query(Agent).filter(
            Agent.api_key == token,
            Agent.deleted_at.is_(None)
        ).first()
        return agent
    except Exception:
        return None
