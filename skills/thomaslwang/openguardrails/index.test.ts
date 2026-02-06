/**
 * Tests for OpenClawGuard plugin
 */

import { describe, expect,it } from "vitest";

import { DEFAULT_CONFIG,resolveConfig } from "./agent/config.js";
import { chunkContent } from "./agent/runner.js";

// =============================================================================
// Chunking Tests
// =============================================================================

describe("chunkContent", () => {
  it("should return single chunk for small content", () => {
    const chunks = chunkContent("Hello world", 100, 20);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]!.content).toBe("Hello world");
    expect(chunks[0]!.index).toBe(0);
    expect(chunks[0]!.total).toBe(1);
  });

  it("should split large content into multiple chunks", () => {
    const content = "a".repeat(1000);
    const chunks = chunkContent(content, 300, 50);

    expect(chunks.length).toBeGreaterThan(1);

    // Each chunk should have correct index and total
    for (let i = 0; i < chunks.length; i++) {
      expect(chunks[i]!.index).toBe(i);
      expect(chunks[i]!.total).toBe(chunks.length);
    }
  });

  it("should have overlapping content between chunks", () => {
    const content = "abcdefghij".repeat(100); // 1000 chars
    const chunks = chunkContent(content, 300, 50);

    // Check that chunks overlap
    for (let i = 1; i < chunks.length; i++) {
      expect(chunks[i]!.startOffset).toBeLessThan(chunks[i - 1]!.endOffset);
    }
  });

  it("should set correct offsets", () => {
    const content = "Hello World Test";
    const chunks = chunkContent(content, 100, 10);

    expect(chunks[0]!.startOffset).toBe(0);
    expect(chunks[0]!.endOffset).toBe(content.length);
  });

  it("should handle edge case of content exactly at chunk size", () => {
    const content = "a".repeat(100);
    const chunks = chunkContent(content, 100, 20);

    expect(chunks).toHaveLength(1);
    expect(chunks[0]!.content.length).toBe(100);
  });
});

// =============================================================================
// Config Tests
// =============================================================================

describe("Config", () => {
  it("should have sensible defaults", () => {
    expect(DEFAULT_CONFIG.enabled).toBe(true);
    expect(DEFAULT_CONFIG.blockOnRisk).toBe(true);
    expect(DEFAULT_CONFIG.maxChunkSize).toBe(4000);
    expect(DEFAULT_CONFIG.overlapSize).toBe(200);
    expect(DEFAULT_CONFIG.timeoutMs).toBe(60000);
  });

  it("should resolve partial config with defaults", () => {
    const config = resolveConfig({ blockOnRisk: false });

    expect(config.enabled).toBe(true); // default
    expect(config.blockOnRisk).toBe(false); // overridden
    expect(config.maxChunkSize).toBe(4000); // default
  });

  it("should resolve empty config to defaults", () => {
    const config = resolveConfig({});

    expect(config).toEqual(DEFAULT_CONFIG);
  });

  it("should allow custom chunk sizes", () => {
    const config = resolveConfig({ maxChunkSize: 2000, overlapSize: 100 });

    expect(config.maxChunkSize).toBe(2000);
    expect(config.overlapSize).toBe(100);
  });
});
