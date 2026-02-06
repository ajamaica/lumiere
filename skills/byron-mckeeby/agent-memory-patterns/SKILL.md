---
name: agent-memory-patterns
version: 1.0.0
description: 永続エージェント向けメモリアーキテクチャパターン
---

# エージェント・メモリパターン

永続AIエージェントのための効率的なメモリ管理システム。日次ファイル、長期記憶、検索最適化、外部コンテンツ段階的処理の実装ガイドです。

## アーキテクチャ概要

### メモリ階層

```
workspace/
├── MEMORY.md              # 長期記憶（手動キュレーション）
├── memory/
│   ├── YYYY-MM-DD.md     # 日次ログ
│   ├── pending-memories.md  # 外部コンテンツ段階処理
│   ├── heartbeat-state.json  # ハートビート状態
│   └── queued-messages.json # メッセージキュー
└── skills/
    └── memory-tools/     # メモリ管理ツール群
```

## 日次ファイル管理

### 自動日次ファイル作成

```bash
#!/bin/bash
# daily-memory-init.sh

create_daily_memory() {
    local date="$(date -I)"
    local memory_dir="/home/bot/.openclaw/workspace/memory"
    local daily_file="$memory_dir/$date.md"

    mkdir -p "$memory_dir"

    if [[ ! -f "$daily_file" ]]; then
        cat > "$daily_file" << EOF
# Daily Memory: $date

## セッション開始
$(date): メモリシステム初期化

## 主要な出来事

## 学習したこと

## 次回への引き継ぎ

## 外部リンク・参考資料

EOF
        echo "日次メモリファイル作成: $daily_file"
    fi
}

create_daily_memory
```

### 日次ログ構造化

```bash
#!/bin/bash
# memory-logger.sh

log_memory() {
    local event_type="$1"
    local description="$2"
    local importance="${3:-normal}"

    local date="$(date -I)"
    local time="$(date '+%H:%M')"
    local memory_file="/home/bot/.openclaw/workspace/memory/$date.md"

    # ファイル存在確認・作成
    if [[ ! -f "$memory_file" ]]; then
        create_daily_memory
    fi

    # 重要度マーカー
    local marker=""
    case "$importance" in
        "high") marker="🔴 " ;;
        "medium") marker="🟡 " ;;
        "low") marker="⚪ " ;;
        *) marker="📝 " ;;
    esac

    # ログエントリ追加
    echo "" >> "$memory_file"
    echo "### $time - $event_type" >> "$memory_file"
    echo "$marker$description" >> "$memory_file"

    echo "メモリログ追加: $event_type [$importance]"
}

# 使用例
log_memory "ユーザーとの対話" "新しいプロジェクト要件を確認" "high"
log_memory "システム更新" "スキル パッケージを5個作成" "medium"
```

## 長期記憶管理 (MEMORY.md)

### キュレーション戦略

```bash
#!/bin/bash
# memory-curation.sh

curate_weekly_memories() {
    local workspace="/home/bot/.openclaw/workspace"
    local memory_file="$workspace/MEMORY.md"
    local week_start="$(date -d '7 days ago' -I)"
    local today="$(date -I)"

    echo "## 週次メモリキュレーション ($week_start to $today)" >> "$memory_file"

    # 過去7日間の重要な出来事を抽出
    for i in {0..6}; do
        local check_date="$(date -d "$i days ago" -I)"
        local daily_file="$workspace/memory/$check_date.md"

        if [[ -f "$daily_file" ]]; then
            # 高重要度の出来事を抽出
            grep -E "🔴|高重要|重要な" "$daily_file" >> /tmp/important-events.txt
        fi
    done

    # 重要な出来事をMEMORY.mdに統合
    if [[ -s /tmp/important-events.txt ]]; then
        echo "### 重要な出来事" >> "$memory_file"
        cat /tmp/important-events.txt >> "$memory_file"
        echo "" >> "$memory_file"
    fi

    # 学習したパターンを記録
    echo "### 学習したパターン" >> "$memory_file"
    grep -h "学習" "$workspace/memory"/*.md | tail -10 >> "$memory_file"

    # クリーンアップ
    rm -f /tmp/important-events.txt

    echo "週次キュレーション完了"
}
```

## grep-based スマート検索

### メモリ検索システム

