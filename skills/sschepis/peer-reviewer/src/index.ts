import dotenv from 'dotenv'
import path from 'path'

import { ArxivAdapter } from './adapters/arxiv'
import { FileStorageAdapter } from './adapters/file_storage'
import { OpenClawLLMAdapter } from './adapters/openclaw_llm'
import { SerperSearchAdapter } from './adapters/serper_search'
import { SkillSearchAdapter } from './adapters/skill_search'
import { VertexAIAdapter } from './adapters/vertex_ai'
import { DeconstructionAgent, DevilsAdvocateAgent, JudgeAgent } from './agents'
import { ReviewEngine } from './engine'
import { ILLMProvider, ISearchProvider } from './ports'
import { MeritReport } from './types'

dotenv.config()

// Re-export core classes for standalone usage
export { OpenClawLLMAdapter } from './adapters/openclaw_llm'
export { SkillSearchAdapter } from './adapters/skill_search'
export { ReviewEngine } from './engine'
export * from './ports'
export * from './types'

export class PeerReviewer {
  private engine: ReviewEngine
  private storage: FileStorageAdapter

  constructor(llm: ILLMProvider, search: ISearchProvider, dataDir: string = './data') {
    this.storage = new FileStorageAdapter(dataDir)

    this.engine = new ReviewEngine(
      new DeconstructionAgent(llm),
      new DevilsAdvocateAgent(llm, search),
      new JudgeAgent(llm),
    )
  }

  async review(paperText: string): Promise<MeritReport> {
    return this.engine.processPaper(paperText)
  }

  async saveReport(report: MeritReport, id?: string): Promise<string> {
    const reportId = id || `report-${Date.now()}`
    await this.storage.save('reports', reportId, report)
    return reportId
  }
}

// Helper to composite search providers
class CompositeSearchProvider implements ISearchProvider {
  constructor(private providers: ISearchProvider[]) {}

  async findContradictions(claim: string): Promise<string[]> {
    const results = await Promise.all(this.providers.map((p) => p.findContradictions(claim)))
    return results.flat()
  }
}

// Standalone CLI execution
if (require.main === module) {
  ;(async () => {
    // CLI Argument Parsing
    const args = process.argv.slice(2)
    if (args.length === 0) {
      console.error('Usage: node dist/index.js <file_or_text>')
      process.exit(1)
    }

    let textToReview = args[0]
    const fs = require('fs')
    try {
      if (fs.existsSync(textToReview)) {
        textToReview = fs.readFileSync(textToReview, 'utf-8')
      }
    } catch (e) {
      // Assume raw text
    }

    console.log('Initializing Peer Reviewer...')

    // --- ADAPTER SELECTION LOGIC ---

    // 1. Select LLM Provider
    let llm: ILLMProvider
    // Check for explicit Vertex/Google creds file first (legacy/specific mode)
    if (fs.existsSync('./google.json') || process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      console.log('Using VertexAIAdapter (Google Credentials detected)')
      llm = new VertexAIAdapter()
    } else {
      console.log('Using OpenClawLLMAdapter (Env vars detected)')
      llm = new OpenClawLLMAdapter()
    }

    // 2. Select Search Provider
    // We combine Arxiv (always free/easy) with either SkillSearch (if available) or SerperDirect
    const providers: ISearchProvider[] = [new ArxivAdapter()]

    // Check if serper-tool is available in path or parallel directory
    // For development convenience, we check the relative path
    const devSerperPath = path.resolve(__dirname, '../../serper-tool/dist/index.js')

    if (fs.existsSync(devSerperPath)) {
      console.log(`Using SkillSearchAdapter (via ${devSerperPath})`)
      providers.push(new SkillSearchAdapter(`node ${devSerperPath}`))
    } else if (process.env.SERPER_API_KEY) {
      console.log('Using SerperSearchAdapter (Direct API)')
      providers.push(new SerperSearchAdapter(process.env.SERPER_API_KEY))
    }

    const search = new CompositeSearchProvider(providers)

    // --- EXECUTION ---

    const reviewer = new PeerReviewer(llm, search)

    try {
      console.log('Reviewing paper...')
      const report = await reviewer.review(textToReview)
      console.log('\n=== Merit Report ===')
      console.log(JSON.stringify(report, null, 2))

      const id = await reviewer.saveReport(report)
      console.log(`\nReport saved with ID: ${id}`)
    } catch (error) {
      console.error('Review failed:', error)
    }
  })()
}
