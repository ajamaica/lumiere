"""
CCTP (Cross-Chain Transfer Protocol) Client
"""

from web3 import Web3
import os
import time


class CCTPClient:
    """Client for interacting with CCTP TokenMessenger"""
    
    # CCTP contract addresses (testnet)
    TOKEN_MESSENGERS = {
        'ethereum-sepolia': '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5',
        'base-sepolia': '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5',
        'arbitrum-sepolia': '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5',
        'arc-testnet': '0x0000000000000000000000000000000000000000', # TBD
    }

    MESSAGE_TRANSMITTERS = {
        'ethereum-sepolia': '0x7865fAfC2db2093669d92c0F33AeEF291086BEFD',
        'base-sepolia': '0x7865fAfC2db2093669d92c0F33AeEF291086BEFD',
        'arbitrum-sepolia': '0x7865fAfC2db2093669d92c0F33AeEF291086BEFD',
        'arc-testnet': '0x0000000000000000000000000000000000000000', # TBD
    }
    
    USDC_ADDRESSES = {
        'ethereum-sepolia': '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
        'base-sepolia': '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
        'arbitrum-sepolia': '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
        'arc-testnet': '0x0000000000000000000000000000000000000000', # TBD
    }
    
    # Domain IDs
    DOMAIN_IDS = {
        'ethereum-sepolia': 0,
        'avalanche-fuji': 1,
        'optimism-sepolia': 2,
        'arbitrum-sepolia': 3,
        'base-sepolia': 6,
        'arc-testnet': 100,  # Placeholder
    }
    
    def __init__(self):
        self.private_key = os.getenv('PRIVATE_KEY')
        if not self.private_key:
            raise ValueError("PRIVATE_KEY environment variable not set")
    
    def bond_skill(self, skill_id: str, amount: float, source_chain: str) -> dict:
        """
        Bond USDC to vouch for a skill via CCTP
        
        Args:
            skill_id: Skill identifier
            amount: Amount in USDC
            source_chain: Source chain name
            
        Returns:
            dict with success status and transaction hash
        """
        try:
            # Initialize Web3 for source chain
            rpc_url = self._get_rpc_url(source_chain)
            w3 = Web3(Web3.HTTPProvider(rpc_url))
            
            if not w3.is_connected():
                return {'success': False, 'error': f'Failed to connect to {source_chain}'}
            
            account = w3.eth.account.from_key(self.private_key)
            
            # Get contract addresses
            token_messenger_address = self.TOKEN_MESSENGERS.get(source_chain)
            usdc_address = self.USDC_ADDRESSES.get(source_chain)
            arc_domain = self.DOMAIN_IDS.get('arc-testnet')
            registry_address = os.getenv('CONTRACT_ADDRESS')
            
            if not all([token_messenger_address, usdc_address, arc_domain, registry_address]):
                return {'success': False, 'error': 'Missing contract addresses or domain ID'}
            
            # Convert amount to wei (6 decimals for USDC)
            amount_wei = int(amount * 1e6)
            
            # 1. Approve USDC to TokenMessenger
            print(f"Approving {amount} USDC on {source_chain}...")
            usdc_abi = [
                {"inputs": [{"name": "spender", "type": "address"}, {"name": "amount", "type": "uint256"}], "name": "approve", "outputs": [{"name": "", "type": "bool"}], "type": "function"}
            ]
            usdc_contract = w3.eth.contract(address=Web3.to_checksum_address(usdc_address), abi=usdc_abi)
            
            approve_tx = usdc_contract.functions.approve(
                Web3.to_checksum_address(token_messenger_address),
                amount_wei
            ).build_transaction({
                'from': account.address,
                'nonce': w3.eth.get_transaction_count(account.address),
                'gas': 100000,
                'gasPrice': w3.eth.gas_price
            })
            
            signed_approve = w3.eth.account.sign_transaction(approve_tx, self.private_key)
            w3.eth.send_raw_transaction(signed_approve.raw_transaction)
            print("Approval sent.")
            
            # 2. Call depositForBurn
            print(f"Initiating CCTP burn on {source_chain}...")
            messenger_abi = [
                {"inputs": [{"name": "amount", "type": "uint256"}, {"name": "destinationDomain", "type": "uint32"}, {"name": "mintRecipient", "type": "bytes32"}, {"name": "burnToken", "type": "address"}], "name": "depositForBurn", "outputs": [{"name": "nonce", "type": "uint64"}], "type": "function"}
            ]
            messenger_contract = w3.eth.contract(address=Web3.to_checksum_address(token_messenger_address), abi=messenger_abi)
            
            # Convert registry address to bytes32
            mint_recipient = '0x' + registry_address[2:].zfill(64)
            
            burn_tx = messenger_contract.functions.depositForBurn(
                amount_wei,
                arc_domain,
                mint_recipient,
                Web3.to_checksum_address(usdc_address)
            ).build_transaction({
                'from': account.address,
                'nonce': w3.eth.get_transaction_count(account.address),
                'gas': 200000,
                'gasPrice': w3.eth.gas_price
            })
            
            signed_burn = w3.eth.account.sign_transaction(burn_tx, self.private_key)
            tx_hash = w3.eth.send_raw_transaction(signed_burn.raw_transaction)
            print(f"Burn transaction sent: {w3.to_hex(tx_hash)}")
            
            return {
                'success': True,
                'txHash': w3.to_hex(tx_hash),
                'message': 'CCTP transfer initiated'
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def _get_rpc_url(self, chain: str) -> str:
        """Get RPC URL for chain"""
        rpc_urls = {
            'ethereum-sepolia': os.getenv('ETH_RPC_URL', 'https://sepolia.infura.io/v3/YOUR_KEY'),
            'base-sepolia': os.getenv('BASE_RPC_URL', 'https://sepolia.base.org'),
            'arbitrum-sepolia': os.getenv('ARB_RPC_URL', 'https://sepolia-rollup.arbitrum.io/rpc'),
            'arc-testnet': os.getenv('ARC_RPC_URL', 'https://testnet-rpc.arc.network'),
        }
        return rpc_urls.get(chain, '')
    
    def wait_for_attestation(self, tx_hash: str, source_chain: str, timeout: int = 300) -> dict:
        """
        Wait for CCTP attestation after burn
        """
        print(f"Waiting for CCTP attestation for {tx_hash}...")
        # In a real implementation, we would poll Circle's API
        # For now, we simulate with a sleep and return placeholder bytes
        # which would be needed by the Arc contract's receiveMessage.
        
        start_time = time.time()
        while time.time() - start_time < timeout:
            # Simulation: wait 30 seconds
            time.sleep(30)
            
            # Return placeholder attestation data
            # In production, this comes from iris-api.circle.com
            return {
                'success': True,
                'attestation': '0x' + '0' * 128, 
                'message': '0x' + '0' * 128
            }
            
        return {'success': False, 'error': 'Timed out waiting for attestation'}

    def receive_message(self, message: str, attestation: str, destination_chain: str) -> dict:
        """Complete CCTP transfer on destination chain"""
        try:
            rpc_url = self._get_rpc_url(destination_chain)
            w3 = Web3(Web3.HTTPProvider(rpc_url))
            account = w3.eth.account.from_key(self.private_key)
            
            transmitter_address = self.MESSAGE_TRANSMITTERS.get(destination_chain)
            if not transmitter_address:
                return {'success': False, 'error': 'Message transmitter not found for chain'}
                
            transmitter_abi = [
                {"inputs": [{"name": "message", "type": "bytes"}, {"name": "attestation", "type": "bytes"}], "name": "receiveMessage", "outputs": [{"name": "success", "type": "bool"}], "type": "function"}
            ]
            transmitter_contract = w3.eth.contract(address=Web3.to_checksum_address(transmitter_address), abi=transmitter_abi)
            
            tx = transmitter_contract.functions.receiveMessage(
                Web3.to_bytes(hexstr=message),
                Web3.to_bytes(hexstr=attestation)
            ).build_transaction({
                'from': account.address,
                'nonce': w3.eth.get_transaction_count(account.address),
                'gas': 500000,
                'gasPrice': w3.eth.gas_price
            })
            
            signed_tx = w3.eth.account.sign_transaction(tx, self.private_key)
            tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
            
            return {
                'success': True,
                'txHash': w3.to_hex(tx_hash)
            }
        except Exception as e:
            return {'success': False, 'error': str(e)}
