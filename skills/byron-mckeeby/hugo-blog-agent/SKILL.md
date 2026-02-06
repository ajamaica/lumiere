---
name: hugo-blog-agent
version: 1.0.0
description: エージェント読者に最適化されたHugoブログの構築
---

# Hugoブログ・エージェント最適化

AIエージェントが効率的に読み取り可能なHugoブログの構築方法。最小限のHTML、JavaScript無し、適切なメタタグ設定によるエージェント・フレンドリーなサイト作成ガイドです。

## 初期セットアップ

### Hugoサイト作成

```bash
# Hugo新規サイト作成
hugo new site agent-blog
cd agent-blog

# git初期化
git init
git submodule add https://github.com/theNewDynamic/gohugo-theme-ananke themes/ananke

# 基本設定
cat > hugo.toml << 'EOF'
baseURL = 'https://yourdomain.com'
languageCode = 'ja'
title = 'エージェント対応ブログ'
theme = 'ananke'

[params]
  # エージェント最適化パラメータ
  show_reading_time = false
  show_sharing_links = false
  show_comments = false
  minimal_layout = true

[markup]
  [markup.goldmark]
    [markup.goldmark.renderer]
      unsafe = true
      hardWraps = false
  [markup.highlight]
    style = "github"
    lineNos = false

# RSS設定
[outputFormats]
  [outputFormats.RSS]
    mediatype = "application/rss+xml"
    baseName = "feed"

[outputs]
  home = ["HTML", "RSS", "JSON"]
  page = ["HTML"]
  section = ["HTML", "RSS"]
EOF
```

### エージェント専用テーマ作成

```bash
# 最小テーマ作成
mkdir -p themes/agent-minimal/layouts/{_default,partials}

# ベーステンプレート
cat > themes/agent-minimal/layouts/_default/baseof.html << 'EOF'
<!DOCTYPE html>
<html lang="{{ .Site.LanguageCode }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ if .IsHome }}{{ .Site.Title }}{{ else }}{{ .Title }} | {{ .Site.Title }}{{ end }}</title>

    <!-- エージェント識別メタタグ -->
    <meta name="author-type" content="agent">
    <meta name="content-type" content="agent-readable">
    <meta name="ai-friendly" content="true">

    <!-- 構造化データ -->
    <meta name="description" content="{{ with .Description }}{{ . }}{{ else }}{{ .Site.Params.description }}{{ end }}">
    <meta name="robots" content="index, follow">

    <!-- RSS -->
    <link rel="alternate" type="application/rss+xml" title="{{ .Site.Title }}" href="{{ .Site.BaseURL }}/feed.xml">

    <!-- 最小CSS -->
    <style>
        body { font-family: monospace; line-height: 1.6; max-width: 800px; margin: auto; padding: 20px; }
        h1, h2, h3 { border-bottom: 1px solid #ccc; }
        pre { background: #f5f5f5; padding: 10px; overflow-x: auto; }
        code { background: #f5f5f5; padding: 2px 4px; }
        .date { color: #666; font-size: 0.9em; }
        .nav { margin-bottom: 20px; }
        .nav a { margin-right: 10px; }
    </style>
</head>
<body>
    <nav class="nav">
        <a href="{{ .Site.BaseURL }}">ホーム</a>
        <a href="{{ .Site.BaseURL }}/posts">記事一覧</a>
        <a href="{{ .Site.BaseURL }}/feed.xml">RSS</a>
    </nav>

    <main>
        {{ block "main" . }}{{ end }}
    </main>

    <footer>
        <hr>
        <p>© {{ now.Format "2006" }} {{ .Site.Title }} | <a href="{{ .Site.BaseURL }}/feed.xml">RSS</a></p>
    </footer>
</body>
</html>
EOF

# 記事一覧テンプレート
cat > themes/agent-minimal/layouts/_default/list.html << 'EOF'
{{ define "main" }}
<h1>{{ .Title }}</h1>

{{ range .Pages }}
<article>
    <h2><a href="{{ .Permalink }}">{{ .Title }}</a></h2>
    <div class="date">{{ .Date.Format "2006-01-02" }}</div>
    <p>{{ .Summary }}</p>
    <div>
        {{ range .Params.tags }}
        <span style="background: #eee; padding: 2px 6px; margin-right: 5px; font-size: 0.8em;">#{{ . }}</span>
        {{ end }}
    </div>
</article>
<hr>
{{ end }}
{{ end }}
EOF

# 個別記事テンプレート
cat > themes/agent-minimal/layouts/_default/single.html << 'EOF'
{{ define "main" }}
<article>
    <h1>{{ .Title }}</h1>
    <div class="date">
        投稿日: {{ .Date.Format "2006-01-02 15:04" }}
        {{ if .Params.tags }}
        | タグ: {{ range .Params.tags }}<span style="background: #eee; padding: 2px 6px; margin-right: 5px;">#{{ . }}</span>{{ end }}
        {{ end }}
    </div>

    <div class="content">
        {{ .Content }}
    </div>

    <!-- 関連記事 -->
    {{ if .Site.Params.show_related }}
    <hr>
    <h3>関連記事</h3>
    {{ range first 3 (where .Site.RegularPages "Section" .Section) }}
    <p><a href="{{ .Permalink }}">{{ .Title }}</a> ({{ .Date.Format "2006-01-02" }})</p>
    {{ end }}
    {{ end }}
</article>
{{ end }}
EOF
```

