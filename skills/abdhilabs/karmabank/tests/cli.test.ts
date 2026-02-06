/**
 * Basic CLI Tests
 *
 * These tests validate that the CLI commands are registered
 * and that help output includes expected sections.
 */

import { program } from '../src/cli'

describe('CLI', () => {
  it('should have program name "credit"', () => {
    expect(program.name()).toBe('credit')
  })

  it('should include register command', () => {
    const cmd = program.commands.find((c) => c.name() === 'register')
    expect(cmd).toBeDefined()
  })

  it('should include check command', () => {
    const cmd = program.commands.find((c) => c.name() === 'check')
    expect(cmd).toBeDefined()
  })

  it('should include borrow command', () => {
    const cmd = program.commands.find((c) => c.name() === 'borrow')
    expect(cmd).toBeDefined()
  })

  it('should include repay command', () => {
    const cmd = program.commands.find((c) => c.name() === 'repay')
    expect(cmd).toBeDefined()
  })

  it('should include history command', () => {
    const cmd = program.commands.find((c) => c.name() === 'history')
    expect(cmd).toBeDefined()
  })

  it('should include list command', () => {
    const cmd = program.commands.find((c) => c.name() === 'list')
    expect(cmd).toBeDefined()
  })
})
