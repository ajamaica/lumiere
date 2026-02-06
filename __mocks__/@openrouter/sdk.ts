// Mock for @openrouter/sdk
/* eslint-disable @typescript-eslint/no-explicit-any */

export class OpenRouter {
  constructor(_options?: any) {}

  models = {
    list: jest.fn().mockResolvedValue({ data: [] }),
  }

  chat = {
    send: jest.fn(),
  }
}

export type Message = any
export type UserMessage = any
export type AssistantMessage = any
