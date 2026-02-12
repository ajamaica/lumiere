/**
 * useActiveWebsite — native stub.
 *
 * On iOS/Android the app is never inside a Chrome extension,
 * so there is no active website to report.
 */

export function useActiveWebsite(): string | null {
  return null
}
