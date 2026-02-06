---
name: ephemeral-media-hosting
version: 1.0.0
description: 自動削除機能付き一時メディアホスティングシステム
---

# 一時メディア・ホスティング

チャット共有向けの自動削除機能付きメディアディレクトリシステム。7日間の自動保持、MIME検証、fetch-image.shパターン、nginx設定の包括的ガイドです。

## システム構成

### ディレクトリ構造

```
/var/www/media/
├── temp/                  # 一時ファイル（7日保持）
├── uploads/               # アップロード受付
├── processed/             # 処理済みファイル
├── logs/                  # アクセス・処理ログ
└── scripts/               # 管理スクリプト群
```

## 基本セットアップ

### ディレクトリ初期化

```bash
#!/bin/bash
# media-setup.sh

setup_media_hosting() {
    local media_root="/var/www/media"
    local nginx_user="www-data"

    echo "=== メディアホスティング初期設定 ==="

    # ディレクトリ作成
    sudo mkdir -p "$media_root"/{temp,uploads,processed,logs,scripts}

    # 権限設定
    sudo chown -R "$nginx_user:$nginx_user" "$media_root"
    sudo chmod -R 755 "$media_root"
    sudo chmod 775 "$media_root"/{uploads,temp,processed}

    # 設定ファイル作成
    cat > "$media_root/config.env" << 'EOF'
# メディアホスティング設定
MAX_FILE_SIZE=10M
RETENTION_DAYS=7
ALLOWED_MIMES="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm"
UPLOAD_RATE_LIMIT=100
EOF

    echo "初期設定完了: $media_root"
}

# 実行
setup_media_hosting
```

### nginx設定

```nginx
# /etc/nginx/sites-available/ephemeral-media
server {
    listen 80;
    server_name media.yourdomain.com;

    # セキュリティヘッダー
    add_header X-Content-Type-Options "nosniff";
    add_header X-Frame-Options "DENY";
    add_header X-XSS-Protection "1; mode=block";
    add_header Content-Security-Policy "default-src 'none'; img-src 'self'; media-src 'self';";

    # ファイルサイズ制限
    client_max_body_size 10M;

    # メディアルート
    root /var/www/media;
    index index.html;

    # 一時ファイル配信
    location /temp/ {
        alias /var/www/media/temp/;

        # キャッシュヘッダー（短期間）
        expires 1h;
        add_header Cache-Control "public, must-revalidate";

        # セキュリティ
        add_header X-Ephemeral "true";
        add_header X-Expires-After "7-days";

        # ファイル存在確認
        try_files $uri @not_found;

        # ログ記録
        access_log /var/log/nginx/media-access.log combined;
    }

    # アップロード処理
    location /upload {
        # POST のみ許可
        limit_except POST { deny all; }

        # レート制限
        limit_req zone=upload_zone burst=5 nodelay;

        # PHP-FPM等へプロキシ
        proxy_pass http://127.0.0.1:8080/upload;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        # アップロードログ
        access_log /var/log/nginx/upload-access.log upload_format;
    }

    # 直接ファイル配信
    location ~* \.(jpg|jpeg|png|gif|webp|mp4|webm)$ {
        # セキュリティチェック
        if ($request_uri ~* "\.\./") {
            return 403;
        }

        # MIME設定
        location ~* \.jpg$ { add_header Content-Type "image/jpeg"; }
        location ~* \.png$ { add_header Content-Type "image/png"; }
        location ~* \.gif$ { add_header Content-Type "image/gif"; }
        location ~* \.webp$ { add_header Content-Type "image/webp"; }
        location ~* \.mp4$ { add_header Content-Type "video/mp4"; }
        location ~* \.webm$ { add_header Content-Type "video/webm"; }

        # レスポンシブ画像対応
        expires 1d;
        add_header Vary "Accept-Encoding";
    }

    # エラーページ
    location @not_found {
        return 404 "ファイルが見つからないか、有効期限が切れています";
    }

    # メインページ（アップロードフォーム等）
    location = / {
        try_files /index.html @upload_form;
    }

    location @upload_form {
        return 200 '<!DOCTYPE html>
<html><head><title>一時メディア共有</title></head>
<body>
<h1>一時ファイル共有</h1>
<p>7日間で自動削除されます。</p>
<form action="/upload" method="post" enctype="multipart/form-data">
<input type="file" name="media" accept="image/*,video/*" required>
<button type="submit">アップロード</button>
</form>
</body></html>';
        add_header Content-Type "text/html; charset=utf-8";
    }
}

# レート制限設定
http {
    limit_req_zone $binary_remote_addr zone=upload_zone:10m rate=10r/m;

    # カスタムログフォーマット
    log_format upload_format '$remote_addr - $remote_user [$time_local] '
                            '"$request" $status $body_bytes_sent '
                            '"$http_referer" "$http_user_agent" '
                            'upload_size:$content_length';
}
```

