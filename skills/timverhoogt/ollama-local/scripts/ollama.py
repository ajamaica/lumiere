#!/usr/bin/env python3
"""
Ollama CLI helper for local Ollama servers.
Configure host via OLLAMA_HOST env var (default: http://localhost:11434)
"""

import argparse
import json
import os
import sys
import urllib.request
import urllib.error

OLLAMA_HOST = os.environ.get("OLLAMA_HOST", "http://localhost:11434")

def api_request(endpoint, method="GET", data=None):
    """Make request to Ollama API (non-streaming)."""
    url = f"{OLLAMA_HOST}{endpoint}"
    headers = {"Content-Type": "application/json"} if data else {}
    
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode() if data else None,
        headers=headers,
        method=method
    )
    
    try:
        with urllib.request.urlopen(req, timeout=300) as resp:
            return json.loads(resp.read())
    except urllib.error.URLError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

def api_stream(endpoint, data):
    """Make streaming request to Ollama API."""
    url = f"{OLLAMA_HOST}{endpoint}"
    
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode(),
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    
    try:
        with urllib.request.urlopen(req, timeout=300) as resp:
            for line in resp:
                if line.strip():
                    yield json.loads(line)
    except urllib.error.URLError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

def list_models():
    """List all available models."""
    result = api_request("/api/tags")
    models = result.get("models", [])
    
    if not models:
        print("No models installed.")
        return
    
    print(f"{'Model':<35} {'Size':<10} {'Params':<12} {'Family'}")
    print("-" * 70)
    for m in models:
        name = m["name"]
        size_gb = m["size"] / (1024**3)
        params = m["details"].get("parameter_size", "?")
        family = m["details"].get("family", "?")
        print(f"{name:<35} {size_gb:>6.1f} GB  {params:<12} {family}")

def pull_model(model_name):
    """Pull a model from Ollama registry."""
    print(f"Pulling {model_name}...")
    
    for chunk in api_stream("/api/pull", {"name": model_name}):
        status = chunk.get("status", "")
        if "pulling" in status:
            completed = chunk.get("completed", 0)
            total = chunk.get("total", 0)
            if total:
                pct = (completed / total) * 100
                print(f"\r{status}: {pct:.1f}%", end="", flush=True)
            else:
                print(f"\r{status}", end="", flush=True)
        elif status:
            print(f"\n{status}")
    
    print(f"\n✅ {model_name} pulled successfully")

def remove_model(model_name):
    """Remove a model."""
    api_request("/api/delete", method="DELETE", data={"name": model_name})
    print(f"✅ {model_name} removed")

def show_model(model_name):
    """Show model details."""
    result = api_request("/api/show", method="POST", data={"name": model_name})
    
    print(f"Model: {model_name}")
    print("-" * 40)
    
    if "details" in result:
        d = result["details"]
        print(f"Family: {d.get('family', '?')}")
        print(f"Parameters: {d.get('parameter_size', '?')}")
        print(f"Quantization: {d.get('quantization_level', '?')}")
    
    if "modelfile" in result:
        print(f"\nModelfile:\n{result['modelfile'][:500]}...")

def chat(model_name, message, system=None, stream=True):
    """Chat with a model."""
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": message})
    
    data = {
        "model": model_name,
        "messages": messages,
        "stream": stream
    }
    
    if stream:
        for chunk in api_stream("/api/chat", data):
            content = chunk.get("message", {}).get("content", "")
            if content:
                print(content, end="", flush=True)
            if chunk.get("done"):
                print()  # newline at end
                # Print stats
                if "eval_count" in chunk:
                    tokens = chunk["eval_count"]
                    duration = chunk.get("eval_duration", 0) / 1e9
                    tps = tokens / duration if duration else 0
                    print(f"\n[{tokens} tokens, {tps:.1f} tok/s]")
    else:
        data["stream"] = False
        result = api_request("/api/chat", method="POST", data=data)
        print(result.get("message", {}).get("content", ""))

def generate(model_name, prompt, system=None, stream=True):
    """Generate completion (non-chat mode)."""
    data = {
        "model": model_name,
        "prompt": prompt,
        "stream": stream
    }
    if system:
        data["system"] = system
    
    if stream:
        for chunk in api_stream("/api/generate", data):
            response = chunk.get("response", "")
            if response:
                print(response, end="", flush=True)
            if chunk.get("done"):
                print()
    else:
        data["stream"] = False
        result = api_request("/api/generate", method="POST", data=data)
        print(result.get("response", ""))

def embeddings(model_name, text):
    """Get embeddings for text."""
    result = api_request("/api/embeddings", method="POST", data={
        "model": model_name,
        "prompt": text
    })
    emb = result.get("embedding", [])
    print(f"Embedding dimensions: {len(emb)}")
    print(f"First 10 values: {emb[:10]}")

def main():
    parser = argparse.ArgumentParser(description="Ollama CLI helper")
    subparsers = parser.add_subparsers(dest="command", required=True)
    
    # list
    subparsers.add_parser("list", help="List all models")
    
    # pull
    pull_parser = subparsers.add_parser("pull", help="Pull a model")
    pull_parser.add_argument("model", help="Model name (e.g., llama3.1:8b)")
    
    # rm
    rm_parser = subparsers.add_parser("rm", help="Remove a model")
    rm_parser.add_argument("model", help="Model name")
    
    # show
    show_parser = subparsers.add_parser("show", help="Show model details")
    show_parser.add_argument("model", help="Model name")
    
    # chat
    chat_parser = subparsers.add_parser("chat", help="Chat with a model")
    chat_parser.add_argument("model", help="Model name")
    chat_parser.add_argument("message", help="User message")
    chat_parser.add_argument("-s", "--system", help="System prompt")
    chat_parser.add_argument("--no-stream", action="store_true", help="Disable streaming")
    
    # generate
    gen_parser = subparsers.add_parser("generate", help="Generate completion")
    gen_parser.add_argument("model", help="Model name")
    gen_parser.add_argument("prompt", help="Prompt text")
    gen_parser.add_argument("-s", "--system", help="System prompt")
    gen_parser.add_argument("--no-stream", action="store_true", help="Disable streaming")
    
    # embeddings
    emb_parser = subparsers.add_parser("embed", help="Get embeddings")
    emb_parser.add_argument("model", help="Model name (e.g., bge-m3)")
    emb_parser.add_argument("text", help="Text to embed")
    
    args = parser.parse_args()
    
    if args.command == "list":
        list_models()
    elif args.command == "pull":
        pull_model(args.model)
    elif args.command == "rm":
        remove_model(args.model)
    elif args.command == "show":
        show_model(args.model)
    elif args.command == "chat":
        chat(args.model, args.message, args.system, stream=not args.no_stream)
    elif args.command == "generate":
        generate(args.model, args.prompt, args.system, stream=not args.no_stream)
    elif args.command == "embed":
        embeddings(args.model, args.text)

if __name__ == "__main__":
    main()
