# Kaspa Rust SDK

The Kaspa Rust SDK provides native Rust bindings for interacting with the Kaspa blockchain. This is the primary implementation used by the Kaspa network itself.

## Installation

Add to your `Cargo.toml`:

```toml
[dependencies]
kaspa-rpc-client = "0.14"
kaspa-wallet-core = "0.14"
kaspa-consensus-core = "0.14"
kaspa-addresses = "0.14"
kaspa-txscript = "0.14"
kaspa-utils = "0.14"
```

## Core Modules

### Addresses

```rust
use kaspa_addresses::{Address, Prefix};
use kaspa_consensus_core::network::NetworkType;

// Create address from string
let address = Address::try_from("kaspa:qqkqkzjvr7zwxxmjxjkmxx")?;

// Create address from public key hash
let address = Address::new(
    Prefix::Mainnet,
    Version::PubKey,
    &public_key_hash
);

// Validate address
let is_valid = Address::try_from("kaspa:qqkqkzjvr7zwxxmjxjkmxx").is_ok();

// Get string representation
let address_string = address.to_string();
```

### Private Keys

```rust
use kaspa_wallet_core::keys::{PrivateKey, PublicKey};
use kaspa_consensus_core::network::NetworkType;

// Generate random private key
let private_key = PrivateKey::random(NetworkType::Mainnet);

// Import from WIF
let private_key = PrivateKey::from_wif("Kx...", NetworkType::Mainnet)?;

// Get public key
let public_key = private_key.to_public_key();

// Export to WIF
let wif = private_key.to_wif();
```

### Transactions

```rust
use kaspa_consensus_core::tx::{Transaction, TransactionInput, TransactionOutput};
use kaspa_consensus_core::subnetwork::SubnetworkId;

// Create transaction
let tx = Transaction::new(
    0, // version
    vec![input], // inputs
    vec![output], // outputs
    0, // lock_time
    SubnetworkId::from_bytes([0; 32]),
    0, // gas
    vec![], // payload
);

// Get transaction ID
let tx_id = tx.id();

// Serialize
let serialized = tx.serialize();
```

### Transaction Input

```rust
use kaspa_consensus_core::tx::{TransactionInput, TransactionOutpoint};

let input = TransactionInput::new(
    TransactionOutpoint::new(tx_id, index),
    signature_script,
    sequence,
    sig_op_count,
);
```

### Transaction Output

```rust
use kaspa_consensus_core::tx::{TransactionOutput, ScriptPublicKey};

let output = TransactionOutput::new(
    amount,
    ScriptPublicKey::new(version, script),
);
```

## RPC Client

### Connecting to Node

```rust
use kaspa_rpc_client::Client;
use kaspa_consensus_core::network::NetworkType;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Create client
    let client = Client::new(
        "wss://api.kaspa.org",
        NetworkType::Mainnet,
    ).await?;

    // Connect
    client.connect().await?;

    // Use client...

    // Disconnect
    client.disconnect().await?;

    Ok(())
}
```

### Balance Operations

```rust
use kaspa_rpc_client::GetBalanceByAddressRequest;

// Get balance for single address
let request = GetBalanceByAddressRequest {
    address: "kaspa:qqkqkzjvr7zwxxmjxjkmxx".into(),
};

let response = client.get_balance_by_address(request).await?;
println!("Balance: {}", response.balance);

// Get balances for multiple addresses
use kaspa_rpc_client::GetBalancesByAddressesRequest;

let request = GetBalancesByAddressesRequest {
    addresses: vec![
        "kaspa:qqkqkzjvr7zwxxmjxjkmxx".into(),
        "kaspa:qqkqkzjvr7zwxxmjxjkmxy".into(),
    ],
};

let response = client.get_balances_by_addresses(request).await?;
for entry in response.entries {
    println!("{}: {}", entry.address, entry.balance);
}
```

### UTXO Operations

```rust
use kaspa_rpc_client::GetUtxosByAddressesRequest;

let request = GetUtxosByAddressesRequest {
    addresses: vec!["kaspa:qqkqkzjvr7zwxxmjxjkmxx".into()],
};

let response = client.get_utxos_by_addresses(request).await?;

for entry in response.entries {
    println!("UTXO: {}:{}",
        entry.outpoint.transaction_id,
        entry.outpoint.index
    );
    println!("  Amount: {}", entry.utxo_entry.amount);
    println!("  Is Coinbase: {}", entry.utxo_entry.is_coinbase);
}
```

