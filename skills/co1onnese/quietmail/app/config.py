"""
Configuration management for quiet-mail API
"""
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings"""
    
    # API Settings
    APP_NAME: str = "quiet-mail API"
    APP_VERSION: str = "1.0.0"
    API_PREFIX: str = ""
    DEBUG: bool = False
    
    # Database
    DATABASE_URL: str = "postgresql://quietmail:quietmail@localhost:5432/quietmail"
    
    # mailcow Integration
    MAILCOW_API_URL: str = "https://quiet-mail.com"
    MAILCOW_API_KEY: str = ""
    MAILCOW_DOMAIN: str = "quiet-mail.com"
    
    # SMTP Settings
    SMTP_HOST: str = "quiet-mail.com"
    SMTP_PORT: int = 587
    SMTP_USE_TLS: bool = True
    
    # IMAP Settings (for reading emails)
    IMAP_HOST: str = "quiet-mail.com"
    IMAP_PORT: int = 993
    IMAP_USE_SSL: bool = True
    
    # Security
    API_KEY_PREFIX: str = "qmail_"
    API_KEY_LENGTH: int = 48
    
    # Rate Limiting (future)
    RATE_LIMIT_PER_HOUR: int = 1000
    RATE_LIMIT_EMAILS_PER_DAY: int = 1000
    
    # Storage
    STORAGE_LIMIT_MB: int = 1024  # 1GB per agent
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