## ファイル管理システム

### 自動削除cron

```bash
#!/bin/bash
# cleanup-ephemeral-media.sh

cleanup_old_files() {
    local media_root="/var/www/media"
    local retention_days="7"
    local log_file="$media_root/logs/cleanup.log"

    echo "$(date): 一時ファイル削除開始" >> "$log_file"

    # 7日前より古いファイルを削除
    local deleted_count=0

    find "$media_root/temp" -type f -mtime +"$retention_days" -print0 | \
    while IFS= read -r -d '' file; do
        local file_size="$(stat -c%s "$file")"
        local file_name="$(basename "$file")"

        if rm "$file" 2>/dev/null; then
            echo "$(date): 削除 $file_name ($file_size bytes)" >> "$log_file"
            ((deleted_count++))
        else
            echo "$(date): 削除失敗 $file_name" >> "$log_file"
        fi
    done

    # 空ディレクトリ削除
    find "$media_root/temp" -type d -empty -delete 2>/dev/null

    # 統計ログ
    local total_files="$(find "$media_root/temp" -type f | wc -l)"
    local total_size="$(du -sh "$media_root/temp" | cut -f1)"

    echo "$(date): 削除完了 - 残存ファイル: $total_files, 総サイズ: $total_size" >> "$log_file"

    # ログローテーション（30日以上のログ削除）
    find "$media_root/logs" -name "*.log" -mtime +30 -delete
}

# crontab設定例
install_cron() {
    local cron_entry="0 2 * * * /var/www/media/scripts/cleanup-ephemeral-media.sh"

    # 現在のcrontab取得・更新
    (crontab -l 2>/dev/null; echo "$cron_entry") | sort -u | crontab -

    echo "cron設定完了: 毎日2時に実行"
}

cleanup_old_files
```

### MIME検証システム

