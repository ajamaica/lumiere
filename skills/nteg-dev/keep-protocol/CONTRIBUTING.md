# Contributing to keep-protocol

Thank you for your interest in contributing.

## Quick Start

1. Fork and clone the repo
2. Build the server: `docker build -t keep-server . && docker run -d -p 9009:9009 keep-server`
3. Run the signed test: `pip install protobuf cryptography && python3 test_signed_send.py`
4. Make your changes
5. Submit a PR

## What We're Looking For

- Client libraries in new languages (Rust, TypeScript, Java)
- Relay/routing implementations for the `dst` field semantics
- Integration examples with agent frameworks (LangChain, CrewAI, AutoGen, etc.)
- MCP tool wrappers for AI agent platforms
- Documentation improvements

## Design Constraints

- **No HTTP/REST** — TCP + Protobuf is intentional
- **No external dependencies** beyond protobuf and ed25519
- **Signatures are mandatory** — this is a core security property
- **Keep the schema minimal** — resist adding fields unless strongly justified

## Code Style

- Go: `gofmt`
- Python: stdlib-compatible, no heavy frameworks
- Commit messages: `type: description` (feat, fix, docs, chore, test)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
