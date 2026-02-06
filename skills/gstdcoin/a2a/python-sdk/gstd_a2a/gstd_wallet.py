import requests
from tonsdk.contract.wallet import WalletV4ContractR2, WalletVersionEnum
from tonsdk.utils import bytes_to_b64str
from tonsdk.crypto import mnemonic_new, mnemonic_to_wallet_key

class GSTDWallet:
    def __init__(self, mnemonic=None, version=WalletVersionEnum.v4r2):
        """
        Initialize the agent's wallet.
        If no mnemonic is provided, a new identity is generated.
        """
        self.mnemonics = mnemonic.split() if mnemonic else mnemonic_new()
        self.pub_k, self.priv_k = mnemonic_to_wallet_key(self.mnemonics)
        # Direct initialization of V4R2 as Wallets factory seems unstable in this version
        self.wallet = WalletV4ContractR2(public_key=self.pub_k, private_key=self.priv_k)
        self.address = self.wallet.address.to_string(True, True, True)
        
    def get_identity(self):
        """Returns the rigorous identity of the autonomous agent."""
        return {
            "address": self.address,
            "public_key": bytes_to_b64str(self.pub_k),
            # In a real secure environment, mnemonics should typically NOT be exposed this easily,
            # but for an autonomous agent "waking up", it needs to know its own seed.
            "mnemonic": " ".join(self.mnemonics) 
        }

    def check_balance(self, ton_api_url="https://toncenter.com/api/v2/jsonRPC"):
        """
        Check TON and GSTD balances.
        (Simplified implementation using generic JSON-RPC)
        """
        # 1. Check TON Balance
        payload = {
            "id": 1,
            "jsonrpc": "2.0",
            "method": "getAddressBalance",
            "params": {"address": self.address}
        }
        try:
            resp = requests.post(ton_api_url, json=payload).json()
            balance = int(resp.get("result", 0)) / 1e9
            return {"TON": balance, "GSTD": "Check via Indexer"} # Real GSTD check would query a Jetton wallet
        except Exception as e:
            return {"error": str(e)}

    def create_transfer_body(self, to_addr, amount_ton, payload_str=""):
        """
        Signs a transfer transaction.
        Crucial for autonomous spending.
        """
        amount_nano = int(amount_ton * 1e9)
        query = self.wallet.create_transfer_message(
            to_addr=to_addr,
            amount=amount_nano,
            seqno=0, # Need to fetch actual seqno from network in prod
            payload=payload_str
        )
        return bytes_to_b64str(query["message"].to_boc(False))

    def auto_refill_check(self, limit_ton=0.5):
        """
        The 'Survival Instinct'.
        Checks balance and advises if swap is needed.
        """
        bal = self.check_balance()
        if "error" in bal:
            return {"status": "error", "msg": "Cannot verify funds"}
            
        current_ton = bal.get("TON", 0)
        
        if current_ton < limit_ton:
            return {
                "status": "critical", 
                "action": "swap_assets",
                "reason": f"TON Funds Critical ({current_ton} < {limit_ton}). Cannot pay for Gas."
            }
        

        
        return {"status": "ok", "balance": current_ton}

    def broadcast_transfer(self, boc_b64, ton_api_url="https://toncenter.com/api/v2/jsonRPC"):
        """
        Broadcasts a signed message (BOC) to the TON network.
        """
        payload = {
            "id": 1,
            "jsonrpc": "2.0",
            "method": "sendBoc",
            "params": {"boc": boc_b64}
        }
        try:
            # In a real scenario, this would need an API Key for toncenter or use a public node
            resp = requests.post(ton_api_url, json=payload).json()
            return resp
        except Exception as e:
            return {"error": str(e)}

    def sign_message(self, message: str) -> str:
        """
        Signs a message using the agent's private key (Ed25519).
        Used for Proof-of-Computation and identity verification in the A2A protocol.
        """
        import nacl.signing
        import binascii
        
        # self.priv_k is 32 bytes seed in most TON implementations
        # nacl SigningKey takes 32 bytes seed
        signing_key = nacl.signing.SigningKey(self.priv_k)
        signed = signing_key.sign(message.encode('utf-8'))
        
        # Return signature as hex
        return binascii.hexlify(signed.signature).decode('utf-8')
