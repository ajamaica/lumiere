# AgentCore Gateway Integration

Gateway transforms APIs, Lambda, and MCP servers into unified MCP-compatible tools.

## Quick Start

```bash
agentcore gateway create-mcp-gateway --name MyGateway --region us-east-1
agentcore gateway create-mcp-gateway-target --gateway-arn ARN --gateway-url URL \
  --role-arn ROLE --name OrderLookup --target-type lambda
```

## Target Types

| Type        | CLI `--target-type` | Use Case                |
| ----------- | ------------------- | ----------------------- |
| Lambda      | `lambda`            | Custom code, DB queries |
| OpenAPI     | `openApiSchema`     | REST APIs with spec     |
| MCP Server  | `mcpServer`         | Existing MCP servers    |
| Smithy      | `smithyModel`       | AWS Smithy models       |
| API Gateway | SDK only            | API Gateway stages      |

## CLI Commands

| Command                                                        | Purpose        |
| -------------------------------------------------------------- | -------------- |
| `agentcore gateway create-mcp-gateway --name NAME`             | Create gateway |
| `agentcore gateway list-mcp-gateways`                          | List gateways  |
| `agentcore gateway create-mcp-gateway-target ...`              | Add target     |
| `agentcore gateway list-mcp-gateway-targets --gateway-arn ARN` | List targets   |

## Lambda Handler Requirements

**Event format**: Flat dict of input schema properties (`{"order_id": "ORD-123"}`).

**Tool name prefix**: Names include target prefix `{target_name}___{tool_name}`. Strip it:

```python
def lambda_handler(event, context):
    full_name = context.client_context.custom.get('bedrockAgentCoreToolName', '')
    tool_name = full_name.split("___")[-1]  # Strip prefix
    if tool_name == "lookup_order":
        return {"status": "found", "order_id": event["order_id"]}
```

## Credential Providers

| Type               | Use Case             |
| ------------------ | -------------------- |
| `GATEWAY_IAM_ROLE` | Lambda, internal AWS |
| `API_KEY`          | Third-party APIs     |
| `OAUTH`            | OAuth2 APIs          |

## LangGraph Integration

```python
from langchain_core.tools import StructuredTool
import boto3

data_client = boto3.client('bedrock-agentcore', region_name='us-east-1')

def call_gateway(tool_name: str, args: dict) -> dict:
    return data_client.invoke_mcp_tool(
        gatewayIdentifier="MyGateway", toolName=tool_name, arguments=args
    ).get("result", {})

tools = [StructuredTool.from_function(
    func=lambda order_id: call_gateway("lookup_order", {"order_id": order_id}),
    name="lookup_order", description="Look up order by ID"
)]
```

## Pre-built Integrations

Console one-click: Salesforce, Slack, Jira, Asana, Zendesk

## Troubleshooting

| Issue                    | Solution                              |
| ------------------------ | ------------------------------------- |
| "Unknown tool" in Lambda | Strip `___` prefix from tool name     |
| Lambda timeout           | Increase timeout                      |
| Auth errors              | Check Cognito token, `allowedClients` |
| Tools not discoverable   | Verify target status ACTIVE           |

## Documentation

| Resource           | URL                                                                                                                        |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| Gateway Overview   | https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway.html                                                 |
| Lambda Targets     | https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway-add-target-lambda.html                               |
| MCP Server Targets | https://aws.amazon.com/blogs/machine-learning/transform-your-mcp-architecture-unite-mcp-servers-through-agentcore-gateway/ |
