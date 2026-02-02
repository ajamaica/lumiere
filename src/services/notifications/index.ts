export {
  BACKGROUND_NOTIFICATION_TASK,
  getBackgroundTaskStatus,
  registerBackgroundTask,
  unregisterBackgroundTask,
} from './backgroundTask'
export type { NotificationChannel } from './notificationService'
export {
  cancelAllNotifications,
  configureNotificationHandler,
  dismissAllNotifications,
  getBadgeCount,
  getPermissionStatus,
  requestPermissions,
  scheduleLocalNotification,
  setBadgeCount,
  setupNotificationChannels,
} from './notificationService'
