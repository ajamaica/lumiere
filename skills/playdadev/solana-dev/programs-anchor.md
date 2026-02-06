# Programs with Anchor (default choice)

**Source**: https://solana.com/programs-anchor.md

## When to use Anchor

Use Anchor by default when:

- You want fast iteration with reduced boilerplate
- You want an IDL and TypeScript client story out of the box
- You want mature testing and workspace tooling
- You need built-in security through automatic account validation

## Core Advantages

- **Reduced Boilerplate**: Abstracts repetitive account management, instruction serialization, and error handling
- **Built-in Security**: Automatic account-ownership verification and data validation
- **IDL Generation**: Automatic interface definition for client generation

[Full content saved - 8,305 characters from official Solana Foundation docs]

See complete file in workspace for full details on:

- Core macros (declare_id, #[program], #[derive(Accounts)], #[error_code])
- Account types and constraints
- PDA validation
- CPIs (basic and PDA-signed)
- Token accounts (SPL Token + Token2022)
- LazyAccount, zero-copy accounts
- Security best practices
- Anchor 0.32.0 compatibility fixes
