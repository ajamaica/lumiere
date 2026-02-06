import axios from 'axios'

import { ISearchProvider } from '../ports'

interface SerperResult {
  title: string
  link: string
  snippet: string
}

interface SerperResponse {
  organic: SerperResult[]
}

export class SerperSearchAdapter implements ISearchProvider {
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async findContradictions(claim: string): Promise<string[]> {
    try {
      const query = `contradiction refutation "${claim}"`

      const response = await axios.post<SerperResponse>(
        'https://google.serper.dev/search',
        {
          q: query,
          num: 5,
        },
        {
          headers: {
            'X-API-KEY': this.apiKey,
            'Content-Type': 'application/json',
          },
        },
      )

      if (!response.data.organic) {
        return []
      }

      return response.data.organic.map((item) => `${item.title}: ${item.snippet}`)
    } catch (error) {
      console.error('Error in SerperSearchAdapter.findContradictions:', error)
      return []
    }
  }
}