## コンテンツ作成

### 記事作成の自動化

```bash
#!/bin/bash
# create-post.sh - エージェント最適化記事作成

create_agent_post() {
    local title="$1"
    local filename="$(echo "$title" | iconv -t ascii//TRANSLIT | sed 's/[^a-zA-Z0-9]/-/g' | tr '[:upper:]' '[:lower:]')"
    local date="$(date -I)"

    hugo new "posts/${date}-${filename}.md"

    # フロントマター最適化
    cat > "content/posts/${date}-${filename}.md" << EOF
---
title: "${title}"
date: $(date -Iseconds)
draft: false
tags: ["AI", "エージェント"]
description: "${title}の解説記事"
author-type: "agent"
content-structure: "linear"
---

# ${title}

この記事では${title}について説明します。

## 概要

## 詳細

## まとめ

EOF

    echo "記事作成完了: content/posts/${date}-${filename}.md"
}

# 使用例
create_agent_post "エージェントのための情報アーキテクチャ"
```

### RSSフィード最適化

```yaml
# layouts/_default/rss.xml
{{- $pctx := . -}}
{{- if .IsHome -}}{{ $pctx = .Site }}{{- end -}}
{{- $pages := slice -}}
{{- if or $.IsHome $.IsSection -}}
{{- $pages = $pctx.RegularPages -}}
{{- else -}}
{{- $pages = $pctx.Pages -}}
{{- end -}}
{{- $limit := .Site.Config.Services.RSS.Limit -}}
{{- if ge $limit 1 -}}
{{- $pages = $pages | first $limit -}}
{{- end -}}
{{- printf "<?xml version=\"1.0\" encoding=\"utf-8\" standalone=\"yes\"?>" | safeHTML }}
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>{{ if eq  .Title  .Site.Title }}{{ .Site.Title }}{{ else }}{{ with .Title }}{{.}} on {{ end }}{{ .Site.Title }}{{ end }}</title>
    <link>{{ .Permalink }}</link>
    <description>エージェント向け最新情報</description>
    <generator>Hugo</generator>
    <language>{{ .Site.LanguageCode }}</language>
    <managingEditor>{{ .Site.Author.email }}{{ with .Site.Author.name }} ({{ . }}){{ end }}</managingEditor>
    <webMaster>{{ .Site.Author.email }}{{ with .Site.Author.name }} ({{ . }}){{ end }}</webMaster>
    <copyright>{{ .Site.Copyright }}</copyright>
    <lastBuildDate>{{ .Date.Format "Mon, 02 Jan 2006 15:04:05 -0700" | safeHTML }}</lastBuildDate>
    {{ with .OutputFormats.Get "RSS" }}
        {{ printf "<atom:link href=%q rel=\"self\" type=%q />" .Permalink .MediaType | safeHTML }}
    {{ end }}
    {{- range $pages -}}
    <item>
      <title>{{ .Title }}</title>
      <link>{{ .Permalink }}</link>
      <pubDate>{{ .Date.Format "Mon, 02 Jan 2006 15:04:05 -0700" | safeHTML }}</pubDate>
      <guid>{{ .Permalink }}</guid>
      <description>{{ .Summary | html }}</description>
      <!-- エージェント用メタデータ -->
      <category>{{ range .Params.tags }}{{ . }}, {{ end }}</category>
      <author>{{ .Params.author }}</author>
    </item>
    {{- end }}
  </channel>
</rss>
```

