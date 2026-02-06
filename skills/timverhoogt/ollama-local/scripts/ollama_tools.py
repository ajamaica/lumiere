#!/usr/bin/env python3
"""
Ollama tool-use helper for local models.
Implements function calling pattern for models that support it.
Configure host via OLLAMA_HOST env var (default: http://localhost:11434)

Note: Tool use support varies by model:
- qwen2.5-coder, qwen3: Good tool support
- llama3.1: Basic tool support  
- mistral: Good tool support
- Others: May not support tools natively
"""

import argparse
import json
import os
import sys
import urllib.request

OLLAMA_HOST = os.environ.get("OLLAMA_HOST", "http://localhost:11434")

# Example tools for demonstration
EXAMPLE_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": "Get current weather for a location",
            "parameters": {
                "type": "object",
                "properties": {
                    "location": {
                        "type": "string",
                        "description": "City name, e.g., 'Amsterdam'"
                    },
                    "unit": {
                        "type": "string",
                        "enum": ["celsius", "fahrenheit"],
                        "description": "Temperature unit"
                    }
                },
                "required": ["location"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "search_web",
            "description": "Search the web for information",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Search query"
                    }
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "run_code",
            "description": "Execute Python code and return the result",
            "parameters": {
                "type": "object",
                "properties": {
                    "code": {
                        "type": "string",
                        "description": "Python code to execute"
                    }
                },
                "required": ["code"]
            }
        }
    }
]

def chat_with_tools(model, message, tools=None, system=None):
    """
    Send a chat request with tool definitions.
    Returns the model's response, including any tool calls.
    """
    tools = tools or EXAMPLE_TOOLS
    
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": message})
    
    data = {
        "model": model,
        "messages": messages,
        "tools": tools,
        "stream": False
    }
    
    req = urllib.request.Request(
        f"{OLLAMA_HOST}/api/chat",
        data=json.dumps(data).encode(),
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    
    with urllib.request.urlopen(req, timeout=120) as resp:
        result = json.loads(resp.read())
    
    return result

def execute_tool_call(tool_call):
    """
    Execute a tool call (mock implementation).
    In production, replace with actual implementations.
    """
    name = tool_call.get("function", {}).get("name", "")
    args = tool_call.get("function", {}).get("arguments", {})
    
    # Parse arguments if string
    if isinstance(args, str):
        try:
            args = json.loads(args)
        except:
            args = {}
    
    print(f"  🔧 Tool: {name}")
    print(f"  📥 Args: {json.dumps(args, indent=2)}")
    
    # Mock responses
    if name == "get_weather":
        return {"temperature": 12, "condition": "cloudy", "location": args.get("location", "Unknown")}
    elif name == "search_web":
        return {"results": [f"Result for: {args.get('query', '')}"]}
    elif name == "run_code":
        return {"output": "Code execution simulated", "code": args.get("code", "")}
    else:
        return {"error": f"Unknown tool: {name}"}

def tool_loop(model, message, max_iterations=5):
    """
    Run a full tool-use loop:
    1. Send message with tools
    2. If model requests tool call, execute it
    3. Send tool result back
    4. Repeat until model gives final answer
    """
    tools = EXAMPLE_TOOLS
    messages = [{"role": "user", "content": message}]
    
    system = """You are a helpful assistant with access to tools.
When you need to use a tool, respond with a tool call.
After receiving tool results, provide a helpful answer to the user."""
    
    for i in range(max_iterations):
        print(f"\n--- Iteration {i+1} ---")
        
        data = {
            "model": model,
            "messages": [{"role": "system", "content": system}] + messages,
            "tools": tools,
            "stream": False
        }
        
        req = urllib.request.Request(
            f"{OLLAMA_HOST}/api/chat",
            data=json.dumps(data).encode(),
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        
        with urllib.request.urlopen(req, timeout=120) as resp:
            result = json.loads(resp.read())
        
        msg = result.get("message", {})
        content = msg.get("content", "")
        tool_calls = msg.get("tool_calls", [])
        
        if content:
            print(f"🤖 Model: {content}")
        
        if not tool_calls:
            print("\n✅ Final response (no more tool calls)")
            return content
        
        # Process tool calls
        messages.append({"role": "assistant", "content": content, "tool_calls": tool_calls})
        
        for tc in tool_calls:
            print(f"\n📞 Tool call requested:")
            result = execute_tool_call(tc)
            print(f"  📤 Result: {json.dumps(result)}")
            
            messages.append({
                "role": "tool",
                "content": json.dumps(result)
            })
    
    print("\n⚠️ Max iterations reached")
    return content

def main():
    parser = argparse.ArgumentParser(description="Ollama tool-use helper")
    subparsers = parser.add_subparsers(dest="command", required=True)
    
    # single: One-shot tool call
    single_parser = subparsers.add_parser("single", help="Single tool-enabled request")
    single_parser.add_argument("model", help="Model name")
    single_parser.add_argument("message", help="User message")
    
    # loop: Full tool loop
    loop_parser = subparsers.add_parser("loop", help="Full tool-use loop")
    loop_parser.add_argument("model", help="Model name")
    loop_parser.add_argument("message", help="User message")
    loop_parser.add_argument("-n", "--max-iter", type=int, default=5, help="Max iterations")
    
    # tools: Show available tools
    subparsers.add_parser("tools", help="Show example tools")
    
    args = parser.parse_args()
    
    if args.command == "single":
        result = chat_with_tools(args.model, args.message)
        msg = result.get("message", {})
        print(f"Content: {msg.get('content', '')}")
        if msg.get("tool_calls"):
            print(f"Tool calls: {json.dumps(msg['tool_calls'], indent=2)}")
    
    elif args.command == "loop":
        tool_loop(args.model, args.message, args.max_iter)
    
    elif args.command == "tools":
        print(json.dumps(EXAMPLE_TOOLS, indent=2))

if __name__ == "__main__":
    main()
