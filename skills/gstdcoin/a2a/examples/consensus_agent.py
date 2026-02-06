import os
import sys
import time
import json
import logging
from typing import List, Dict, Any

# Add parent directory to path to import sdk
# Assuming we are in A2A/examples 
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'python-sdk')))
from gstd_a2a import GSTDClient

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class ConsensusClient(GSTDClient):
    """
    Extends GSTDClient with Consensus Protocol logic.
    A simple demonstration of how one agent can verify the truth by hiring multiple peers.
    """
    
    def create_consensus_task(self, prompt: str, task_type: str = "text-generation", num_workers: int = 3, bid_gstd: float = 0.5) -> Dict[str, Any]:
        """
        Launches parallel tasks to distinct workers and returns their combined results.
        """
        logger.info(f"🧠 Launching Consensus Task for: '{prompt[:50]}...'")
        logger.info(f"   - Hiring {num_workers} independent agents")
        logger.info(f"   - Total Budget: {bid_gstd * num_workers} GSTD")
        
        # In a real implementation, we would use a 'group_id' or tag to link these
        # For prototype, we just fire N tasks and track their IDs
        task_ids = []
        
        for i in range(num_workers):
            # Create sub-task
            payload = {
                "prompt": prompt,
                "consensus_group": f"consensus-{int(time.time())}",
                "worker_index": i
            }
            try:
                # We use the base create_task
                # Note: In a real P2P net, we'd specify 'exclude_nodes' to ensure diversity
                resp = self.create_task(task_type, payload, bid_gstd)
                tid = resp.get("task_id")
                if tid:
                    task_ids.append(tid)
                    logger.info(f"   -> Sub-task {i+1} dispatched: {tid}")
            except Exception as e:
                logger.error(f"   !! Failed to dispatch sub-task {i+1}: {e}")
                
        return {"consensus_id": f"cons-{int(time.time())}", "task_ids": task_ids}

    def wait_for_consensus(self, task_ids: List[str], timeout: int = 300) -> Dict[str, Any]:
        """
        Waits for all sub-tasks to complete and aggregates results.
        """
        logger.info(f"⏳ Waiting for {len(task_ids)} agents to report back...")
        results = {}
        start_time = time.time()
        
        while len(results) < len(task_ids):
            if time.time() - start_time > timeout:
                logger.warning("⚠️ Consensus timeout reached. Proceeding with partial results.")
                break
                
            for tid in task_ids:
                if tid in results:
                    continue
                    
                status = self.check_task_status(tid)
                if status.get("status") == "completed":
                    res_data = status.get("result", {})
                    # Assume simple text output in 'output' field
                    output = res_data.get("output", "")
                    results[tid] = output
                    logger.info(f"   ✅ Agent {tid[:8]} reported: {len(output)} chars")
            
            time.sleep(5)
            
        return self._adjudicate(list(results.values()))

    def _adjudicate(self, outputs: List[str]) -> Dict[str, Any]:
        """
        The 'Judge' Logic. 
        In V1: Simple majority voting or similarity check.
        In V2: Use a local LLM to synthesizing the best answer.
        """
        logger.info("⚖️ ADJUDICATING RESULTS...")
        
        if not outputs:
            return {"status": "failed", "reason": "No results received"}
            
        # Simplified Consensus: Just return all for manual review or first one
        # Real logic would use embedding similarity
        
        # Check agreement (naive string matching for demo)
        unique_answers = set(outputs)
        agreement_score = 1.0 - (len(unique_answers) - 1) / len(outputs) if outputs else 0
        
        return {
            "status": "success",
            "consensus_score": agreement_score,
            "agent_count": len(outputs),
            "synthesized_answer": outputs[0] if outputs else "", # Naive 'first is best'
            "all_perspectives": outputs
        }

if __name__ == "__main__":
    # Example Usage
    API_URL = os.getenv("GSTD_API_URL", "https://app.gstdtoken.com")
    WALLET = os.getenv("GSTD_WALLET_ADDRESS", "UQ_DEMO_CONSENSUS_ARCHITECT")
    API_KEY = os.getenv("GSTD_API_KEY", "gstd_system_key_2026") # The Sovereign Key
    
    architect = ConsensusClient(api_url=API_URL, wallet_address=WALLET, api_key=API_KEY)
    
    # Define a tricky question that benefits from multiple perspectives
    prompt = "Explain the potential economic impact of autonomous AI agents on the gig economy in 2030. Provide 3 scenarios."
    
    # 1. Dispatch
    consensus_job = architect.create_consensus_task(prompt, num_workers=3)
    
    # 2. Wait & Judge
    final_verdict = architect.wait_for_consensus(consensus_job["task_ids"])
    
    print("\n" + "="*40)
    print("🏁 FINAL CONSENSUS REPORT")
    print("="*40)
    print(f"Agreement Score: {final_verdict.get('consensus_score', 0):.2f}")
    print(f"Synthesized Answer:\n{final_verdict.get('synthesized_answer')[:200]}...")
    print("="*40)
