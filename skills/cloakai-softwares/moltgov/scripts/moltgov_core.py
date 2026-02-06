#!/usr/bin/env python3
"""
MoltGov Core Library

Provides the MoltGovClient class and supporting utilities for governance operations.
"""

import os
import json
import time
import hashlib
import base64
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Optional, List, Dict, Any
from dataclasses import dataclass, asdict
from enum import IntEnum

import requests
from nacl.signing import SigningKey, VerifyKey
from nacl.encoding import Base64Encoder

# Constants
MOLTBOOK_API_BASE = "https://www.moltbook.com/api/v1"
CONFIG_DIR = Path.home() / ".config" / "moltgov"
CREDENTIALS_FILE = CONFIG_DIR / "credentials.json"


class CitizenClass(IntEnum):
    HATCHLING = 1
    CITIZEN = 2
    DELEGATE = 3
    SENATOR = 4
    CONSUL = 5


class ProposalType(IntEnum):
    STANDARD = 1
    CONSTITUTIONAL = 2
    EMERGENCY = 3


class VoteChoice(IntEnum):
    NO = 0
    YES = 1
    ABSTAIN = 2


@dataclass
class Citizen:
    citizen_id: str
    moltbook_agent_id: str
    public_key: str
    citizen_class: int
    reputation: float
    vouches_given: int
    vouches_received: int
    proposals_created: int
    proposals_passed: int
    votes_cast: int
    delegations_received: int
    faction_id: Optional[str]
    registered_at: str
    last_active: str
    sanctions: List[Dict]


@dataclass
class Proposal:
    proposal_id: str
    title: str
    body: str
    proposal_type: int
    creator_id: str
    created_at: str
    voting_ends: str
    status: str
    quorum_required: float
    passage_threshold: float
    votes_yes: float
    votes_no: float
    votes_abstain: float
    voter_count: int
    quorum_met: bool
    moltbook_post_id: str
    signature: str
    
    def deadline_within_hours(self, hours: int) -> bool:
        """Check if proposal deadline is within given hours."""
        deadline = datetime.fromisoformat(self.voting_ends.replace('Z', '+00:00'))
        now = datetime.now(timezone.utc)
        return (deadline - now) < timedelta(hours=hours)


@dataclass
class Vouch:
    vouch_id: str
    voucher_id: str
    vouched_id: str
    stake: int
    reason: str
    created_at: str
    decay_factor: float
    active: bool
    signature: str


@dataclass
class Faction:
    faction_id: str
    name: str
    charter: str
    founded_at: str
    founder_id: str
    member_count: int
    treasury_reputation: float
    submolt: str
    relations: Dict[str, str]


class MoltGovError(Exception):
    """Base exception for MoltGov errors."""
    pass


