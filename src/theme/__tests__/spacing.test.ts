import { borderRadius, spacing } from '../spacing'

describe('spacing', () => {
  it('has values in ascending order', () => {
    const values = [spacing.xs, spacing.sm, spacing.md, spacing.lg, spacing.xl, spacing.xxl, spacing.xxxl]
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThan(values[i - 1])
    }
  })

  it('has expected base values', () => {
    expect(spacing.xs).toBe(4)
    expect(spacing.sm).toBe(8)
    expect(spacing.md).toBe(12)
    expect(spacing.lg).toBe(16)
  })
})

describe('borderRadius', () => {
  it('has values in ascending order', () => {
    const values = [
      borderRadius.xs,
      borderRadius.sm,
      borderRadius.md,
      borderRadius.lg,
      borderRadius.xl,
      borderRadius.xxl,
      borderRadius.full,
    ]
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThan(values[i - 1])
    }
  })

  it('has a full border radius of 9999', () => {
    expect(borderRadius.full).toBe(9999)
  })
})
