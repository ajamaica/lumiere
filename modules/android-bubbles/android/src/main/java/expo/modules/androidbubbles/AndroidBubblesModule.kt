package expo.modules.androidbubbles

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.drawable.Icon
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.Person
import androidx.core.content.pm.ShortcutInfoCompat
import androidx.core.content.pm.ShortcutManagerCompat
import androidx.core.graphics.drawable.IconCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Expo native module that exposes Android Bubbles API (Android 11+) to React Native.
 * Allows the app to show floating chat bubbles for incoming messages.
 */
class AndroidBubblesModule : Module() {

  companion object {
    private const val CHANNEL_ID = "lumiere_chat_bubbles"
    private const val CHANNEL_NAME = "Chat Bubbles"
    private const val BUBBLE_SHORTCUT_PREFIX = "bubble_"
  }

  override fun definition() = ModuleDefinition {
    Name("AndroidBubbles")

    Function("isAvailable") {
      return@Function isSupported()
    }

    AsyncFunction("showBubble") { title: String, message: String, serverId: String, sessionKey: String ->
      showChatBubble(title, message, serverId, sessionKey)
    }

    AsyncFunction("createChannel") {
      ensureNotificationChannel()
    }

    Function("canBubble") {
      return@Function canShowBubbles()
    }
  }

  /**
   * Check if the device supports the Bubbles API (Android 11+ / API 30+).
   */
  private fun isSupported(): Boolean {
    return Build.VERSION.SDK_INT >= Build.VERSION_CODES.R
  }

  /**
   * Check if bubbles are actually allowed by the user for our channel.
   */
  private fun canShowBubbles(): Boolean {
    if (!isSupported()) return false

    val context = appContext.reactContext ?: return false
    val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

    // Check if the app can bubble
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      if (!notificationManager.areBubblesEnabled()) return false
    }

    val channel = notificationManager.getNotificationChannel(CHANNEL_ID)
    return channel?.canBubble() == true
  }

  /**
   * Create the notification channel with bubbles enabled.
   */
  private fun ensureNotificationChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return

    val context = appContext.reactContext ?: return
    val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

    if (notificationManager.getNotificationChannel(CHANNEL_ID) != null) return

    val channel = NotificationChannel(
      CHANNEL_ID,
      CHANNEL_NAME,
      NotificationManager.IMPORTANCE_HIGH
    ).apply {
      description = "Chat bubble notifications for incoming messages"
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        setAllowBubbles(true)
      }
    }

    notificationManager.createNotificationChannel(channel)
  }

  /**
   * Show a chat bubble notification.
   */
  private fun showChatBubble(title: String, message: String, serverId: String, sessionKey: String) {
    if (!isSupported()) return

    val context = appContext.reactContext ?: return
    val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

    ensureNotificationChannel()

    val shortcutId = "$BUBBLE_SHORTCUT_PREFIX${serverId}_${sessionKey.hashCode()}"
    val notificationId = shortcutId.hashCode()

    // Create the Person for the conversation
    val person = Person.Builder()
      .setName(title)
      .setImportant(true)
      .build()

    // Create a dynamic shortcut (required for bubbles on Android 11+)
    val iconCompat = IconCompat.createWithResource(context, R.drawable.ic_bubble)

    val shortcut = ShortcutInfoCompat.Builder(context, shortcutId)
      .setLongLived(true)
      .setShortLabel(title)
      .setIcon(iconCompat)
      .setPerson(person)
      .setIntent(
        Intent(context, BubbleActivity::class.java).apply {
          action = Intent.ACTION_VIEW
          putExtra("serverId", serverId)
          putExtra("sessionKey", sessionKey)
          putExtra("title", title)
        }
      )
      .build()

    ShortcutManagerCompat.pushDynamicShortcut(context, shortcut)

    // Create the bubble intent
    val bubbleIntent = PendingIntent.getActivity(
      context,
      notificationId,
      Intent(context, BubbleActivity::class.java).apply {
        action = Intent.ACTION_VIEW
        putExtra("serverId", serverId)
        putExtra("sessionKey", sessionKey)
        putExtra("title", title)
      },
      PendingIntent.FLAG_MUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
    )

    // Build BubbleMetadata
    val bubbleIcon = Icon.createWithResource(context, R.drawable.ic_bubble)
    val bubbleMetadata = android.app.Notification.BubbleMetadata.Builder(bubbleIntent, bubbleIcon)
      .setDesiredHeight(600)
      .setAutoExpandBubble(false)
      .setSuppressNotification(false)
      .build()

    // Build the messaging-style notification
    val messagingStyle = NotificationCompat.MessagingStyle(person)
      .setConversationTitle(title)
      .addMessage(message, System.currentTimeMillis(), person)

    val notification = NotificationCompat.Builder(context, CHANNEL_ID)
      .setContentTitle(title)
      .setContentText(message)
      .setSmallIcon(R.drawable.ic_bubble)
      .setCategory(android.app.Notification.CATEGORY_MESSAGE)
      .setStyle(messagingStyle)
      .setShortcutId(shortcutId)
      .addPerson(person)
      .setBubbleMetadata(
        NotificationCompat.BubbleMetadata.Builder(bubbleIntent, iconCompat)
          .setDesiredHeight(600)
          .setAutoExpandBubble(false)
          .setSuppressNotification(false)
          .build()
      )
      .build()

    notificationManager.notify(notificationId, notification)
  }
}
