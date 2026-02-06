#!/usr/bin/env python3
"""
SearXNG MCP Server - Python Version
Simple MCP server for SearXNG web search

Configure SEARXNG_URL environment variable before running:
    export SEARXNG_URL="http://your-searxng-instance:port"
"""

import os
import sys
import json
import urllib.request
import urllib.parse
from typing import Any

# Get SearXNG URL from environment variable
SEARXNG_URL = os.environ.get('SEARXNG_URL')

if not SEARXNG_URL:
    print("Error: SEARXNG_URL environment variable not set", file=sys.stderr)
    print("Example: export SEARXNG_URL='http://localhost:8080'", file=sys.stderr)
    sys.exit(1)

def send_response(response: dict):
    """Send JSON-RPC response"""
    print(json.dumps(response), flush=True)

def handle_initialize(params: dict) -> dict:
    """Handle initialize request"""
    return {
        "jsonrpc": "2.0",
        "id": params.get('id'),
        "result": {
            "protocolVersion": "2024-11-05",
            "capabilities": {
                "tools": {}
            },
            "serverInfo": {
                "name": "searxng-search",
                "version": "1.0.0"
            }
        }
    }

def handle_tools_list(params: dict) -> dict:
    """Handle tools/list request"""
    return {
        "jsonrpc": "2.0",
        "id": params.get('id'),
        "result": {
            "tools": [
                {
                    "name": "web_search",
                    "description": "Search the web using SearXNG. Returns search results with title, URL, and content summary.",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "query": {
                                "type": "string",
                                "description": "The search query"
                            },
                            "limit": {
                                "type": "integer",
                                "description": "Maximum number of results (default: 10)",
                                "default": 10
                            }
                        },
                        "required": ["query"]
                    }
                }
            ]
        }
    }

def search_web(query: str, limit: int = 10) -> list:
    """Perform web search using SearXNG"""
    encoded_query = urllib.parse.quote(query)
    url = f"{SEARXNG_URL}/search?q={encoded_query}&format=json"
    
    try:
        with urllib.request.urlopen(url, timeout=30) as response:
            data = json.loads(response.read().decode('utf-8'))
            results = data.get('results', [])[:limit]
            return results
    except Exception as e:
        return [{"error": str(e)}]

def handle_tool_call(params: dict) -> dict:
    """Handle tools/call request"""
    tool_name = params['params']['name']
    args = params['params']['arguments']
    
    if tool_name == 'web_search':
        query = args.get('query', '')
        limit = args.get('limit', 10)
        
        results = search_web(query, limit)
        
        if results and 'error' in results[0]:
            return {
                "jsonrpc": "2.0",
                "id": params.get('id'),
                "error": {
                    "code": -32603,
                    "message": f"Search failed: {results[0]['error']}"
                }
            }
        
        formatted_results = []
        for i, r in enumerate(results, 1):
            formatted_results.append(
                f"{i}. {r.get('title', 'N/A')}\n"
                f"   URL: {r.get('url', 'N/A')}\n"
                f"   {r.get('content', 'N/A')[:200]}...\n"
                f"   (via {r.get('engine', 'N/A')})"
            )
        
        return {
            "jsonrpc": "2.0",
            "id": params.get('id'),
            "result": {
                "content": [
                    {
                        "type": "text",
                        "text": f"Search results for '{query}':\n\n" + "\n\n".join(formatted_results)
                    }
                ]
            }
        }
    
    return {
        "jsonrpc": "2.0",
        "id": params.get('id'),
        "error": {
            "code": -32601,
            "message": f"Unknown tool: {tool_name}"
        }
    }

def main():
    """Main server loop"""
    print(f"SearXNG MCP Server started (URL: {SEARXNG_URL})", file=sys.stderr)
    
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        
        try:
            request = json.loads(line)
            method = request.get('method', '')
            
            if method == 'initialize':
                send_response(handle_initialize(request))
            elif method == 'tools/list':
                send_response(handle_tools_list(request))
            elif method == 'tools/call':
                send_response(handle_tool_call(request))
            else:
                send_response({
                    "jsonrpc": "2.0",
                    "id": request.get('id'),
                    "error": {
                        "code": -32601,
                        "message": f"Method not found: {method}"
                    }
                })
        except json.JSONDecodeError as e:
            print(f"JSON parse error: {e}", file=sys.stderr)
        except Exception as e:
            print(f"Error: {e}", file=sys.stderr)

if __name__ == '__main__':
    main()
