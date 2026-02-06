import * as fs from 'fs'

import { ArxivAdapter } from './adapters/arxiv'
import { OpenClawLLMAdapter } from './adapters/openclaw_llm'
import { PeerReviewer } from './index'

async function test() {
  console.log('Starting test...')

  try {
    // Mock or use real adapters
    // For test, we use OpenClawLLMAdapter (which handles missing keys gracefully-ish in constructor)
    const llm = new OpenClawLLMAdapter()
    const search = new ArxivAdapter()

    const reviewer = new PeerReviewer(llm, search)
    console.log('PeerReviewer initialized successfully with DI.')
  } catch (e) {
    console.error('Test failed:', e)
    process.exit(1)
  }
}

test()
