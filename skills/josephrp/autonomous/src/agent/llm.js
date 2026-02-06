/**
 * LLM: Hugging Face inference via OpenAI-compatible endpoint.
 * Uses ChatOpenAI with baseURL = LLM_BASE_URL, apiKey = HUGGINGFACE_API_KEY or HF_TOKEN.
 */

import { ChatOpenAI } from '@langchain/openai'

export function createLLM() {
  const baseURL = process.env.LLM_BASE_URL || 'https://router.huggingface.co/v1'
  const apiKey = process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN || ''
  const model = process.env.LLM_MODEL || 'meta-llama/Llama-3.2-3B-Instruct'

  if (!apiKey) {
    throw new Error('Set HUGGINGFACE_API_KEY or HF_TOKEN for Hugging Face inference.')
  }

  return new ChatOpenAI({
    model,
    temperature: 0,
    openAIApiKey: apiKey,
    configuration: {
      baseURL,
    },
  })
}
