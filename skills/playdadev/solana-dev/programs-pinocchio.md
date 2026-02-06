# Programs with Pinocchio

**Source**: https://solana.com/programs-pinocchio.md

## When to Use Pinocchio

Use Pinocchio when you need:

- **Maximum compute efficiency**: 84% CU savings vs Anchor
- **Minimal binary size**: Leaner code, smaller deployments
- **Zero external dependencies**: Only Solana SDK types
- **Fine-grained control**: Direct memory access, byte-level ops
- **no_std environments**: Embedded or constrained contexts

## Core Architecture

- Manual validation via `TryFrom` trait
- Single-byte discriminators (255 instructions max)
- Zero-copy account access
- Direct CPI control

## Key Differences from Anchor

**Anchor**: Automatic validation, macro magic, IDL generation  
**Pinocchio**: Manual everything, maximum control, extreme performance

## Security Checklist

- [ ] Validate all account owners in `TryFrom`
- [ ] Check signer status for authority accounts
- [ ] Verify PDA derivation
- [ ] Validate program IDs before CPIs
- [ ] Use checked math
- [ ] Mark closed accounts (prevent revival)
- [ ] Validate instruction data length
- [ ] Check for duplicate mutable accounts

## Performance Tips

- Use references instead of heap allocations
- Pack booleans into bitwise flags (8 per byte)
- Skip redundant checks (if CPI will validate anyway)
- Batch instructions (saves ~1000 CU per operation)
- Order struct fields largest-to-smallest (minimize padding)

## Token Support

- SPL Token: Fixed-size validation
- Token2022: Discriminator-based (variable size with extensions)
- MintInterface: Supports both programs

Full details: https://solana.com/programs-pinocchio.md (15,734 characters)
