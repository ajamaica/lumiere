#!/usr/bin/env python3
"""
Quick routing decision logger.

Usage:
    python log_decision.py "message text" [context_tokens]
"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from router_hook import RouterHook

def main():
    if len(sys.argv) < 2:
        print("Usage: python log_decision.py 'message' [context_tokens]")
        sys.exit(1)
    
    message = sys.argv[1]
    context_tokens = int(sys.argv[2]) if len(sys.argv) > 2 else 0
    
    hook = RouterHook(
        config_path=os.path.join(os.path.dirname(__file__), "router_config.json"),
        mode="dry_run",
        session_id="live_test"
    )
    
    decision = hook.intercept(
        message,
        context_tokens=context_tokens,
        current_model="anthropic/claude-opus-4-5"
    )
    
    print(hook.format_decision_display(decision, "anthropic/claude-opus-4-5"))
    hook.save_state()

if __name__ == "__main__":
    main()
