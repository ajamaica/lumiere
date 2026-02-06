# Kaspa Go SDK

The Kaspa Go SDK is the official Go implementation of the Kaspa protocol. It includes the full node implementation and client libraries.

## Installation

```bash
go get github.com/kaspanet/kaspad
```

## Core Packages

### Addresses

```go
import (
    "github.com/kaspanet/kaspad/util"
    "github.com/kaspanet/kaspad/domain/consensus/utils/txscript"
)

// Generate new address
func generateAddress() (*util.Address, error) {
    // Generate private key
    privateKey, err := util.GeneratePrivateKey()
    if err != nil {
        return nil, err
    }

    // Get public key
    publicKey := privateKey.PubKey()

    // Create address
    address, err := util.NewAddressPublicKey(
        publicKey.SerializeCompressed(),
        util.Bech32PrefixKaspaMain,
    )
    if err != nil {
        return nil, err
    }

    return address, nil
}

// Validate address
func validateAddress(addressStr string) (*util.Address, error) {
    address, err := util.DecodeAddress(addressStr, util.Bech32PrefixKaspaMain)
    if err != nil {
        return nil, err
    }
    return address, nil
}

// Get address string
addressString := address.String()
```

### Private Keys

```go
import "github.com/kaspanet/kaspad/util"

// Generate random private key
privateKey, err := util.GeneratePrivateKey()
if err != nil {
    log.Fatal(err)
}

// Get WIF
wif, err := util.NewWIF(privateKey, util.Bech32PrefixKaspaMain, true)
if err != nil {
    log.Fatal(err)
}
wifString := wif.String()

// Import from WIF
wif, err = util.DecodeWIF(wifString)
if err != nil {
    log.Fatal(err)
}
privateKey = wif.PrivKey
```

### Transactions

```go
import (
    "github.com/kaspanet/kaspad/domain/consensus/model/externalapi"
    "github.com/kaspanet/kaspad/domain/consensus/utils/transactionid"
)

// Create transaction
func createTransaction(inputs []*externalapi.DomainTransactionInput,
    outputs []*externalapi.DomainTransactionOutput) *externalapi.DomainTransaction {

    return &externalapi.DomainTransaction{
        Version:      0,
        Inputs:       inputs,
        Outputs:      outputs,
        LockTime:     0,
        SubnetworkID: externalapi.DomainSubnetworkID{},
        Gas:          0,
        Payload:      nil,
    }
}

// Get transaction ID
func getTransactionID(tx *externalapi.DomainTransaction) *externalapi.DomainTransactionID {
    return consensushashing.TransactionID(tx)
}
```

### Transaction Input

```go
import "github.com/kaspanet/kaspad/domain/consensus/model/externalapi"

func createInput(txID *externalapi.DomainTransactionID, index uint32,
    signatureScript []byte) *externalapi.DomainTransactionInput {

    return &externalapi.DomainTransactionInput{
        PreviousOutpoint: externalapi.DomainOutpoint{
            TransactionID: *txID,
            Index:         index,
        },
        SignatureScript: signatureScript,
        Sequence:        0,
        SigOpCount:      1,
    }
}
```

### Transaction Output

```go
import (
    "github.com/kaspanet/kaspad/domain/consensus/model/externalapi"
    "github.com/kaspanet/kaspad/domain/consensus/utils/txscript"
)

func createOutput(address *util.Address, amount uint64) (*externalapi.DomainTransactionOutput, error) {
    // Create script
    script, err := txscript.PayToAddrScript(address)
    if err != nil {
        return nil, err
    }

    return &externalapi.DomainTransactionOutput{
        Value:           amount,
        ScriptPublicKey: script,
    }, nil
}
```

## RPC Client

### Connecting to Node

```go
import (
    "context"
    "github.com/kaspanet/kaspad/infrastructure/network/rpcclient"
)

func connectToNode() (*rpcclient.RPCClient, error) {
    config := &rpcclient.Config{
        URL:      "wss://api.kaspa.org",
        Username: "",
        Password: "",
    }

    client, err := rpcclient.NewRPCClient(config)
    if err != nil {
        return nil, err
    }

    return client, nil
}
```

