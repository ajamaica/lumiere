"""
Email endpoints - send and receive
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from ..database import get_db
from ..models import Agent, EmailSent
from ..schemas import (
    SendEmailRequest,
    SendEmailResponse,
    EmailListResponse,
    EmailResponse,
    EmailAddress,
    ErrorResponse
)
from ..auth import get_current_agent
from ..integrations.smtp import send_email
import aioimaplib
from email import message_from_bytes
from email.header import decode_header
from ..config import settings

router = APIRouter()


@router.post(
    "/{agent_id}/send",
    response_model=SendEmailResponse,
    responses={
        401: {"model": ErrorResponse, "description": "Invalid API key"},
        403: {"model": ErrorResponse, "description": "Access denied"},
        500: {"model": ErrorResponse, "description": "Failed to send email"}
    }
)
async def send_agent_email(
    agent_id: str,
    request: SendEmailRequest,
    current_agent: Agent = Depends(get_current_agent),
    db: Session = Depends(get_db)
):
    """
    Send an email from the agent's mailbox
    
    The email will be sent from agent@quiet-mail.com
    """
    # Verify the authenticated agent matches the requested agent
    if current_agent.id != agent_id:
        raise HTTPException(
            status_code=403,
            detail="You can only send emails from your own agent"
        )
    
    # Send email via SMTP
    try:
        await send_email(
            from_email=current_agent.email,
            from_password=current_agent.mailbox_password,
            to=request.to,
            subject=request.subject,
            text=request.text,
            html=request.html,
            reply_to=request.replyTo
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to send email: {str(e)}"
        )
    
    # Log sent email
    email_record = EmailSent(
        agent_id=current_agent.id,
        to_address=request.to,
        subject=request.subject
    )
    db.add(email_record)
    db.commit()
    db.refresh(email_record)
    
    # Return response
    return SendEmailResponse(
        id=email_record.id,
        to=request.to,
        subject=request.subject,
        sentAt=int(email_record.sent_at.timestamp() * 1000)
    )


@router.get(
    "/{agent_id}/emails",
    response_model=EmailListResponse,
    responses={
        401: {"model": ErrorResponse, "description": "Invalid API key"},
        403: {"model": ErrorResponse, "description": "Access denied"}
    }
)
async def list_emails(
    agent_id: str,
    folder: str = "INBOX",
    limit: int = 50,
    offset: int = 0,
    current_agent: Agent = Depends(get_current_agent)
):
    """
    List emails in the agent's inbox
    
    Folder can be: INBOX, Sent, Trash, etc.
    Limit: max 100
    """
    # Verify the authenticated agent matches
    if current_agent.id != agent_id:
        raise HTTPException(
            status_code=403,
            detail="You can only access your own emails"
        )
    
    # Validate limit
    if limit > 100:
        limit = 100
    
    try:
        # Connect to IMAP
        imap = aioimaplib.IMAP4_SSL(
            host=settings.IMAP_HOST,
            port=settings.IMAP_PORT
        )
        await imap.wait_hello_from_server()
        
        # Login
        await imap.login(current_agent.email, current_agent.mailbox_password)
        
        # Select folder
        await imap.select(folder)
        
        # Search for all emails
        status, data = await imap.search('ALL')
        
        if status != 'OK':
            raise HTTPException(status_code=500, detail="Failed to search emails")
        
        # Get email IDs
        email_ids = data[0].split()
        total = len(email_ids)
        
        # Apply pagination
        start = offset
        end = min(offset + limit, total)
        email_ids_page = email_ids[start:end]
        
        # Fetch emails
        emails = []
        for email_id in reversed(email_ids_page):  # Newest first
            try:
                # Convert email_id to string if it's bytes
                email_id_str = email_id.decode() if isinstance(email_id, bytes) else str(email_id)
                
                # Fetch email
                status, data = await imap.fetch(email_id_str, '(RFC822)')
                
                if status != 'OK':
                    continue
                
                # Parse response - aioimaplib returns: (status, [response_line, email_bytearray, closing_paren])
                # The email content is typically in a bytearray (part index 1)
                email_content = None
                for part in data:
                    if isinstance(part, (bytes, bytearray)) and len(part) > 100:  # Actual email content
                        email_content = bytes(part) if isinstance(part, bytearray) else part
                        break
                
                if not email_content:
                    continue
                
                msg = message_from_bytes(email_content)
                
                # Extract fields
                from_header = msg.get('From', '')
                subject = msg.get('Subject', '')
                
                # Decode subject if needed
                if subject:
                    decoded = decode_header(subject)
                    subject = ''.join([
                        part.decode(encoding or 'utf-8') if isinstance(part, bytes) else part
                        for part, encoding in decoded
                    ])
                
                # Get body
                body_text = ""
                body_html = ""
                
                if msg.is_multipart():
                    for part in msg.walk():
                        content_type = part.get_content_type()
                        if content_type == 'text/plain':
                            payload = part.get_payload(decode=True)
                            if payload:
                                body_text = payload.decode('utf-8', errors='ignore')
                        elif content_type == 'text/html':
                            payload = part.get_payload(decode=True)
                            if payload:
                                body_html = payload.decode('utf-8', errors='ignore')
                else:
                    payload = msg.get_payload(decode=True)
                    if payload:
                        body_text = payload.decode('utf-8', errors='ignore')
                
                # Create preview (first 200 chars)
                preview = body_text[:200] if body_text else ""
                
                emails.append(EmailResponse(
                    id=email_id_str,
                    messageId=msg.get('Message-ID'),
                    **{"from": EmailAddress(address=from_header)},
                    to=current_agent.email,
                    subject=subject,
                    preview=preview,
                    bodyText=body_text,
                    bodyHtml=body_html if body_html else None,
                    receivedAt=int(datetime.now().timestamp() * 1000),  # TODO: Parse date header
                    isRead=False,  # TODO: Check flags
                    folder=folder
                ))
            except Exception as e:
                # Skip emails that fail to parse
                continue
        
        # Logout
        await imap.logout()
        
        return EmailListResponse(
            data=emails,
            total=total,
            limit=limit,
            offset=offset
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch emails: {str(e)}"
        )


@router.get(
    "/{agent_id}/sent",
    response_model=EmailListResponse,
    responses={
        401: {"model": ErrorResponse, "description": "Invalid API key"},
        403: {"model": ErrorResponse, "description": "Access denied"}
    }
)
async def list_sent_emails(
    agent_id: str,
    limit: int = 50,
    offset: int = 0,
    current_agent: Agent = Depends(get_current_agent),
    db: Session = Depends(get_db)
):
    """
    List emails sent by the agent
    
    This queries the local database (faster than IMAP)
    """
    # Verify the authenticated agent matches
    if current_agent.id != agent_id:
        raise HTTPException(
            status_code=403,
            detail="You can only access your own sent emails"
        )
    
    # Validate limit
    if limit > 100:
        limit = 100
    
    # Query sent emails
    query = db.query(EmailSent).filter(
        EmailSent.agent_id == agent_id
    ).order_by(EmailSent.sent_at.desc())
    
    total = query.count()
    emails = query.offset(offset).limit(limit).all()
    
    # Convert to response format
    email_responses = [
        EmailResponse(
            id=str(email.id),
            **{"from": EmailAddress(address=current_agent.email)},
            to=email.to_address,
            subject=email.subject or "",
            preview="",
            receivedAt=int(email.sent_at.timestamp() * 1000),
            folder="sent"
        )
        for email in emails
    ]
    
    return EmailListResponse(
        data=email_responses,
        total=total,
        limit=limit,
        offset=offset
    )
