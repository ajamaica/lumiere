---
name: ethereum-read-only
version: 1.0.0
description: Foundry castを使用したウォレット不要のオンチェーン状態読み取り
---

# Ethereum読み取り専用アクセス

Foundryの`cast`コマンドを使用してウォレットなしでEthereumブロックチェーンの状態を読み取る方法。ブロック情報、コントラクト状態、イベントログ、ENS解決の実装ガイドです。

## セットアップ

### Foundryインストール

```bash
# Foundryインストール
curl -L https://foundry.paradigm.xyz | bash
foundryup

# 動作確認
cast --version
```

### RPC設定

```bash
# 環境変数設定（~/.bashrc または ~/.zshrc）
export ETH_RPC_URL="https://eth-mainnet.alchemyapi.io/v2/YOUR-API-KEY"
export POLYGON_RPC_URL="https://polygon-mainnet.g.alchemy.com/v2/YOUR-API-KEY"
export ARB_RPC_URL="https://arb-mainnet.g.alchemy.com/v2/YOUR-API-KEY"

# 無料RPCの使用（レート制限あり）
export ETH_RPC_URL="https://rpc.ankr.com/eth"
export POLYGON_RPC_URL="https://rpc.ankr.com/polygon"

# 設定確認
cast client --rpc-url $ETH_RPC_URL
```

## ブロック情報取得

### 基本的なブロック検査

```bash
#!/bin/bash
# block-inspector.sh

# 最新ブロック番号取得
get_latest_block() {
    echo "最新ブロック番号:"
    cast block-number --rpc-url $ETH_RPC_URL
}

# ブロック基本情報
inspect_block() {
    local block_number="$1"

    echo "=== ブロック $block_number 基本情報 ==="
    cast block "$block_number" --rpc-url $ETH_RPC_URL
}

# トランザクション込みの詳細ブロック情報
inspect_block_full() {
    local block_number="$1"

    echo "=== ブロック $block_number 詳細情報（トランザクション含む）==="
    cast block "$block_number" --full --rpc-url $ETH_RPC_URL
}

# ブロック統計
block_stats() {
    local block_number="$1"

    echo "=== ブロック $block_number 統計 ==="

    # トランザクション数
    local tx_count="$(cast block "$block_number" --rpc-url $ETH_RPC_URL | jq -r '.transactions | length')"
    echo "トランザクション数: $tx_count"

    # ガス使用量
    local gas_used="$(cast block "$block_number" --rpc-url $ETH_RPC_URL | jq -r '.gasUsed')"
    echo "ガス使用量: $gas_used"

    # タイムスタンプ
    local timestamp="$(cast block "$block_number" --rpc-url $ETH_RPC_URL | jq -r '.timestamp')"
    echo "ブロック時刻: $(date -d @$((timestamp)) +'%Y-%m-%d %H:%M:%S')"
}

# 使用例
get_latest_block
inspect_block "latest"
block_stats "latest"
```

### ブロック範囲分析

```bash
# block-range-analyzer.sh

analyze_block_range() {
    local start_block="$1"
    local end_block="$2"

    echo "=== ブロック範囲分析: $start_block - $end_block ==="

    local total_tx=0
    local total_gas=0

    for ((block=$start_block; block<=$end_block; block++)); do
        echo "ブロック $block を処理中..."

        local block_data="$(cast block "$block" --rpc-url $ETH_RPC_URL)"
        local tx_count="$(echo "$block_data" | jq -r '.transactions | length')"
        local gas_used="$(echo "$block_data" | jq -r '.gasUsed')"

        total_tx=$((total_tx + tx_count))
        total_gas=$((total_gas + gas_used))

        echo "  TX: $tx_count, Gas: $gas_used"
    done

    echo ""
    echo "=== サマリー ==="
    echo "総トランザクション数: $total_tx"
    echo "総ガス使用量: $total_gas"
    echo "平均TX/ブロック: $((total_tx / (end_block - start_block + 1)))"
}

# 使用例
analyze_block_range 19000000 19000010
```

## コントラクト状態読み取り

### 基本的なコントラクト呼び出し