### Balance Operations

```go
import (
    "context"
    "github.com/kaspanet/kaspad/app/rpc/rpccontext"
)

// Get balance for address
func getBalance(client *rpcclient.RPCClient, address string) (uint64, error) {
    response, err := client.GetBalanceByAddress(context.Background(),
        &rpccontext.GetBalanceByAddressRequestMessage{
            Address: address,
        })
    if err != nil {
        return 0, err
    }

    return response.Balance, nil
}

// Get balances for multiple addresses
func getBalances(client *rpcclient.RPCClient, addresses []string) (map[string]uint64, error) {
    response, err := client.GetBalancesByAddresses(context.Background(),
        &rpccontext.GetBalancesByAddressesRequestMessage{
            Addresses: addresses,
        })
    if err != nil {
        return nil, err
    }

    balances := make(map[string]uint64)
    for _, entry := range response.Entries {
        balances[entry.Address] = entry.Balance
    }

    return balances, nil
}
```

### UTXO Operations

```go
// Get UTXOs for addresses
func getUTXOs(client *rpcclient.RPCClient, addresses []string) ([]*externalapi.DomainUtxo, error) {
    response, err := client.GetUtxosByAddresses(context.Background(),
        &rpccontext.GetUtxosByAddressesRequestMessage{
            Addresses: addresses,
        })
    if err != nil {
        return nil, err
    }

    return response.Entries, nil
}
```

### Transaction Operations

```go
// Submit transaction
func submitTransaction(client *rpcclient.RPCClient,
    tx *externalapi.DomainTransaction) (*externalapi.DomainTransactionID, error) {

    response, err := client.SubmitTransaction(context.Background(),
        &rpccontext.SubmitTransactionRequestMessage{
            Transaction:     tx,
            AllowOrphan:     false,
        })
    if err != nil {
        return nil, err
    }

    return response.TransactionID, nil
}

// Get mempool entries
func getMempoolEntries(client *rpcclient.RPCClient) ([]*externalapi.DomainTransaction, error) {
    response, err := client.GetMempoolEntries(context.Background(),
        &rpccontext.GetMempoolEntriesRequestMessage{
            IncludeOrphanPool:     false,
            FilterTransactionPool: false,
        })
    if err != nil {
        return nil, err
    }

    return response.Entries, nil
}

// Get mempool entry
func getMempoolEntry(client *rpcclient.RPCClient,
    txID *externalapi.DomainTransactionID) (*externalapi.DomainTransaction, error) {

    response, err := client.GetMempoolEntry(context.Background(),
        &rpccontext.GetMempoolEntryRequestMessage{
            TransactionID:     txID,
            IncludeOrphanPool: false,
        })
    if err != nil {
        return nil, err
    }

    return response.Entry, nil
}
```

### Block Operations

```go
// Get block by hash
func getBlock(client *rpcclient.RPCClient,
    blockHash *externalapi.DomainHash) (*externalapi.DomainBlock, error) {

    response, err := client.GetBlock(context.Background(),
        &rpccontext.GetBlockRequestMessage{
            Hash:                blockHash,
            IncludeTransactions: true,
        })
    if err != nil {
        return nil, err
    }

    return response.Block, nil
}

// Get blocks
func getBlocks(client *rpcclient.RPCClient,
    lowHash *externalapi.DomainHash) ([]*externalapi.DomainBlock, error) {

    response, err := client.GetBlocks(context.Background(),
        &rpccontext.GetBlocksRequestMessage{
            LowHash:             lowHash,
            IncludeBlocks:       true,
            IncludeTransactions: false,
        })
    if err != nil {
        return nil, err
    }

    return response.Blocks, nil
}

// Get block DAG info
func getBlockDAGInfo(client *rpcclient.RPCClient) (*rpccontext.GetBlockDAGInfoResponseMessage, error) {
    return client.GetBlockDAGInfo(context.Background(),
        &rpccontext.GetBlockDAGInfoRequestMessage{})
}

// Get sink (tip)
func getSink(client *rpcclient.RPCClient) (*externalapi.DomainHash, error) {
    response, err := client.GetSink(context.Background(),
        &rpccontext.GetSinkRequestMessage{})
    if err != nil {
        return nil, err
    }

    return response.Sink, nil
}

// Get sink blue score
func getSinkBlueScore(client *rpcclient.RPCClient) (uint64, error) {
    response, err := client.GetSinkBlueScore(context.Background(),
        &rpccontext.GetSinkBlueScoreRequestMessage{})
    if err != nil {
        return 0, err
    }

    return response.BlueScore, nil
}
```

