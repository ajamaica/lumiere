import { cotHijackingPatterns } from './cot-hijacking'
import { directExtractionPatterns } from './direct-extraction'
import { encodingObfuscationPatterns } from './encoding-obfuscation'
import { extractionAttackPatterns } from './extraction-attacks'
import { instructionOverridePatterns } from './instruction-override'
import { jailbreakPatterns } from './jailbreak-attempts'
import { policyPuppetryPatterns } from './policy-puppetry'
import { roleManipulationPatterns } from './role-manipulation'
import { socialEngineeringPatterns } from './social-engineering'
import { systemImpersonationPatterns } from './system-impersonation'

export const promptInjectionPatternsEN = [
  ...instructionOverridePatterns,
  ...roleManipulationPatterns,
  ...systemImpersonationPatterns,
  ...jailbreakPatterns,
  ...directExtractionPatterns,
  ...socialEngineeringPatterns,
  ...cotHijackingPatterns,
  ...policyPuppetryPatterns,
  ...extractionAttackPatterns,
  ...encodingObfuscationPatterns,
]
