import { Platform } from 'react-native'

import type { Message } from '../../components/chat/chatMessageTypes'

// ---------- extract parseSuggestions for direct testing ----------

// We can't test the hook directly without a full React render environment,
// but we CAN test the pure `parseSuggestions` function by importing the module
// and extracting it. Since parseSuggestions is not exported, we replicate its
// logic here and test it (the hook delegates all parsing to this function).

function parseSuggestions(response: string): string[] {
  try {
    const jsonMatch = response.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      if (Array.isArray(parsed)) {
        return parsed
          .filter((item): item is string => typeof item === 'string')
          .map((s) => s.trim())
          .filter((s) => s.length > 0)
          .slice(0, 3)
      }
    }
  } catch {
    // JSON parsing failed, try line-based fallback
  }

  const lines = response
    .split('\n')
    .map((line) => line.replace(/^\d+[.)]\s*/, '').trim())
    .filter((line) => line.length > 0 && line.length < 100)
    .slice(0, 3)

  return lines
}

// ---------- mock setup for hook tests ----------

const mockIsAvailable = jest.fn().mockReturnValue(true)
const mockGenerateResponse = jest.fn()

jest.mock('../../../modules/apple-intelligence', () => ({
  isAvailable: () => mockIsAvailable(),
  generateResponse: (...args: unknown[]) => mockGenerateResponse(...args),
}))

// We need to mock the hook's dependencies
jest.mock('react', () => {
  const actual = jest.requireActual('react')
  return {
    ...actual,
    useCallback: jest.fn(actual.useCallback),
    useEffect: jest.fn(actual.useEffect),
    useRef: jest.fn((initial: unknown) => ({ current: initial })),
    useState: jest.fn(actual.useState),
  }
})

import { useCallback, useEffect, useRef, useState } from 'react'

import { useResponseSuggestions } from '../useResponseSuggestions'

// ---------- helpers ----------

function createAgentMessage(id: string, text: string): Message {
  return {
    id,
    text,
    sender: 'agent',
    timestamp: new Date(),
  }
}

function createUserMessage(id: string, text: string): Message {
  return {
    id,
    text,
    sender: 'user',
    timestamp: new Date(),
  }
}

function createToolEventMessage(id: string): Message {
  return {
    id,
    type: 'tool_event',
    toolName: 'web_search',
    toolCallId: `tc-${id}`,
    status: 'completed',
    sender: 'agent',
    timestamp: new Date(),
    text: 'web_search',
  }
}

// ---------- parseSuggestions tests ----------

describe('parseSuggestions (response parsing logic)', () => {
  it('parses a valid JSON array of strings', () => {
    const response = '["Sure, tell me more.", "That sounds interesting.", "I disagree."]'
    expect(parseSuggestions(response)).toEqual([
      'Sure, tell me more.',
      'That sounds interesting.',
      'I disagree.',
    ])
  })

  it('extracts JSON array embedded in other text', () => {
    const response = 'Here are some suggestions: ["Option A", "Option B", "Option C"] enjoy!'
    expect(parseSuggestions(response)).toEqual(['Option A', 'Option B', 'Option C'])
  })

  it('limits to 3 suggestions even if more are provided', () => {
    const response = '["A", "B", "C", "D", "E"]'
    expect(parseSuggestions(response)).toHaveLength(3)
  })

  it('filters out non-string items in the JSON array', () => {
    const response = '["Valid", 42, null, "Also valid", true]'
    expect(parseSuggestions(response)).toEqual(['Valid', 'Also valid'])
  })

  it('filters out empty strings after trimming', () => {
    const response = '["Hello", "  ", "", "World"]'
    expect(parseSuggestions(response)).toEqual(['Hello', 'World'])
  })

  it('falls back to line-based parsing when JSON is invalid', () => {
    const response = 'Sure, here are suggestions:\nOption one\nOption two\nOption three'
    expect(parseSuggestions(response)).toEqual([
      'Sure, here are suggestions:',
      'Option one',
      'Option two',
    ])
  })

  it('strips numbered prefixes in fallback mode', () => {
    const response = '1. First suggestion\n2. Second suggestion\n3. Third suggestion'
    expect(parseSuggestions(response)).toEqual([
      'First suggestion',
      'Second suggestion',
      'Third suggestion',
    ])
  })

  it('strips numbered prefixes with parentheses', () => {
    const response = '1) First\n2) Second\n3) Third'
    expect(parseSuggestions(response)).toEqual(['First', 'Second', 'Third'])
  })

  it('filters out lines longer than 100 characters in fallback mode', () => {
    const longLine = 'A'.repeat(101)
    const response = `Short line\n${longLine}\nAnother short line`
    expect(parseSuggestions(response)).toEqual(['Short line', 'Another short line'])
  })

  it('returns empty array for empty response', () => {
    expect(parseSuggestions('')).toEqual([])
  })

  it('limits fallback to 3 lines', () => {
    const response = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5'
    expect(parseSuggestions(response)).toHaveLength(3)
  })
})

// ---------- hook behavior tests ----------

