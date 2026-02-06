import { Client } from '@notionhq/client'

export interface NotionConfig {
  token: string
}

export class NotionSkill {
  private client: Client

  constructor(config: NotionConfig) {
    this.client = new Client({ auth: config.token })
  }

  // Query a database
  async queryDatabase(databaseId: string, filter?: any, sorts?: any[]) {
    const cleanId = this.cleanId(databaseId)
    const response = await this.client.databases.query({
      database_id: cleanId,
      filter,
      sorts,
      page_size: 100,
    })
    return response.results
  }

  // Get a page's content
  async getPage(pageId: string) {
    const cleanId = this.cleanId(pageId)
    const [page, blocks] = await Promise.all([
      this.client.pages.retrieve({ page_id: cleanId }),
      this.client.blocks.children.list({ block_id: cleanId, page_size: 100 }),
    ])
    return { page, blocks: blocks.results }
  }

  // Add entry to database
  async addEntry(databaseId: string, properties: any) {
    const cleanId = this.cleanId(databaseId)
    return await this.client.pages.create({
      parent: { database_id: cleanId },
      properties,
    })
  }

  // Update page properties
  async updatePage(pageId: string, properties: any) {
    const cleanId = this.cleanId(pageId)
    return await this.client.pages.update({
      page_id: cleanId,
      properties,
    })
  }

  // Append blocks to page
  async appendBlocks(pageId: string, blocks: any[]) {
    const cleanId = this.cleanId(pageId)
    return await this.client.blocks.children.append({
      block_id: cleanId,
      children: blocks,
    })
  }

  // Search across workspace
  async search(query: string) {
    return await this.client.search({
      query,
      page_size: 20,
    })
  }

  // Get database schema
  async getDatabase(databaseId: string) {
    const cleanId = this.cleanId(databaseId)
    return await this.client.databases.retrieve({ database_id: cleanId })
  }

  // Helper: clean ID (remove hyphens, ensure 32 chars)
  private cleanId(id: string): string {
    return id.replace(/-/g, '')
  }
}
