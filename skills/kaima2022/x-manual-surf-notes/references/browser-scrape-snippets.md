# Browser scrape snippets (X Home / status)

> 只在需要写 JS 抓取 DOM 时再看。

## 1) 从 Home 视窗拿到前 N 个 status base URL（去掉 /photo /analytics 等）

```js
;(() => {
  const seen = new Set()
  const urls = []
  for (const a of document.querySelectorAll('article a[href*="/status/"]')) {
    const m = a.href?.match(/^(https:\/\/x\.com\/[A-Za-z0-9_]+\/status\/\d+)/)
    if (!m) continue
    const base = m[1]
    if (seen.has(base)) continue
    seen.add(base)
    urls.push(base)
    if (urls.length >= 10) break
  }
  return urls
})()
```

## 2) 在 status 详情页抓取主帖文本/作者/时间

```js
;(() => {
  const art = document.querySelector('article')
  if (!art) return null

  // try expand
  const more = [...document.querySelectorAll('div[role="button"], a, span')].find((el) => {
    const t = (el.innerText || '').trim().toLowerCase()
    return t === 'show more' || (el.innerText || '').trim() === '显示更多'
  })
  more?.click?.()

  const text = art.innerText.replace(/\n+/g, '\n').trim()
  const timeEl = art.querySelector('time')
  const datetime = timeEl?.getAttribute('datetime') || null
  const links = [...art.querySelectorAll('a[href]')].map((a) => a.href)
  const authorLink = links.find((h) => /^https:\/\/x\.com\/[A-Za-z0-9_]+$/.test(h))
  const author = authorLink ? '@' + authorLink.replace('https://x.com/', '') : null

  const m = location.href.match(/^(https:\/\/x\.com\/[A-Za-z0-9_]+\/status\/\d+)/)
  const url = m ? m[1] : location.href

  return { url, author, datetime, text }
})()
```