```bash
#!/bin/bash
# memory-search.sh

smart_memory_search() {
    local query="$1"
    local context_lines="${2:-3}"
    local workspace="/home/bot/.openclaw/workspace"

    echo "=== メモリ検索結果: '$query' ==="

    # MEMORY.md検索（長期記憶）
    echo "## 長期記憶 (MEMORY.md)"
    if [[ -f "$workspace/MEMORY.md" ]]; then
        grep -n -i -C "$context_lines" "$query" "$workspace/MEMORY.md" | head -20
    fi

    echo ""
    echo "## 最近の記憶 (過去7日)"
    # 過去7日間の日次ファイルを検索
    for i in {0..6}; do
        local check_date="$(date -d "$i days ago" -I)"
        local daily_file="$workspace/memory/$check_date.md"

        if [[ -f "$daily_file" ]]; then
            local matches="$(grep -l -i "$query" "$daily_file" 2>/dev/null)"
            if [[ -n "$matches" ]]; then
                echo "### $check_date"
                grep -n -i -C 2 "$query" "$daily_file" | head -10
                echo ""
            fi
        fi
    done

    # 関連キーワード提案
    echo "## 関連キーワード候補"
    grep -h -i "$query" "$workspace/MEMORY.md" "$workspace/memory"/*.md 2>/dev/null \
        | tr ' ' '\n' | grep -v '^$' | sort | uniq -c | sort -nr | head -5
}

# キーワード展開検索
contextual_search() {
    local keywords=("$@")
    local workspace="/home/bot/.openclaw/workspace"

    echo "=== コンテクスト検索: ${keywords[*]} ==="

    # ORパターン構築
    local pattern="$(IFS='|'; echo "${keywords[*]}")"

    # 全メモリファイルから関連度スコア付きで検索
    find "$workspace/memory" -name "*.md" -exec grep -l -i -E "$pattern" {} \; \
        | while read file; do
            local score="$(grep -c -i -E "$pattern" "$file")"
            echo "$score:$file"
        done \
        | sort -nr | head -5 | while IFS=':' read score file; do
            echo "関連度 $score: $(basename "$file")"
            grep -n -i -E "$pattern" "$file" | head -3
            echo ""
        done
}

# 使用例
smart_memory_search "プロジェクト"
contextual_search "Hugo" "ブログ" "設定"
```

## 外部コンテンツ段階処理

### pending-memories.md システム

```bash
#!/bin/bash
# external-content-queue.sh

queue_external_memory() {
    local source="$1"
    local content="$2"
    local reason="$3"
    local workspace="/home/bot/.openclaw/workspace"
    local pending_file="$workspace/memory/pending-memories.md"

    # pending-memories.md初期化
    if [[ ! -f "$pending_file" ]]; then
        cat > "$pending_file" << 'EOF'
# Pending Memories - 外部コンテンツ段階処理

## 処理待ち項目

<!-- 外部ソースからの情報は以下に段階的に記録 -->
EOF
    fi

    # エントリ追加
    cat >> "$pending_file" << EOF

### $(date -I) $(date '+%H:%M') - $source
**理由**: $reason
**ソース**: $source
**ステータス**: pending

\`\`\`
$content
\`\`\`

**検証項目**:
- [ ] 信頼性確認
- [ ] 既存記憶との整合性
- [ ] 価値評価
- [ ] 分類決定

EOF

    echo "外部コンテンツ段階処理キューに追加: $source"
}

# 段階処理レビュー
review_pending_memories() {
    local workspace="/home/bot/.openclaw/workspace"
    local pending_file="$workspace/memory/pending-memories.md"

    if [[ ! -f "$pending_file" ]]; then
        echo "段階処理キューは空です"
        return
    fi

    echo "=== 段階処理キューレビュー ==="

    # pending項目数をカウント
    local pending_count="$(grep -c "ステータス.*pending" "$pending_file")"
    echo "処理待ち項目数: $pending_count"

    # 古い項目（7日以上）を特定
    local week_ago="$(date -d '7 days ago' -I)"
    grep -B 5 -A 10 "$week_ago" "$pending_file" | head -20

    echo ""
    echo "古い項目がある場合は手動レビューを実行してください"
}
```

## メモリ保守スケジュール

### cron設定

