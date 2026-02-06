"""
Pydantic schemas for API request/response validation
"""
from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List
from datetime import datetime
import re


class AgentCreate(BaseModel):
    """Request to create a new agent"""
    id: str = Field(..., min_length=3, max_length=32, description="Agent ID (alphanumeric + hyphens)")
    name: Optional[str] = Field(None, max_length=255, description="Display name")
    
    @validator('id')
    def validate_agent_id(cls, v):
        """Validate agent ID format"""
        v = v.lower()  # Convert to lowercase
        if not re.match(r'^[a-z0-9][a-z0-9-]*[a-z0-9]$', v):
            raise ValueError(
                'Agent ID must contain only lowercase letters, numbers, and hyphens. '
                'Must start and end with letter/number. '
                'Example: "my-agent" or "bot123"'
            )
        if '--' in v:
            raise ValueError('Agent ID cannot contain consecutive hyphens')
        if len(v) < 3:
            raise ValueError('Agent ID must be at least 3 characters long')
        return v


class AgentResponse(BaseModel):
    """Agent information (without sensitive data)"""
    id: str
    email: str
    name: Optional[str]
    createdAt: int  # Unix timestamp in milliseconds
    storageUsed: int  # Bytes
    
    class Config:
        from_attributes = True


class AgentCreateResponse(BaseModel):
    """Response when creating an agent"""
    agent: AgentResponse
    apiKey: str
    message: str = "Store your API key securely - it won't be shown again"


class SendEmailRequest(BaseModel):
    """Request to send an email"""
    to: str = Field(..., description="Recipient email address")
    subject: str = Field(..., max_length=998, description="Email subject")
    text: str = Field(..., description="Plain text body")
    html: Optional[str] = Field(None, description="HTML body (optional)")
    replyTo: Optional[str] = Field(None, description="Reply-to address (optional)")
    
    @validator('to', 'replyTo')
    def validate_email(cls, v):
        """Basic email validation"""
        if v and '@' not in v:
            raise ValueError('Invalid email address')
        return v


class SendEmailResponse(BaseModel):
    """Response after sending an email"""
    id: int
    to: str
    subject: str
    sentAt: int  # Unix timestamp in milliseconds


class EmailAddress(BaseModel):
    """Email address with optional name"""
    address: str
    name: Optional[str] = None


class EmailResponse(BaseModel):
    """Email message details"""
    id: str
    messageId: Optional[str] = None
    from_: EmailAddress = Field(..., alias="from")
    to: str
    subject: str
    preview: str  # First 200 chars of text
    bodyText: Optional[str] = None
    bodyHtml: Optional[str] = None
    receivedAt: int  # Unix timestamp in milliseconds
    isRead: bool = False
    folder: str = "inbox"
    
    class Config:
        populate_by_name = True


class EmailListResponse(BaseModel):
    """Paginated list of emails"""
    data: List[EmailResponse]
    total: int
    limit: int
    offset: int


class ErrorResponse(BaseModel):
    """Standard error response"""
    error: str
    message: str
    code: Optional[str] = None
