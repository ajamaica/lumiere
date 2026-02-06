/**
 * Check-In Prompter - Daily Reflections
 * Sends morning check-ins and evening reflections
 * Flexible scheduling based on user's time
 */

const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');

class CheckInPrompter extends EventEmitter {
  constructor(config, logger) {
    super();
    this.config = config;
    this.logger = logger;
    this.interval = null;
    this.lastMorningCheck = null;
    this.lastEveningCheck = null;
    this.checkInterval = 60 * 1000; // Check every minute
    this.journalFile = path.join(__dirname, '..', 'data', 'journal.json');

    this.ensureDataDir();
    this.loadJournal();
  }

  ensureDataDir() {
    const dir = path.dirname(this.journalFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  loadJournal() {
    try {
      if (fs.existsSync(this.journalFile)) {
        const data = JSON.parse(fs.readFileSync(this.journalFile, 'utf8'));
        this.journal = data || [];
      } else {
        this.journal = [];
      }
    } catch (e) {
      this.logger.warn(`Failed to load journal: ${e.message}`);
      this.journal = [];
    }
  }

  saveJournal() {
    try {
      fs.writeFileSync(this.journalFile, JSON.stringify(this.journal, null, 2));
    } catch (e) {
      this.logger.warn(`Failed to save journal: ${e.message}`);
    }
  }

  start() {
    if (this.interval) {
      return;
    }

    this.logger.info('Check-In Prompter started');

    // Initial check
    this.checkTime();

    // Regular time checks
    this.interval = setInterval(() => this.checkTime(), this.checkInterval);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      this.logger.info('Check-In Prompter stopped');
    }
  }

  /**
   * Check if it's time for check-ins
   */
  checkTime() {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;
    const today = now.toDateString();

    // Morning check-in
    if (
      this.config.checkInEnabled &&
      currentTime === this.config.checkInTime &&
      this.lastMorningCheck !== today
    ) {
      this.emit('morning-check-in', {
        timestamp: now,
      });
      this.lastMorningCheck = today;
      this.logger.info('Morning check-in triggered');
    }

    // Evening reflection
    if (
      this.config.eveningReflectionEnabled &&
      currentTime === this.config.eveningReflectionTime &&
      this.lastEveningCheck !== today
    ) {
      this.emit('evening-reflection', {
        timestamp: now,
      });
      this.lastEveningCheck = today;
      this.logger.info('Evening reflection triggered');
    }
  }

  /**
   * Record a reflection or response
   */
  recordEntry(type, content) {
    const entry = {
      id: `entry_${Date.now()}`,
      type, // 'morning' or 'evening'
      content,
      timestamp: new Date().toISOString(),
      date: new Date().toDateString(),
    };

    this.journal.push(entry);
    this.saveJournal();

    this.logger.info(`${type} entry recorded`);
    return entry;
  }

  /**
   * Get entries for a specific date
   */
  getEntriesForDate(date) {
    const dateStr = date.toDateString();
    return this.journal.filter((e) => e.date === dateStr);
  }

  /**
   * Get entries for a date range
   */
  getEntriesForRange(startDate, endDate) {
    return this.journal.filter((e) => {
      const entryDate = new Date(e.timestamp);
      return entryDate >= startDate && entryDate <= endDate;
    });
  }

  /**
   * Get the most recent morning entry
   */
  getMostRecentMorningEntry() {
    return this.journal
      .filter((e) => e.type === 'morning')
      .reverse()[0] || null;
  }

  /**
   * Get the most recent evening entry
   */
  getMostRecentEveningEntry() {
    return this.journal
      .filter((e) => e.type === 'evening')
      .reverse()[0] || null;
  }

  /**
   * Get statistics on check-in patterns
   */
  getStatistics() {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const recentEntries = this.journal.filter((e) => new Date(e.timestamp) >= thirtyDaysAgo);

    const morningEntries = recentEntries.filter((e) => e.type === 'morning');
    const eveningEntries = recentEntries.filter((e) => e.type === 'evening');

    return {
      lastThirtyDays: {
        total: recentEntries.length,
        morningCount: morningEntries.length,
        eveningCount: eveningEntries.length,
        averagePerDay: (recentEntries.length / 30).toFixed(1),
        completionRate: (
          ((morningEntries.length + eveningEntries.length) / (30 * 2)) *
          100
        ).toFixed(1),
      },
      mostRecentEntry: recentEntries[recentEntries.length - 1] || null,
    };
  }

  /**
   * Get suggested prompts based on patterns
   */
  getSuggestedPrompts(type = 'morning') {
    if (type === 'morning') {
      return [
        'What are your top 3 priorities for today?',
        'How are you feeling as you start the day?',
        'What's one thing you want to remember about God today?',
        'What do you need help with today?',
        'How can you work with integrity today?',
      ];
    } else {
      return [
        'What did God do in your work today?',
        'What's one thing you're grateful for?',
        'What was difficult today, and why?',
        'Did you maintain your boundaries? How?',
        'What will you do to rest tonight?',
      ];
    }
  }
}

module.exports = CheckInPrompter;
