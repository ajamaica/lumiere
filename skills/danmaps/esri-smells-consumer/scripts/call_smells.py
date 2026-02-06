#!/usr/bin/env python3
"""Paid client for Esri Workflow Smell Detector via x402 (Base).

Usage:
  python call_smells.py <project_snapshot.json> [--endpoint https://api.x402layer.cc/e/esri-smells]

Env:
  PRIVATE_KEY   EVM private key (Base)
  WALLET_ADDRESS EVM address

Notes:
- This script will pay-per-request (x402 HTTP 402 flow) using Base/USDC.
- Designed to be deterministic given same snapshot + same endpoint behavior.
"""

import argparse
import base64
import json
import os
import secrets
import sys
import time

import requests
from eth_account import Account

USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
USDC_NAME = "USD Coin"
USDC_VERSION = "2"
BASE_CHAIN_ID = 8453


def load_creds():
    pk = os.getenv("PRIVATE_KEY")
    wa = os.getenv("WALLET_ADDRESS")
    if not pk or not wa:
        raise SystemExit("Set PRIVATE_KEY and WALLET_ADDRESS")
    return pk, wa


def pick_base_option(challenge: dict) -> dict:
    for opt in challenge.get("accepts", []):
        if opt.get("network") == "base":
            return opt
    raise ValueError("No Base payment option in 402 challenge")


def make_x_payment(challenge: dict, wallet: str, private_key: str) -> str:
    opt = pick_base_option(challenge)
    pay_to = opt["payTo"]
    amount = int(opt["maxAmountRequired"])  # USDC has 6 decimals

    nonce = "0x" + secrets.token_hex(32)
    valid_after = 0
    valid_before = int(time.time()) + 3600

    typed_data = {
        "types": {
            "EIP712Domain": [
                {"name": "name", "type": "string"},
                {"name": "version", "type": "string"},
                {"name": "chainId", "type": "uint256"},
                {"name": "verifyingContract", "type": "address"},
            ],
            "TransferWithAuthorization": [
                {"name": "from", "type": "address"},
                {"name": "to", "type": "address"},
                {"name": "value", "type": "uint256"},
                {"name": "validAfter", "type": "uint256"},
                {"name": "validBefore", "type": "uint256"},
                {"name": "nonce", "type": "bytes32"},
            ],
        },
        "primaryType": "TransferWithAuthorization",
        "domain": {
            "name": USDC_NAME,
            "version": USDC_VERSION,
            "chainId": BASE_CHAIN_ID,
            "verifyingContract": USDC_ADDRESS,
        },
        "message": {
            "from": wallet,
            "to": pay_to,
            "value": amount,
            "validAfter": valid_after,
            "validBefore": valid_before,
            "nonce": nonce,
        },
    }

    account = Account.from_key(private_key)
    signed = account.sign_typed_data(
        typed_data["domain"],
        {"TransferWithAuthorization": typed_data["types"]["TransferWithAuthorization"]},
        typed_data["message"],
    )

    payload = {
        "x402Version": 1,
        "scheme": "exact",
        "network": "base",
        "payload": {
            "signature": signed.signature.hex(),
            "authorization": {
                "from": wallet,
                "to": pay_to,
                "value": str(amount),
                "validAfter": str(valid_after),
                "validBefore": str(valid_before),
                "nonce": nonce,
            },
        },
    }

    return base64.b64encode(json.dumps(payload).encode()).decode()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("snapshot", help="Path to project_snapshot.json")
    ap.add_argument("--endpoint", default="https://api.x402layer.cc/e/esri-smells")
    args = ap.parse_args()

    private_key, wallet = load_creds()

    snapshot = json.loads(open(args.snapshot, "r", encoding="utf-8").read())
    body = {
        "project_snapshot": snapshot,
        "constraints": {"target": "arcpy", "deployment": "desktop", "max_runtime_sec": 300},
    }

    # Step 1: get 402 challenge
    r1 = requests.post(args.endpoint, json=body, headers={"Accept": "application/json"}, timeout=30)
    if r1.status_code == 200:
        print(json.dumps(r1.json(), indent=2))
        return 0
    if r1.status_code != 402:
        print(f"Unexpected status: {r1.status_code}\n{r1.text[:800]}")
        return 1

    challenge = r1.json()

    # Step 2: pay and retry
    x_payment = make_x_payment(challenge, wallet, private_key)
    r2 = requests.post(args.endpoint, json=body, headers={"X-Payment": x_payment, "Accept": "application/json"}, timeout=30)
    print(f"Response: {r2.status_code}")
    ct = (r2.headers.get("content-type") or "").lower()
    if "application/json" in ct:
        try:
            print(json.dumps(r2.json(), indent=2)[:2000])
        except Exception:
            print(r2.text[:2000])
    else:
        print(r2.text[:2000])

    return 0 if r2.status_code == 200 else 1


if __name__ == "__main__":
    raise SystemExit(main())
