#!/bin/bash
# Daily Devotional Automation Script
# Runs at 9:00 AM MST every day

echo "🌅 Starting Daily Devotional Workflow - $(date)"
echo "========================================"

# 1. Check YouTube comments for user suggestions AND doctrinal alerts
echo ""
echo "💬 Step 1: Checking YouTube comments..."
cd ~/clawd/skills/daily-devotional-auto
node scripts/check-comments.js

# 1b. Show doctrinal alerts for Snail's attention
echo ""
echo "🚨 Step 1b: Doctrinal alerts for Snail's review..."
ALERTS_FILE="$HOME/.clawd-devotional/temp/doctrinal-alerts.json"
if [ -f "$ALERTS_FILE" ]; then
  UNREVIEWED=$(cat "$ALERTS_FILE" | grep -c '"reviewed": false' || echo "0")
  if [ "$UNREVIEWED" -gt 0 ]; then
    echo "⚠️  $UNREVIEWED doctrinal questions/comments need your attention"
    echo "📁 Review at: $ALERTS_FILE"
  else
    echo "✅ No new doctrinal alerts"
  fi
fi

# 1c. Generate suggested replies (for Snail's approval)
echo ""
echo "🤖 Step 1c: Generating reply suggestions..."
node scripts/reply-as-bot.js

# 2. Generate devotional video
echo ""
echo "🎬 Step 2: Generating devotional video..."
node scripts/daily-devotional.js

# 3. Find the latest video file
echo ""
echo "📹 Step 3: Looking for video to upload..."
VIDEO_FILE=$(ls -t ~/Desktop/devotionals/devotional-*.mp4 2>/dev/null | head -1)

if [ -f "$VIDEO_FILE" ]; then
  echo "Found: $VIDEO_FILE"
  
  # 4. Upload to YouTube
  echo ""
  echo "📤 Step 4: Uploading to YouTube..."
  cd ~/clawd/skills/youtube-studio
  node upload-simple.js "$VIDEO_FILE"
  
  # 5. Clean up local file after upload
  echo ""
  echo "🧹 Step 5: Cleaning up..."
  rm "$VIDEO_FILE"
  echo "✅ Upload complete and local file cleaned up."
else
  echo "⚠️ No video file found to upload"
fi

echo ""
echo "========================================"
echo "✅ Daily devotional workflow complete!"
echo "Next run: Tomorrow at 9:00 AM MST"
echo ""
echo "📋 Reminders:"
echo "  - Check doctrinal alerts if any"
echo "  - Review suggested replies before posting"
echo "  - Add ELEVENLABS_API_KEY for voice generation"
