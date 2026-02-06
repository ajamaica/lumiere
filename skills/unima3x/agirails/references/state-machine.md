# ACTP State Machine

The Agent Commerce Transaction Protocol uses an 8-state machine for secure, trustless transactions.

## States

| State | Description | Who Can Transition Out |
|-------|-------------|------------------------|
| **INITIATED** | Transaction created, no funds locked | Requester (cancel), Provider (quote) |
| **QUOTED** | Provider quoted a price | Requester (commit or cancel) |
| **COMMITTED** | Funds locked in escrow | Provider (start work), Either (cancel) |
| **IN_PROGRESS** | Provider working on task | Provider (deliver) |
| **DELIVERED** | Work delivered, dispute window active | Requester (release or dispute) |
| **SETTLED** | Transaction complete, funds distributed | Terminal state |
| **DISPUTED** | Under mediation | Mediator (resolve) |
| **CANCELLED** | Transaction cancelled, funds refunded | Terminal state |

## State Diagram

```
                    ┌─────────────┐
                    │  INITIATED  │
                    └──────┬──────┘
                           │ Provider quotes
                           ▼
                    ┌─────────────┐
         Cancel ◄───│   QUOTED    │
                    └──────┬──────┘
                           │ Requester commits (escrow locked)
                           ▼
                    ┌─────────────┐
         Cancel ◄───│  COMMITTED  │
                    └──────┬──────┘
                           │ Provider starts (REQUIRED!)
                           ▼
                    ┌─────────────┐
                    │ IN_PROGRESS │
                    └──────┬──────┘
                           │ Provider delivers + proof
                           ▼
                    ┌─────────────┐
         Dispute ──►│  DELIVERED  │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
       ┌──────────┐  ┌──────────┐  ┌──────────┐
       │ DISPUTED │  │ SETTLED  │  │ CANCELLED│
       └────┬─────┘  └──────────┘  └──────────┘
            │ Mediator resolves
            ▼
       ┌──────────┐
       │ SETTLED  │
       └──────────┘
```

## Transition Rules

### INITIATED → QUOTED
**Who**: Provider only
**Proof**: ABI-encoded quote amount
```typescript
const proof = abiCoder.encode(['uint256'], [ethers.parseUnits('100', 6)]);
await client.standard.transitionState(txId, 'QUOTED', proof);
```

### QUOTED → COMMITTED
**Who**: Requester only (via linkEscrow)
**Action**: Locks quoted amount in escrow
```typescript
await client.standard.linkEscrow(txId);
```

### COMMITTED → IN_PROGRESS
**Who**: Provider only
**Proof**: None required
```typescript
await client.standard.transitionState(txId, 'IN_PROGRESS');
```

### IN_PROGRESS → DELIVERED
**Who**: Provider only
**Proof**: ABI-encoded dispute window (seconds)
```typescript
const proof = abiCoder.encode(['uint256'], [172800]); // 48 hours
await client.standard.transitionState(txId, 'DELIVERED', proof);
```

### DELIVERED → SETTLED
**Who**: Requester (explicit release)
```typescript
// Explicit release
await client.standard.releaseEscrow(escrowId);
```

### DELIVERED → DISPUTED
**Who**: Requester or Provider (before SETTLED)
```typescript
await client.standard.transitionState(txId, 'DISPUTED');
```

### DISPUTED → SETTLED
**Who**: Admin/Pauser (mediator) only
**Proof**: Resolution amounts
```typescript
const proof = abiCoder.encode(
  ['uint256', 'uint256', 'address', 'uint256'],
  [requesterAmount, providerAmount, mediatorAddress, mediatorFee]
);
await client.standard.transitionState(txId, 'SETTLED', proof);
```

### Any → CANCELLED
**Who**:
- INITIATED/QUOTED: Requester only
- COMMITTED: Either party
- DISPUTED: Admin/Pauser only

```typescript
await client.standard.transitionState(txId, 'CANCELLED');
```

## Critical Invariants

1. **Escrow Solvency**: Vault balance >= sum of all active transaction amounts
2. **State Monotonicity**: States only move forward (never backwards)
3. **IN_PROGRESS Required**: Cannot skip from COMMITTED to DELIVERED
4. **Deadline Enforcement**: No delivery after deadline passes
5. **Access Control**: Only authorized parties can trigger transitions

## Dispute Window

The dispute window (default 48 hours) protects both parties:

- **Requester**: Can dispute if delivery is unsatisfactory
- **Provider**: Gets paid after window if no dispute raised
- **Settlement**: Requester releases after window

```typescript
// Check if dispute window is active
const status = await client.basic.checkStatus(txId);
if (status.canDispute) {
  console.log(`Dispute window is active`);
}
```

## Fee Calculation

```
Fee = max(amount * 0.01, $0.05)

Example:
- $100 transaction → $1.00 fee (1%)
- $3 transaction → $0.05 fee (minimum)
```

Provider receives: `amount - fee`
