import { exec } from 'child_process'
import util from 'util'

import { ISearchProvider } from '../ports'

const execAsync = util.promisify(exec)

export class SkillSearchAdapter implements ISearchProvider {
  private executablePath: string

  constructor(executablePath: string = 'serper-tool') {
    this.executablePath = executablePath
  }

  async findContradictions(claim: string): Promise<string[]> {
    try {
      // We are calling the serper-tool CLI
      // The tool expects: serper-tool "query"
      const query = `contradiction refutation "${claim.replace(/"/g, '\\"')}"`

      const { stdout, stderr } = await execAsync(`${this.executablePath} "${query}"`)

      if (stderr && stderr.trim().length > 0) {
        console.warn('SkillSearchAdapter stderr:', stderr)
      }

      if (!stdout || stdout.trim().length === 0) {
        return []
      }

      const results = JSON.parse(stdout)
      return results // The serper-tool output format matches string[] format we expect?
      // Wait, serper-tool outputs "title: snippet" strings array?
      // Let's check serper-tool implementation.
    } catch (error) {
      console.error('SkillSearchAdapter failed:', error)
      return []
    }
  }
}