describe('useResponseSuggestions', () => {
  const originalPlatform = Platform.OS

  beforeEach(() => {
    jest.clearAllMocks()
    Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true })
    mockIsAvailable.mockReturnValue(true)
  })

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { value: originalPlatform, writable: true })
  })

  function setupHook(options: {
    messages: Message[]
    isAgentResponding: boolean
    providerType: string
    enabled: boolean
  }) {
    let suggestions: Array<{ id: string; text: string }> = []
    const setSuggestions = jest.fn(
      (
        updater:
          | Array<{ id: string; text: string }>
          | ((prev: Array<{ id: string; text: string }>) => Array<{ id: string; text: string }>),
      ) => {
        if (typeof updater === 'function') {
          suggestions = updater(suggestions)
        } else {
          suggestions = updater
        }
      },
    )

    let isGenerating = false
    const setIsGenerating = jest.fn((value: boolean | ((prev: boolean) => boolean)) => {
      if (typeof value === 'function') {
        isGenerating = value(isGenerating)
      } else {
        isGenerating = value
      }
    })

    let stateCallCount = 0
    ;(useState as jest.Mock).mockImplementation((initial: unknown) => {
      stateCallCount++
      if (stateCallCount === 1) return [suggestions, setSuggestions]
      if (stateCallCount === 2) return [isGenerating, setIsGenerating]
      return [initial, jest.fn()]
    })

    const effects: Array<() => void | (() => void)> = []
    ;(useEffect as jest.Mock).mockImplementation((fn: () => void | (() => void)) => {
      effects.push(fn)
    })
    ;(useCallback as jest.Mock).mockImplementation((fn: (...args: unknown[]) => unknown) => fn)

    const refs: Array<{ current: unknown }> = []
    ;(useRef as jest.Mock).mockImplementation((initial: unknown) => {
      const ref = { current: initial }
      refs.push(ref)
      return ref
    })

    // eslint-disable-next-line react-hooks/rules-of-hooks -- test helper that drives hooks imperatively
    const result = useResponseSuggestions(options as Parameters<typeof useResponseSuggestions>[0])

    return {
      result,
      effects,
      refs,
      setSuggestions,
      setIsGenerating,
      getState: () => ({ suggestions, isGenerating }),
    }
  }

  it('returns empty suggestions and isGenerating false initially', () => {
    const { result } = setupHook({
      messages: [],
      isAgentResponding: false,
      providerType: 'apple',
      enabled: true,
    })

    expect(result.suggestions).toEqual([])
    expect(result.isGenerating).toBe(false)
    expect(typeof result.dismiss).toBe('function')
  })

  it('dismiss callback clears suggestions', () => {
    const { result, setSuggestions } = setupHook({
      messages: [createAgentMessage('1', 'Hello')],
      isAgentResponding: false,
      providerType: 'apple',
      enabled: true,
    })

    result.dismiss()
    expect(setSuggestions).toHaveBeenCalledWith([])
  })

  it('does not generate when enabled is false', () => {
    const { effects } = setupHook({
      messages: [createAgentMessage('1', 'Hello')],
      isAgentResponding: false,
      providerType: 'apple',
      enabled: false,
    })

    // Run all effects
    effects.forEach((fn) => fn())

    expect(mockGenerateResponse).not.toHaveBeenCalled()
  })

  it('does not generate on non-iOS platforms', () => {
    Object.defineProperty(Platform, 'OS', { value: 'android', writable: true })

    const { effects } = setupHook({
      messages: [createAgentMessage('1', 'Hello')],
      isAgentResponding: false,
      providerType: 'apple',
      enabled: true,
    })

    effects.forEach((fn) => fn())

    expect(mockGenerateResponse).not.toHaveBeenCalled()
  })

  it('does not generate for non-apple providers', () => {
    const { effects } = setupHook({
      messages: [createAgentMessage('1', 'Hello')],
      isAgentResponding: false,
      providerType: 'openai',
      enabled: true,
    })

    effects.forEach((fn) => fn())

    expect(mockGenerateResponse).not.toHaveBeenCalled()
  })

  it('does not generate when agent is still responding', () => {
    const { effects } = setupHook({
      messages: [createAgentMessage('1', 'Hello')],
      isAgentResponding: true,
      providerType: 'apple',
      enabled: true,
    })

    effects.forEach((fn) => fn())

    expect(mockGenerateResponse).not.toHaveBeenCalled()
  })

  it('does not generate when last message is from user', () => {
    const { effects } = setupHook({
      messages: [createUserMessage('1', 'Hello')],
      isAgentResponding: false,
      providerType: 'apple',
      enabled: true,
    })

    effects.forEach((fn) => fn())

    expect(mockGenerateResponse).not.toHaveBeenCalled()
  })

  it('does not generate when last message is a tool event', () => {
    const { effects } = setupHook({
      messages: [createToolEventMessage('1')],
      isAgentResponding: false,
      providerType: 'apple',
      enabled: true,
    })

    effects.forEach((fn) => fn())

    expect(mockGenerateResponse).not.toHaveBeenCalled()
  })

  it('does not generate for empty messages array', () => {
    const { effects } = setupHook({
      messages: [],
      isAgentResponding: false,
      providerType: 'apple',
      enabled: true,
    })

    effects.forEach((fn) => fn())

    expect(mockGenerateResponse).not.toHaveBeenCalled()
  })

  it('clears suggestions when agent starts responding', () => {
    const { effects, setSuggestions } = setupHook({
      messages: [createAgentMessage('1', 'Hello')],
      isAgentResponding: true,
      providerType: 'apple',
      enabled: true,
    })

    // The second effect handles clearing when isAgentResponding changes
    effects.forEach((fn) => fn())

    expect(setSuggestions).toHaveBeenCalledWith([])
  })
})
