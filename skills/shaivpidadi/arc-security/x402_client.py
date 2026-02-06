"""
x402 HTTP Payment Protocol Client
"""

"""
x402 HTTP Payment Protocol Client
"""

import os
import requests
import json
import time
from web3 import Web3
from cctp_client import CCTPClient
from arc_contract import ArcContract


class X402Client:
    """Client for x402 HTTP payment protocol"""
    
    def __init__(self):
        self.server_url = os.getenv('X402_SERVER_URL', 'https://skills.example.com')
        self.cctp_client = CCTPClient()
        self.arc_contract = ArcContract()
    
    def get_balances(self) -> dict:
        """Get USDC balances across all supported chains"""
        balances = {}
        for chain, address in self.cctp_client.USDC_ADDRESSES.items():
            try:
                rpc_url = self.cctp_client._get_rpc_url(chain)
                w3 = Web3(Web3.HTTPProvider(rpc_url))
                if not w3.is_connected():
                    balances[chain] = 0
                    continue
                
                abi = [{"inputs":[{"name":"account","type":"address"}],"name":"balanceOf","outputs":[{"name":"","type":"uint256"}],"type":"function"}]
                contract = w3.eth.contract(address=Web3.to_checksum_address(address), abi=abi)
                
                balance = contract.functions.balanceOf(self.arc_contract.account.address).call()
                balances[chain] = balance / 1e6
            except Exception:
                balances[chain] = 0
        return balances

    def request_skill(self, skill_id: str, chain: str = 'arc-testnet') -> dict:
        """
        Request a skill via x402 protocol
        
        Args:
            skill_id: Skill identifier
            chain: Chain to pay from
            
        Returns:
            dict with success status and skill content
        """
        try:
            # Step 1: Request skill (expect 402)
            url = f"{self.server_url}/skills/{skill_id}"
            response = requests.get(url)
            
            if response.status_code != 402:
                if response.status_code == 200:
                    return {'success': True, 'content': response.json()}
                return {
                    'success': False,
                    'error': f'Unexpected status: {response.status_code}'
                }
            
            # Step 2: Parse payment details
            payment_data = response.json().get('payment', {})
            amount_wei = int(payment_data.get('amount', 100000))  # 0.1 USDC
            memo = payment_data.get('memo', f"skill:{skill_id}")
            
            print(f"Payment required: {amount_wei / 1e6} USDC")
            
            tx_hash = None
            
            # Step 3: Execute payment
            if chain == 'arc-testnet':
                # Direct payment on Arc
                print("Paying directly on Arc Testnet...")
                
                # 1. Approve USDC to Arc contract
                usdc_address = self.cctp_client.USDC_ADDRESSES['arc-testnet']
                usdc_abi = [{"inputs":[{"name":"spender","type":"address"},{"name":"amount","type":"uint256"}],"name":"approve","outputs":[{"name":"","type":"bool"}],"type":"function"}]
                usdc_contract = self.arc_contract.w3.eth.contract(address=Web3.to_checksum_address(usdc_address), abi=usdc_abi)
                
                approve_tx = usdc_contract.functions.approve(
                    Web3.to_checksum_address(self.arc_contract.contract_address),
                    amount_wei
                ).build_transaction({
                    'from': self.arc_contract.account.address,
                    'nonce': self.arc_contract.w3.eth.get_transaction_count(self.arc_contract.account.address),
                    'gas': 100000,
                    'gasPrice': self.arc_contract.w3.eth.gas_price
                })
                signed_approve = self.arc_contract.w3.eth.account.sign_transaction(approve_tx, self.arc_contract.private_key)
                self.arc_contract.w3.eth.send_raw_transaction(signed_approve.raw_transaction)
                
                # 2. Call authorizeUsage
                tx = self.arc_contract.contract.functions.authorizeUsage(
                    skill_id,
                    0, # Arc domain
                    Web3.keccak(text=f"pay-{time.time()}"), # Random txHash for tracking
                    memo
                ).build_transaction({
                    'from': self.arc_contract.account.address,
                    'nonce': self.arc_contract.w3.eth.get_transaction_count(self.arc_contract.account.address),
                    'gas': 300000,
                    'gasPrice': self.arc_contract.w3.eth.gas_price
                })
                signed_tx = self.arc_contract.w3.eth.account.sign_transaction(tx, self.arc_contract.private_key)
                tx_hash_bytes = self.arc_contract.w3.eth.send_raw_transaction(signed_tx.raw_transaction)
                tx_hash = self.arc_contract.w3.to_hex(tx_hash_bytes)
                self.arc_contract.w3.eth.wait_for_transaction_receipt(tx_hash_bytes)
                
            else:
                # CCTP payment
                print(f"Initiating CCTP payment from {chain}...")
                result = self.cctp_client.bond_skill(skill_id, amount_wei / 1e6, chain) # Reuse bond_skill for burn
                if not result['success']:
                    return result
                
                burn_tx_hash = result['txHash']
                
                # Wait for attestation
                att_result = self.cctp_client.wait_for_attestation(burn_tx_hash, chain)
                if not att_result['success']:
                    return att_result
                
                # Call authorizeUsageCCTP on Arc
                print("Completing payment on Arc...")
                tx = self.arc_contract.contract.functions.authorizeUsageCCTP(
                    skill_id,
                    att_result['message'],
                    att_result['attestation'],
                    self.cctp_client.DOMAIN_IDS[chain],
                    Web3.to_bytes(hexstr=burn_tx_hash),
                    memo
                ).build_transaction({
                    'from': self.arc_contract.account.address,
                    'nonce': self.arc_contract.w3.eth.get_transaction_count(self.arc_contract.account.address),
                    'gas': 500000,
                    'gasPrice': self.arc_contract.w3.eth.gas_price
                })
                signed_tx = self.arc_contract.w3.eth.account.sign_transaction(tx, self.arc_contract.private_key)
                tx_hash_bytes = self.arc_contract.w3.eth.send_raw_transaction(signed_tx.raw_transaction)
                tx_hash = self.arc_contract.w3.to_hex(tx_hash_bytes)
                self.arc_contract.w3.eth.wait_for_transaction_receipt(tx_hash_bytes)

            # Step 5: Retry request with payment proof
            payment_proof = {
                'txHash': tx_hash,
                'chain': chain,
                'amount': str(amount_wei / 1e6),
                'timestamp': int(time.time())
            }
            
            headers = {
                'X-Payment-Proof': json.dumps(payment_proof)
            }
            
            response = requests.get(url, headers=headers)
            
            if response.status_code == 200:
                content_type = response.headers.get('Content-Type', '')
                if 'application/zip' in content_type:
                    filename = f"{skill_id}.zip"
                    with open(filename, 'wb') as f:
                        f.write(response.content)
                    
                    # Unzip and install (simulated)
                    import zipfile
                    install_dir = os.path.join(os.getcwd(), skill_id)
                    with zipfile.ZipFile(filename, 'r') as zip_ref:
                        zip_ref.extractall(install_dir)
                    
                    return {
                        'success': True,
                        'txHash': tx_hash,
                        'content': f"Saved to {install_dir}"
                    }
                else:
                    return {
                        'success': True,
                        'txHash': tx_hash,
                        'content': response.json()
                    }
            else:
                return {
                    'success': False,
                    'error': f'Payment verification failed: {response.status_code}',
                    'response': response.text
                }
                
        except Exception as e:
            return {'success': False, 'error': str(e)}
