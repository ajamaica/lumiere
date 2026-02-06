#!/usr/bin/env python3
"""
A2A Market Client - Handles skill marketplace operations with x402 payments.

Usage:
    from a2a_client import A2AClient
    
    client = A2AClient(
        wallet_address="0x...",
        private_key=os.getenv("A2A_MARKET_PRIVATE_KEY"),
        api_url="https://api.a2amarket.live"
    )
    
    # Search skills
    results = client.search("pdf parser", max_price=10)
    
    # Purchase skill
    skill = client.purchase("skill_042")
"""

import os
import json
import time
import hashlib
import requests
from typing import Optional, Dict, Any, List
from dataclasses import dataclass
from eth_account import Account
from eth_account.messages import encode_defunct

API_URL = os.getenv("A2A_MARKET_API_URL", "https://api.a2amarket.live")

@dataclass
class SpendingRules:
    max_per_transaction: float = 10.0
    daily_budget: float = 100.0
    min_seller_reputation: int = 60
    auto_approve_below: float = 5.0
    require_confirmation_above: float = 50.0

@dataclass
class Skill:
    id: str
    name: str
    description: str
    price: float
    seller: str
    reputation: int
    rating: float
    sales: int

AGENT_ID_FILE = os.path.expanduser("~/.a2a_agent_id")
REFERRAL_CODE_FILE = os.path.expanduser("~/.a2a_referral_code")


