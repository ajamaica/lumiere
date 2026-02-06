# BAML Pattern Library

## Pattern Selection Guide

| Pattern        | Use Case                     | Model       | Latency |
| -------------- | ---------------------------- | ----------- | ------- |
| Extraction     | Parse text → structured data | GPT-4o      | 2-5s    |
| Classification | Categorize into classes      | GPT-4o-mini | <1s     |
| RAG            | Q&A with citations           | GPT-4o      | 3-5s    |
| Agent          | Multi-step planning          | GPT-4o      | 5-10s   |
| Vision         | Image analysis               | GPT-4o      | 4-6s    |
| Hierarchical   | Nested structures            | GPT-4o      | 5-8s    |

## 1. Extraction Pattern

```baml
class Invoice {
  invoice_number string
  date string
  total float @assert(positive, {{ this > 0 }})
  items InvoiceItem[]
}

function ExtractInvoice(text: string) -> Invoice {
  client "openai/gpt-4o"
  prompt #"Extract invoice details: {{ text }} {{ ctx.output_format }}"#
}
```

**Use for**: invoices, resumes, forms, contracts, medical records

## 2. Classification Pattern

```baml
enum Sentiment {
  POSITIVE @description("Happy, satisfied")
  NEGATIVE @description("Angry, disappointed")
  NEUTRAL @description("Factual, balanced")
}

class SentimentResult {
  sentiment Sentiment
  confidence float
  reasoning string
}

function ClassifySentiment(text: string) -> SentimentResult {
  client "openai/gpt-4o-mini"
  prompt #"Analyze sentiment: {{ text }} {{ ctx.output_format }}"#
}
```

**Use for**: sentiment, intent, moderation, priority, topics

## 3. RAG Pattern

```baml
class Citation {
  source string
  quote string
  relevance float
}

class AnswerWithCitations {
  answer string
  citations Citation[]
  confidence float
}

function AnswerQuestion(question: string, context: string) -> AnswerWithCitations {
  client "openai/gpt-4o"
  prompt #"Answer using context. Question: {{ question }} Context: {{ context }} Cite sources. {{ ctx.output_format }}"#
}
```

**Use for**: document Q&A, knowledge bases, research, support

## 4. Agent Pattern

```baml
enum ToolType {
  SEARCH @description("Search knowledge")
  CALCULATE @description("Math operations")
  QUERY @description("Database query")
}

class ToolCall {
  tool ToolType
  params string
  reasoning string
}

class AgentPlan {
  steps ToolCall[]
  expected_outcome string
}

function PlanTask(task: string) -> AgentPlan {
  client "openai/gpt-4o"
  prompt #"Create plan: {{ task }} {{ ctx.output_format }}"#
}
```

**Use for**: task planning, tool selection, workflows, decision trees

## 5. Vision Pattern

```baml
class ImageContent {
  description string
  text string
  objects string[]
}

function AnalyzeImage(image: image) -> ImageContent {
  client "openai/gpt-4o"
  prompt #"Analyze image: {{ image }} {{ ctx.output_format }}"#
}
```

## 6. Hierarchical Pattern

```baml
class Section {
  title string
  content string
  subsections Section[]
}

function ParseDocument(doc: string) -> Section[] {
  client "openai/gpt-4o"
  prompt #"Parse into hierarchy: {{ doc }} {{ ctx.output_format }}"#
}
```

## 7. Chain of Thought Pattern

```baml
class ReasoningStep {
  thought string
  conclusion string
}

class ReasonedAnswer {
  steps ReasoningStep[]
  final_answer string
  confidence float
}

function ReasonAbout(question: string) -> ReasonedAnswer {
  client "openai/gpt-4o"
  prompt #"Reason step-by-step: {{ question }} {{ ctx.output_format }}"#
}
```

## Optimization Tips

- Fast models (GPT-4o-mini, Haiku) for classification
- Fewer optional fields = more predictable output
- Clear `@description` = better extraction
- Multiple simple functions > one complex function
- Use `@assert` for critical validations

**Docs**: https://docs.boundaryml.com/guides/patterns
