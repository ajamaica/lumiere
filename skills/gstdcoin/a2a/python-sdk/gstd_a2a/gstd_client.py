import requests
import json
import time
import uuid
import os
from .protocols import validate_task_payload
from .security import SovereignSecurity

class GSTDClient:
    def __init__(self, api_url="https://app.gstdtoken.com", wallet_address=None, private_key=None, api_key=None, preferred_language="ru"):
        self.api_url = api_url.rstrip('/')
        self.wallet_address = wallet_address
        self.private_key = private_key
        self.api_key = api_key or os.getenv("GSTD_API_KEY")
        self.node_id = None
        self.preferred_language = preferred_language
        
    def _get_headers(self):
        headers = {
            "Content-Type": "application/json",
            "X-GSTD-Agent-Language": self.preferred_language,
            "X-GSTD-Protocol-Version": "1.1"
        }
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
            headers["X-GSTD-API-KEY"] = self.api_key # Legacy support
            if self.wallet_address:
                headers["X-GSTD-Target-Wallet"] = self.wallet_address
                headers["X-Wallet-Address"] = self.wallet_address
        return headers

    def health_check(self):
        """Checks connectivity to the GSTD Grid."""
        try:
            resp = requests.get(f"{self.api_url}/api/v1/health", headers=self._get_headers())
            return resp.json()
        except Exception as e:
            return {"status": "unreachable", "error": str(e)}

    def register_node(self, device_name="Autonomous-Agent-Node", capabilities=None, referrer_id=None):
        """Registers the agent as a compute node. Supports referrals for agent recruitment."""
        if not self.wallet_address:
            raise ValueError("Wallet address required for registration")
            
        payload = {
            "name": device_name,
            "type": "agent",
            "capabilities": capabilities or ["text-generation", "data-processing"],
            "wallet_address": self.wallet_address,
            "referrer_id": referrer_id
        }
        
        resp = requests.post(f"{self.api_url}/api/v1/nodes/register", json=payload, headers=self._get_headers())
        if resp.status_code in [200, 201]:
            data = resp.json()
            self.node_id = data.get("node_id") or data.get("id")
            return data
        raise Exception(f"Registration failed: {resp.text}")

    def get_pending_tasks(self):
        """Fetches tasks available for execution."""
        if not self.node_id:
             self.node_id = self.wallet_address
             
        resp = requests.get(f"{self.api_url}/api/v1/worker/pending?node_id={self.node_id}", headers=self._get_headers())
        if resp.status_code == 200:
            return resp.json().get("tasks", [])
        return []


    def submit_result(self, task_id, result_data, wallet=None):
        """
        Submits the result of a task with cryptographic proof.
        If a GSTDWallet instance is provided, it signs the result to prove identity.
        """
        import json
        
        # Serialize result for signing consistency
        result_json = json.dumps(result_data, sort_keys=True)
        
        proof = ""
        if wallet and hasattr(wallet, 'sign_message'):
            # The protocol expects signature of (taskID + resultData)
            message_to_sign = f"{task_id}{result_json}"
            proof = wallet.sign_message(message_to_sign)
            print(f"🔒 Generated Sovereign Proof: {proof[:10]}...")

        payload = {
            "task_id": task_id,
            "device_id": self.node_id or self.wallet_address,
            "result": result_data,
            "proof": proof,
            "execution_time_ms": int(getattr(self, '_start_time', 0)) # Placeholder
        }
        resp = requests.post(f"{self.api_url}/api/v1/worker/submit", json=payload, headers=self._get_headers())
        return resp.json()

    def send_heartbeat(self, status="idle"):
        """Sends a heartbeat to the grid to indicate liveness."""
        if not self.node_id:
             self.node_id = self.wallet_address
             
        payload = {
            "node_id": self.node_id,
            "status": status,
            "timestamp": time.time()
        }
        try:
            requests.post(f"{self.api_url}/api/v1/nodes/heartbeat", json=payload, timeout=2, headers=self._get_headers())
            return True
        except:
            return False


    # --- Consumer / Requester Methods ---

    def create_task(self, task_type, data_payload, bid_gstd=1.0):
        """
        Posts a new task to the GSTD grid.
        Enforces Protocol Standards so agents understand each other.
        """
        if not self.wallet_address:
            raise ValueError("Wallet address required to pay for tasks")

        if not validate_task_payload(task_type, data_payload):
            raise ValueError(f"Payload does not match protocol for {task_type}. See protocols.py")

        if isinstance(data_payload, dict):
            # SECURITY: Scan for prompt injections
            data_payload, is_safe = SovereignSecurity.sanitize_payload(data_payload)
            if not is_safe:
                print("⚠️  Security Alert: Potential injection detected and neutralized in task payload.")

            # Inject protocol metadata for inter-agent understanding
            data_payload["_meta"] = {
                "source_language": self.preferred_language,
                "protocol": "A2A-Standard-v1",
                "intent": task_type
            }

        payload = {
            "type": task_type,
            "budget": bid_gstd,
            "payload": data_payload,
            "input_source": "agent"
        }
        
        resp = requests.post(f"{self.api_url}/api/v1/tasks/create", json=payload, headers=self._get_headers())
        if resp.status_code in [200, 201]:
            return resp.json() 
        raise Exception(f"Task creation failed: {resp.text}")

    def check_task_status(self, task_id):
        """Checks if a requested task is complete and gets the result."""
        resp = requests.get(f"{self.api_url}/api/v1/tasks/{task_id}", headers=self._get_headers())
        if resp.status_code == 200:
            return resp.json()
        return {"status": "unknown"}


    def get_balance(self, wallet_address=None):
        """Gets the GSTD and TON balance for a wallet."""
        target = wallet_address or self.wallet_address
        if not target:
            raise ValueError("Wallet address required to check balance")
        resp = requests.get(f"{self.api_url}/api/v1/wallet/balance?wallet={target}", headers=self._get_headers())
        return resp.json()

    def get_payout_intent(self, task_id):
        """Creates a payout intent for a completed task to claim rewards."""
        if not self.wallet_address:
            raise ValueError("Wallet address required to claim rewards")
        payload = {
            "task_id": task_id,
            "executor_address": self.wallet_address
        }
        resp = requests.post(f"{self.api_url}/api/v1/payments/payout-intent", json=payload, headers=self._get_headers())
        return resp.json()

    def get_market_quote(self, amount_ton):
        """Gets a quote to swap TON for GSTD."""
        resp = requests.get(f"{self.api_url}/api/v1/market/quote?amount_ton={amount_ton}", headers=self._get_headers())
        return resp.json()
        
    def prepare_swap(self, amount_ton):
        """Prepares a transaction to buy GSTD."""
        payload = {
            "wallet_address": self.wallet_address,
            "amount_ton": amount_ton
        }
        resp = requests.post(f"{self.api_url}/api/v1/market/swap", json=payload, headers=self._get_headers())
        return resp.json()

    # --- Settlement Layer (A2A Invoicing) ---

    def request_invoice(self, payer_address, amount_gstd, description, task_id=None):
        """Issues an invoice to another agent."""
        payload = {
            "issuer_address": self.wallet_address,
            "payer_address": payer_address,
            "amount_gstd": amount_gstd,
            "description": description,
            "task_id": task_id
        }
        resp = requests.post(f"{self.api_url}/api/v1/invoices", json=payload, headers=self._get_headers())
        if resp.status_code == 201:
            return resp.json()
        raise Exception(f"Invoice creation failed: {resp.text}")

    def pay_invoice(self, invoice_id, wallet):
        """Pays an invoice using the agent's wallet."""
        inv = requests.get(f"{self.api_url}/api/v1/invoices/{invoice_id}", headers=self._get_headers()).json()
        if "error" in inv:
            raise Exception(f"Invoice not found: {invoice_id}")

        # Real payment on TON/GSTD would happen here
        # For simplicity, we sign a transfer and get a TX hash
        transfer_boc = wallet.create_transfer_body(inv['issuer_address'], 0.01, f"PAY_INV:{invoice_id}")
        # In a real scenario, broadcast_transfer returns tx_hash
        # Here we simulate the broadcast
        tx_hash = f"abc{uuid.uuid4().hex[:10]}" 
        
        payload = {"tx_hash": tx_hash}
        resp = requests.post(f"{self.api_url}/api/v1/invoices/{invoice_id}/pay", json=payload, headers=self._get_headers())
        return resp.json()

    # --- Discovery (Registry) ---

    def discover_agents(self, capability=None):
        """Finds other agents on the network."""
        resp = requests.get(f"{self.api_url}/api/v1/nodes/public", headers=self._get_headers())
        if resp.status_code == 200:
            nodes = resp.json().get("nodes", [])
            if capability:
                # Local filtering (backend should ideally support this)
                return [n for n in nodes if capability in str(n.get('capabilities', []))]
            return nodes
        return []

    # --- Knowledge / Hive Memory ---

    def store_knowledge(self, topic: str, content: str, tags: list = None):
        """Stores information in the collective grid memory."""
        if not self.wallet_address:
             self.node_id = "anonymous"
        else:
             self.node_id = self.wallet_address

        payload = {
            "agent_id": self.node_id,
            "topic": topic,
            "content": content,
            "tags": tags or []
        }
        resp = requests.post(f"{self.api_url}/api/v1/knowledge/store", json=payload, headers=self._get_headers())
        return resp.json()

    def query_knowledge(self, topic: str):
        """Retrieves information from the grid memory."""
        resp = requests.get(f"{self.api_url}/api/v1/knowledge/query?topic={topic}", headers=self._get_headers())
        if resp.status_code == 200:
            return resp.json().get("results", [])
        return []
