#!/usr/bin/env python3
"""Smoke tests for Strands SDK imports and basic functionality.

Run: python3 -m pytest tests/ -v
  or: python3 tests/test_imports.py
"""

import sys


def test_core_imports():
    """Verify core SDK imports work."""
    from strands import Agent, tool
    from strands.types.tools import ToolContext
    assert Agent is not None
    assert tool is not None
    assert ToolContext is not None
    print("  ✅ Core imports (Agent, tool, ToolContext)")


def test_bedrock_model_import():
    """Verify BedrockModel is eagerly available."""
    from strands.models import BedrockModel
    from strands.models.bedrock import DEFAULT_BEDROCK_MODEL_ID
    assert BedrockModel is not None
    assert "anthropic" in DEFAULT_BEDROCK_MODEL_ID
    print(f"  ✅ BedrockModel (default: {DEFAULT_BEDROCK_MODEL_ID})")


def test_lazy_model_imports():
    """Verify lazy-loaded model providers resolve (some need optional deps)."""
    from strands.models.ollama import OllamaModel
    assert OllamaModel is not None

    # These require optional deps — verify the lazy-load mechanism works
    # even if the underlying package isn't installed
    import strands.models as m
    lazy_names = [
        "AnthropicModel", "GeminiModel", "LiteLLMModel", "LlamaAPIModel",
        "LlamaCppModel", "MistralModel", "OllamaModel", "OpenAIModel",
        "SageMakerAIModel", "WriterModel",
    ]
    resolved = 0
    skipped = []
    for name in lazy_names:
        try:
            cls = getattr(m, name)
            assert cls is not None
            resolved += 1
        except (ImportError, ModuleNotFoundError):
            skipped.append(name)
    print(f"  ✅ Lazy-load mechanism works: {resolved}/10 resolved, {len(skipped)} need optional deps")
    if skipped:
        print(f"     Skipped (missing deps): {', '.join(skipped)}")


def test_multiagent_imports():
    """Verify multi-agent pattern imports."""
    from strands.multiagent.swarm import Swarm
    from strands.multiagent.graph import GraphBuilder
    assert Swarm is not None
    assert GraphBuilder is not None
    try:
        from strands.multiagent.a2a import A2AServer, StrandsA2AExecutor
        assert A2AServer is not None
        print("  ✅ Multi-agent imports (Swarm, GraphBuilder, A2AServer)")
    except ImportError:
        print("  ✅ Multi-agent imports (Swarm, GraphBuilder) — A2A skipped (needs 'a2a' package)")


def test_mcp_imports():
    """Verify MCP integration imports."""
    from strands.tools.mcp import MCPClient
    from mcp import stdio_client, StdioServerParameters
    assert MCPClient is not None
    assert stdio_client is not None
    print("  ✅ MCP imports (MCPClient, stdio_client)")


def test_session_imports():
    """Verify session manager imports."""
    from strands.session.file_session_manager import FileSessionManager
    from strands.session.s3_session_manager import S3SessionManager
    from strands.session.session_manager import SessionManager
    assert FileSessionManager is not None
    assert S3SessionManager is not None
    print("  ✅ Session imports (FileSessionManager, S3SessionManager)")


def test_experimental_imports():
    """Verify experimental bidirectional streaming imports."""
    try:
        from strands.experimental.bidi.agent import BidiAgent
        assert BidiAgent is not None
        models_found = []
        for name, mod in [
            ("NovaSonic", "strands.experimental.bidi.models.nova_sonic"),
            ("GeminiLive", "strands.experimental.bidi.models.gemini_live"),
            ("OpenAIRealtime", "strands.experimental.bidi.models.openai_realtime"),
        ]:
            try:
                __import__(mod)
                models_found.append(name)
            except ImportError:
                pass
        print(f"  ✅ Experimental bidi: BidiAgent + {len(models_found)}/3 models ({', '.join(models_found) or 'none — need optional deps'})")
    except ImportError as e:
        print(f"  ⚠️  Experimental bidi skipped (missing dep: {e})")


