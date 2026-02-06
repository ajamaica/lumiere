import { IDeconstructor, IDevilsAdvocate, IJudge, IProgressMonitor } from './ports'
import { MeritReport } from './types'

export class ReviewEngine {
  constructor(
    private deconstructor: IDeconstructor,
    private devil: IDevilsAdvocate,
    private judge: IJudge,
    private monitor?: IProgressMonitor,
  ) {}

  private emitProgress(stage: 'deconstructing' | 'attacking' | 'judging', message: string) {
    if (this.monitor) {
      this.monitor.onProgress({
        stage,
        message,
        timestamp: new Date(),
      })
    }
  }

  async processPaper(rawText: string): Promise<MeritReport> {
    this.emitProgress('deconstructing', 'Starting logic graph extraction...')
    const logicGraph = await this.deconstructor.parse(rawText)
    this.emitProgress('deconstructing', `Extracted ${logicGraph.nodes.length} logic nodes.`)

    this.emitProgress('attacking', 'Starting consensus check...')
    const objections = await this.devil.attack(logicGraph)
    this.emitProgress('attacking', `Generated ${objections.length} objections.`)

    this.emitProgress('judging', 'Starting final evaluation...')
    const report = await this.judge.evaluate(logicGraph, objections)
    this.emitProgress('judging', 'Evaluation complete.')

    return report
  }
}
