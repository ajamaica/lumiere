// cost-calculator.mjs
// Calculate token costs based on model

const PRICING = {
  'anthropic/claude-opus-4-5': {
    input: 5.00,   // $ per 1M tokens
    output: 25.00
  },
  'anthropic/claude-sonnet-4-20250514': {
    input: 3.00,   // $ per 1M tokens  
    output: 15.00
  },
  'anthropic/claude-haiku-4-20250321': {
    input: 0.25,   // $ per 1M tokens
    output: 1.25
  }
};

export function calculateCost(usage, model = 'anthropic/claude-sonnet-4-20250514') {
  if (!usage || typeof usage !== 'object') {
    return 0;
  }

  const pricing = PRICING[model];
  if (!pricing) {
    // Default to Sonnet pricing if model not found
    pricing = PRICING['anthropic/claude-sonnet-4-20250514'];
  }

  const inputTokens = usage.input_tokens || usage.prompt_tokens || 0;
  const outputTokens = usage.output_tokens || usage.completion_tokens || 0;

  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;

  return inputCost + outputCost;
}

export function formatCost(cost) {
  if (cost < 0.01) {
    return `$${(cost * 100).toFixed(3)}¢`;
  }
  return `$${cost.toFixed(3)}`;
}

export function getModelShortName(model) {
  if (model?.includes('opus')) return 'Opus';
  if (model?.includes('sonnet')) return 'Sonnet';
  if (model?.includes('haiku')) return 'Haiku';
  return 'Unknown';
}