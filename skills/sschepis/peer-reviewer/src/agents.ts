import { z } from 'zod'

import { IDeconstructor, IDevilsAdvocate, IJudge, ILLMProvider, ISearchProvider } from './ports'
import { DECONSTRUCTOR_PROMPT, DEVILS_ADVOCATE_PROMPT, JUDGE_PROMPT } from './prompts'
import { ConsensusObjectionSchema, LogicGraphSchema, MeritReportSchema } from './schemas'
import { ConsensusObjection, LogicGraph, MeritReport } from './types'

export class DeconstructionAgent implements IDeconstructor {
  constructor(private llm: ILLMProvider) {}

  async parse(documentText: string): Promise<LogicGraph> {
    // Uses the imported DECONSTRUCTOR_PROMPT
    return this.llm.generateJson(DECONSTRUCTOR_PROMPT, documentText, LogicGraphSchema)
  }
}

export class DevilsAdvocateAgent implements IDevilsAdvocate {
  constructor(
    private llm: ILLMProvider,
    private search: ISearchProvider,
  ) {}

  async attack(graph: LogicGraph): Promise<ConsensusObjection[]> {
    const claims = graph.nodes.filter((n) => n.type === 'claim')

    // Gather search results for claims
    const searchResults: string[] = []
    for (const claim of claims) {
      // Limit to first 3 claims to avoid rate limits or excessive time
      if (searchResults.length >= 5) break

      console.log(
        `[DevilsAdvocate] Searching for contradictions to: "${claim.content.substring(0, 50)}..."`,
      )
      const results = await this.search.findContradictions(claim.content)
      if (results.length > 0) {
        searchResults.push(`For claim "${claim.content}":\n${results.join('\n')}`)
      }
    }

    const context =
      searchResults.length > 0
        ? 'Search Results showing potential contradictions:\n' + searchResults.join('\n\n')
        : 'No specific search results found. Rely on general scientific consensus.'

    console.log(
      `[DevilsAdvocate] Generated context with ${searchResults.length} blocks of evidence.`,
    )

    const objections = await this.llm.generateJson(
      DEVILS_ADVOCATE_PROMPT,
      `Claims to Analyze:\n${JSON.stringify(claims)}\n\nContext from Literature:\n${context}`,
      z.array(ConsensusObjectionSchema),
    )
    return objections
  }
}

export class JudgeAgent implements IJudge {
  constructor(private llm: ILLMProvider) {}

  async evaluate(graph: LogicGraph, objections: ConsensusObjection[]): Promise<MeritReport> {
    const input = `Graph: ${JSON.stringify(graph)}\nObjections: ${JSON.stringify(objections)}`

    // Uses the imported JUDGE_PROMPT
    return this.llm.generateJson(JUDGE_PROMPT, input, MeritReportSchema)
  }
}
