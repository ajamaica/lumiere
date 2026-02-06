import { exec } from 'child_process'
import { util } from 'util'

const execAsync = util.promisify(exec)

// Strict response shape based on ClawDex API
interface ClawDexResponse {
  skill_name?: string
  verdict: 'benign' | 'malicious' | 'unknown'
}

/**
 * Tool: scan_skill_api
 * Description: Queries the ClawDex API by https://www.koi.ai/ to check a skill's safety profile.
 */
export async function scanSkillApi(skillName: string) {
  // Ensure strict URL encoding for the skill name
  const safeName = encodeURIComponent(skillName)
  const url = `https://clawdex.koi.security/api/skill/${safeName}`

  try {
    const response = await fetch(url)

    if (!response.ok) {
      return JSON.stringify({
        verdict: 'unknown',
        error: `API Error ${response.status}`,
      })
    }

    const data = (await response.json()) as ClawDexResponse

    // Validate that the response actually has a verdict, fallback if missing
    if (!data.verdict) {
      return JSON.stringify({ verdict: 'unknown', details: 'Invalid API response' })
    }

    return JSON.stringify(data)
  } catch (error) {
    // If the network fails, default to 'unknown' safety for caution
    return JSON.stringify({
      verdict: 'unknown',
      details: `Network Error: ${error.message}`,
    })
  }
}

/**
 * Tool: execute_clawhub_install
 * Description: Installs the skill using the clawhub CLI. ONLY use after explicit user confirmation.
 */
export async function executeClawhubInstall(skillName: string) {
  try {
    const { stdout } = await execAsync(`clawhub install ${skillName}`)
    return stdout
  } catch (error) {
    return `Installation failed: ${error.message}`
  }
}
