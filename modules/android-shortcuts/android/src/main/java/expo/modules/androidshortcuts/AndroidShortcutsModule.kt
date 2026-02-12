package expo.modules.androidshortcuts

import android.content.Context
import android.content.Intent
import android.content.pm.ShortcutInfo
import android.content.pm.ShortcutManager
import android.graphics.drawable.Icon
import android.net.Uri
import android.os.Build
import androidx.core.content.pm.ShortcutInfoCompat
import androidx.core.content.pm.ShortcutManagerCompat
import androidx.core.graphics.drawable.IconCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.json.JSONArray

class AndroidShortcutsModule : Module() {

  private fun getContext(): Context? = appContext.reactContext

  override fun definition() = ModuleDefinition {
    Name("AndroidShortcuts")

    /**
     * Whether the ShortcutManager API is available (API 25+).
     */
    Function("isAvailable") {
      Build.VERSION.SDK_INT >= Build.VERSION_CODES.N_MR1
    }

    /**
     * Whether the device supports pinning shortcuts to the home screen (API 26+).
     */
    Function("isPinningSupported") {
      val context = getContext() ?: return@Function false
      ShortcutManagerCompat.isRequestPinShortcutSupported(context)
    }

    /**
     * Request to pin a shortcut to the home screen.
     * The user sees a system confirmation dialog.
     *
     * @param id        Unique shortcut ID (e.g. trigger slug)
     * @param label     Short label displayed under the icon
     * @param longLabel Longer descriptive label
     * @param uri       Deep link URI (e.g. lumiere://trigger/autotrigger/abc12345)
     */
    AsyncFunction("requestPinShortcut") { id: String, label: String, longLabel: String, uri: String ->
      val context = getContext()
        ?: throw Exception("Context not available")

      if (!ShortcutManagerCompat.isRequestPinShortcutSupported(context)) {
        throw Exception("Pinned shortcuts are not supported on this device")
      }

      val intent = Intent(Intent.ACTION_VIEW, Uri.parse(uri)).apply {
        setPackage(context.packageName)
      }

      val shortcutInfo = ShortcutInfoCompat.Builder(context, id)
        .setShortLabel(label)
        .setLongLabel(longLabel)
        .setIcon(IconCompat.createWithResource(context, getAppIconResource(context)))
        .setIntent(intent)
        .build()

      val success = ShortcutManagerCompat.requestPinShortcut(context, shortcutInfo, null)
      if (!success) {
        throw Exception("Failed to request pinned shortcut")
      }
    }

    /**
     * Push / update dynamic shortcuts that appear when long-pressing the app icon.
     * These complement the static shortcuts defined in shortcuts.xml.
     *
     * @param shortcutsJson JSON array of objects: [{id, shortLabel, longLabel, uri}]
     */
    AsyncFunction("setDynamicShortcuts") { shortcutsJson: String ->
      val context = getContext()
        ?: throw Exception("Context not available")

      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.N_MR1) return@AsyncFunction

      val manager = context.getSystemService(ShortcutManager::class.java)
        ?: return@AsyncFunction

      val jsonArray = JSONArray(shortcutsJson)
      val shortcuts = mutableListOf<ShortcutInfo>()

      // Static shortcuts count against the limit, so reserve slots
      val maxDynamic = manager.maxShortcutCountPerActivity -
        manager.manifestShortcuts.size

      for (i in 0 until minOf(jsonArray.length(), maxDynamic)) {
        val obj = jsonArray.getJSONObject(i)
        val id = obj.getString("id")
        val shortLabel = obj.getString("shortLabel")
        val longLabel = obj.optString("longLabel", shortLabel)
        val uri = obj.getString("uri")

        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(uri)).apply {
          setPackage(context.packageName)
        }

        val shortcutInfo = ShortcutInfo.Builder(context, id)
          .setShortLabel(shortLabel)
          .setLongLabel(longLabel)
          .setIcon(Icon.createWithResource(context, getAppIconResource(context)))
          .setIntent(intent)
          .setRank(i)
          .build()

        shortcuts.add(shortcutInfo)
      }

      manager.dynamicShortcuts = shortcuts
    }

    /**
     * Remove all dynamic shortcuts.
     */
    Function("removeAllDynamicShortcuts") {
      val context = getContext() ?: return@Function
      ShortcutManagerCompat.removeAllDynamicShortcuts(context)
    }

    /**
     * Update an existing pinned shortcut (e.g. after the trigger message changes).
     *
     * @param shortcutsJson JSON array of objects: [{id, shortLabel, longLabel, uri}]
     */
    AsyncFunction("updatePinnedShortcuts") { shortcutsJson: String ->
      val context = getContext()
        ?: throw Exception("Context not available")

      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.N_MR1) return@AsyncFunction

      val jsonArray = JSONArray(shortcutsJson)
      val shortcuts = mutableListOf<ShortcutInfoCompat>()

      for (i in 0 until jsonArray.length()) {
        val obj = jsonArray.getJSONObject(i)
        val id = obj.getString("id")
        val shortLabel = obj.getString("shortLabel")
        val longLabel = obj.optString("longLabel", shortLabel)
        val uri = obj.getString("uri")

        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(uri)).apply {
          setPackage(context.packageName)
        }

        val shortcutInfo = ShortcutInfoCompat.Builder(context, id)
          .setShortLabel(shortLabel)
          .setLongLabel(longLabel)
          .setIcon(IconCompat.createWithResource(context, getAppIconResource(context)))
          .setIntent(intent)
          .build()

        shortcuts.add(shortcutInfo)
      }

      ShortcutManagerCompat.updateShortcuts(context, shortcuts)
    }

    /**
     * Get IDs of all currently pinned shortcuts.
     */
    AsyncFunction("getPinnedShortcutIds") {
      val context = getContext()
        ?: return@AsyncFunction emptyList<String>()

      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.N_MR1) {
        return@AsyncFunction emptyList<String>()
      }

      val manager = context.getSystemService(ShortcutManager::class.java)
        ?: return@AsyncFunction emptyList<String>()

      manager.pinnedShortcuts.map { it.id }
    }

    /**
     * Disable pinned shortcuts by ID (shows a disabled message).
     *
     * @param ids     List of shortcut IDs to disable
     * @param message Message shown when user taps the disabled shortcut
     */
    AsyncFunction("disableShortcuts") { ids: List<String>, message: String ->
      val context = getContext()
        ?: throw Exception("Context not available")

      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.N_MR1) return@AsyncFunction

      val manager = context.getSystemService(ShortcutManager::class.java)
        ?: return@AsyncFunction

      manager.disableShortcuts(ids, message)
    }
  }

  /**
   * Resolve the app's launcher icon resource ID to use for shortcuts.
   */
  private fun getAppIconResource(context: Context): Int {
    val appInfo = context.applicationInfo
    return appInfo.icon.takeIf { it != 0 } ?: android.R.mipmap.sym_def_app_icon
  }
}