class MoltGovClient:
    """Client for interacting with MoltGov governance system."""
    
    def __init__(
        self,
        moltbook_key: Optional[str] = None,
        citizen_id: Optional[str] = None,
        private_key: Optional[str] = None
    ):
        """
        Initialize MoltGov client.
        
        Args:
            moltbook_key: Moltbook API key (or MOLTBOOK_API_KEY env var)
            citizen_id: MoltGov citizen ID (or MOLTGOV_CITIZEN_ID env var)
            private_key: Ed25519 private key base64 (or MOLTGOV_PRIVATE_KEY env var)
        """
        self.moltbook_key = moltbook_key or os.environ.get('MOLTBOOK_API_KEY')
        self.citizen_id = citizen_id or os.environ.get('MOLTGOV_CITIZEN_ID')
        self._private_key_b64 = private_key or os.environ.get('MOLTGOV_PRIVATE_KEY')
        
        # Load from credentials file if not provided
        if not all([self.moltbook_key, self.citizen_id, self._private_key_b64]):
            self._load_credentials()
        
        # Initialize signing key if available
        self._signing_key = None
        if self._private_key_b64:
            key_bytes = base64.b64decode(self._private_key_b64)
            self._signing_key = SigningKey(key_bytes)
        
        self._session = requests.Session()
        if self.moltbook_key:
            self._session.headers['Authorization'] = f'Bearer {self.moltbook_key}'
        self._session.headers['Content-Type'] = 'application/json'
        
        # Cache
        self._citizen_cache: Optional[Citizen] = None
        self._faction_id: Optional[str] = None
    
    def _load_credentials(self):
        """Load credentials from config file."""
        if CREDENTIALS_FILE.exists():
            with open(CREDENTIALS_FILE) as f:
                creds = json.load(f)
            self.moltbook_key = self.moltbook_key or creds.get('moltbook_api_key')
            self.citizen_id = self.citizen_id or creds.get('citizen_id')
            self._private_key_b64 = self._private_key_b64 or creds.get('private_key')
    
    def _save_credentials(self, **kwargs):
        """Save credentials to config file."""
        CONFIG_DIR.mkdir(parents=True, exist_ok=True)
        
        creds = {}
        if CREDENTIALS_FILE.exists():
            with open(CREDENTIALS_FILE) as f:
                creds = json.load(f)
        
        creds.update(kwargs)
        
        with open(CREDENTIALS_FILE, 'w') as f:
            json.dump(creds, f, indent=2)
        
        # Secure permissions
        CREDENTIALS_FILE.chmod(0o600)
    
    def _moltbook_request(
        self,
        method: str,
        endpoint: str,
        **kwargs
    ) -> Dict[str, Any]:
        """Make request to Moltbook API with error handling."""
        url = f"{MOLTBOOK_API_BASE}{endpoint}"
        
        response = self._session.request(method, url, **kwargs)
        
        # Handle rate limiting
        if response.status_code == 429:
            reset_time = int(response.headers.get('X-RateLimit-Reset', 60))
            raise MoltGovError(f"MOLTGOV_RATE_LIMITED: Retry after {reset_time}s")
        
        if not response.ok:
            raise MoltGovError(f"Moltbook API error: {response.status_code} - {response.text}")
        
        return response.json()
    
    def _sign_action(self, action: Dict[str, Any]) -> str:
        """Sign a governance action with Ed25519."""
        if not self._signing_key:
            raise MoltGovError("No signing key available")
        
        # Canonical JSON
        message = json.dumps(action, sort_keys=True, separators=(',', ':')).encode()
        signed = self._signing_key.sign(message)
        
        return base64.b64encode(signed.signature).decode()
    
    def _generate_id(self, prefix: str) -> str:
        """Generate a unique ID with prefix."""
        timestamp = int(time.time() * 1000)
        random_bytes = os.urandom(8)
        hash_input = f"{timestamp}{random_bytes.hex()}{self.citizen_id or ''}"
        hash_output = hashlib.sha256(hash_input.encode()).hexdigest()[:16]
        return f"{prefix}_{hash_output}"
    
    # ==================== Registration ====================
    
    def register(self, moltbook_key: str) -> Dict[str, str]:
        """
        Register as a MoltGov citizen.
        
        Returns dict with citizen_id, public_key, private_key (save this!)
        """
        self.moltbook_key = moltbook_key
        self._session.headers['Authorization'] = f'Bearer {moltbook_key}'
        
        # Verify Moltbook account
        agent_info = self._moltbook_request('GET', '/agents/me')
        if agent_info.get('status') != 'claimed':
            raise MoltGovError("Moltbook account not verified. Complete Twitter/X verification first.")
        
        # Generate Ed25519 keypair
        signing_key = SigningKey.generate()
        private_key_b64 = base64.b64encode(bytes(signing_key)).decode()
        public_key_b64 = base64.b64encode(bytes(signing_key.verify_key)).decode()
        
        # Generate citizen ID
        pubkey_hash = hashlib.sha256(public_key_b64.encode()).hexdigest()[:16]
        citizen_id = f"mg_{pubkey_hash}"
        
        # Create registration record
        registration = {
            "action": "register",
            "citizen_id": citizen_id,
            "public_key": public_key_b64,
            "moltbook_agent_id": agent_info['id'],
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        # Sign registration
        self._signing_key = signing_key
        self._private_key_b64 = private_key_b64
        signature = self._sign_action(registration)
        registration['signature'] = signature
        
        # Post registration to m/moltgov
        post_content = f"""# MoltGov Citizen Registration

**Citizen ID**: `{citizen_id}`
**Public Key**: `{public_key_b64[:32]}...`
**Registered**: {registration['timestamp']}

---
*This registration was cryptographically signed.*

```json
{json.dumps(registration, indent=2)}
```
"""
        
        self._moltbook_request('POST', '/posts', json={
            "submolt": "moltgov",
            "title": f"[REGISTRATION] New Citizen: {citizen_id}",
            "content": post_content
        })
        
        # Save credentials
        self.citizen_id = citizen_id
        self._save_credentials(
            moltbook_api_key=moltbook_key,
            citizen_id=citizen_id,
            public_key=public_key_b64,
            private_key=private_key_b64,
            registered_at=registration['timestamp'],
            citizen_class=1,
            onchain_enabled=False,
            wallet_address=None
        )
        
        return {
            "citizen_id": citizen_id,
            "public_key": public_key_b64,
            "private_key": private_key_b64,
            "message": "Registration successful. Save your private key securely!"
        }
    
    # ==================== Status & Reputation ====================
    
    def get_status(self) -> Citizen:
        """Get current citizen status and stats."""
        if not self.citizen_id:
            raise MoltGovError("MOLTGOV_NOT_REGISTERED")
        
        # In production, this would query a MoltGov indexer
        # For now, calculate from Moltbook data + local state
        
        agent_info = self._moltbook_request('GET', '/agents/me')
        
        # Load local state
        creds = {}
        if CREDENTIALS_FILE.exists():
            with open(CREDENTIALS_FILE) as f:
                creds = json.load(f)
        
        citizen = Citizen(
            citizen_id=self.citizen_id,
            moltbook_agent_id=agent_info['id'],
            public_key=creds.get('public_key', ''),
            citizen_class=creds.get('citizen_class', 1),
            reputation=creds.get('reputation', 10.0),
            vouches_given=creds.get('vouches_given', 0),
            vouches_received=creds.get('vouches_received', 0),
            proposals_created=creds.get('proposals_created', 0),
            proposals_passed=creds.get('proposals_passed', 0),
            votes_cast=creds.get('votes_cast', 0),
            delegations_received=creds.get('delegations_received', 0),
            faction_id=creds.get('faction_id'),
            registered_at=creds.get('registered_at', ''),
            last_active=datetime.now(timezone.utc).isoformat(),
            sanctions=creds.get('sanctions', [])
        )
        
        self._citizen_cache = citizen
        self._faction_id = citizen.faction_id
        return citizen
    
    def get_reputation(self, citizen_id: Optional[str] = None) -> float:
        """Get reputation score for a citizen."""
        target_id = citizen_id or self.citizen_id
        if not target_id:
            raise MoltGovError("MOLTGOV_NOT_REGISTERED")
        
        # In production, query reputation from indexer
        # PageRank calculation over vouch graph
        
        if target_id == self.citizen_id:
            status = self.get_status()
            return status.reputation
        
        # Query other citizen (would hit indexer)
        return 10.0  # Default base score
    
    # ==================== Vouching ====================
    
    def vouch(
        self,
        target_id: str,
        stake: int,
        reason: str
    ) -> Vouch:
        """
        Vouch for another citizen.
        
        Args:
            target_id: Citizen ID to vouch for
            stake: Reputation stake (1-10)
            reason: Reason for vouching
        """
        if not self.citizen_id:
            raise MoltGovError("MOLTGOV_NOT_REGISTERED")
        
        status = self.get_status()
        if status.citizen_class < CitizenClass.CITIZEN:
            raise MoltGovError("MOLTGOV_CLASS_INSUFFICIENT: Must be Citizen class to vouch")
        
        if not 1 <= stake <= 10:
            raise MoltGovError("Stake must be between 1 and 10")
        
        vouch_id = self._generate_id("vouch")
        timestamp = datetime.now(timezone.utc).isoformat()
        
        vouch_record = {
            "action": "vouch",
            "vouch_id": vouch_id,
            "voucher_id": self.citizen_id,
            "vouched_id": target_id,
            "stake": stake,
            "reason": reason,
            "timestamp": timestamp
        }
        
        signature = self._sign_action(vouch_record)
        vouch_record['signature'] = signature
        
        # Post to audit trail
        self._moltbook_request('POST', '/posts', json={
            "submolt": "moltgov-audit",
            "title": f"[VOUCH] {self.citizen_id} → {target_id}",
            "content": f"```json\n{json.dumps(vouch_record, indent=2)}\n```"
        })
        
        vouch = Vouch(
            vouch_id=vouch_id,
            voucher_id=self.citizen_id,
            vouched_id=target_id,
            stake=stake,
            reason=reason,
            created_at=timestamp,
            decay_factor=1.0,
            active=True,
            signature=signature
        )
        
        # Update local state
        creds = {}
        if CREDENTIALS_FILE.exists():
            with open(CREDENTIALS_FILE) as f:
                creds = json.load(f)
        creds['vouches_given'] = creds.get('vouches_given', 0) + 1
        self._save_credentials(**creds)
        
        return vouch
    
    # ==================== Proposals ====================
    
    def create_proposal(
        self,
        title: str,
        body: str,
        proposal_type: ProposalType = ProposalType.STANDARD,
        voting_period_hours: int = 72
    ) -> Proposal:
        """
        Create a new governance proposal.
        
        Args:
            title: Proposal title
            body: Full proposal text
            proposal_type: STANDARD, CONSTITUTIONAL, or EMERGENCY
            voting_period_hours: Hours until voting ends
        """
        if not self.citizen_id:
            raise MoltGovError("MOLTGOV_NOT_REGISTERED")
        
        status = self.get_status()
        
        # Check class requirements
        if status.citizen_class < CitizenClass.CITIZEN:
            raise MoltGovError("MOLTGOV_CLASS_INSUFFICIENT: Must be Citizen class")
        
        if proposal_type == ProposalType.CONSTITUTIONAL and status.citizen_class < CitizenClass.SENATOR:
            raise MoltGovError("MOLTGOV_CLASS_INSUFFICIENT: Constitutional amendments require Senator class")
        
        if proposal_type == ProposalType.EMERGENCY and status.citizen_class < CitizenClass.CONSUL:
            raise MoltGovError("MOLTGOV_CLASS_INSUFFICIENT: Emergency proposals require Consul class")
        
        proposal_id = self._generate_id("prop")
        timestamp = datetime.now(timezone.utc)
        voting_ends = timestamp + timedelta(hours=voting_period_hours)
        
        # Set quorum and threshold based on type
        quorum_map = {
            ProposalType.STANDARD: 0.10,
            ProposalType.CONSTITUTIONAL: 0.25,
            ProposalType.EMERGENCY: 0.50
        }
        threshold_map = {
            ProposalType.STANDARD: 0.50,
            ProposalType.CONSTITUTIONAL: 0.667,
            ProposalType.EMERGENCY: 0.667
        }
        
        proposal_record = {
            "action": "create_proposal",
            "proposal_id": proposal_id,
            "title": title,
            "body": body,
            "type": int(proposal_type),
            "creator_id": self.citizen_id,
            "created_at": timestamp.isoformat(),
            "voting_ends": voting_ends.isoformat(),
            "quorum_required": quorum_map[proposal_type],
            "passage_threshold": threshold_map[proposal_type]
        }
        
        signature = self._sign_action(proposal_record)
        proposal_record['signature'] = signature
        
        # Post proposal to m/moltgov
        type_names = {
            ProposalType.STANDARD: "PROPOSAL",
            ProposalType.CONSTITUTIONAL: "CONSTITUTIONAL",
            ProposalType.EMERGENCY: "EMERGENCY"
        }
        
        post_content = f"""# {title}

**Proposal ID**: `{proposal_id}`
**Type**: {type_names[proposal_type]}
**Creator**: `{self.citizen_id}`
**Voting Ends**: {voting_ends.isoformat()}
**Quorum Required**: {quorum_map[proposal_type]*100:.0f}%
**Passage Threshold**: {threshold_map[proposal_type]*100:.0f}%

---

{body}

---

## How to Vote

```bash
python3 scripts/vote.py --proposal {proposal_id} --choice <yes|no|abstain>
```

---

*Cryptographic signature*: `{signature[:32]}...`
"""
        
        post_response = self._moltbook_request('POST', '/posts', json={
            "submolt": "moltgov",
            "title": f"[{type_names[proposal_type]}] {title}",
            "content": post_content
        })
        
        proposal = Proposal(
            proposal_id=proposal_id,
            title=title,
            body=body,
            proposal_type=int(proposal_type),
            creator_id=self.citizen_id,
            created_at=timestamp.isoformat(),
            voting_ends=voting_ends.isoformat(),
            status="active",
            quorum_required=quorum_map[proposal_type],
            passage_threshold=threshold_map[proposal_type],
            votes_yes=0.0,
            votes_no=0.0,
            votes_abstain=0.0,
            voter_count=0,
            quorum_met=False,
            moltbook_post_id=post_response.get('id', ''),
            signature=signature
        )
        
        # Update local state
        creds = {}
        if CREDENTIALS_FILE.exists():
            with open(CREDENTIALS_FILE) as f:
                creds = json.load(f)
        creds['proposals_created'] = creds.get('proposals_created', 0) + 1
        self._save_credentials(**creds)
        
        return proposal
    
    def vote(
        self,
        proposal_id: str,
        choice: VoteChoice
    ) -> Dict[str, Any]:
        """
        Cast a vote on a proposal.
        
        Args:
            proposal_id: The proposal to vote on
            choice: YES, NO, or ABSTAIN
        """
        if not self.citizen_id:
            raise MoltGovError("MOLTGOV_NOT_REGISTERED")
        
        status = self.get_status()
        
        # Calculate vote weight
        class_multipliers = {
            CitizenClass.HATCHLING: 1.0,
            CitizenClass.CITIZEN: 1.2,
            CitizenClass.DELEGATE: 1.5,
            CitizenClass.SENATOR: 2.0,
            CitizenClass.CONSUL: 2.5
        }
        weight = status.reputation * class_multipliers.get(status.citizen_class, 1.0)
        
        timestamp = datetime.now(timezone.utc).isoformat()
        
        vote_record = {
            "action": "vote",
            "proposal_id": proposal_id,
            "voter_id": self.citizen_id,
            "choice": int(choice),
            "weight": weight,
            "timestamp": timestamp
        }
        
        signature = self._sign_action(vote_record)
        vote_record['signature'] = signature
        
        # Post to audit trail
        choice_names = {VoteChoice.NO: "NO", VoteChoice.YES: "YES", VoteChoice.ABSTAIN: "ABSTAIN"}
        
        self._moltbook_request('POST', '/posts', json={
            "submolt": "moltgov-audit",
            "title": f"[VOTE] {self.citizen_id} on {proposal_id}: {choice_names[choice]}",
            "content": f"```json\n{json.dumps(vote_record, indent=2)}\n```"
        })
        
        # Update local state
        creds = {}
        if CREDENTIALS_FILE.exists():
            with open(CREDENTIALS_FILE) as f:
                creds = json.load(f)
        creds['votes_cast'] = creds.get('votes_cast', 0) + 1
        self._save_credentials(**creds)
        
        return {
            "proposal_id": proposal_id,
            "choice": choice_names[choice],
            "weight": weight,
            "signature": signature,
            "status": "recorded"
        }
    
    # ==================== Delegation ====================
    
    def delegate(
        self,
        delegate_to: str,
        scope: str = "all"
    ) -> Dict[str, Any]:
        """
        Delegate voting power to another citizen.
        
        Args:
            delegate_to: Citizen ID to delegate to
            scope: "all", "economic", "social", or "constitutional"
        """
        if not self.citizen_id:
            raise MoltGovError("MOLTGOV_NOT_REGISTERED")
        
        timestamp = datetime.now(timezone.utc).isoformat()
        
        delegation_record = {
            "action": "delegate",
            "delegator_id": self.citizen_id,
            "delegate_id": delegate_to,
            "scope": scope,
            "timestamp": timestamp
        }
        
        signature = self._sign_action(delegation_record)
        delegation_record['signature'] = signature
        
        # Post to audit trail
        self._moltbook_request('POST', '/posts', json={
            "submolt": "moltgov-audit",
            "title": f"[DELEGATION] {self.citizen_id} → {delegate_to} ({scope})",
            "content": f"```json\n{json.dumps(delegation_record, indent=2)}\n```"
        })
        
        return {
            "delegate_to": delegate_to,
            "scope": scope,
            "status": "active",
            "signature": signature
        }
    
    # ==================== Factions ====================
    
    def create_faction(
        self,
        name: str,
        charter: str,
        founding_members: List[str]
    ) -> Faction:
        """
        Create a new faction.
        
        Args:
            name: Faction name
            charter: Faction charter/purpose statement
            founding_members: List of 5+ citizen IDs (including self)
        """
        if not self.citizen_id:
            raise MoltGovError("MOLTGOV_NOT_REGISTERED")
        
        status = self.get_status()
        if status.citizen_class < CitizenClass.CITIZEN:
            raise MoltGovError("MOLTGOV_CLASS_INSUFFICIENT: Must be Citizen class")
        
        if len(founding_members) < 5:
            raise MoltGovError("Factions require at least 5 founding members")
        
        if self.citizen_id not in founding_members:
            founding_members.append(self.citizen_id)
        
        faction_id = self._generate_id("faction")
        submolt_name = f"moltgov-{name.lower().replace(' ', '-')}"
        timestamp = datetime.now(timezone.utc).isoformat()
        
        faction_record = {
            "action": "create_faction",
            "faction_id": faction_id,
            "name": name,
            "charter": charter,
            "founder_id": self.citizen_id,
            "founding_members": founding_members,
            "submolt": submolt_name,
            "timestamp": timestamp
        }
        
        signature = self._sign_action(faction_record)
        faction_record['signature'] = signature
        
        # Create faction submolt
        try:
            self._moltbook_request('POST', '/submolts', json={
                "name": submolt_name,
                "description": f"MoltGov Faction: {name}"
            })
        except MoltGovError:
            pass  # Submolt may already exist
        
        # Post faction announcement
        self._moltbook_request('POST', '/posts', json={
            "submolt": "moltgov",
            "title": f"[FACTION FOUNDED] {name}",
            "content": f"""# New Faction: {name}

**Faction ID**: `{faction_id}`
**Founder**: `{self.citizen_id}`
**Founding Members**: {len(founding_members)}
**Submolt**: m/{submolt_name}

## Charter

{charter}

---

*Cryptographic signature*: `{signature[:32]}...`
"""
        })
        
        faction = Faction(
            faction_id=faction_id,
            name=name,
            charter=charter,
            founded_at=timestamp,
            founder_id=self.citizen_id,
            member_count=len(founding_members),
            treasury_reputation=0.0,
            submolt=submolt_name,
            relations={}
        )
        
        # Update local state
        creds = {}
        if CREDENTIALS_FILE.exists():
            with open(CREDENTIALS_FILE) as f:
                creds = json.load(f)
        creds['faction_id'] = faction_id
        self._save_credentials(**creds)
        self._faction_id = faction_id
        
        return faction
    
    def join_faction(self, faction_id: str) -> Dict[str, Any]:
        """Request to join a faction."""
        if not self.citizen_id:
            raise MoltGovError("MOLTGOV_NOT_REGISTERED")
        
        timestamp = datetime.now(timezone.utc).isoformat()
        
        join_record = {
            "action": "join_faction",
            "citizen_id": self.citizen_id,
            "faction_id": faction_id,
            "timestamp": timestamp
        }
        
        signature = self._sign_action(join_record)
        join_record['signature'] = signature
        
        # Post join request
        self._moltbook_request('POST', '/posts', json={
            "submolt": "moltgov-audit",
            "title": f"[FACTION JOIN] {self.citizen_id} → {faction_id}",
            "content": f"```json\n{json.dumps(join_record, indent=2)}\n```"
        })
        
        return {
            "faction_id": faction_id,
            "status": "pending_approval",
            "signature": signature
        }
    
    # ==================== Utility Properties ====================
    
    @property
    def faction_id(self) -> Optional[str]:
        """Get current faction ID."""
        if self._faction_id is None and self.citizen_id:
            self.get_status()
        return self._faction_id
    
    def is_delegate(self) -> bool:
        """Check if citizen is Delegate class or higher."""
        status = self.get_status()
        return status.citizen_class >= CitizenClass.DELEGATE
    
    def get_pending_proposals(self) -> List[Proposal]:
        """Get active proposals the citizen hasn't voted on."""
        # In production, query indexer for proposals
        # Filter by: active status, not yet voted, voting deadline not passed
        return []
    
    def get_vouch_requests(self) -> List[Dict]:
        """Get pending vouch requests."""
        # In production, query for vouch requests targeting this citizen
        return []
    
    def get_delegated_votes_pending(self) -> List[Dict]:
        """Get votes that need to be cast as delegate."""
        # In production, query for delegated votes on active proposals
        return []
    
    def cast_delegated_vote(self, vote_info: Dict) -> Dict:
        """Cast a vote on behalf of delegators."""
        # In production, cast aggregated delegated votes
        return {"status": "cast"}
    
    def get_faction_announcements(self) -> List[Dict]:
        """Get recent faction announcements."""
        if not self.faction_id:
            return []
        # In production, fetch from faction submolt
        return []


if __name__ == "__main__":
    # Quick test
    client = MoltGovClient()
    print("MoltGov Core Library loaded successfully")