### Transaction Operations

```rust
use kaspa_rpc_client::SubmitTransactionRequest;

// Submit transaction
let request = SubmitTransactionRequest {
    transaction: signed_tx,
    allow_orphan: false,
};

let response = client.submit_transaction(request).await?;
println!("Transaction ID: {}", response.transaction_id);

// Get mempool entries
use kaspa_rpc_client::GetMempoolEntriesRequest;

let request = GetMempoolEntriesRequest {
    include_orphan_pool: false,
    filter_transaction_pool: false,
};

let response = client.get_mempool_entries(request).await?;

// Get mempool entry
use kaspa_rpc_client::GetMempoolEntryRequest;

let request = GetMempoolEntryRequest {
    transaction_id: tx_id,
    include_orphan_pool: false,
};

let response = client.get_mempool_entry(request).await?;
```

### Block Operations

```rust
use kaspa_rpc_client::{GetBlockRequest, GetBlocksRequest, GetBlockDagInfoRequest};

// Get block by hash
let request = GetBlockRequest {
    hash: block_hash,
    include_transactions: true,
};

let response = client.get_block(request).await?;

// Get blocks
let request = GetBlocksRequest {
    low_hash: Some(low_hash),
    include_blocks: true,
    include_transactions: false,
};

let response = client.get_blocks(request).await?;

// Get block DAG info
let response = client.get_block_dag_info(GetBlockDagInfoRequest {}).await?;
println!("Block count: {}", response.block_count);
println!("Tip hashes: {:?}", response.tip_hashes);

// Get sink (tip)
use kaspa_rpc_client::GetSinkRequest;
let response = client.get_sink(GetSinkRequest {}).await?;

// Get sink blue score
use kaspa_rpc_client::GetSinkBlueScoreRequest;
let response = client.get_sink_blue_score(GetSinkBlueScoreRequest {}).await?;
```

### Fee Estimation

```rust
use kaspa_rpc_client::GetFeeEstimateRequest;

let response = client.get_fee_estimate(GetFeeEstimateRequest {}).await?;

println!("Priority fee rate: {}", response.priority_bucket.fee_rate);
println!("Normal fee rate: {}", response.normal_bucket.fee_rate);
println!("Low fee rate: {}", response.low_bucket.fee_rate);
```

### Network Info

```rust
use kaspa_rpc_client::{GetCurrentNetworkRequest, GetCoinSupplyRequest};

// Get current network
let response = client.get_current_network(GetCurrentNetworkRequest {}).await?;

// Get coin supply
let response = client.get_coin_supply(GetCoinSupplyRequest {}).await?;
println!("Circulating: {}", response.circulating_supply);
println!("Total: {}", response.total_supply);
```

## Transaction Building

### Complete Example

```rust
use kaspa_wallet_core::tx::{Generator, PaymentOutput, Fees};
use kaspa_wallet_core::utxo::UtxoEntryReference;
use kaspa_consensus_core::tx::{Transaction, TransactionInput, TransactionOutput};
use kaspa_txscript::pay_to_address_script;

async fn send_kaspa(
    client: &Client,
    sender_key: &PrivateKey,
    recipient_address: &Address,
    amount: u64,
) -> Result<String, Box<dyn std::error::Error>> {
    // Get sender address
    let sender_public_key = sender_key.to_public_key();
    let sender_address = sender_public_key.to_address(NetworkType::Mainnet);

    // Get UTXOs
    let utxos_response = client
        .get_utxos_by_addresses(GetUtxosByAddressesRequest {
            addresses: vec![sender_address.to_string()],
        })
        .await?;

    // Convert UTXOs
    let utxos: Vec<UtxoEntryReference> = utxos_response
        .entries
        .into_iter()
        .map(|e| UtxoEntryReference::from(e))
        .collect();

    // Get fee estimate
    let fee_estimate = client
        .get_fee_estimate(GetFeeEstimateRequest {})
        .await?;

    // Create payment outputs
    let outputs = vec![PaymentOutput {
        address: recipient_address.clone(),
        amount,
    }];

    // Create generator
    let generator = Generator::new(
        utxos,
        outputs,
        Fees::new(fee_estimate.normal_bucket.fee_rate),
        Some(sender_address),
    )?;

    // Generate transaction
    let tx = generator.generate()?;

    // Sign transaction
    let signed_tx = sign_transaction(tx, sender_key)?;

    // Submit
    let response = client
        .submit_transaction(SubmitTransactionRequest {
            transaction: signed_tx,
            allow_orphan: false,
        })
        .await?;

    Ok(response.transaction_id.to_string())
}

fn sign_transaction(
    mut tx: Transaction,
    private_key: &PrivateKey,
) -> Result<Transaction, Box<dyn std::error::Error>> {
    // Sign each input
    for i in 0..tx.inputs.len() {
        let sighash = tx.signature_hash(i, SigHashType::All)?;
        let signature = private_key.sign_schnorr(&sighash)?;

        tx.inputs[i].signature_script = create_signature_script(&signature, &private_key.to_public_key());
    }

    Ok(tx)
}
```

