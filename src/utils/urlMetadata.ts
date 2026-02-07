const URL_REGEX = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/g
const MARKDOWN_LINK_REGEX = /\[([^\]]+)\]\(([^)]+)\)/g

/**
 * Extract plain URLs from text, ignoring URLs already inside markdown links.
 */
export function extractUrls(text: string): string[] {
  // Remove markdown links so we don't double-count their URLs
  const stripped = text.replace(MARKDOWN_LINK_REGEX, '')
  const matches = stripped.match(URL_REGEX)
  if (!matches) return []
  // Deduplicate
  return [...new Set(matches)]
}

export interface UrlMetadata {
  url: string
  title: string | null
  description: string | null
  image: string | null
  favicon: string | null
  hostname: string
}

function getHostname(url: string): string {
  try {
    const parsed = new URL(url)
    return parsed.hostname
  } catch {
    return url
  }
}

function extractMetaContent(html: string, property: string): string | null {
  // Match both property="og:..." and name="og:..." variants
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`, 'i'),
  ]
  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match?.[1]) return match[1]
  }
  return null
}

function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  return match?.[1]?.trim() ?? null
}

function getFaviconUrl(url: string): string {
  try {
    const parsed = new URL(url)
    return `${parsed.origin}/favicon.ico`
  } catch {
    return ''
  }
}

/**
 * Fetch Open Graph / meta information for a given URL.
 * Returns metadata with title, description, image, and favicon.
 */
export async function fetchUrlMetadata(url: string): Promise<UrlMetadata> {
  const hostname = getHostname(url)
  const fallback: UrlMetadata = {
    url,
    title: null,
    description: null,
    image: null,
    favicon: getFaviconUrl(url),
    hostname,
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LumiereBot/1.0)',
        Accept: 'text/html',
      },
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    if (!response.ok) return fallback

    // Only read first 50KB to avoid loading huge pages
    const reader = response.body?.getReader()
    if (!reader) {
      const text = await response.text()
      return parseHtmlMetadata(text.substring(0, 50000), url, hostname)
    }

    let html = ''
    const decoder = new TextDecoder()
    while (html.length < 50000) {
      const { done, value } = await reader.read()
      if (done) break
      html += decoder.decode(value, { stream: true })
      // Stop once we've passed the </head> tag
      if (html.includes('</head>')) break
    }
    reader.cancel()

    return parseHtmlMetadata(html, url, hostname)
  } catch {
    return fallback
  }
}

function parseHtmlMetadata(html: string, url: string, hostname: string): UrlMetadata {
  const ogTitle = extractMetaContent(html, 'og:title')
  const ogDescription =
    extractMetaContent(html, 'og:description') ?? extractMetaContent(html, 'description')
  const ogImage = extractMetaContent(html, 'og:image')
  const title = ogTitle ?? extractTitle(html)

  // Resolve relative image URLs
  let image = ogImage
  if (image && !image.startsWith('http')) {
    try {
      image = new URL(image, url).href
    } catch {
      image = null
    }
  }

  return {
    url,
    title: title ? decodeHtmlEntities(title) : null,
    description: ogDescription ? decodeHtmlEntities(ogDescription) : null,
    image,
    favicon: getFaviconUrl(url),
    hostname,
  }
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
}
