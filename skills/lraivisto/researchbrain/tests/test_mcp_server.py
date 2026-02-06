import os
import sys

import anyio
from mcp.client.session import ClientSession
from mcp.client.stdio import StdioServerParameters, stdio_client


def test_mcp_server_exposes_tools(tmp_path):
    async def _run():
        db_path = tmp_path / "vault.db"
        env = os.environ.copy()
        env["RESEARCHVAULT_DB"] = str(db_path)

        server = StdioServerParameters(
            command=sys.executable,
            args=["-m", "scripts.mcp_server"],
            env=env,
            cwd=os.getcwd(),
            encoding="utf-8",
            encoding_error_handler="replace",
        )

        async with stdio_client(server) as (read, write):
            async with ClientSession(read, write) as session:
                await session.initialize()

                tools = await session.list_tools()
                tool_names = {t.name for t in tools.tools}
                assert "vault_list_projects" in tool_names
                assert "vault_add_finding" in tool_names
                assert "vault_synthesize" in tool_names

                await session.call_tool(
                    "vault_create_project",
                    {"project_id": "mcp-demo", "name": "Demo", "objective": "MCP smoke", "priority": 1},
                )
                await session.call_tool(
                    "vault_add_finding",
                    {
                        "project_id": "mcp-demo",
                        "title": "First",
                        "content": "alpha beta gamma",
                        "tags": "mcp",
                        "confidence": 0.6,
                    },
                )

                res = await session.call_tool("vault_list_findings", {"project_id": "mcp-demo", "limit": 10})
                payload = res.structuredContent or {}
                findings = payload.get("result") if isinstance(payload, dict) else payload
                assert isinstance(findings, list), f"unexpected tool payload: {payload!r}"
                assert any(f.get("title") == "First" for f in findings)

    anyio.run(_run)