## Mnemonic and HD Wallets

### BIP39 Mnemonic

```rust
use kaspa_wallet_core::mnemonic::Mnemonic;

// Generate new mnemonic
let mnemonic = Mnemonic::random(24, Default::default())?;
let phrase = mnemonic.phrase();

// Validate mnemonic
let is_valid = Mnemonic::validate(phrase, Default::default()).is_ok();

// Generate seed
let seed = mnemonic.to_seed("optional_password");
```

### BIP32 HD Wallet

```rust
use kaspa_wallet_core::derivation::DerivationPath;
use kaspa_wallet_core::xprv::XPrv;
use kaspa_wallet_core::xpub::XPub;

// Create extended private key from seed
let xprv = XPrv::from_seed(&seed)?;

// Derivation path for Kaspa (coin type 111111)
let path = DerivationPath::from_str("m/44'/111111'/0'/0/0")?;

// Derive child key
let child_xprv = xprv.derive_path(&path)?;

// Get private key
let private_key = child_xprv.to_private_key();

// Get extended public key
let xpub = xprv.to_xpub();

// Derive addresses from xpub (watch-only)
let child_xpub = xpub.derive_path(&path)?;
let public_key = child_xpub.to_public_key();
let address = public_key.to_address(NetworkType::Mainnet);
```

## Script Operations

### Pay to Address Script

```rust
use kaspa_txscript::pay_to_address_script;

let script = pay_to_address_script(&address);
```

### Script Builder

```rust
use kaspa_txscript::builder::ScriptBuilder;
use kaspa_txscript::opcodes::OpCodes;

let script = ScriptBuilder::new()
    .add_op(OpCodes::OpDup)?
    .add_op(OpCodes::OpHash160)?
    .add_data(&public_key_hash)?
    .add_op(OpCodes::OpEqualVerify)?
    .add_op(OpCodes::OpCheckSig)?
    .build()?;
```

## Error Handling

```rust
use kaspa_rpc_client::Error;

match result {
    Ok(response) => {
        // Handle success
    }
    Err(Error::Connection(e)) => {
        eprintln!("Connection error: {}", e);
    }
    Err(Error::Rpc(e)) => {
        eprintln!("RPC error: {} - {}", e.code, e.message);
    }
    Err(Error::Serialization(e)) => {
        eprintln!("Serialization error: {}", e);
    }
    Err(e) => {
        eprintln!("Unknown error: {}", e);
    }
}
```

## Async Runtime

The Kaspa Rust SDK requires an async runtime. Use Tokio:

```rust
#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Your async code here
    Ok(())
}
```

Or with custom runtime:

```rust
use tokio::runtime::Runtime;

let rt = Runtime::new()?;
rt.block_on(async {
    // Your async code here
});
```

## Best Practices

1. **Use connection pooling** for high-throughput applications
2. **Implement retry logic** for transient failures
3. **Validate all inputs** before sending to RPC
4. **Use proper UTXO management** to avoid dust outputs
5. **Implement fee estimation** for timely confirmations
6. **Secure private keys** using proper key management
7. **Test on testnet** before mainnet deployment

## Resources

- **Crates.io**: https://crates.io/crates/kaspa-rpc-client
- **GitHub**: https://github.com/kaspanet/rusty-kaspa
- **Documentation**: https://docs.rs/kaspa-rpc-client/