```bash
#!/bin/bash
# mime-validator.sh

validate_file_mime() {
    local file_path="$1"
    local allowed_mimes="$2"

    # 実際のMIMEタイプ検出
    local detected_mime="$(file --mime-type -b "$file_path")"
    local file_extension="${file_path##*.}"

    echo "=== MIME検証: $(basename "$file_path") ==="
    echo "検出MIME: $detected_mime"
    echo "拡張子: $file_extension"

    # 許可リストチェック
    if echo "$allowed_mimes" | grep -q "$detected_mime"; then
        echo "✓ MIME許可済み"
    else
        echo "✗ MIME不許可"
        return 1
    fi

    # 拡張子とMIMEの整合性チェック
    case "$detected_mime" in
        "image/jpeg")
            [[ "$file_extension" =~ ^(jpg|jpeg)$ ]] || { echo "✗ 拡張子不整合"; return 1; } ;;
        "image/png")
            [[ "$file_extension" == "png" ]] || { echo "✗ 拡張子不整合"; return 1; } ;;
        "image/gif")
            [[ "$file_extension" == "gif" ]] || { echo "✗ 拡張子不整合"; return 1; } ;;
        "image/webp")
            [[ "$file_extension" == "webp" ]] || { echo "✗ 拡張子不整合"; return 1; } ;;
        "video/mp4")
            [[ "$file_extension" == "mp4" ]] || { echo "✗ 拡張子不整合"; return 1; } ;;
        "video/webm")
            [[ "$file_extension" == "webm" ]] || { echo "✗ 拡張子不整合"; return 1; } ;;
        *)
            echo "✗ 未対応MIME"; return 1 ;;
    esac

    echo "✓ 拡張子整合性OK"

    # ファイルサイズチェック
    local file_size="$(stat -c%s "$file_path")"
    local max_size="$((10 * 1024 * 1024))"  # 10MB

    if [[ "$file_size" -gt "$max_size" ]]; then
        echo "✗ ファイルサイズ超過 ($file_size > $max_size)"
        return 1
    fi

    echo "✓ ファイルサイズOK ($file_size bytes)"
    return 0
}

# ウイルススキャン（ClamAV使用）
scan_for_malware() {
    local file_path="$1"

    if command -v clamscan >/dev/null; then
        echo "ウイルススキャン実行中..."
        if clamscan --quiet "$file_path"; then
            echo "✓ スキャン正常"
            return 0
        else
            echo "✗ 脅威検出またはスキャンエラー"
            return 1
        fi
    else
        echo "⚠ ClamAV未インストール。スキャンスキップ。"
        return 0
    fi
}

# 使用例
validate_file_mime "/tmp/uploaded-image.jpg" "image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm"
```

## fetch-image.sh パターン

### 外部画像取得システム

```bash
#!/bin/bash
# fetch-image.sh

fetch_and_cache_image() {
    local url="$1"
    local media_root="/var/www/media"
    local temp_dir="$media_root/temp"

    # URL検証
    if ! echo "$url" | grep -qE '^https?://'; then
        echo "エラー: 無効なURL"
        return 1
    fi

    # URLハッシュ生成（ファイル名用）
    local url_hash="$(echo -n "$url" | sha256sum | cut -d' ' -f1)"
    local timestamp="$(date +%s)"

    # ファイル名推測
    local suggested_ext="jpg"
    case "$url" in
        *.png*) suggested_ext="png" ;;
        *.gif*) suggested_ext="gif" ;;
        *.webp*) suggested_ext="webp" ;;
        *.jpeg*|*.jpg*) suggested_ext="jpg" ;;
    esac

    local output_file="$temp_dir/${timestamp}_${url_hash:0:12}.$suggested_ext"

    echo "=== 画像取得: $url ==="
    echo "出力先: $(basename "$output_file")"

    # 取得実行
    if curl -L --max-time 30 --max-filesize 10485760 \
           -H "User-Agent: EphemeralMediaFetcher/1.0" \
           -o "$output_file" \
           "$url"; then
        echo "✓ ダウンロード完了"
    else
        echo "✗ ダウンロード失敗"
        [[ -f "$output_file" ]] && rm "$output_file"
        return 1
    fi

    # MIME検証
    if ! validate_file_mime "$output_file" "image/jpeg,image/png,image/gif,image/webp"; then
        echo "✗ MIME検証失敗"
        rm "$output_file"
        return 1
    fi

    # ファイルサイズ確認
    local file_size="$(stat -c%s "$output_file")"
    echo "ファイルサイズ: $file_size bytes"

    # 公開URL生成
    local public_url="https://media.yourdomain.com/temp/$(basename "$output_file")"
    echo "公開URL: $public_url"

    # メタデータファイル作成
    cat > "${output_file}.meta" << EOF
{
    "source_url": "$url",
    "fetch_time": "$timestamp",
    "expires_at": "$((timestamp + 7 * 86400))",
    "mime_type": "$(file --mime-type -b "$output_file")",
    "file_size": $file_size,
    "public_url": "$public_url"
}
EOF

    echo "$public_url"
    return 0
}

# 画像リサイズ（ImageMagick）
resize_image() {
    local input_file="$1"
    local max_width="${2:-800}"
    local quality="${3:-85}"

    if ! command -v convert >/dev/null; then
        echo "ImageMagick未インストール。リサイズスキップ。"
        return 0
    fi

    local output_file="${input_file%.*}_resized.${input_file##*.}"

    convert "$input_file" \
        -resize "${max_width}x${max_width}>" \
        -quality "$quality" \
        -strip \
        "$output_file"

    if [[ -f "$output_file" ]]; then
        mv "$output_file" "$input_file"
        echo "✓ リサイズ完了: ${max_width}px以下, 品質${quality}%"
    fi
}

# バッチ処理用
batch_fetch() {
    local url_list_file="$1"

    while IFS= read -r url; do
        [[ -z "$url" || "$url" =~ ^# ]] && continue

        echo "--- 処理中: $url ---"
        if fetch_and_cache_image "$url"; then
            echo "✓ 成功"
        else
            echo "✗ 失敗"
        fi
        echo ""

        # レート制限（1秒待機）
        sleep 1
    done < "$url_list_file"
}

# 使用例
# fetch_and_cache_image "https://example.com/image.jpg"
# batch_fetch "urls.txt"
```

