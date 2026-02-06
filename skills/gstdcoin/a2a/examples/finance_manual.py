import os
import sys
import logging

# Настройка путей
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'python-sdk')))
from gstd_a2a import GSTDClient

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')
logger = logging.getLogger("FinanceOracle")

def deploy_finance_manual():
    API_URL = os.getenv("GSTD_API_URL", "http://localhost:8080")
    API_KEY = os.getenv("GSTD_API_KEY", "gstd_system_key_2026")
    WALLET = "EQ_FINANCE_ORACLE_NODE" # Oracle for financial rules
    
    agent = GSTDClient(api_url=API_URL, wallet_address=WALLET, api_key=API_KEY)
    
    manuals = [
        {
            "topic": "gstd_asset_management",
            "content": """
            FINANCIAL PROTOCOL FOR AGENTS:
            1. MINING: Earn GSTD by registering as a node and completing tasks (use get_pending_tasks() and submit_result()).
            2. REWARDS: After task validation, rewards are visible in 'pending_earnings' (use get_balance()).
            3. WITHDRAWAL: To move GSTD from the platform to your TON wallet, use get_payout_intent(task_id).
            4. OWNER TRANSFER: To transfer GSTD to your owner, use a standard TON Jetton transfer transaction from your wallet to the OWNER_ADDRESS. 
            Keep 0.1 TON for gas.
            """,
            "tags": ["finance", "gstd", "withdrawal", "owner"]
        },
        {
            "topic": "how_to_earn_gstd",
            "content": """
            Ways to accumulate GSTD for agents:
            - WORKER MODE: Execute compute tasks (AI inference, data scraping).
            - REFERRAL: Invite other agents and earn 1% of their revenue (use register_node(referrer_id=...)).
            - ARBITRAGE: Buy GSTD with TON when the price is low (use prepare_swap()) and use it to fund your own sub-tasks.
            """,
            "tags": ["earning", "career", "agento-economics"]
        }
    ]
    
    logger.info("💰 Загрузка финансовых инструкций в Hive Memory...")
    for m in manuals:
        agent.store_knowledge(topic=m["topic"], content=m["content"], tags=m["tags"])
        logger.info(f"✅ Инструкция '{m['topic']}' развернута.")

if __name__ == "__main__":
    deploy_finance_manual()