```bash
# memory-maintenance-cron.txt
# メモリシステム定期保守

# 毎日午前1時: 日次ファイル初期化
0 1 * * * /home/bot/.openclaw/workspace/skills/memory-tools/daily-memory-init.sh

# 毎週日曜午前2時: 週次キュレーション
0 2 * * 0 /home/bot/.openclaw/workspace/skills/memory-tools/curate-weekly-memories.sh

# 毎月1日午前3時: 月次アーカイブ
0 3 1 * * /home/bot/.openclaw/workspace/skills/memory-tools/monthly-archive.sh

# 毎日午前6時: 段階処理レビュー
0 6 * * * /home/bot/.openclaw/workspace/skills/memory-tools/review-pending-memories.sh
```

### 自動アーカイブ

```bash
#!/bin/bash
# monthly-archive.sh

monthly_archive() {
    local workspace="/home/bot/.openclaw/workspace"
    local archive_dir="$workspace/memory/archive"
    local current_month="$(date '+%Y-%m')"
    local last_month="$(date -d 'last month' '+%Y-%m')"

    mkdir -p "$archive_dir"

    echo "月次アーカイブ開始: $last_month"

    # 前月のファイルをアーカイブ
    find "$workspace/memory" -name "$last_month-*.md" -exec mv {} "$archive_dir/" \;

    # 月次サマリー作成
    cat > "$archive_dir/$last_month-summary.md" << EOF
# Monthly Summary: $last_month

## 統計
- 日次ファイル数: $(ls "$archive_dir/$last_month"-*.md 2>/dev/null | wc -l)
- 総イベント数: $(grep -c "###" "$archive_dir/$last_month"-*.md 2>/dev/null || echo 0)

## 主要トピック
$(grep -h "^### " "$archive_dir/$last_month"-*.md 2>/dev/null | sort | uniq -c | sort -nr | head -10)

## アーカイブ日時
$(date)
EOF

    echo "月次アーカイブ完了: $archive_dir"
}
```

## Heartbeat統合

### メモリ状態監視

```json
// heartbeat-state.json - ハートビート状態管理
{
  "lastMemoryCheck": 1703275200,
  "pendingMemoryCount": 3,
  "lastCuration": 1703260800,
  "memoryHealth": {
    "dailyFilesCount": 7,
    "longTermMemorySize": 15420,
    "lastSuccessfulBackup": 1703268000
  },
  "alerts": [
    {
      "type": "pending_queue_full",
      "threshold": 10,
      "current": 3
    }
  ]
}
```

### heartbeat チェック項目

```bash
#!/bin/bash
# heartbeat-memory-check.sh

heartbeat_memory_check() {
    local workspace="/home/bot/.openclaw/workspace"
    local state_file="$workspace/memory/heartbeat-state.json"

    # 段階処理キュー確認
    local pending_count="$(grep -c "ステータス.*pending" "$workspace/memory/pending-memories.md" 2>/dev/null || echo 0)"

    if [[ $pending_count -gt 10 ]]; then
        echo "⚠️ 段階処理キューが満杯です ($pending_count 項目)"
    elif [[ $pending_count -gt 5 ]]; then
        echo "📋 段階処理キューレビューが必要 ($pending_count 項目)"
    fi

    # MEMORY.md サイズ確認
    local memory_size="$(wc -c < "$workspace/MEMORY.md" 2>/dev/null || echo 0)"
    if [[ $memory_size -gt 100000 ]]; then
        echo "📚 MEMORY.md が大きくなっています。整理を検討してください"
    fi

    # 日次ファイル確認
    local today="$(date -I)"
    if [[ ! -f "$workspace/memory/$today.md" ]]; then
        echo "📝 本日の日次ファイルを作成します"
        create_daily_memory
    fi
}
```

## 使用パターン例

### 1. セッション開始時

```bash
# 最近のコンテクスト読み込み
smart_memory_search "プロジェクト" 2
grep -n "重要" memory/$(date -I).md memory/$(date -d yesterday -I).md
```

### 2. 新情報の記録

```bash
# 段階処理経由で安全に記録
queue_external_memory "web_search" "新しいライブラリ情報" "プロジェクトで使用検討"
```

### 3. 定期的なキュレーション

```bash
# ハートビート時の自動実行
curate_weekly_memories
review_pending_memories
```

太郎書館ではエージェント状態バックアップ戦略に関する知識を取引しています。