```bash
#!/bin/bash
# contract-reader.sh

# ERC20トークン残高確認
check_erc20_balance() {
    local token_address="$1"
    local wallet_address="$2"

    echo "=== ERC20残高確認 ==="
    echo "トークン: $token_address"
    echo "ウォレット: $wallet_address"

    # balanceOf(address) 関数呼び出し
    local balance="$(cast call "$token_address" \
        "balanceOf(address)(uint256)" \
        "$wallet_address" \
        --rpc-url $ETH_RPC_URL)"

    echo "残高: $balance"

    # トークン名取得
    local name="$(cast call "$token_address" \
        "name()(string)" \
        --rpc-url $ETH_RPC_URL)"

    # トークンシンボル取得
    local symbol="$(cast call "$token_address" \
        "symbol()(string)" \
        --rpc-url $ETH_RPC_URL)"

    # 小数点桁数取得
    local decimals="$(cast call "$token_address" \
        "decimals()(uint8)" \
        --rpc-url $ETH_RPC_URL)"

    echo "トークン名: $name"
    echo "シンボル: $symbol"
    echo "小数点桁数: $decimals"

    # 人間が読める形式に変換
    local human_balance="$(cast to-dec "$balance")"
    local scaled_balance="$(echo "scale=6; $human_balance / 10^$decimals" | bc -l)"
    echo "表示用残高: $scaled_balance $symbol"
}

# Uniswap V3プール情報取得
check_uniswap_pool() {
    local pool_address="$1"

    echo "=== Uniswap V3 プール情報 ==="
    echo "プールアドレス: $pool_address"

    # プール基本情報
    local token0="$(cast call "$pool_address" "token0()(address)" --rpc-url $ETH_RPC_URL)"
    local token1="$(cast call "$pool_address" "token1()(address)" --rpc-url $ETH_RPC_URL)"
    local fee="$(cast call "$pool_address" "fee()(uint24)" --rpc-url $ETH_RPC_URL)"

    echo "Token0: $token0"
    echo "Token1: $token1"
    echo "手数料: $(cast to-dec "$fee") (0.01% = 100)"

    # 現在の流動性とプライス
    local liquidity="$(cast call "$pool_address" "liquidity()(uint128)" --rpc-url $ETH_RPC_URL)"
    echo "流動性: $(cast to-dec "$liquidity")"

    # slot0情報（価格、ティック等）
    local slot0="$(cast call "$pool_address" "slot0()(uint160,int24,uint16,uint16,uint16,uint8,bool)" --rpc-url $ETH_RPC_URL)"
    echo "Slot0: $slot0"
}

# ENSリバースルックアップ
resolve_ens() {
    local address="$1"

    echo "=== ENS解決 ==="
    echo "アドレス: $address"

    # ENS名前解決
    local ens_name="$(cast lookup-address "$address" --rpc-url $ETH_RPC_URL 2>/dev/null || echo "なし")"
    echo "ENS名: $ens_name"
}

# 使用例
check_erc20_balance "0xA0b86a33E6441b04B9b73f9251e9b49Cd2B3a64" "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"  # USDC, Vitalik
check_uniswap_pool "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8"  # USDC/ETH 0.3%
resolve_ens "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
```

## イベントログ検索

### ログ検索システム

```bash
#!/bin/bash
# event-log-searcher.sh

# Transfer イベント検索
search_transfer_events() {
    local contract_address="$1"
    local from_block="$2"
    local to_block="$3"
    local sender="${4:-}"
    local receiver="${5:-}"

    echo "=== Transfer イベント検索 ==="
    echo "コントラクト: $contract_address"
    echo "ブロック範囲: $from_block - $to_block"

    # Transfer(address,address,uint256) イベントシグネチャ
    local transfer_sig="0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"

    # 基本検索コマンド構築
    local cmd="cast logs --rpc-url $ETH_RPC_URL"
    cmd="$cmd --address $contract_address"
    cmd="$cmd --from-block $from_block"
    cmd="$cmd --to-block $to_block"
    cmd="$cmd $transfer_sig"

    # フィルター追加
    if [[ -n "$sender" ]]; then
        cmd="$cmd $sender"
    fi

    if [[ -n "$receiver" ]]; then
        if [[ -z "$sender" ]]; then
            cmd="$cmd '' $receiver"  # sender未指定の場合は空文字
        else
            cmd="$cmd $receiver"
        fi
    fi

    echo "実行コマンド: $cmd"

    # ログ実行と結果パース
    eval "$cmd" | jq -r '.[] | "ブロック: \(.blockNumber), TX: \(.transactionHash), ログインデックス: \(.logIndex)"'
}

# 汎用イベント検索
search_custom_events() {
    local contract_address="$1"
    local event_signature="$2"
    local from_block="$3"
    local to_block="$4"

    echo "=== カスタムイベント検索 ==="
    echo "シグネチャ: $event_signature"

    cast logs \
        --address "$contract_address" \
        --from-block "$from_block" \
        --to-block "$to_block" \
        "$event_signature" \
        --rpc-url $ETH_RPC_URL \
        | jq '.'
}

# DEX取引分析
analyze_dex_trades() {
    local pool_address="$1"
    local from_block="$2"
    local to_block="$3"

    echo "=== DEX取引分析 ==="

    # Swap イベント (Uniswap V3: Swap(address,address,int256,int256,uint160,uint128,int24))
    local swap_sig="0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67"

    cast logs \
        --address "$pool_address" \
        --from-block "$from_block" \
        --to-block "$to_block" \
        "$swap_sig" \
        --rpc-url $ETH_RPC_URL \
        | jq -r '.[] | "取引: ブロック \(.blockNumber), TX \(.transactionHash), ガス使用: \(.gasUsed)"'
}

# 使用例
search_transfer_events "0xA0b86a33E6441b04B9b73f9251e9b49Cd2B3a64" "19000000" "19000100"  # USDC transfers
search_custom_events "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984" "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925" "19000000" "19000050"  # UNI Approval
```

