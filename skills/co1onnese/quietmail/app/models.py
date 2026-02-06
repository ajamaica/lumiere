"""
Database models
"""
from sqlalchemy import Column, String, BigInteger, DateTime, Text, ForeignKey
from sqlalchemy.sql import func
from .database import Base


class Agent(Base):
    """Agent/inbox model"""
    __tablename__ = "agents"
    
    id = Column(String(32), primary_key=True)  # agent-id chosen by user
    email = Column(String(255), unique=True, nullable=False, index=True)  # agent-id@quiet-mail.com
    api_key = Column(String(128), unique=True, nullable=False, index=True)  # qmail_xxx
    name = Column(String(255))  # Display name
    mailbox_password = Column(String(255), nullable=False)  # For SMTP/IMAP access
    
    storage_used = Column(BigInteger, default=0)  # Bytes
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    deleted_at = Column(DateTime(timezone=True))  # Soft delete
    
    def __repr__(self):
        return f"<Agent {self.id} ({self.email})>"


class EmailSent(Base):
    """Track sent emails for analytics"""
    __tablename__ = "emails_sent"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    agent_id = Column(String(32), ForeignKey("agents.id"), nullable=False, index=True)
    
    to_address = Column(String(255), nullable=False)
    subject = Column(Text)
    
    sent_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    
    def __repr__(self):
        return f"<EmailSent {self.id} from {self.agent_id} to {self.to_address}>"
