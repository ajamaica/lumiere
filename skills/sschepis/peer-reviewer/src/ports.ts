import { z } from 'zod'

import { ConsensusObjection, LogicGraph, MeritReport, ProgressUpdate } from './types'

export interface ILLMProvider {
  generateJson<T>(systemPrompt: string, userContent: string, schema: z.ZodType<T>): Promise<T>
}

export interface ISearchProvider {
  findContradictions(claim: string): Promise<string[]>
}

export interface IDeconstructor {
  parse(documentText: string): Promise<LogicGraph>
}

export interface IDevilsAdvocate {
  attack(graph: LogicGraph): Promise<ConsensusObjection[]>
}

export interface IJudge {
  evaluate(graph: LogicGraph, objections: ConsensusObjection[]): Promise<MeritReport>
}

export interface IStorageProvider {
  save<T>(collection: string, id: string, data: T): Promise<void>
  get<T>(collection: string, id: string): Promise<T | null>
}

export interface IProgressMonitor {
  onProgress(update: ProgressUpdate): void
}
