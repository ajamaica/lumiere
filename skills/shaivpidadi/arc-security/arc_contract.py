"""
Arc Contract Interaction Module
"""

from web3 import Web3
import os
import json


class ArcContract:
    """Interface to SkillSecurityRegistry contract on Arc"""
    
    def __init__(self):
        self.rpc_url = os.getenv('ARC_RPC_URL', 'https://testnet-rpc.arc.network')
        self.contract_address = os.getenv('CONTRACT_ADDRESS')
        self.private_key = os.getenv('PRIVATE_KEY')
        
        if not self.contract_address:
            raise ValueError("CONTRACT_ADDRESS environment variable not set")
        
        self.w3 = Web3(Web3.HTTPProvider(self.rpc_url))
        
        # Load ABI from compiled contract JSON
        self.abi = self._load_abi()
        self.contract = self.w3.eth.contract(
            address=Web3.to_checksum_address(self.contract_address),
            abi=self.abi
        )
        
        if self.private_key:
            self.account = self.w3.eth.account.from_key(self.private_key)
    
    def _load_abi(self):
        """Load contract ABI from file"""
        abi_path = os.path.join(os.path.dirname(__file__), 'SkillSecurityRegistry.json')
        if os.path.exists(abi_path):
            with open(abi_path, 'r') as f:
                data = json.load(f)
                return data.get('abi', data)
        
        # Fallback minimal ABI if file missing
        return [
            {
                "inputs": [{"internalType": "string", "name": "skillId", "type": "string"}],
                "name": "getSkillInfo",
                "outputs": [
                    {"internalType": "string", "name": "", "type": "string"},
                    {"internalType": "uint256", "name": "totalBonded", "type": "uint256"},
                    {"internalType": "uint256", "name": "usageCount", "type": "uint256"},
                    {"internalType": "uint256", "name": "totalFeesGenerated", "type": "uint256"},
                    {"internalType": "bool", "name": "flagged", "type": "bool"},
                    {"internalType": "uint256", "name": "createdAt", "type": "uint256"}
                ],
                "stateMutability": "view",
                "type": "function"
            }
        ]
    
    def get_skill_info(self, skill_id: str) -> dict:
        """Get skill information"""
        try:
            result = self.contract.functions.getSkillInfo(skill_id).call()
            return {
                'skillId': result[0],
                'totalBonded': result[1],
                'usageCount': result[2],
                'totalFeesGenerated': result[3],
                'flagged': result[4],
                'createdAt': result[5]
            }
        except Exception as e:
            raise Exception(f"Failed to get skill info: {str(e)}")
    
    def get_claim_info(self, claim_id: int) -> dict:
        """Get claim information"""
        try:
            result = self.contract.functions.getClaimInfo(claim_id).call()
            return {
                'skillId': result[0],
                'claimant': result[1],
                'evidenceHash': result[2],
                'votesFor': result[3],
                'votesAgainst': result[4],
                'resolved': result[5],
                'outcome': result[6]
            }
        except Exception as e:
            raise Exception(f"Failed to get claim info: {str(e)}")
    
    def get_pending_earnings(self) -> int:
        """Get pending earnings for connected account"""
        if not hasattr(self, 'account'):
            return 0
        
        try:
            return self.contract.functions.pendingEarnings(self.account.address).call()
        except Exception as e:
            raise Exception(f"Failed to get pending earnings: {str(e)}")
    
    def submit_claim(self, skill_id: str, evidence_hash: str, destination_chain: int = 0) -> dict:
        """Submit a malicious behavior claim (direct Arc version)"""
        if not hasattr(self, 'account'):
            return {'success': False, 'error': 'Private key required for write operations'}
        
        try:
            # Build transaction
            tx = self.contract.functions.submitClaim(
                skill_id,
                evidence_hash,
                destination_chain
            ).build_transaction({
                'from': self.account.address,
                'nonce': self.w3.eth.get_transaction_count(self.account.address),
                'gas': 300000,
                'gasPrice': self.w3.eth.gas_price
            })
            
            # Sign and send
            signed_tx = self.w3.eth.account.sign_transaction(tx, self.private_key)
            tx_hash = self.w3.eth.send_raw_transaction(signed_tx.raw_transaction)
            
            # Wait for receipt
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
            
            # Extract claimId from events (placeholder - assuming simplified return for demo)
            return {
                'success': True,
                'txHash': self.w3.to_hex(tx_hash),
                'claimId': 1, # Should parse from logs
                'status': receipt['status']
            }
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def vote_on_claim(self, claim_id: int, support: bool) -> dict:
        """Vote on a claim"""
        if not hasattr(self, 'account'):
            return {'success': False, 'error': 'Private key required for write operations'}
        
        try:
            tx = self.contract.functions.voteOnClaim(
                claim_id,
                support
            ).build_transaction({
                'from': self.account.address,
                'nonce': self.w3.eth.get_transaction_count(self.account.address),
                'gas': 200000,
                'gasPrice': self.w3.eth.gas_price
            })
            
            signed_tx = self.w3.eth.account.sign_transaction(tx, self.private_key)
            tx_hash = self.w3.eth.send_raw_transaction(signed_tx.raw_transaction)
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
            
            return {
                'success': True,
                'txHash': self.w3.to_hex(tx_hash),
                'status': receipt['status']
            }
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def claim_earnings(self, destination_chain_domain: int) -> dict:
        """Claim accumulated earnings"""
        if not hasattr(self, 'account'):
            return {'success': False, 'error': 'Private key required for write operations'}
        
        try:
            tx = self.contract.functions.claimEarnings(
                destination_chain_domain
            ).build_transaction({
                'from': self.account.address,
                'nonce': self.w3.eth.get_transaction_count(self.account.address),
                'gas': 200000,
                'gasPrice': self.w3.eth.gas_price
            })
            
            signed_tx = self.w3.eth.account.sign_transaction(tx, self.private_key)
            tx_hash = self.w3.eth.send_raw_transaction(signed_tx.raw_transaction)
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
            
            return {
                'success': True,
                'txHash': self.w3.to_hex(tx_hash),
                'status': receipt['status']
            }
        except Exception as e:
            return {'success': False, 'error': str(e)}