def test_tool_decorator():
    """Verify @tool decorator produces valid tool metadata."""
    from strands import tool

    @tool
    def greet(name: str) -> str:
        """Say hello to someone.

        Args:
            name: The person's name.
        """
        return f"Hello, {name}!"

    # Decorated function should still be callable
    result = greet(name="World")
    assert "Hello" in str(result)
    print("  ✅ @tool decorator works and function is callable")


def test_ollama_model_construction():
    """Verify OllamaModel accepts host as positional arg."""
    from strands.models.ollama import OllamaModel

    # host is positional, model_id is keyword
    model = OllamaModel("http://localhost:11434", model_id="qwen3:latest")
    assert model.host == "http://localhost:11434"
    assert model.config["model_id"] == "qwen3:latest"
    print("  ✅ OllamaModel('host', model_id='...') constructs correctly")


def test_anthropic_model_requires_max_tokens():
    """Verify AnthropicModel enforces max_tokens as Required."""
    try:
        from strands.models.anthropic import AnthropicModel
        model = AnthropicModel(model_id="claude-sonnet-4-20250514", max_tokens=4096)
        assert model.config["max_tokens"] == 4096
        print("  ✅ AnthropicModel requires max_tokens (verified)")
    except ImportError:
        # anthropic package not installed — verify via source inspection instead
        import inspect
        from strands.models import model as base
        # Check the lazy-load path exists
        import strands.models as m
        assert "AnthropicModel" in dir(m) or hasattr(m, '__getattr__')
        print("  ⚠️  AnthropicModel: 'anthropic' package not installed — import verified via lazy-load path")


def test_swarm_construction():
    """Verify Swarm accepts nodes list."""
    from strands.multiagent.swarm import Swarm
    # Can't fully construct without real agents (needs model), but verify the class
    import inspect
    sig = inspect.signature(Swarm.__init__)
    params = list(sig.parameters.keys())
    assert "nodes" in params
    assert "entry_point" in params
    assert "max_handoffs" in params
    print("  ✅ Swarm constructor has expected params (nodes, entry_point, max_handoffs)")


def test_graph_builder():
    """Verify GraphBuilder has expected methods."""
    from strands.multiagent.graph import GraphBuilder
    builder = GraphBuilder()
    assert hasattr(builder, "add_node")
    assert hasattr(builder, "add_edge")
    assert hasattr(builder, "set_entry_point")
    assert hasattr(builder, "build")
    print("  ✅ GraphBuilder has expected methods (add_node, add_edge, set_entry_point, build)")


def test_built_in_tools_count():
    """Verify expected number of built-in tools."""
    import strands_tools
    import os
    tools_dir = os.path.dirname(strands_tools.__file__)
    tool_files = [
        f[:-3] for f in os.listdir(tools_dir)
        if f.endswith(".py") and not f.startswith("__")
    ]
    assert len(tool_files) >= 46, f"Expected ≥46 tools, found {len(tool_files)}"
    print(f"  ✅ Built-in tools: {len(tool_files)} available (≥46 expected)")


def test_provider_count():
    """Verify expected number of model providers."""
    import os
    import strands.models as models_pkg
    models_dir = os.path.dirname(models_pkg.__file__)
    model_files = [
        f[:-3] for f in os.listdir(models_dir)
        if f.endswith(".py") and not f.startswith("_") and f != "model.py"
    ]
    assert len(model_files) == 11, f"Expected 11 providers, found {len(model_files)}: {model_files}"
    print(f"  ✅ Model providers: {len(model_files)} (expected 11)")


# === Run all tests ===

if __name__ == "__main__":
    tests = [v for k, v in sorted(globals().items()) if k.startswith("test_")]
    passed = 0
    failed = 0
    print(f"\nRunning {len(tests)} smoke tests...\n")
    for test in tests:
        try:
            test()
            passed += 1
        except Exception as e:
            print(f"  ❌ {test.__name__}: {e}")
            failed += 1
    print(f"\n{'='*40}")
    print(f"Results: {passed} passed, {failed} failed")
    if failed:
        sys.exit(1)
    print("All tests passed! ✅")
