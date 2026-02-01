/**
 * Platform-aware selectors for Lumiere E2E tests.
 *
 * React Native renders to native views, so selectors differ between iOS and Android.
 * Use accessibility labels (testID) as the primary selector strategy.
 */

export function byAccessibilityId(id: string) {
  return `~${id}`
}

export function byText(text: string) {
  if (driver.isIOS) {
    return `-ios predicate string:label == "${text}"`
  }
  return `//*[@text="${text}"]`
}

export function byTextContaining(text: string) {
  if (driver.isIOS) {
    return `-ios predicate string:label CONTAINS "${text}"`
  }
  return `//*[contains(@text, "${text}")]`
}