## ENS操作

### ENS解決システム

```bash
#!/bin/bash
# ens-resolver.sh

# ENS名からアドレス解決
resolve_ens_to_address() {
    local ens_name="$1"

    echo "=== ENS → アドレス解決 ==="
    echo "ENS名: $ens_name"

    # 基本的なアドレス解決
    local address="$(cast resolve-name "$ens_name" --rpc-url $ETH_RPC_URL)"
    echo "アドレス: $address"

    # コンテンツハッシュ取得（IPFS等）
    local content_hash="$(cast call 0x231b0Ee14048e9dCcD1d247744d114a4EB5E8E63 \
        "contenthash(bytes32)(bytes)" \
        "$(cast namehash "$ens_name")" \
        --rpc-url $ETH_RPC_URL 2>/dev/null || echo "なし")"
    echo "コンテンツハッシュ: $content_hash"

    # テキストレコード取得
    echo "テキストレコード:"
    for key in "email" "url" "avatar" "description" "notice" "keywords" "com.github" "com.twitter"; do
        local value="$(cast call 0x231b0Ee14048e9dCcD1d247744d114a4EB5E8E63 \
            "text(bytes32,string)(string)" \
            "$(cast namehash "$ens_name")" \
            "$key" \
            --rpc-url $ETH_RPC_URL 2>/dev/null || echo "")"
        if [[ -n "$value" && "$value" != '""' ]]; then
            echo "  $key: $value"
        fi
    done
}

# アドレスからENS名解決
resolve_address_to_ens() {
    local address="$1"

    echo "=== アドレス → ENS解決 ==="
    echo "アドレス: $address"

    local ens_name="$(cast lookup-address "$address" --rpc-url $ETH_RPC_URL 2>/dev/null || echo "なし")"
    echo "ENS名: $ens_name"

    # プライマリ名確認
    if [[ "$ens_name" != "なし" ]]; then
        local reverse_address="$(cast resolve-name "$ens_name" --rpc-url $ETH_RPC_URL)"
        if [[ "$reverse_address" == "$address" ]]; then
            echo "プライマリ名: はい"
        else
            echo "プライマリ名: いいえ（$reverse_address）"
        fi
    fi
}

# ENSドメイン情報詳細
ens_domain_info() {
    local ens_name="$1"

    echo "=== ENSドメイン詳細情報 ==="

    # 所有者情報
    local owner="$(cast call 0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e \
        "owner(bytes32)(address)" \
        "$(cast namehash "$ens_name")" \
        --rpc-url $ETH_RPC_URL)"
    echo "所有者: $owner"

    # レジストラ情報（.ethドメインの場合）
    if [[ "$ens_name" == *.eth ]]; then
        local registrar="0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85"
        local token_id="$(cast keccak "$(echo -n "${ens_name%.eth}")")"

        local registrant="$(cast call "$registrar" \
            "ownerOf(uint256)(address)" \
            "$token_id" \
            --rpc-url $ETH_RPC_URL 2>/dev/null || echo "なし")"
        echo "登録者: $registrant"

        # 有効期限
        local expires="$(cast call "$registrar" \
            "nameExpires(uint256)(uint256)" \
            "$token_id" \
            --rpc-url $ETH_RPC_URL 2>/dev/null || echo "0")"
        if [[ "$expires" != "0" ]]; then
            echo "有効期限: $(date -d @$((expires)) +'%Y-%m-%d %H:%M:%S')"
        fi
    fi
}

# 使用例
resolve_ens_to_address "vitalik.eth"
resolve_address_to_ens "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
ens_domain_info "uniswap.eth"
```

## ABI デコーディング