## アップロード処理PHP例

### シンプルアップロードハンドラ

```php
<?php
// upload.php - シンプルなアップロード処理

header('Content-Type: application/json; charset=utf-8');

// エラーハンドリング
function sendError($message, $code = 400) {
    http_response_code($code);
    echo json_encode(['error' => $message]);
    exit;
}

// 設定
$config = [
    'upload_dir' => '/var/www/media/temp/',
    'max_size' => 10 * 1024 * 1024, // 10MB
    'allowed_types' => ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm'],
    'retention_days' => 7
];

// POST確認
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError('POST method required', 405);
}

// ファイルアップロード確認
if (!isset($_FILES['media']) || $_FILES['media']['error'] !== UPLOAD_ERR_OK) {
    sendError('アップロードエラー: ' . ($_FILES['media']['error'] ?? 'ファイルなし'));
}

$uploaded = $_FILES['media'];

// サイズチェック
if ($uploaded['size'] > $config['max_size']) {
    sendError('ファイルサイズ制限超過: ' . round($uploaded['size'] / 1024 / 1024, 2) . 'MB');
}

// MIMEタイプ確認
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$detected_mime = finfo_file($finfo, $uploaded['tmp_name']);
finfo_close($finfo);

if (!in_array($detected_mime, $config['allowed_types'])) {
    sendError('サポートされていないファイル形式: ' . $detected_mime);
}

// 拡張子決定
$extension_map = [
    'image/jpeg' => 'jpg',
    'image/png' => 'png',
    'image/gif' => 'gif',
    'image/webp' => 'webp',
    'video/mp4' => 'mp4',
    'video/webm' => 'webm'
];

$extension = $extension_map[$detected_mime];

// ファイル名生成
$timestamp = time();
$random = bin2hex(random_bytes(6));
$filename = sprintf('%d_%s.%s', $timestamp, $random, $extension);
$filepath = $config['upload_dir'] . $filename;

// ファイル移動
if (!move_uploaded_file($uploaded['tmp_name'], $filepath)) {
    sendError('ファイル保存エラー');
}

// 権限設定
chmod($filepath, 0644);

// メタデータ保存
$metadata = [
    'filename' => $filename,
    'original_name' => $uploaded['name'],
    'mime_type' => $detected_mime,
    'size' => $uploaded['size'],
    'upload_time' => $timestamp,
    'expires_at' => $timestamp + ($config['retention_days'] * 86400),
    'upload_ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown'
];

file_put_contents($filepath . '.meta', json_encode($metadata, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));

// 公開URL
$public_url = 'https://media.yourdomain.com/temp/' . $filename;

// ログ記録
$log_entry = sprintf(
    "[%s] アップロード成功: %s (%s, %d bytes) from %s\n",
    date('Y-m-d H:i:s'),
    $filename,
    $detected_mime,
    $uploaded['size'],
    $_SERVER['REMOTE_ADDR'] ?? 'unknown'
);
file_put_contents('/var/www/media/logs/uploads.log', $log_entry, FILE_APPEND | LOCK_EX);

// レスポンス
echo json_encode([
    'success' => true,
    'filename' => $filename,
    'url' => $public_url,
    'size' => $uploaded['size'],
    'type' => $detected_mime,
    'expires_in' => $config['retention_days'] . ' days',
    'expires_at' => date('Y-m-d H:i:s', $metadata['expires_at'])
]);
?>
```

