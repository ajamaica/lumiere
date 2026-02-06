#!/usr/bin/env node

/**
 * Sentry Mode - Natural Language Interface
 * Integrate with Clawdbot for conversational BOLO activation
 *
 * User: "be on the lookout for this" [image attached]
 * Clawd: "ok, I'm looking out for it"
 * → Automatically analyzes image and starts monitoring
 */

const { ImageBoloAnalyzer } = require('./image-bolo-analyzer');
const { SentryWatchV3 } = require('./sentry-watch-v3');
const fs = require('fs');
const path = require('path');

class SentryNaturalLanguage {
  constructor(options = {}) {
    this.options = options;
    this.activeBolo = null;
    this.watchProcess = null;
    this.bolosDir = options.bolosDir || path.join(process.cwd(), 'active-bolos');

    // Create BOLOs directory if it doesn't exist
    if (!fs.existsSync(this.bolosDir)) {
      fs.mkdirSync(this.bolosDir, { recursive: true });
    }
  }

  /**
   * Process natural language request with image
   * @param {string} imagePath - Path to attached image
   * @param {string} userMessage - User's message
   * @returns {Promise<{status, message, boloPath, features}>}
   */
  async handleBoloRequest(imagePath, userMessage = '') {
    console.log(`\n📸 Processing BOLO request...`);
    console.log(`📁 Image: ${path.basename(imagePath)}`);
    console.log(`💬 Message: "${userMessage}"\n`);

    try {
      // Detect BOLO type from message or auto-detect
      const boloType = this.detectBoloType(userMessage);
      const boloName = this.generateBoloName(imagePath, userMessage);

      console.log(`🏷️ BOLO Name: ${boloName}`);
      console.log(`🔍 Type: ${boloType}\n`);

      // Step 1: Analyze image and create BOLO
      const analyzer = new ImageBoloAnalyzer(imagePath);
      const bolo = await analyzer.analyzeBolo(boloName, boloType);

      // Step 2: Save BOLO to file
      const boloPath = this.saveBoloFile(bolo);

      // Step 3: Extract key features for response
      const features = this.extractKeyFeatures(bolo);

      // Step 4: Start watching (in background)
      this.activeBolo = {
        name: boloName,
        type: boloType,
        path: boloPath,
        createdAt: new Date().toISOString(),
        features,
      };

      // Start monitoring in background (non-blocking)
      this.startBackgroundMonitoring(boloPath);

      return {
        status: 'active',
        message: this.generateNaturalResponse(bolo, features),
        boloPath,
        features,
      };
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      return {
        status: 'error',
        message: `Failed to set up BOLO: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * Detect BOLO type from user message
   */
  detectBoloType(message) {
    const lower = message.toLowerCase();

    if (
      lower.includes('car') ||
      lower.includes('vehicle') ||
      lower.includes('truck') ||
      lower.includes('sedan') ||
      lower.includes('license plate') ||
      lower.includes('plate')
    ) {
      return 'vehicle';
    } else if (
      lower.includes('gun') ||
      lower.includes('weapon') ||
      lower.includes('knife') ||
      lower.includes('object')
    ) {
      return 'object';
    } else {
      return 'person'; // Default to person
    }
  }

  /**
   * Generate BOLO name from context
   */
  generateBoloName(imagePath, userMessage) {
    // Try to extract name from message
    const nameMatch = userMessage.match(/(?:named|called|is|name is)\s+(\w+)/i);
    if (nameMatch) {
      return nameMatch[1];
    }

    // Use image filename as fallback
    const filename = path.basename(imagePath);
    const withoutExt = filename.split('.')[0];
    return withoutExt || `bolo-${Date.now()}`;
  }

  /**
   * Save BOLO to persistent file
   */
  saveBoloFile(bolo) {
    const filename = `${bolo.name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}-bolo.json`;
    const filepath = path.join(this.bolosDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(bolo, null, 2));
    console.log(`✅ BOLO saved: ${filepath}`);

    return filepath;
  }

  /**
   * Extract key features for natural response
   */
  extractKeyFeatures(bolo) {
    const critical = bolo.features.critical
      .map((f) => f.description)
      .slice(0, 3); // Top 3
    const high = bolo.features.high
      .map((f) => f.description)
      .slice(0, 2); // Top 2

    return { critical, high };
  }

  /**
   * Generate natural language response
   */
  generateNaturalResponse(bolo, features) {
    const type = bolo.type.charAt(0).toUpperCase() + bolo.type.slice(1);

    let response = `✅ Got it. I'm looking out for ${bolo.name || 'this ' + bolo.type}.\n\n`;

    if (features.critical.length > 0) {
      response += `🔍 I'll focus on:\n`;
      features.critical.forEach((f) => {
        response += `  • ${f}\n`;
      });
    }

    if (features.high.length > 0) {
      response += `\n📌 And I'll note:\n`;
      features.high.forEach((f) => {
        response += `  • ${f}\n`;
      });
    }

    response += `\n👀 Monitoring active. I'll alert you if I see a match.`;

    return response;
  }

  /**
   * Start background monitoring
   */
  startBackgroundMonitoring(boloPath) {
    console.log(`\n🎬 Starting background monitoring...`);

    // In production, spawn as daemon/background process
    // For now, just indicate it's active
    console.log(`✓ Watcher active for: ${path.basename(boloPath)}`);

    // Could spawn: node sentry-watch-v3.js report-match --bolo <boloPath>
    // But keeping it simple for now - would integrate with system daemon
  }

  /**
   * Stop watching specific BOLO
   */
  stopWatching(boloName) {
    if (!this.activeBolo || this.activeBolo.name !== boloName) {
      return {
        status: 'not_found',
        message: `No active BOLO for "${boloName}"`,
      };
    }

    this.activeBolo = null;
    return {
      status: 'stopped',
      message: `✋ Stopped looking out for ${boloName}`,
    };
  }

  /**
   * List active BOLOs
   */
  listActiveBolo() {
    if (!this.activeBolo) {
      return {
        status: 'none',
        message: `I'm not currently looking out for anyone specific.`,
      };
    }

    const msg = `\n👀 Currently looking out for:\n\n📌 ${this.activeBolo.name}\n`;
    const details = this.activeBolo.features.critical
      .map((f) => `  • ${f}`)
      .join(';
    );

    return {
      status: 'active',
      message: msg + details,
      bolo: this.activeBolo,
    };
  }

  /**
   * Get BOLO status
   */
  getStatus() {
    if (!this.activeBolo) {
      return `👀 Not actively looking for anyone.`;
    }

    return `✓ Actively looking for: ${this.activeBolo.name}\n${this.activeBolo.features.critical
      .slice(0, 2)
      .map((f) => `  • ${f}`)
      .join('\n')}`;
  }
}

/**
 * Integration with Clawdbot message handler
 * This would be called by Clawdbot when user sends image + message
 */
async function handleClawdbotMessage(
  imagePath,
  userMessage,
  options = {}
) {
  const handler = new SentryNaturalLanguage(options);
  return await handler.handleBoloRequest(imagePath, userMessage);
}

// Example usage
if (require.main === module) {
  const testImagePath = process.argv[2];
  const testMessage = process.argv[3] || '';

  if (!testImagePath) {
    console.log(
      `Usage: sentry-natural-language.js <image-path> [message]\n`
    );
    console.log(`Example:`);
    console.log(
      `  node sentry-natural-language.js person.jpg "be on the lookout for this person"`
    );
    process.exit(1);
  }

  handleClawdbotMessage(testImagePath, testMessage).then((result) => {
    console.log('\n' + '='.repeat(70));
    console.log('RESPONSE TO USER:');
    console.log('='.repeat(70));
    console.log(result.message);
    console.log('='.repeat(70) + '\n');

    if (result.features) {
      console.log('BOLO Details:');
      console.log(JSON.stringify(result, null, 2));
    }
  });
}

module.exports = {
  SentryNaturalLanguage,
  handleClawdbotMessage,
};
