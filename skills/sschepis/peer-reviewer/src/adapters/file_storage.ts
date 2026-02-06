import fs from 'fs/promises'
import path from 'path'

import { IStorageProvider } from '../ports'

export class FileStorageAdapter implements IStorageProvider {
  private baseDir: string

  constructor(baseDir: string = './data') {
    this.baseDir = baseDir
    this.ensureBaseDir()
  }

  private async ensureBaseDir() {
    try {
      await fs.mkdir(this.baseDir, { recursive: true })
    } catch (error) {
      console.error(`Failed to create base directory ${this.baseDir}:`, error)
    }
  }

  async save<T>(collection: string, id: string, data: T): Promise<void> {
    const collectionDir = path.join(this.baseDir, collection)
    await fs.mkdir(collectionDir, { recursive: true })

    const filePath = path.join(collectionDir, `${id}.json`)
    await fs.writeFile(filePath, JSON.stringify(data, null, 2))
  }

  async get<T>(collection: string, id: string): Promise<T | null> {
    const filePath = path.join(this.baseDir, collection, `${id}.json`)
    try {
      const data = await fs.readFile(filePath, 'utf-8')
      return JSON.parse(data) as T
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return null
      }
      throw error
    }
  }
}
