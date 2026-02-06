import axios from 'axios'
import { z } from 'zod'

import { ILLMProvider } from '../ports'

/**
 * An adapter that leverages standard environment variables found in OpenClaw environments.
 * Supports:
 * - OpenAI (OPENAI_API_KEY)
 * - Anthropic (ANTHROPIC_API_KEY) - *Placeholder for future expansion*
 * - Google Gemini (GEMINI_API_KEY)
 */
export class OpenClawLLMAdapter implements ILLMProvider {
  private openaiKey?: string
  private geminiKey?: string

  constructor() {
    this.openaiKey = process.env.OPENAI_API_KEY
    this.geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY

    if (!this.openaiKey && !this.geminiKey) {
      // We don't throw here to allow instantiation, but generateJson will fail if no key is found at runtime
      console.warn(
        'OpenClawLLMAdapter: No standard API keys (OPENAI_API_KEY, GEMINI_API_KEY) found in environment.',
      )
    }
  }

  async generateJson<T>(
    systemPrompt: string,
    userContent: string,
    schema: z.ZodType<T>,
  ): Promise<T> {
    if (this.openaiKey) {
      return this.callOpenAI(systemPrompt, userContent, schema)
    } else if (this.geminiKey) {
      return this.callGemini(systemPrompt, userContent, schema)
    }

    throw new Error('No configured LLM provider found in environment.')
  }

  private async callOpenAI<T>(
    systemPrompt: string,
    userContent: string,
    schema: z.ZodType<T>,
  ): Promise<T> {
    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: process.env.OPENAI_MODEL || 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: systemPrompt + '\n\nIMPORTANT: Respond with VALID JSON ONLY.',
            },
            { role: 'user', content: userContent },
          ],
          response_format: { type: 'json_object' },
        },
        {
          headers: {
            Authorization: `Bearer ${this.openaiKey}`,
            'Content-Type': 'application/json',
          },
        },
      )

      const content = response.data.choices[0].message.content
      return schema.parse(JSON.parse(content))
    } catch (error) {
      console.error('OpenAI API call failed:', error)
      throw error
    }
  }

  private async callGemini<T>(
    systemPrompt: string,
    userContent: string,
    schema: z.ZodType<T>,
  ): Promise<T> {
    // Basic implementation for Gemini API via REST
    const model = process.env.GEMINI_MODEL || 'gemini-1.5-pro'
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.geminiKey}`

    try {
      const response = await axios.post(url, {
        contents: [
          {
            parts: [{ text: systemPrompt + '\n\nOutput strictly JSON.\n\n' + userContent }],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
        },
      })

      const text = response.data.candidates[0].content.parts[0].text
      return schema.parse(JSON.parse(text))
    } catch (error) {
      console.error('Gemini API call failed:', error)
      throw error
    }
  }
}
