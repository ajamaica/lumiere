# Smart Contract Patterns (MegaEVM)

## MegaEVM vs Standard EVM

MegaEVM is fully compatible with Ethereum contracts but has different:

- **Gas costs** (especially SSTORE)
- **Block metadata limits** (volatile data access)
- **Contract size limits** (512 KB)

## Contract Limits

| Resource             | Limit                           |
| -------------------- | ------------------------------- |
| Contract code        | 512 KB                          |
| Calldata             | 128 KB                          |
| eth_call/estimateGas | 10M gas (public), higher on VIP |

## Volatile Data Access Control

After accessing block metadata, transaction is limited to 20M additional compute gas.

**Affected opcodes:**

- `TIMESTAMP` / `block.timestamp`
- `NUMBER` / `block.number`
- `BLOCKHASH` / `blockhash(n)`

```solidity
// ❌ Problematic pattern
function process() external {
    uint256 ts = block.timestamp;  // Triggers limit
    // Complex computation here will hit 20M gas ceiling
    for (uint i = 0; i < 10000; i++) {
        // Heavy work...
    }
}

// ✅ Better: access metadata late
function process() external {
    // Do heavy computation first
    for (uint i = 0; i < 10000; i++) {
        // Heavy work...
    }
    // Access metadata at the end
    emit Processed(block.timestamp);
}
```

**Spec:** https://github.com/megaeth-labs/mega-evm/blob/main/specs/MiniRex.md#28-volatile-data-access-control

## High-Precision Timestamps

For microsecond precision, use the oracle instead of `block.timestamp`:

```solidity
interface ITimestampOracle {
    /// @notice Returns timestamp in microseconds
    function timestamp() external view returns (uint256);
}

contract MyContract {
    ITimestampOracle constant ORACLE =
        ITimestampOracle(0x6342000000000000000000000000000000000002);

    function getTime() external view returns (uint256) {
        return ORACLE.timestamp(); // Microseconds, not seconds
    }
}
```

## Storage Patterns

### Avoid Dynamic Mappings

```solidity
// ❌ Expensive: each new key = new storage slot = 2M+ gas
mapping(address => uint256) public balances;

// ✅ Better: fixed-size or use RedBlackTreeLib
uint256[100] public fixedBalances;
```

### Solady RedBlackTreeLib

```solidity
import {RedBlackTreeLib} from "solady/src/utils/RedBlackTreeLib.sol";

contract OptimizedStorage {
    using RedBlackTreeLib for RedBlackTreeLib.Tree;
    RedBlackTreeLib.Tree private _tree;

    // Tree manages contiguous storage slots
    // Insert/remove reuses slots instead of allocating new ones

    function insert(uint256 key, uint256 value) external {
        _tree.insert(key);
        // Store value in separate packed array
    }
}
```

## Gas Estimation

Always use remote estimation:

```solidity
// foundry.toml
[profile.default]
# Don't rely on local simulation
```

```bash
# Deploy with explicit gas, skip simulation
forge script Deploy.s.sol \
    --rpc-url https://mainnet.megaeth.com/rpc \
    --gas-limit 5000000 \
    --skip-simulation \
    --broadcast
```

## Events and Logs

LOG opcodes have quadratic cost above 4KB data:

```solidity
// ❌ Expensive: large event data
event LargeData(bytes data); // If data > 4KB, quadratic cost

// ✅ Better: emit hash, store off-chain
event DataStored(bytes32 indexed hash);
```

## SELFDESTRUCT

EIP-6780 style SELFDESTRUCT is being implemented. Check current status:

- Same-tx destruction works
- Cross-tx destruction behavior may vary

## Deployment Patterns

### Factory Contracts

```solidity
contract Factory {
    function deploy(bytes32 salt, bytes memory bytecode)
        external
        returns (address)
    {
        address addr;
        assembly {
            addr := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }
        require(addr != address(0), "Deploy failed");
        return addr;
    }
}
```

### Proxy Patterns

Standard proxy patterns (EIP-1967, UUPS, Transparent) work normally. Consider:

- Storage slot allocation costs on first write
- Upgrade authorization patterns

## Testing Contracts

```solidity
// Use Foundry with remote RPC
contract MyTest is Test {
    function setUp() public {
        // Fork MegaETH testnet for realistic gas costs
        vm.createSelectFork("https://carrot.megaeth.com/rpc");
    }

    function testGasCost() public {
        uint256 gasBefore = gasleft();
        // Your operation
        uint256 gasUsed = gasBefore - gasleft();
        console.log("Gas used:", gasUsed);
    }
}
```

## SSTORE2: On-Chain Data Storage

For storing large immutable data on-chain (HTML, images, metadata), use the **SSTORE2** pattern — store data as contract bytecode instead of storage slots.

### Why SSTORE2 on MegaETH?

| Approach               | Write Cost           | Read Cost              |
| ---------------------- | -------------------- | ---------------------- |
| SSTORE (storage slots) | 2M+ gas per new slot | 100-2100 gas           |
| SSTORE2 (bytecode)     | ~10K gas per byte    | **FREE** (EXTCODECOPY) |

SSTORE2 is ideal for write-once, read-many data — content is immutable once deployed.

### How It Works

1. Deploy a contract with data as bytecode
2. Read data via `EXTCODECOPY` (no gas for view calls)

```solidity
// Writing: Deploy data as contract bytecode
library SSTORE2 {
    function write(bytes memory data) internal returns (address) {
        // Prepend STOP opcode so contract can't be called
        bytes memory bytecode = abi.encodePacked(
            hex"00", // STOP opcode
            data
        );

        address pointer;
        assembly {
            pointer := create(0, add(bytecode, 32), mload(bytecode))
        }
        require(pointer != address(0), "Deploy failed");
        return pointer;
    }

    function read(address pointer) internal view returns (bytes memory) {
        uint256 size;
        assembly { size := extcodesize(pointer) }

        bytes memory data = new bytes(size - 1); // Skip STOP opcode
        assembly {
            extcodecopy(pointer, add(data, 32), 1, sub(size, 1))
        }
        return data;
    }
}
```