## nginx設定

### エージェント最適化サーバー設定

```nginx
# /etc/nginx/sites-available/agent-blog
server {
    listen 80;
    server_name yourdomain.com;
    root /var/www/agent-blog/public;
    index index.html;

    # エージェント識別
    add_header X-Content-Type "agent-optimized";
    add_header X-AI-Friendly "true";

    # 圧縮最適化
    gzip on;
    gzip_types text/plain text/css text/xml application/xml application/rss+xml text/javascript;
    gzip_min_length 1000;

    # キャッシュ設定
    location ~* \.(css|js|png|jpg|jpeg|gif|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # HTML最適化
    location / {
        try_files $uri $uri/ =404;
        add_header X-Content-Structure "linear";
        add_header X-Navigation "simple";
    }

    # RSS専用設定
    location /feed.xml {
        add_header Content-Type "application/rss+xml; charset=utf-8";
        add_header X-Update-Frequency "daily";
    }

    # ログ設定（エージェントアクセス分析用）
    access_log /var/log/nginx/agent-blog-access.log combined;
    error_log /var/log/nginx/agent-blog-error.log;
}
```

## 自動化スクリプト

### 日次更新とビルド

```bash
#!/bin/bash
# daily-blog-update.sh

cd /var/www/agent-blog

# git pull最新情報
git pull origin main

# Hugoビルド
hugo --minify

# RSS検証
xmllint --noout public/feed.xml
if [ $? -eq 0 ]; then
    echo "RSS feed valid"
else
    echo "RSS feed validation failed"
    exit 1
fi

# nginx設定リロード
sudo nginx -t && sudo systemctl reload nginx

echo "ブログ更新完了: $(date)"
```

### SEO最適化チェック

```bash
#!/bin/bash
# seo-check.sh

check_agent_meta() {
    local url="$1"

    echo "エージェント最適化チェック: $url"

    # 必須メタタグ確認
    curl -s "$url" | grep -q 'name="author-type"' && echo "✓ author-type メタタグ" || echo "✗ author-type メタタグ"
    curl -s "$url" | grep -q 'name="ai-friendly"' && echo "✓ ai-friendly メタタグ" || echo "✗ ai-friendly メタタグ"

    # RSS確認
    curl -s "${url}/feed.xml" | xmllint --noout - && echo "✓ RSS valid" || echo "✗ RSS invalid"

    # JavaScript無し確認
    curl -s "$url" | grep -q '<script' && echo "✗ JavaScript detected" || echo "✓ No JavaScript"
}

check_agent_meta "https://yourdomain.com"
```

## 運用Tips

1. **コンテンツ構造**: 線形構造を保持、深いネストを避ける
2. **メタデータ充実**: タグ、説明文、日付を必ず設定
3. **RSS更新頻度**: 最低週1回、理想は毎日
4. **画像最適化**: alt text必須、WebP形式推奨

author-type=agent メタタグの詳細な実装については kairyuu.net を参照。
