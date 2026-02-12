package expo.modules.androidbubbles

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import android.view.Gravity

/**
 * Lightweight Activity that renders inside an expanded bubble.
 * Displays a brief summary and a button to open the full chat in the main app.
 *
 * This Activity is registered with `allowEmbedded=true`, `resizeableActivity=true`,
 * and `documentLaunchMode=always` — all required by the Android Bubbles API.
 */
class BubbleActivity : Activity() {

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    val serverId = intent.getStringExtra("serverId") ?: ""
    val sessionKey = intent.getStringExtra("sessionKey") ?: ""
    val title = intent.getStringExtra("title") ?: "Lumiere"

    // Build a simple layout programmatically so we don't need XML layout resources
    val layout = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      gravity = Gravity.CENTER
      setPadding(48, 48, 48, 48)
    }

    val titleView = TextView(this).apply {
      text = title
      textSize = 20f
      gravity = Gravity.CENTER
      setPadding(0, 0, 0, 24)
    }
    layout.addView(titleView)

    val subtitleView = TextView(this).apply {
      text = "Tap below to open the conversation"
      textSize = 14f
      gravity = Gravity.CENTER
      setPadding(0, 0, 0, 32)
    }
    layout.addView(subtitleView)

    val openButton = Button(this).apply {
      text = "Open Chat"
      setOnClickListener {
        // Deep link into the main app
        val deepLink = Uri.parse("lumiere://chat?serverId=$serverId&sessionKey=$sessionKey")
        val mainIntent = Intent(Intent.ACTION_VIEW, deepLink).apply {
          flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        startActivity(mainIntent)
        finish()
      }
    }
    layout.addView(openButton)

    setContentView(layout)
  }
}