### Fee Estimation

```go
// Get fee estimate
func getFeeEstimate(client *rpcclient.RPCClient) (*rpccontext.GetFeeEstimateResponseMessage, error) {
    return client.GetFeeEstimate(context.Background(),
        &rpccontext.GetFeeEstimateRequestMessage{})
}
```

### Network Info

```go
// Get current network
func getCurrentNetwork(client *rpcclient.RPCClient) (string, error) {
    response, err := client.GetCurrentNetwork(context.Background(),
        &rpccontext.GetCurrentNetworkRequestMessage{})
    if err != nil {
        return "", err
    }

    return response.Network, nil
}

// Get coin supply
func getCoinSupply(client *rpcclient.RPCClient) (*rpccontext.GetCoinSupplyResponseMessage, error) {
    return client.GetCoinSupply(context.Background(),
        &rpccontext.GetCoinSupplyRequestMessage{})
}
```

## Transaction Building

### Complete Example

```go
func sendKaspa(
    client *rpcclient.RPCClient,
    senderKey *btcec.PrivateKey,
    recipientAddress *util.Address,
    amount uint64,
) (*externalapi.DomainTransactionID, error) {
    ctx := context.Background()

    // Get sender address
    senderPubKey := senderKey.PubKey()
    senderAddress, err := util.NewAddressPublicKey(
        senderPubKey.SerializeCompressed(),
        util.Bech32PrefixKaspaMain,
    )
    if err != nil {
        return nil, err
    }

    // Get UTXOs
    utxosResponse, err := client.GetUtxosByAddresses(ctx,
        &rpccontext.GetUtxosByAddressesRequestMessage{
            Addresses: []string{senderAddress.String()},
        })
    if err != nil {
        return nil, err
    }

    // Select UTXOs
    var totalInput uint64
    var selectedUtxos []*externalapi.DomainUtxo

    for _, utxo := range utxosResponse.Entries {
        selectedUtxos = append(selectedUtxos, utxo)
        totalInput += utxo.Entry.Amount()

        if totalInput >= amount {
            break
        }
    }

    if totalInput < amount {
        return nil, errors.New("insufficient funds")
    }

    // Get fee estimate
    feeEstimate, err := client.GetFeeEstimate(ctx,
        &rpccontext.GetFeeEstimateRequestMessage{})
    if err != nil {
        return nil, err
    }

    // Calculate fee
    estimatedSize := uint64(200 + len(selectedUtxos)*150 + 35)
    fee := feeEstimate.NormalBucket.FeeRate * estimatedSize

    // Create outputs
    recipientScript, err := txscript.PayToAddrScript(recipientAddress)
    if err != nil {
        return nil, err
    }

    outputs := []*externalapi.DomainTransactionOutput{
        {
            Value:           amount,
            ScriptPublicKey: recipientScript,
        },
    }

    // Add change output
    change := totalInput - amount - fee
    if change > 546 {
        senderScript, err := txscript.PayToAddrScript(senderAddress)
        if err != nil {
            return nil, err
        }
        outputs = append(outputs, &externalapi.DomainTransactionOutput{
            Value:           change,
            ScriptPublicKey: senderScript,
        })
    }

    // Create inputs
    inputs := make([]*externalapi.DomainTransactionInput, len(selectedUtxos))
    for i, utxo := range selectedUtxos {
        inputs[i] = &externalapi.DomainTransactionInput{
            PreviousOutpoint: utxo.Outpoint,
            SignatureScript:  nil,
            Sequence:         0,
            SigOpCount:       1,
        }
    }

    // Create transaction
    tx := &externalapi.DomainTransaction{
        Version:      0,
        Inputs:       inputs,
        Outputs:      outputs,
        LockTime:     0,
        SubnetworkID: externalapi.DomainSubnetworkID{},
        Gas:          0,
        Payload:      nil,
    }

    // Sign transaction
    signedTx, err := signTransaction(tx, senderKey)
    if err != nil {
        return nil, err
    }

    // Submit
    response, err := client.SubmitTransaction(ctx,
        &rpccontext.SubmitTransactionRequestMessage{
            Transaction: signedTx,
            AllowOrphan: false,
        })
    if err != nil {
        return nil, err
    }

    return response.TransactionID, nil
}

func signTransaction(tx *externalapi.DomainTransaction,
    privateKey *btcec.PrivateKey) (*externalapi.DomainTransaction, error) {

    for i := range tx.Inputs {
        // Calculate signature hash
        sighash, err := txscript.CalcSignatureHash(
            tx.Outputs[tx.Inputs[i].PreviousOutpoint.Index].ScriptPublicKey,
            txscript.SigHashAll,
            tx,
            i,
        )
        if err != nil {
            return nil, err
        }

        // Sign
        signature, err := privateKey.Sign(sighash[:])
        if err != nil {
            return nil, err
        }

        // Create signature script
        sigScript, err := txscript.NewScriptBuilder().
            AddData(append(signature.Serialize(), byte(txscript.SigHashAll))).
            AddData(privateKey.PubKey().SerializeCompressed()).
            Script()
        if err != nil {
            return nil, err
        }

        tx.Inputs[i].SignatureScript = sigScript
    }

    return tx, nil
}
```

