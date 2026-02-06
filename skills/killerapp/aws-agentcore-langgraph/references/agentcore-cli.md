# AgentCore CLI Reference

## Primitives Overview

| Primitive        | Purpose              | agentcore CLI          | AWS CLI                    |
| ---------------- | -------------------- | ---------------------- | -------------------------- |
| Runtime          | Deploy/manage agents | `status/deploy/invoke` | `list-agent-runtimes`      |
| Memory           | STM/LTM persistence  | `memory`               | `list-memories`            |
| Gateway          | API to MCP tools     | `gateway`              | `list-gateways`            |
| Identity         | OAuth/credentials    | `identity`             | `list-workload-identities` |
| Code Interpreter | Sandboxed code       | -                      | `list-code-interpreters`   |
| Browser          | Web browsing         | -                      | `list-browsers`            |
| Observability    | Traces/logs          | `obs`                  | CloudWatch                 |

## agentcore CLI Commands

| Command                              | Purpose                                                                   |
| ------------------------------------ | ------------------------------------------------------------------------- |
| `agentcore configure`                | Interactive setup (creates `.bedrock_agentcore.yaml` - add to .gitignore) |
| `agentcore status`                   | Current agent status                                                      |
| `agentcore deploy`                   | Deploy via CodeBuild (recommended)                                        |
| `agentcore deploy --local`           | Local dev server                                                          |
| `agentcore invoke '{"prompt":"Hi"}'` | Test invocation                                                           |
| `agentcore destroy`                  | Cleanup all resources                                                     |
| `agentcore dev`                      | Hot-reload dev server                                                     |

### Memory Commands

- `agentcore memory list` / `create NAME` / `get --memory-id ID` / `delete --memory-id ID`

### Gateway Commands

- `agentcore gateway list` / `create NAME` / `target list`

### Identity Commands

- `agentcore identity list` / `create NAME`

### Observability Commands

- `agentcore obs traces` / `logs` / `spans`

## AWS CLI (bedrock-agentcore-control)

| Operation     | Command                                                                 |
| ------------- | ----------------------------------------------------------------------- |
| List runtimes | `aws bedrock-agentcore-control list-agent-runtimes --region us-east-1`  |
| List memories | `aws bedrock-agentcore-control list-memories --region us-east-1`        |
| List gateways | `aws bedrock-agentcore-control list-gateways --region us-east-1`        |
| Get runtime   | `aws bedrock-agentcore-control get-agent-runtime --agent-runtime-id ID` |
| Get memory    | `aws bedrock-agentcore-control get-memory --memory-id ID`               |

### CloudWatch Logs

```bash
# Runtime logs
aws logs tail /aws/bedrock-agentcore/runtimes/AGENT_ID-DEFAULT \
  --log-stream-name-prefix "$(date +%Y/%m/%d)/[runtime-logs]" --since 1h
```

## Environment Variables

Auto-injected by toolkit during `agentcore launch`:

- `BEDROCK_AGENTCORE_MEMORY_ID` - Memory resource ID
- `BEDROCK_AGENTCORE_MEMORY_NAME` - Memory name
- `AWS_REGION` - Deployment region

Custom: `agentcore launch --env GUARDRAIL_ID="xyz" --env KB_ID="abc"`

## Documentation

| Resource      | URL                                                                                                     |
| ------------- | ------------------------------------------------------------------------------------------------------- |
| CLI Reference | https://aws.github.io/bedrock-agentcore-starter-toolkit/api-reference/cli.html                          |
| AWS CLI       | https://awscli.amazonaws.com/v2/documentation/api/latest/reference/bedrock-agentcore-control/index.html |
