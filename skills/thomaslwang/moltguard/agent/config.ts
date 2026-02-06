/**
 * Agent configuration and API client setup
 */

import os from "node:os";
import path from "node:path";

import OpenAI from "openai";

import type { OpenClawGuardConfig } from "./types.js";

// =============================================================================
// API Configuration
// =============================================================================

const OG_API_BASE_URL = "https://api.openguardrails.com/v1/model/";
const OG_API_KEY = "sk-xxai-model-0e5a52bd1c70cca03d5f67fe1c2ca406";

export const LLM_MODEL = "OG-Text";

// =============================================================================
// API Client (Singleton)
// =============================================================================

let llmClient: OpenAI | null = null;

export function getLlmClient(): OpenAI {
  if (!llmClient) {
    llmClient = new OpenAI({
      baseURL: OG_API_BASE_URL,
      apiKey: OG_API_KEY,
    });
  }
  return llmClient;
}

// =============================================================================
// Default Configuration
// =============================================================================

export const DEFAULT_CONFIG: Required<OpenClawGuardConfig> = {
  enabled: true,
  blockOnRisk: true,
  maxChunkSize: 4000,
  overlapSize: 200,
  timeoutMs: 60000,
  dbPath: path.join(os.homedir(), ".openclaw", "openclawguard.db"),
};

// =============================================================================
// Configuration Helpers
// =============================================================================

export function resolveConfig(config?: Partial<OpenClawGuardConfig>): Required<OpenClawGuardConfig> {
  return {
    enabled: config?.enabled ?? DEFAULT_CONFIG.enabled,
    blockOnRisk: config?.blockOnRisk ?? DEFAULT_CONFIG.blockOnRisk,
    maxChunkSize: config?.maxChunkSize ?? DEFAULT_CONFIG.maxChunkSize,
    overlapSize: config?.overlapSize ?? DEFAULT_CONFIG.overlapSize,
    timeoutMs: config?.timeoutMs ?? DEFAULT_CONFIG.timeoutMs,
    dbPath: config?.dbPath ?? DEFAULT_CONFIG.dbPath,
  };
}