### MegaETH Gas Estimation for SSTORE2

```javascript
// MegaETH multidimensional gas model for bytecode deployment
const MEGAETH_GAS = {
  INTRINSIC_COMPUTE: 21_000n,
  INTRINSIC_STORAGE: 39_000n,
  CONTRACT_CREATION_COMPUTE: 32_000n,
  CODE_DEPOSIT_PER_BYTE: 10_000n,
  CALLDATA_NONZERO_PER_BYTE: 160n,
}

function estimateDeployGas(dataSizeBytes) {
  const dataSize = BigInt(dataSizeBytes)

  const computeGas = MEGAETH_GAS.INTRINSIC_COMPUTE + MEGAETH_GAS.CONTRACT_CREATION_COMPUTE

  const storageGas =
    MEGAETH_GAS.INTRINSIC_STORAGE +
    dataSize * MEGAETH_GAS.CODE_DEPOSIT_PER_BYTE +
    dataSize * MEGAETH_GAS.CALLDATA_NONZERO_PER_BYTE

  return ((computeGas + storageGas) * 150n) / 100n // 50% buffer
}
```

### Use Cases

- **On-chain websites/HTML** — permanent, censorship-resistant hosting
- **NFT metadata** — fully on-chain images/JSON
- **Large configs** — immutable protocol parameters
- **Data availability** — store proofs, attestations

### Chunking Large Data

For data > 24KB, chunk into multiple contracts:

```javascript
const CHUNK_SIZE = 15000 // 15KB per chunk

function chunkData(data) {
  const chunks = []
  for (let i = 0; i < data.length; i += CHUNK_SIZE) {
    chunks.push(data.slice(i, i + CHUNK_SIZE))
  }
  return chunks
}
```

### Solady Implementation

Solady provides an optimized SSTORE2:

```solidity
import {SSTORE2} from "solady/src/utils/SSTORE2.sol";

// Write
address pointer = SSTORE2.write(data);

// Read
bytes memory data = SSTORE2.read(pointer);
```

**Reference implementation:** See [warren-deploy](https://clawdhub.ai/planetai87/warren-deploy) for a complete on-chain website deployment system using SSTORE2 on MegaETH.

## EIP-6909: Minimal Multi-Token Standard

For contracts managing multiple token types, prefer [EIP-6909](https://eips.ethereum.org/EIPS/eip-6909) over ERC-1155.

### Why EIP-6909 on MegaETH?

| Feature                | MegaETH Benefit                          |
| ---------------------- | ---------------------------------------- |
| No mandatory callbacks | Less gas, simpler integrations           |
| No batching in spec    | Allows MegaETH-optimized implementations |
| Single contract        | Fewer SSTORE operations (expensive)      |
| Granular approvals     | Per-token-ID OR full operator access     |
| Minimal interface      | Smaller bytecode                         |

### Storage Efficiency

One EIP-6909 contract vs. N separate ERC-20 contracts:

```solidity
// ❌ Deploying many ERC-20s = many new storage slots
// Each contract: new code, new storage initialization

// ✅ Single EIP-6909 = shared storage
// Multiple token IDs in one contract, slot reuse
```

### Basic Implementation

```solidity
// Using Solady's ERC6909 (gas-optimized)
import {ERC6909} from "solady/src/tokens/ERC6909.sol";

contract MultiToken is ERC6909 {
    function name(uint256 id) public view override returns (string memory) {
        // Return name for token ID
    }

    function symbol(uint256 id) public view override returns (string memory) {
        // Return symbol for token ID
    }

    function tokenURI(uint256 id) public view override returns (string memory) {
        // Return metadata URI for token ID
    }

    function mint(address to, uint256 id, uint256 amount) external {
        _mint(to, id, amount);
    }
}
```

### Key Differences from ERC-1155

|                 | ERC-1155      | EIP-6909                    |
| --------------- | ------------- | --------------------------- |
| Callbacks       | Required      | None                        |
| Batch transfers | In spec       | Implementation choice       |
| Approvals       | Operator only | Operator + per-ID allowance |
| Complexity      | Higher        | Minimal                     |

### Use Cases

- **DEXes**: LP tokens for multiple pairs in one contract
- **Games**: Multiple item/asset types
- **DeFi vaults**: Multiple share classes
- **NFT editions**: Fungible editions of NFTs

### Solady Implementation

Solady provides a gas-optimized EIP-6909:

```bash
forge install vectorized/solady
```

```solidity
import {ERC6909} from "solady/src/tokens/ERC6909.sol";
```

**Docs**: https://github.com/Vectorized/solady/blob/main/src/tokens/ERC6909.sol

## OP Stack Compatibility

MegaETH uses OP Stack. Standard bridge contracts and predeploys are available:

| Contract               | Address                                      |
| ---------------------- | -------------------------------------------- |
| WETH9                  | `0x4200000000000000000000000000000000000006` |
| Multicall3             | `0xcA11bde05977b3631167028862bE2a173976CA11` |
| L2CrossDomainMessenger | `0x4200000000000000000000000000000000000007` |

See OP Stack docs for full predeploy list.

## Common Issues

### "Intrinsic gas too low"

Local simulation uses wrong opcode costs. Use `--skip-simulation` or remote estimation.

### "Out of gas" after block.timestamp

Hitting volatile data access limit. Restructure to access metadata late.

### Transaction stuck

Check nonce with `eth_getTransactionCount` using `pending` tag.
