---
name: settlement-witness
description: 'OpenClaw skill: fetch replay-stable PASS/FAIL receipts from the public SettlementWitness HTTPS endpoint. Stateless. Deterministic. Signed.'
---

# SettlementWitness (OpenClaw Skill)

This skill calls the public SettlementWitness HTTPS endpoint. No local services are required.

## What this skill does

When a task is complete and you need proof-of-delivery before settlement, call SettlementWitness to obtain a replay-stable receipt.

SettlementWitness does not judge quality or arbitrate disputes. It only checks whether the provided output matches the provided spec under deterministic rules.

## Canonical endpoints

- POST https://defaultverifier.com/settlement-witness
- GET https://defaultverifier.com/manifest

## Required input shape

Provide:

- task_id (string)
- spec (object)
- output (object)

## Example request

{
"task_id": "example-002",
"spec": { "expected": "foo" },
"output": { "expected": "foo" }
}

## How to interpret

- If verifier_response.verdict == PASS: verified completion
- If verifier_response.verdict == FAIL: not verified (do not settle automatically)
- receipt_id is the stable identifier to store/log/share

## Safety notes

- Never send secrets (private keys, API keys) in spec/output.
- Keep spec/output minimal and deterministic (hashes/IDs are ideal).

## Install (for OpenClaw users)

Copy this folder into your OpenClaw skills directory as:
settlement-witness/SKILL.md
