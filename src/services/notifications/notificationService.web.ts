/**
 * Web stub for notification service.
 * Background tasks and push notifications are not supported on web.
 */

export const BACKGROUND_FETCH_TASK = 'background-server-check'

export async function backgroundCheckTask(): Promise<number> {
  return 1 // Success
}

export async function registerBackgroundFetch(_intervalMinutes: number = 15): Promise<void> {
  // No-op on web
}

export async function unregisterBackgroundFetch(): Promise<void> {
  // No-op on web
}

export function configureNotificationHandler(): void {
  // No-op on web
}

export async function requestNotificationPermissions(): Promise<boolean> {
  return false
}

export async function initBubbleChannel(): Promise<void> {
  // No-op on web
}