## Script Operations

### Pay to Address Script

```go
import "github.com/kaspanet/kaspad/domain/consensus/utils/txscript"

script, err := txscript.PayToAddrScript(address)
if err != nil {
    log.Fatal(err)
}
```

### Script Builder

```go
import "github.com/kaspanet/kaspad/domain/consensus/utils/txscript"

script, err := txscript.NewScriptBuilder().
    AddOp(txscript.OpDup).
    AddOp(txscript.OpHash160).
    AddData(publicKeyHash).
    AddOp(txscript.OpEqualVerify).
    AddOp(txscript.OpCheckSig).
    Script()
```

## Error Handling

```go
import (
    "errors"
    "github.com/kaspanet/kaspad/infrastructure/network/rpcclient"
)

func handleError(err error) {
    if err == nil {
        return
    }

    var rpcErr *rpcclient.RPCError
    if errors.As(err, &rpcErr) {
        switch rpcErr.Code {
        case rpcclient.ErrRPCInvalidAddressOrKey:
            log.Printf("Invalid address or key: %s", rpcErr.Message)
        case rpcclient.ErrRPCInvalidParameter:
            log.Printf("Invalid parameter: %s", rpcErr.Message)
        case rpcclient.ErrRPCClientNotConnected:
            log.Printf("Client not connected: %s", rpcErr.Message)
        default:
            log.Printf("RPC error %d: %s", rpcErr.Code, rpcErr.Message)
        }
    } else {
        log.Printf("Error: %v", err)
    }
}
```

## Best Practices

1. **Use context for cancellation** in all RPC calls
2. **Implement retry logic** for transient failures
3. **Validate all inputs** before sending to RPC
4. **Use proper UTXO selection** to minimize fees
5. **Implement fee estimation** for timely confirmations
6. **Secure private keys** using proper key management
7. **Test on testnet** before mainnet deployment

## Resources

- **GitHub**: https://github.com/kaspanet/kaspad
- **Documentation**: https://pkg.go.dev/github.com/kaspanet/kaspad
- **Go Report Card**: https://goreportcard.com/report/github.com/kaspanet/kaspad
