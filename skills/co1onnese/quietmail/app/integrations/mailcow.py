"""
Mailcow API integration client
"""
import httpx
from typing import Dict, Any
from ..config import settings


class MailcowClient:
    """Client for interacting with mailcow API"""
    
    def __init__(
        self,
        base_url: str = None,
        api_key: str = None,
        domain: str = None
    ):
        self.base_url = base_url or settings.MAILCOW_API_URL
        self.api_key = api_key or settings.MAILCOW_API_KEY
        self.domain = domain or settings.MAILCOW_DOMAIN
        
        # Remove trailing slash from base URL
        if self.base_url.endswith('/'):
            self.base_url = self.base_url[:-1]
    
    def _get_headers(self) -> Dict[str, str]:
        """Get headers for API requests"""
        return {
            "X-API-Key": self.api_key,
            "Content-Type": "application/json"
        }
    
    async def create_mailbox(
        self,
        local_part: str,
        password: str,
        name: str = None,
        quota: int = 1024  # MB
    ) -> Dict[str, Any]:
        """
        Create a new mailbox
        
        Args:
            local_part: Username part of email (before @)
            password: Mailbox password
            name: Display name (optional)
            quota: Storage quota in MB
        
        Returns:
            API response from mailcow
        
        Raises:
            httpx.HTTPStatusError if request fails
        """
        url = f"{self.base_url}/api/v1/add/mailbox"
        
        payload = {
            "local_part": local_part,
            "domain": self.domain,
            "password": password,
            "password2": password,  # Confirmation
            "quota": quota,
            "active": 1,
            "force_pw_update": 0,
            "tls_enforce_in": 0,
            "tls_enforce_out": 0
        }
        
        if name:
            payload["name"] = name
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                url,
                headers=self._get_headers(),
                json=payload
            )
            response.raise_for_status()
            return response.json()
    
    async def delete_mailbox(self, email: str) -> Dict[str, Any]:
        """
        Delete a mailbox
        
        Args:
            email: Full email address to delete
        
        Returns:
            API response from mailcow
        """
        url = f"{self.base_url}/api/v1/delete/mailbox"
        
        payload = [email]  # mailcow expects array
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                url,
                headers=self._get_headers(),
                json=payload
            )
            response.raise_for_status()
            return response.json()
    
    async def get_mailbox(self, email: str) -> Dict[str, Any]:
        """
        Get mailbox details
        
        Args:
            email: Full email address
        
        Returns:
            Mailbox information
        """
        url = f"{self.base_url}/api/v1/get/mailbox/{email}"
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                url,
                headers=self._get_headers()
            )
            response.raise_for_status()
            return response.json()


# Singleton instance
mailcow_client = MailcowClient()
