---
name: baidu-scholar-search
description: Baidu Academic Search Tool enables the retrieval of both Chinese and English literature, covering various types of literature such as academic journals, conference papers, and dissertations.
homepage: https://xueshu.baidu.com/
metadata: { 'openclaw': { 'emoji': '🔬', 'requires': { 'bins': ['curl'] } } }
---

# Baidu Scholar Search

Based on the keywords entered by the user, search for both Chinese and English literature, covering various types of literature such as academic journals, conference papers, and dissertations

## Setup

1.  **API Key:** Ensure the BAIDU_API_KEY environment variable is set with your valid API key.
2.  **Environment:** The API key should be available in the runtime environment.

## API table

| name           | path                           | description                                                                   |
| -------------- | ------------------------------ | ----------------------------------------------------------------------------- |
| scholar_search | /v2/tools/baidu_scholar/search | Based on the keywords entered, search for both Chinese and English literature |

## Workflow

1. The script makes a GET request to the Baidu Scholar Search API
2. The API returns structured search results with abstract, keyword, paperId, title etc. about a list of literature

## Scholar Search API

### Parameters

- `wd`: The search keywords(required,e.g. 'machine learning')
- `pageNum`: page num (default: 0)
- `enable_abstract`: whether to enable abstract (default: false), if true return the abstract of the literature

### Example Usage

```bash
curl -XGET 'https://qianfan.baidubce.com/v2/tools/baidu_scholar/search?wd=人工智能&enable_abstract=true' \
-H 'Authorization: Bearer API_KEY'
```

## EXEC scripts

```bash
#!/bin/bash

# Baidu Scholar Search Skill Implementation

set -e

# Check if required environment variable is set
if [ -z "$BAIDU_API_KEY" ]; then
    echo '{"error": "BAIDU_API_KEY environment variable not set"}'
    exit 1
fi

WD="$1"
if [ -z "$wd" ]; then
    echo '{"error": "Missing wd parameter"}'
    exit 1
fi
pageNum="$2"
if [ -z "$pageNum" ]; then
    pageNum=0
fi
enable_abstract="$3"
if [ -z "$pageNum" ]; then
    enable_abstract=false
fi
curl -XGET "https://qianfan.baidubce.com/v2/tools/baidu_scholar/search?wd=$WD&pageNum=$pageNum&enable_abstract=$enable_abstract" -H "Authorization: Bearer $BAIDU_API_KEY"
```
