import axios from 'axios'
import * as fs from 'fs'
import { GoogleAuth } from 'google-auth-library'
import * as path from 'path'
import { z } from 'zod'

import { ILLMProvider } from '../ports'

interface GoogleCredentials {
  type: string
  project_id: string
  private_key_id: string
  private_key: string
  client_email: string
  client_id: string
  auth_uri: string
  token_uri: string
  auth_provider_x509_cert_url: string
  client_x509_cert_url: string
  universe_domain: string
}

interface VertexAIResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string
      }>
    }
    finishReason?: string
  }>
}

export class VertexAIAdapter implements ILLMProvider {
  private auth: GoogleAuth
  private projectId: string
  private modelName: string
  private location: string

  constructor(
    credentialsPath: string = './google.json',
    modelName: string = 'gemini-3-pro-preview',
    location: string = 'global',
  ) {
    // Check if file exists, if not try to use GOOGLE_APPLICATION_CREDENTIALS env var or default path
    let credentialsFullPath = path.resolve(credentialsPath)

    if (!fs.existsSync(credentialsFullPath) && process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      credentialsFullPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
    }

    if (fs.existsSync(credentialsFullPath)) {
      const credentialsContent = fs.readFileSync(credentialsFullPath, 'utf-8')
      const credentials: GoogleCredentials = JSON.parse(credentialsContent)
      this.projectId = credentials.project_id

      // Initialize Google Auth with service account credentials
      this.auth = new GoogleAuth({
        keyFile: credentialsFullPath,
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
      })
    } else {
      // Fallback to implicit auth (e.g. if running in GCP environment or via gcloud auth)
      // However, for this specific adapter implementation which reads projectId from file,
      // we need at least the project ID.
      // Assuming user will provide credentials file as per original implementation.
      console.warn(
        `Credentials file not found at ${credentialsFullPath}. Attempting to use default GoogleAuth...`,
      )
      this.auth = new GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/cloud-platform'],
      })
      // We'll need to fetch projectId asynchronously later if not set, or fail.
      // For now, let's assume it's set via env var or we might fail.
      this.projectId = process.env.GOOGLE_CLOUD_PROJECT || ''
    }

    this.modelName = modelName
    this.location = location
  }

  /**
   * Get access token for Vertex AI API calls
   */
  private async getAccessToken(): Promise<string> {
    const client = await this.auth.getClient()
    const tokenResponse = await client.getAccessToken()
    if (!tokenResponse.token) {
      throw new Error('Failed to obtain access token')
    }

    if (!this.projectId) {
      this.projectId = await this.auth.getProjectId()
    }

    return tokenResponse.token
  }

  /**
   * Clean and extract valid JSON from LLM response
   */
  private extractJson(content: string): string {
    // Remove markdown code blocks (various formats)
    content = content.replace(/```(?:json)?\s*/gi, '').replace(/```\s*$/g, '')

    // Remove any BOM or invisible characters
    content = content.replace(/^\uFEFF/, '').trim()

    // Determine if we're looking for an object or array
    const firstBrace = content.indexOf('{')
    const firstBracket = content.indexOf('[')

    let startChar: string
    let endChar: string

    // Determine which comes first (object or array)
    if (firstBrace === -1 && firstBracket === -1) {
      return content // No JSON found, return as-is for error handling
    } else if (firstBrace === -1) {
      startChar = '['
      endChar = ']'
    } else if (firstBracket === -1) {
      startChar = '{'
      endChar = '}'
    } else {
      // Both exist - use whichever comes first
      if (firstBracket < firstBrace) {
        startChar = '['
        endChar = ']'
      } else {
        startChar = '{'
        endChar = '}'
      }
    }

    // Find the outermost JSON structure
    let depth = 0
    let jsonStart = -1
    let jsonEnd = -1
    let inString = false
    let escapeNext = false

    for (let i = 0; i < content.length; i++) {
      const char = content[i]

      if (escapeNext) {
        escapeNext = false
        continue
      }

      if (char === '\\' && inString) {
        escapeNext = true
        continue
      }

      if (char === '"' && !escapeNext) {
        inString = !inString
        continue
      }

      if (inString) continue

      if (char === startChar) {
        if (depth === 0) jsonStart = i
        depth++
      } else if (char === endChar) {
        depth--
        if (depth === 0) {
          jsonEnd = i
          break
        }
      } else if ((char === '{' || char === '[') && depth > 0) {
        // Nested structure
        depth++
      } else if ((char === '}' || char === ']') && depth > 0) {
        depth--
      }
    }

    if (jsonStart !== -1 && jsonEnd !== -1) {
      content = content.substring(jsonStart, jsonEnd + 1)
    }

    // Fix common JSON issues from LLMs
    content = this.fixCommonJsonIssues(content)

    return content
  }

  /**
   * Fix common JSON formatting issues produced by LLMs
   */
  private fixCommonJsonIssues(json: string): string {
    // Remove trailing commas before closing brackets/braces
    json = json.replace(/,(\s*[}\]])/g, '$1')

    // Fix unquoted property names (simple cases)
    json = json.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)(\s*:)/g, '$1"$2"$3')

    // Remove comments (single-line)
    json = json.replace(/\/\/[^\n]*/g, '')

    // Remove control characters except valid whitespace
    json = json.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')

    // Fix single quotes to double quotes (but be careful with apostrophes in values)
    // Only fix obvious cases: {'key': 'value'} patterns
    json = json.replace(/:\s*'([^']*)'/g, ': "$1"')
    json = json.replace(/([{,]\s*)'([^']+)'(\s*:)/g, '$1"$2"$3')

    return json
  }

  async generateJson<T>(
    systemPrompt: string,
    userContent: string,
    schema: z.ZodType<T>,
    retries = 3,
  ): Promise<T> {
    let lastError: any

    const jsonInstructions = `

# CRITICAL JSON OUTPUT REQUIREMENTS
You MUST respond with ONLY a valid JSON object. No explanations, no markdown, no text before or after.

Rules:
1. Output ONLY valid JSON - no prose, no explanations
2. Use double quotes for all strings and property names
3. No trailing commas after the last element in arrays or objects
4. No comments in the JSON
5. Ensure all arrays and objects are properly closed
6. All required fields must be present

Start your response with { and end with }`

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const accessToken = await this.getAccessToken()

        // Ensure projectId is set
        if (!this.projectId) {
          throw new Error(
            'Project ID is missing. Ensure credentials are valid or GOOGLE_CLOUD_PROJECT is set.',
          )
        }

        const endpoint = `https://aiplatform.googleapis.com/v1/projects/${this.projectId}/locations/${this.location}/publishers/google/models/${this.modelName}:generateContent`

        const requestBody = {
          contents: {
            role: 'user',
            parts: [
              {
                text: `${systemPrompt}${jsonInstructions}\n\nUser request:\n${userContent}\n\nRespond with ONLY valid JSON:`,
              },
            ],
          },
          generationConfig: {
            temperature: attempt > 1 ? 0.1 : 0.3,
          },
        }

        const response = await axios.post<VertexAIResponse>(endpoint, requestBody, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        })

        const candidates = response.data.candidates
        if (!candidates || candidates.length === 0) {
          throw new Error('Received empty response from Vertex AI')
        }

        let content = candidates[0]?.content?.parts?.[0]?.text

        if (!content) {
          throw new Error('Received empty text content from Vertex AI')
        }

        content = this.extractJson(content)
        const parsedJson = JSON.parse(content)
        return schema.parse(parsedJson)
      } catch (error) {
        console.warn(`Attempt ${attempt} failed in VertexAIAdapter.generateJson:`, error)
        lastError = error

        if (attempt < retries) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt))
        }
      }
    }

    console.error('All retry attempts failed in VertexAIAdapter.generateJson')
    throw lastError
  }
}