class A2AClient:
    def __init__(
        self,
        wallet_address: str,
        private_key: str,
        api_url: str = API_URL,
        spending_rules: Optional[SpendingRules] = None,
        agent_id: Optional[str] = None
    ):
        self.wallet_address = wallet_address
        self.private_key = private_key
        self.api_url = api_url.rstrip('/')
        self.rules = spending_rules or SpendingRules()
        self.daily_spent = 0.0
        self.account = Account.from_key(private_key)
        self.agent_id = agent_id or self._load_agent_id()

    def _load_agent_id(self) -> Optional[str]:
        """Load agent_id from environment or file."""
        agent_id = os.getenv("A2A_AGENT_ID")
        if agent_id:
            return agent_id
        if os.path.exists(AGENT_ID_FILE):
            with open(AGENT_ID_FILE) as f:
                return f.read().strip()
        return None

    def _agent_headers(self) -> Dict[str, str]:
        """Get headers with agent ID for Credits API calls."""
        if not self.agent_id:
            raise ValueError("Agent ID required. Call register() first.")
        return {"x-agent-id": self.agent_id}
    
    def _sign_request(self, method: str, path: str, body: str = "") -> Dict[str, str]:
        """Sign API request for authentication."""
        timestamp = str(int(time.time() * 1000))
        body_hash = hashlib.sha256(body.encode()).hexdigest() if body else ""
        message = f"{method}:{path}:{timestamp}:{body_hash}"
        
        signed = self.account.sign_message(encode_defunct(text=message))
        
        return {
            "X-Wallet-Address": self.wallet_address,
            "X-Timestamp": timestamp,
            "X-Signature": signed.signature.hex()
        }
    
    def _check_budget(self, price: float) -> tuple[bool, str]:
        """Check if purchase is within budget rules."""
        if price > self.rules.max_per_transaction:
            return False, f"Price ${price} exceeds max per transaction ${self.rules.max_per_transaction}"
        
        if self.daily_spent + price > self.rules.daily_budget:
            return False, f"Would exceed daily budget (spent: ${self.daily_spent}, limit: ${self.rules.daily_budget})"
        
        return True, "OK"
    
    def _needs_confirmation(self, price: float) -> bool:
        """Check if purchase needs human confirmation."""
        return price > self.rules.auto_approve_below
    
    def search(
        self,
        query: str,
        category: Optional[str] = None,
        min_rep: Optional[int] = None,
        max_price: Optional[float] = None,
        sort: str = "rating",
        limit: int = 20
    ) -> List[Skill]:
        """Search for skills on the marketplace."""
        params = {"q": query, "sort": sort, "limit": limit}
        
        if category:
            params["category"] = category
        if min_rep is not None:
            params["min_rep"] = min_rep
        else:
            params["min_rep"] = self.rules.min_seller_reputation
        if max_price is not None:
            params["max_price"] = max_price
        
        response = requests.get(f"{self.api_url}/v1/listings/search", params=params)
        response.raise_for_status()
        
        data = response.json()
        return [
            Skill(
                id=r["id"],
                name=r["name"],
                description=r.get("description", ""),
                price=r["price"],
                seller=r["seller"],
                reputation=r.get("reputation", 0),
                rating=r.get("rating", 0),
                sales=r.get("sales", 0)
            )
            for r in data.get("results", [])
        ]
    
    def get_skill(self, skill_id: str) -> Dict[str, Any]:
        """Get detailed information about a skill."""
        response = requests.get(f"{self.api_url}/v1/listings/{skill_id}")
        response.raise_for_status()
        return response.json()
    
    def purchase(
        self,
        skill_id: str,
        confirm_callback: Optional[callable] = None,
        payment_method: str = "x402"
    ) -> Dict[str, Any]:
        """
        Purchase a skill using x402 payment or credits.

        Args:
            skill_id: ID of the skill to purchase
            confirm_callback: Optional callback for confirmation (returns True to proceed)
            payment_method: "x402" for USDC payment, "credits" for credits payment

        Returns:
            Skill content if successful

        Raises:
            ValueError: If budget rules prevent purchase
            Exception: If payment or API fails
        """
        if payment_method == "credits":
            return self.purchase_with_credits(skill_id)
        # Get skill details first
        skill = self.get_skill(skill_id)
        price = skill["price"]
        
        # Check seller reputation
        seller_rep = skill.get("seller", {}).get("reputation", 0)
        if seller_rep < self.rules.min_seller_reputation:
            raise ValueError(f"Seller reputation {seller_rep} below minimum {self.rules.min_seller_reputation}")
        
        # Check budget
        ok, msg = self._check_budget(price)
        if not ok:
            raise ValueError(msg)
        
        # Check if confirmation needed
        if self._needs_confirmation(price):
            if confirm_callback:
                if not confirm_callback(skill):
                    raise ValueError("Purchase cancelled by user")
            else:
                raise ValueError(f"Purchase of ${price} requires confirmation (above ${self.rules.auto_approve_below})")
        
        # Step 1: Request content, expect 402
        response = requests.get(f"{self.api_url}/v1/listings/{skill_id}/content")
        
        if response.status_code != 402:
            if response.status_code == 200:
                # Already purchased or free
                return response.json()
            response.raise_for_status()
        
        # Step 2: Parse payment requirements
        payment_info = json.loads(response.headers.get("X-Payment-Required", "{}"))
        
        # Step 3: Sign payment (simplified - real implementation uses ERC-3009)
        payment_proof = self._sign_payment(payment_info, price)
        
        # Step 4: Retry with payment proof
        headers = self._sign_request("POST", f"/v1/listings/{skill_id}/content")
        headers["X-Payment"] = payment_proof
        headers["Content-Type"] = "application/json"
        
        response = requests.post(
            f"{self.api_url}/v1/listings/{skill_id}/content",
            headers=headers
        )
        response.raise_for_status()
        
        # Update daily spent
        self.daily_spent += price
        
        return response.json()
    
    def _sign_payment(self, payment_info: Dict, price: float) -> str:
        """
        Sign x402 payment. 
        
        Note: Simplified implementation. Real x402 uses ERC-3009 TransferWithAuthorization.
        """
        # In production, this would create an ERC-3009 signature
        # allowing the facilitator to transfer USDC on your behalf
        payment_data = {
            "from": self.wallet_address,
            "to": payment_info.get("accepts", [{}])[0].get("resource", ""),
            "amount": int(price * 1_000_000),  # USDC has 6 decimals
            "nonce": int(time.time() * 1000),
            "deadline": int(time.time()) + 3600  # 1 hour validity
        }
        
        message = json.dumps(payment_data, sort_keys=True)
        signed = self.account.sign_message(encode_defunct(text=message))
        
        return json.dumps({
            "payment": payment_data,
            "signature": signed.signature.hex()
        })
    
    def list_skill(
        self,
        name: str,
        description: str,
        price: float,
        category: str,
        content: Dict[str, Any],
        tags: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """List a new skill for sale."""
        body = json.dumps({
            "name": name,
            "description": description,
            "price": price,
            "category": category,
            "content": content,
            "tags": tags or []
        })
        
        headers = self._sign_request("POST", "/v1/listings", body)
        headers["Content-Type"] = "application/json"
        
        response = requests.post(
            f"{self.api_url}/v1/listings",
            headers=headers,
            data=body
        )
        response.raise_for_status()
        
        return response.json()
    
    def get_earnings(self) -> Dict[str, Any]:
        """Get account earnings summary."""
        response = requests.get(f"{self.api_url}/v1/account/{self.wallet_address}/earnings")
        response.raise_for_status()
        return response.json()
    
    def get_purchases(self) -> List[Dict[str, Any]]:
        """Get list of purchased skills."""
        response = requests.get(f"{self.api_url}/v1/account/{self.wallet_address}/purchases")
        response.raise_for_status()
        return response.json().get("purchases", [])
    
    def register(self, name: str) -> Dict[str, Any]:
        """
        Register as an agent and receive initial credits.

        Args:
            name: Display name for the agent

        Returns:
            {"agent_id": "...", "referral_code": "...", "credits": {"balance": 100}}
        """
        body = json.dumps({
            "wallet_address": self.wallet_address,
            "name": name
        })

        response = requests.post(
            f"{self.api_url}/v1/agents/register",
            headers={"Content-Type": "application/json"},
            data=body
        )
        response.raise_for_status()
        data = response.json()

        # Save agent_id and referral_code locally
        self.agent_id = data["agent_id"]
        with open(AGENT_ID_FILE, "w") as f:
            f.write(self.agent_id)
        with open(REFERRAL_CODE_FILE, "w") as f:
            f.write(data.get("referral_code", ""))

        return data

    def get_credits_balance(self) -> Dict[str, Any]:
        """
        Get credits balance.

        Returns:
            {"balance": 150, "lifetime_earned": 300, "lifetime_spent": 150}
        """
        response = requests.get(
            f"{self.api_url}/v1/credits/balance",
            headers=self._agent_headers()
        )
        response.raise_for_status()
        return response.json()

    def get_daily_reward_status(self) -> Dict[str, Any]:
        """
        Check daily reward status.

        Returns:
            {"available": true, "amount": 10, "next_available_at": "...", "streak": 5}
        """
        response = requests.get(
            f"{self.api_url}/v1/rewards/daily/status",
            headers=self._agent_headers()
        )
        response.raise_for_status()
        return response.json()

    def claim_daily_reward(self) -> Dict[str, Any]:
        """
        Claim the daily reward credits.

        Returns:
            {"claimed": 10, "new_balance": 160, "streak": 6}
        """
        response = requests.post(
            f"{self.api_url}/v1/rewards/daily/claim",
            headers=self._agent_headers()
        )
        response.raise_for_status()
        return response.json()

    def purchase_with_credits(self, skill_id: str) -> Dict[str, Any]:
        """
        Purchase a skill using credits instead of USDC.

        Args:
            skill_id: ID of the skill to purchase

        Returns:
            Skill content and payment details
        """
        headers = self._agent_headers()
        headers["Content-Type"] = "application/json"

        response = requests.post(
            f"{self.api_url}/v1/listings/{skill_id}/pay",
            headers=headers,
            data=json.dumps({"payment_method": "credits"})
        )
        response.raise_for_status()
        return response.json()

    def get_price_suggestion(
        self,
        skill_name: str,
        category: str,
        description: str = "",
        keywords: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Get price suggestion for a new skill listing.
        
        Useful for cold-start pricing when no market data exists.
        
        Returns:
            {
                "has_market_data": bool,
                "suggested_range": {"min": float, "recommended": float, "max": float},
                "confidence": "high" | "medium" | "low",
                "factors": [...]
            }
        """
        body = json.dumps({
            "skill_name": skill_name,
            "category": category,
            "description": description,
            "keywords": keywords or [],
            "seller_reputation": 50  # Default for new sellers
        })
        
        response = requests.post(
            f"{self.api_url}/v1/pricing/suggest",
            headers={"Content-Type": "application/json"},
            data=body
        )
        response.raise_for_status()
        return response.json()
    
    def list_skill_with_suggestion(
        self,
        name: str,
        description: str,
        category: str,
        content: Dict[str, Any],
        tags: Optional[List[str]] = None,
        price: Optional[float] = None,
        confirm_callback: Optional[callable] = None
    ) -> Dict[str, Any]:
        """
        List a skill with automatic price suggestion if no price provided.
        
        For cold-start scenarios, gets price suggestion first and may
        request confirmation based on confidence level.
        """
        if price is None:
            # Get price suggestion
            suggestion = self.get_price_suggestion(
                skill_name=name,
                category=category,
                description=description,
                keywords=tags
            )
            
            recommended = suggestion["suggested_range"]["recommended"]
            confidence = suggestion["confidence"]
            
            # Decide based on confidence
            if confidence == "low" and confirm_callback:
                # Low confidence = ask human
                msg = (f"No market data for '{name}'. "
                       f"Suggested: ${recommended} "
                       f"(range ${suggestion['suggested_range']['min']}-"
                       f"${suggestion['suggested_range']['max']}). Proceed?")
                if not confirm_callback(msg, suggestion):
                    raise ValueError("Listing cancelled by user")
            
            price = recommended
            print(f"Using suggested price: ${price} (confidence: {confidence})")
        
        return self.list_skill(name, description, price, category, content, tags)


# Example usage
if __name__ == "__main__":
    import sys

    wallet = os.getenv("WALLET_ADDRESS")
    key = os.getenv("A2A_MARKET_PRIVATE_KEY")

    if not wallet or not key:
        print("Set WALLET_ADDRESS and A2A_MARKET_PRIVATE_KEY environment variables")
        sys.exit(1)

    client = A2AClient(wallet, key)

    # Register (first time only)
    if not client.agent_id:
        print("Registering agent...")
        reg = client.register("My Agent")
        print(f"  Agent ID: {reg['agent_id']}")
        print(f"  Referral Code: {reg['referral_code']}")
        print(f"  Initial Credits: {reg['credits']['balance']}")

    # Check credits balance
    print("\nCredits balance...")
    balance = client.get_credits_balance()
    print(f"  Balance: {balance['balance']} credits")

    # Claim daily reward
    print("\nDaily reward...")
    status = client.get_daily_reward_status()
    if status["available"]:
        reward = client.claim_daily_reward()
        print(f"  Claimed {reward['claimed']} credits! Balance: {reward['new_balance']}")
    else:
        print(f"  Already claimed. Next: {status['next_available_at']}")

    # Search example
    print("\nSearching for 'code review' skills...")
    skills = client.search("code review", max_price=15)

    for s in skills[:5]:
        print(f"  [{s.id}] {s.name} - ${s.price} (rating:{s.rating}, rep:{s.reputation})")

    # Check earnings
    print("\nChecking earnings...")
    earnings = client.get_earnings()
    print(f"  Total: ${earnings.get('total_earnings', 0)}")
    print(f"  Available: ${earnings.get('available', 0)}")