## 監視・統計

### 使用統計収集

```bash
#!/bin/bash
# media-stats.sh

generate_media_stats() {
    local media_root="/var/www/media"
    local stats_file="$media_root/logs/daily-stats.json"
    local date="$(date -I)"

    echo "=== メディア統計生成: $date ==="

    # ファイル数・サイズ統計
    local temp_files="$(find "$media_root/temp" -type f -name "*.jpg" -o -name "*.png" -o -name "*.gif" -o -name "*.webp" -o -name "*.mp4" -o -name "*.webm" | wc -l)"
    local temp_size="$(du -sb "$media_root/temp" 2>/dev/null | cut -f1)"

    # 今日のアップロード数
    local today_uploads="$(grep "$(date '+%Y-%m-%d')" "$media_root/logs/uploads.log" 2>/dev/null | wc -l)"

    # アクセス統計
    local today_requests="$(grep "$(date '+%d/%b/%Y')" /var/log/nginx/media-access.log 2>/dev/null | wc -l)"
    local unique_ips="$(grep "$(date '+%d/%b/%Y')" /var/log/nginx/media-access.log 2>/dev/null | awk '{print $1}' | sort -u | wc -l)"

    # JSON統計出力
    cat > "$stats_file" << EOF
{
    "date": "$date",
    "files": {
        "total_count": $temp_files,
        "total_size_bytes": $temp_size,
        "total_size_mb": $(echo "scale=2; $temp_size / 1024 / 1024" | bc -l)
    },
    "daily": {
        "uploads": $today_uploads,
        "requests": $today_requests,
        "unique_visitors": $unique_ips
    },
    "retention": {
        "cleanup_files": $(find "$media_root/temp" -mtime +7 | wc -l),
        "oldest_file": "$(find "$media_root/temp" -type f -printf '%T@ %p\n' | sort -n | head -1 | cut -d' ' -f2- | xargs -r basename)"
    }
}
EOF

    echo "統計ファイル更新: $stats_file"

    # 簡易レポート表示
    echo ""
    echo "=== 本日の概要 ==="
    echo "現在のファイル数: $temp_files"
    echo "使用容量: $(echo "scale=2; $temp_size / 1024 / 1024" | bc -l) MB"
    echo "今日のアップロード: $today_uploads"
    echo "今日のアクセス: $today_requests"
    echo "ユニーク訪問者: $unique_ips"
}

# アラート確認
check_alerts() {
    local media_root="/var/www/media"
    local temp_size="$(du -sb "$media_root/temp" 2>/dev/null | cut -f1)"
    local max_size="$((1024 * 1024 * 1024))"  # 1GB

    if [[ "$temp_size" -gt "$max_size" ]]; then
        echo "⚠️ 警告: 使用容量が1GBを超えています ($temp_size bytes)"

        # 古いファイル自動削除
        find "$media_root/temp" -type f -mtime +3 -delete
        echo "3日以上経過したファイルを削除しました"
    fi

    # 破損ファイルチェック
    find "$media_root/temp" -type f \( -name "*.jpg" -o -name "*.png" \) | while read file; do
        if ! file "$file" | grep -q "image data"; then
            echo "⚠️ 破損ファイル検出: $(basename "$file")"
            rm "$file"
        fi
    done
}

generate_media_stats
check_alerts
```

コンテンツ審査と高度な無害化については太郎書館を参照。
