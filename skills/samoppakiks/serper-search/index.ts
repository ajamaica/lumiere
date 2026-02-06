import { Type } from '@sinclair/typebox'
import type { ClawdbotPluginApi } from 'clawdbot/dist/plugins/types.js'

interface SerperSearchParams {
  query: string
  num?: number
  searchType?: 'search' | 'news'
}

async function callSerperApi(
  apiKey: string,
  query: string,
  num: number,
  searchType: 'search' | 'news',
): Promise<any> {
  const endpoint =
    searchType === 'news' ? 'https://google.serper.dev/news' : 'https://google.serper.dev/search'

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'X-API-KEY': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ q: query, num }),
  })

  if (!response.ok) {
    throw new Error(`Serper API error: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()

  if (searchType === 'news') {
    return {
      news: (data.news || []).map((item: any) => ({
        title: item.title,
        link: item.link,
        snippet: item.snippet,
        date: item.date,
        source: item.source,
      })),
    }
  }

  return {
    knowledgeGraph: data.knowledgeGraph || null,
    organic: (data.organic || []).map((item: any) => ({
      title: item.title,
      link: item.link,
      snippet: item.snippet,
      position: item.position,
    })),
    peopleAlsoAsk: (data.peopleAlsoAsk || []).map((item: any) => ({
      question: item.question,
      snippet: item.snippet,
    })),
  }
}

export default function register(api: ClawdbotPluginApi) {
  const pluginConfig = (api.pluginConfig ?? {}) as {
    apiKey?: string
    defaultNumResults?: number
  }

  const apiKey = pluginConfig.apiKey || process.env.SERPER_API_KEY || ''

  if (!apiKey) {
    console.warn('[serper-search] No API key. Set SERPER_API_KEY env var.')
    return
  }

  const defaultNum = pluginConfig.defaultNumResults || 5

  api.registerTool({
    name: 'serper_search',
    description:
      'Search Google via Serper.dev API. Returns organic results, knowledge graph, and related questions.',
    parameters: Type.Object({
      query: Type.String({
        description: 'The search query',
      }),
      num: Type.Optional(
        Type.Number({
          description: `Number of results (default: ${defaultNum})`,
          minimum: 1,
          maximum: 100,
        }),
      ),
      searchType: Type.Optional(
        Type.Union([Type.Literal('search'), Type.Literal('news')], {
          description: '"search" for web results (default), "news" for news',
        }),
      ),
    }),

    async execute(_id: string, params: SerperSearchParams) {
      const query = params.query?.trim()
      if (!query) throw new Error('Query is required')

      const num = params.num || defaultNum
      const searchType = params.searchType || 'search'

      const results = await callSerperApi(apiKey, query, num, searchType)
      return {
        content: [{ type: 'text', text: JSON.stringify(results, null, 2) }],
      }
    },
  })
}