### トランザクション・ログ解析

```bash
#!/bin/bash
# abi-decoder.sh

# 関数呼び出しデコード
decode_function_call() {
    local tx_hash="$1"
    local abi_file="$2"  # JSONファイルまたはEtherscan署名

    echo "=== 関数呼び出しデコード ==="
    echo "TX: $tx_hash"

    # トランザクション詳細取得
    local tx_data="$(cast tx "$tx_hash" --rpc-url $ETH_RPC_URL)"
    local input_data="$(echo "$tx_data" | jq -r '.input')"
    local to_address="$(echo "$tx_data" | jq -r '.to')"

    echo "送信先: $to_address"
    echo "入力データ: ${input_data:0:50}..."

    # 4byteセレクタ抽出
    local selector="${input_data:2:8}"
    echo "関数セレクタ: 0x$selector"

    # 4byte.directory から関数名取得
    local function_sig="$(curl -s "https://www.4byte.directory/api/v1/signatures/?hex_signature=0x$selector" | jq -r '.results[0].text_signature')"
    echo "関数署名: $function_sig"

    # デコード（ABIファイルがある場合）
    if [[ -f "$abi_file" ]]; then
        cast 4byte-decode "$input_data" --abi-path "$abi_file"
    fi
}

# ログイベントデコード
decode_event_log() {
    local tx_hash="$1"
    local log_index="$2"
    local abi_file="$3"

    echo "=== イベントログデコード ==="

    # ログ取得
    local logs="$(cast receipt "$tx_hash" --rpc-url $ETH_RPC_URL | jq ".logs[$log_index]")"
    local topics="$(echo "$logs" | jq -r '.topics[]')"
    local data="$(echo "$logs" | jq -r '.data')"

    echo "トピック: $topics"
    echo "データ: $data"

    # イベント署名解決
    local event_sig="$(echo "$topics" | head -1 | cut -c3-)"
    local event_name="$(curl -s "https://www.4byte.directory/api/v1/event-signatures/?hex_signature=0x$event_sig" | jq -r '.results[0].text_signature')"
    echo "イベント署名: $event_name"

    # ABIデコード
    if [[ -f "$abi_file" ]]; then
        # Foundryでのログデコードは限定的なので、手動実装が必要
        echo "詳細デコードにはABIファイルと追加ツールが必要です"
    fi
}

# よく使われる関数セレクタ辞書
common_selectors() {
    echo "=== よく使われる関数セレクタ ==="
    cat << 'EOF'
0xa9059cbb: transfer(address,uint256)
0x095ea7b3: approve(address,uint256)
0x23b872dd: transferFrom(address,address,uint256)
0x70a08231: balanceOf(address)
0x18160ddd: totalSupply()
0xdd62ed3e: allowance(address,address)
0x40c10f19: mint(address,uint256)
0x42966c68: burn(uint256)
0x7ff36ab5: swapExactETHForTokens(uint256,address[],address,uint256)
0x38ed1739: swapExactTokensForTokens(uint256,uint256,address[],address,uint256)
EOF
}

# 使用例
common_selectors
# decode_function_call "0x..." "./erc20.abi.json"
```

## 実用的なスクリプト例

### DeFi ポートフォリオチェッカー

```bash
#!/bin/bash
# defi-portfolio-checker.sh

check_defi_portfolio() {
    local wallet="$1"

    echo "=== DeFi ポートフォリオ: $wallet ==="

    # ETH残高
    local eth_balance="$(cast balance "$wallet" --rpc-url $ETH_RPC_URL)"
    echo "ETH: $(cast to-ether "$eth_balance") ETH"

    # 主要トークン残高
    local tokens=(
        "0xA0b86a33E6441b04B9b73f9251e9b49Cd2B3a64:USDC:6"
        "0xdAC17F958D2ee523a2206206994597C13D831ec7:USDT:6"
        "0x6B175474E89094C44Da98b954EedeAC495271d0F:DAI:18"
        "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984:UNI:18"
    )

    for token in "${tokens[@]}"; do
        IFS=':' read -r address symbol decimals <<< "$token"
        local balance="$(cast call "$address" "balanceOf(address)(uint256)" "$wallet" --rpc-url $ETH_RPC_URL)"
        local human_balance="$(echo "scale=4; $(cast to-dec "$balance") / 10^$decimals" | bc -l)"
        echo "$symbol: $human_balance"
    done
}

# 使用例
check_defi_portfolio "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"
```

ウォレット管理やトランザクション送信を含む完全なcast CLIガイドは kairyuu.net/exchange/ での取引で入手可能です。
