#!/bin/bash
# List all AgentCore resources in region
# Usage: ./list-all.sh [region] [profile]

REGION="${1:-us-east-1}"
PROFILE="${2:-}"

if [ -n "$PROFILE" ]; then
  export AWS_PROFILE="$PROFILE"
fi
export AWS_REGION="$REGION"

echo "=== AgentCore Resources in $REGION ==="

echo -e "\n## Runtimes (Agents)"
aws bedrock-agentcore-control list-agent-runtimes --output json 2>/dev/null | \
  jq -r '.agentRuntimes[]? | [.agentRuntimeId, .status, .agentRuntimeName] | @tsv' | \
  column -t || echo "  (none)"

echo -e "\n## Memories"
aws bedrock-agentcore-control list-memories --output json 2>/dev/null | \
  jq -r '.memories[]? | [.id, .status] | @tsv' | \
  column -t || echo "  (none)"

echo -e "\n## Gateways"
aws bedrock-agentcore-control list-gateways --output json 2>/dev/null | \
  jq -r '.gateways[]? | [.gatewayId, .status, .name] | @tsv' | \
  column -t || echo "  (none)"

echo -e "\n## Workload Identities"
aws bedrock-agentcore-control list-workload-identities --output json 2>/dev/null | \
  jq -r '.workloadIdentities[]? | [.workloadIdentityId, .name] | @tsv' | \
  column -t || echo "  (none)"

echo -e "\n## Policies"
aws bedrock-agentcore-control list-policies --output json 2>/dev/null | \
  jq -r '.policies[]? | [.policyId, .status] | @tsv' | \
  column -t || echo "  (none)"

echo -e "\n## Code Interpreters"
aws bedrock-agentcore-control list-code-interpreters --output json 2>/dev/null | \
  jq -r '.codeInterpreters[]? | [.codeInterpreterId, .status] | @tsv' | \
  column -t || echo "  (none)"

echo -e "\n## Browsers"
aws bedrock-agentcore-control list-browsers --output json 2>/dev/null | \
  jq -r '.browsers[]? | [.browserId, .status] | @tsv' | \
  column -t || echo "  (none)"
