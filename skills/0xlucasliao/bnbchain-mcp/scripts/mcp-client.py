import sys
import json
import subprocess
import asyncio
import os

# This is a wrapper to call the MCP server tools via stdio.
# Since we don't have a native MCP client library installed in the environment generally, 
# we assume the 'bnbchain-mcp' executable is available or we are calling it effectively.
# 
# However, for a skill, we often need to Bridge the gap. 
# If the user has `bnbchain-mcp` installed via `uv tool install`, we can call it.
# 
# For now, this script mimics a client by directly invoking the server process in stdio mode 
# for a single request, then exiting. This is inefficient but functional for a CLI wrapper.

async def run_mcp_tool(tool_name, arguments):
    # Command to start the MCP server
    # We assume 'uv run bnbchain-mcp' works in the environment as per the repo docs
    server_command = ["uv", "run", "bnbchain-mcp"]
    
    # Create the JSON-RPC request
    request = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {
            "name": tool_name,
            "arguments": arguments
        }
    }

    try:
        process = await asyncio.create_subprocess_exec(
            *server_command,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        # Initialize connection (simplified, usually requires initialize handshake)
        # Real MCP requires Client <-> Server handshake (initialize -> initialized) before calls.
        
        # Handshake: initialize
        init_req = {
            "jsonrpc": "2.0",
            "id": 0,
            "method": "initialize",
            "params": {
                "protocolVersion": "2024-11-05", # Approximate version
                "capabilities": {},
                "clientInfo": {"name": "openclaw-skill", "version": "1.0"}
            }
        }
        
        input_data = json.dumps(init_req) + "\n"
        process.stdin.write(input_data.encode())
        await process.stdin.drain()
        
        # Read init response (basic loop to find response)
        while True:
            line = await process.stdout.readline()
            if not line: break
            msg = json.loads(line.decode())
            if msg.get("id") == 0:
                # Send initialized notification
                process.stdin.write(json.dumps({"jsonrpc":"2.0","method":"notifications/initialized"}).encode() + b"\n")
                await process.stdin.drain()
                break
        
        # Send actual tool call
        process.stdin.write(json.dumps(request).encode() + b"\n")
        await process.stdin.drain()
        
        # Read tool response
        while True:
            line = await process.stdout.readline()
            if not line: break
            msg = json.loads(line.decode())
            if msg.get("id") == 1:
                print(json.dumps(msg.get("result"), indent=2))
                break
                
        process.terminate()
        
    except FileNotFoundError:
        print("Error: 'uv' or 'bnbchain-mcp' not found. Please ensure the MCP server is installed.")
    except Exception as e:
        print(f"Error running MCP tool: {e}")

def main():
    if len(sys.argv) < 2:
        print("Usage: mcp-client.py <tool_name> [--args '{\"key\": \"value\"}']")
        sys.exit(1)

    tool_name = sys.argv[1]
    args = {}
    
    if len(sys.argv) > 3 and sys.argv[2] == "--args":
        try:
            args = json.loads(sys.argv[3])
        except json.JSONDecodeError:
            print("Error: Invalid JSON for arguments")
            sys.exit(1)
            
    if tool_name == "list_tools":
        # Special case to just list tools (requires different method)
        # We'll skip implementation for brevity in this first pass or implement if needed
        pass
    else:
        asyncio.run(run_mcp_tool(tool_name, args))

if __name__ == "__main__":
    main()
