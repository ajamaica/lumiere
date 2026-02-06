import axios from 'axios'
import { parseStringPromise } from 'xml2js'

import { ISearchProvider } from '../ports'

export class ArxivAdapter implements ISearchProvider {
  async findContradictions(claim: string): Promise<string[]> {
    try {
      // Basic keyword extraction from claim for search (naive approach)
      const keywords = claim
        .split(' ')
        .filter((w) => w.length > 4)
        .join(' AND ')
      const query = `all:${encodeURIComponent(keywords)}`

      const response = await axios.get(
        `http://export.arxiv.org/api/query?search_query=${query}&start=0&max_results=5`,
      )
      const result = await parseStringPromise(response.data)

      if (!result.feed.entry) {
        return []
      }

      return result.feed.entry.map((entry: any) => {
        const title = entry.title[0].trim()
        const summary = entry.summary[0].trim()
        return `[ArXiv] ${title}: ${summary}`
      })
    } catch (error) {
      console.error('Error in ArxivAdapter.findContradictions:', error)
      return []
    }
  }
}
