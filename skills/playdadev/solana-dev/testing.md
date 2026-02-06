# Testing Strategy (LiteSVM / Mollusk / Surfpool)

**Source**: https://solana.com/testing.md

## Testing Pyramid

1. **Unit tests (fast)**: LiteSVM or Mollusk
2. **Integration tests (realistic state)**: Surfpool
3. **Cluster smoke tests**: devnet/testnet/mainnet as needed

## LiteSVM

Lightweight Solana VM running in test process.

**When to use**:

- Fast execution without validator overhead
- Direct account state manipulation
- Built-in performance profiling
- Multi-language support (Rust, TypeScript, Python)

**Setup**: `cargo add --dev litesvm` or `npm i --save-dev litesvm`

## Mollusk

Test harness for direct program execution.

**When to use**:

- Fast Rust-only testing
- Precise account state manipulation
- CU benchmarking
- Custom syscall testing

**Setup**: `cargo add --dev mollusk-svm`

## Surfpool

Integration testing with realistic cluster state.

**When to use**:

- Complex CPIs requiring mainnet programs
- Testing against realistic account state
- Time travel and block manipulation
- Account/program cloning

**Setup**: `cargo install surfpool` → `surfpool start`

## Best Practices

- Keep unit tests as default CI gate (fast feedback)
- Use deterministic PDAs and seeded keypairs
- Profile CU usage during development
- Run integration tests in separate CI stage

Full details: https://solana.com/testing.md
