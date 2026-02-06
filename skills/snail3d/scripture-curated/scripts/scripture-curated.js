#!/usr/bin/env node
/**
 * Scripture-Curated - Main Orchestrator
 * 
 * Connects current events to Scripture with theological depth.
 * Operates within Nicene Christian framework.
 */

const fs = require('fs');
const path = require('path');

// Load configuration
const config = {
  versesPath: process.env.VERSES_PATH || path.join(__dirname, '..', 'config', 'verses.json'),
  braveApiKey: process.env.BRAVE_API_KEY || '',
  defaultVersion: process.env.DEFAULT_VERSION || 'ESV',
  maxVerses: parseInt(process.env.MAX_VERSES_PER_RESULT) || 5,
  defaultPlanDays: parseInt(process.env.DEFAULT_PLAN_DAYS) || 7
};

class ScriptureCurated {
  constructor(options = {}) {
    this.config = { ...config, ...options };
    this.verses = this.loadVerses();
    this.themes = this.verses ? Object.keys(this.verses.themes || {}) : [];
  }

  loadVerses() {
    try {
      const data = fs.readFileSync(this.config.versesPath, 'utf8');
      return JSON.parse(data);
    } catch (e) {
      console.error('Failed to load verses database:', e.message);
      return null;
    }
  }

  /**
   * Get daily verse based on current events
   */
  async dailyVerse(options = {}) {
    // Search for current events
    const events = await this.searchNews(options.query);
    
    // Match events to themes
    const themes = this.matchEventsToThemes(events);
    
    // Select verse from primary theme
    const primaryTheme = themes[0] || 'hope';
    const verse = this.selectVerse(primaryTheme, options);
    
    // Generate reading plan
    const readingPlan = this.generateReadingPlan({
      theme: primaryTheme,
      days: options.planDays || 3,
      startVerse: verse.id
    });

    return {
      verse: {
        reference: verse.reference,
        text: verse.text,
        version: this.config.defaultVersion
      },
      connection: this.generateConnection(verse, events),
      context: {
        historical: verse.context,
        theological: verse.theology,
        canonical: this.getCanonicalConnections(verse)
      },
      readingPlan,
      events: events.slice(0, 3),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Search Scripture by topic or question
   */
  async search(query, options = {}) {
    const normalizedQuery = query.toLowerCase();
    
    // Direct theme match
    let matchingThemes = this.themes.filter(theme => 
      normalizedQuery.includes(theme.toLowerCase())
    );
    
    // Keyword matching
    const keywordMap = {
      'war': ['peace', 'suffering', 'second_coming'],
      'conflict': ['peace', 'suffering'],
      'peace': ['peace', 'restoration'],
      'anxiety': ['peace', 'prayer', 'faith'],
      'fear': ['peace', 'faith', 'hope'],
      'death': ['resurrection', 'hope', 'peace'],
      'grief': ['suffering', 'hope', 'peace'],
      'money': ['faith', 'wisdom'],
      'work': ['wisdom', 'creation'],
      'love': ['love', 'church'],
      'marriage': ['love', 'church'],
      'friend': ['love', 'church'],
      'lonely': ['church', 'love', 'holy_spirit'],
      'sick': ['suffering', 'healing', 'hope'],
      'temptation': ['faith', 'redemption'],
      'doubt': ['faith', 'hope'],
      'future': ['hope', 'second_coming', 'restoration'],
      'creation': ['creation', 'restoration'],
      'prayer': ['prayer', 'faith'],
      'church': ['church', 'love'],
      'jesus': ['redemption', 'resurrection'],
      'holy spirit': ['holy_spirit', 'church'],
      'god': ['creation', 'redemption', 'love']
    };
    
    for (const [keyword, themes] of Object.entries(keywordMap)) {
      if (normalizedQuery.includes(keyword)) {
        matchingThemes = [...new Set([...matchingThemes, ...themes])];
      }
    }
    
    // Get verses from matching themes
    const verses = [];
    for (const theme of matchingThemes.slice(0, 3)) {
      const themeVerses = this.verses.themes[theme]?.verses || [];
      verses.push(...themeVerses.slice(0, 2));
    }
    
    // Deduplicate and limit
    const uniqueVerses = verses.filter((v, i, a) => 
      a.findIndex(t => t.id === v.id) === i
    ).slice(0, this.config.maxVerses);

    // Generate reading plan
    const primaryTheme = matchingThemes[0] || 'hope';
    const readingPlan = this.generateReadingPlan({
      theme: primaryTheme,
      days: options.planDays || 7
    });

    return {
      verses: uniqueVerses.map(v => ({
        reference: v.reference,
        text: v.text,
        relevance: this.calculateRelevance(v, normalizedQuery)
      })),
      explanation: this.generateSearchExplanation(query, matchingThemes),
      readingPlan,
      followUp: this.generateFollowUpQuestions(query, matchingThemes),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Match a specific event to Scripture
   */
  async matchEvent(event, options = {}) {
    const { event: eventType, context, severity } = event;
    
    // Map event to themes
    const eventMappings = this.verses.event_mappings || {};
    let themes = eventMappings[eventType.toLowerCase().replace(/\s+/g, '_')] || 
                 eventMappings[this.categorizeEvent(eventType)] ||
                 ['hope', 'faith'];
    
    // Adjust for severity/context
    if (severity === 'high' || context?.includes('death') || context?.includes('loss')) {
      themes = ['suffering', 'resurrection', 'hope', ...themes];
    }
    
    // Select verse
    const primaryTheme = themes[0];
    const verse = this.selectVerse(primaryTheme, options);
    
    return {
      verse: {
        reference: verse.reference,
        text: verse.text,
        version: this.config.defaultVersion
      },
      connection: this.generateConnection(verse, [{ type: eventType, context }]),
      application: this.generateApplication(verse, event),
      related: this.getRelatedVerses(verse, 3),
      prayers: this.generatePrayers(verse, event),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Generate a reading plan
   */
  generateReadingPlan(options = {}) {
    const { theme, days = 7, startVerse } = options;
    
    const plan = {
      theme,
      days,
      verses: [],
      overview: `A ${days}-day journey through ${theme}, connecting Scripture to life.`
    };
    
    // Get verses for this theme
    const themeData = this.verses.themes[theme];
    if (!themeData) return plan;
    
    // Select verses for each day
    const availableVerses = [...themeData.verses];
    
    // If startVerse specified, put it first
    if (startVerse) {
      const startIndex = availableVerses.findIndex(v => v.id === startVerse);
      if (startIndex > 0) {
        const [start] = availableVerses.splice(startIndex, 1);
        availableVerses.unshift(start);
      }
    }
    
    for (let i = 0; i < Math.min(days, availableVerses.length); i++) {
      const verse = availableVerses[i];
      plan.verses.push({
        day: i + 1,
        reference: verse.reference,
        text: verse.text,
        context: verse.context,
        application: this.generateDailyApplication(verse, i + 1, days),
        connections: i > 0 ? `Connects to Day ${i}: ${plan.verses[i-1].reference}` : 'Beginning'
      });
    }
    
    return plan;
  }

  /**
   * Search news for current events (placeholder - uses web_search tool)
   */
  async searchNews(query) {
    // This would integrate with web_search tool in practice
    // For now, return placeholder events
    const defaultQueries = [
      'major world news today',
      'breaking news',
      'current events'
    ];
    
    // In actual implementation, this would call web_search
    // and parse results into event objects
    return [
      { type: 'placeholder', description: 'News search requires web_search integration' }
    ];
  }

  /**
   * Match events to themes
   */
  matchEventsToThemes(events) {
    const themeScores = {};
    const mappings = this.verses.event_mappings || {};
    
    for (const event of events) {
      const eventType = (event.type || '').toLowerCase().replace(/\s+/g, '_');
      const themes = mappings[eventType] || mappings[this.categorizeEvent(event.type)] || [];
      
      for (const theme of themes) {
        themeScores[theme] = (themeScores[theme] || 0) + 1;
      }
    }
    
    // Sort by score
    return Object.entries(themeScores)
      .sort((a, b) => b[1] - a[1])
      .map(([theme]) => theme);
  }

  /**
   * Categorize an event type
   */
  categorizeEvent(eventType) {
    if (!eventType) return 'general';
    
    const type = eventType.toLowerCase();
    
    if (type.includes('war') || type.includes('conflict') || type.includes('attack')) {
      return 'conflict';
    }
    if (type.includes('economic') || type.includes('financial') || type.includes('market')) {
      return 'economic_crisis';
    }
    if (type.includes('disaster') || type.includes('earthquake') || type.includes('storm')) {
      return 'disaster';
    }
    if (type.includes('death') || type.includes('died')) {
      return 'death';
    }
    if (type.includes('political') || type.includes('election') || type.includes('government')) {
      return 'political';
    }
    
    return 'general';
  }

  /**
   * Select a verse from a theme
   */
  selectVerse(theme, options = {}) {
    const themeData = this.verses.themes[theme];
    if (!themeData || !themeData.verses.length) {
      // Fallback to hope theme
      return this.verses.themes.hope?.verses[0];
    }
    
    // Could add more sophisticated selection based on:
    // - Time of year
    // - Recent selections (avoid repetition)
    // - User preferences
    
    const verses = themeData.verses;
    
    // Random selection for now
    const index = options.verseIndex || Math.floor(Math.random() * verses.length);
    return verses[index % verses.length];
  }

  /**
   * Generate explanation of why verse fits
   */
  generateConnection(verse, events) {
    let connection = verse.theology || '';
    
    if (events && events.length > 0) {
      connection += ` This speaks to ${events[0].type || 'current events'} because `;
      connection += verse.events?.includes(events[0].type) 
        ? 'it directly addresses this situation.'
        : 'it offers eternal perspective on temporal circumstances.';
    }
    
    return connection;
  }

  /**
   * Generate application for an event
   */
  generateApplication(verse, event) {
    // Base application from verse theology
    let application = '';
    
    if (verse.theology?.includes('trust')) {
      application = 'Trust God in this situation, even when you cannot see the outcome.';
    } else if (verse.theology?.includes('hope')) {
      application = 'Set your hope on God's promises, not on circumstances.';
    } else if (verse.theology?.includes('peace')) {
      application = 'Receive God's peace, which transcends understanding.';
    } else if (verse.theology?.includes('love')) {
      application = 'Show love to others as God has loved you.';
    } else {
      application = 'Apply this truth to your life through prayer and obedience.';
    }
    
    // Adjust for event severity
    if (event.severity === 'high') {
      application += ' In acute suffering, focus on God's presence rather than explanations.';
    }
    
    return application;
  }

  /**
   * Generate daily application for reading plan
   */
  generateDailyApplication(verse, day, totalDays) {
    const progress = day / totalDays;
    
    if (progress < 0.3) {
      return `Day ${day}: Begin by meditating on this foundation. ${verse.context}`;
    } else if (progress < 0.7) {
      return `Day ${day}: Build on previous days. Consider how this expands the theme.`;
    } else {
      return `Day ${day}: Culmination. How does this complete the picture? Live it today.`;
    }
  }

  /**
   * Get related verses from other themes
   */
  getRelatedVerses(verse, count = 3) {
    const related = [];
    
    // Find verses with similar events or complementary themes
    for (const [themeName, themeData] of Object.entries(this.verses.themes || {})) {
      for (const v of themeData.verses || []) {
        if (v.id === verse.id) continue;
        
        // Check for shared events
        const sharedEvents = (v.events || []).filter(e => 
          (verse.events || []).includes(e)
        );
        
        if (sharedEvents.length > 0) {
          related.push({
            reference: v.reference,
            text: v.text,
            connection: `Shares theme: ${sharedEvents[0]}`
          });
        }
        
        if (related.length >= count) break;
      }
      if (related.length >= count) break;
    }
    
    return related;
  }

  /**
   * Generate suggested prayers
   */
  generatePrayers(verse, event) {
    const prayers = [];
    
    // Base prayer from verse
    prayers.push(`Lord, help me trust ${verse.reference}: "${verse.text.substring(0, 50)}..."`);
    
    // Event-specific prayer
    if (event) {
      prayers.push(`Father, in ${event.event || 'these circumstances'}, be my refuge and strength.`);
    }
    
    // Application prayer
    prayers.push(`Spirit, empower me to live this truth today.`);
    
    return prayers;
  }

  /**
   * Get canonical connections
   */
  getCanonicalConnections(verse) {
    const connections = [];
    
    // Find cross-references by theme
    for (const theme of verse.events || []) {
      for (const [themeName, themeData] of Object.entries(this.verses.themes || {})) {
        if (themeData.verses?.some(v => v.id === verse.id)) {
          // Add other verses from same theme
          const others = themeData.verses
            .filter(v => v.id !== verse.id)
            .slice(0, 2);
          connections.push(...others.map(v => v.reference));
        }
      }
    }
    
    return connections;
  }

  /**
   * Calculate relevance score
   */
  calculateRelevance(verse, query) {
    let score = 0;
    
    // Check verse text
    if (verse.text.toLowerCase().includes(query)) score += 3;
    if (verse.context.toLowerCase().includes(query)) score += 2;
    if (verse.theology.toLowerCase().includes(query)) score += 2;
    
    // Check events
    for (const event of verse.events || []) {
      if (query.includes(event.toLowerCase())) score += 2;
    }
    
    return score;
  }

  /**
   * Generate search explanation
   */
  generateSearchExplanation(query, themes) {
    return `Searching for "${query}" matched themes: ${themes.slice(0, 3).join(', ')}. ` +
           `These verses address your query from different angles, offering biblical perspective.`;
  }

  /**
   * Generate follow-up questions
   */
  generateFollowUpQuestions(query, themes) {
    const questions = [
      'Would you like a reading plan on this theme?',
      'Would you like to see how this connects to current events?',
      'Would you like historical context on any of these verses?'
    ];
    
    if (themes.includes('suffering')) {
      questions.push('Are you going through a difficult time?');
    }
    if (themes.includes('faith') || themes.includes('doubt')) {
      questions.push('Would you like verses on strengthening faith?');
    }
    
    return questions;
  }
}

// CLI interface
if (require.main === module) {
  const scripture = new ScriptureCurated();
  const command = process.argv[2];

  (async () => {
    switch (command) {
      case 'daily':
        const daily = await scripture.dailyVerse();
        console.log('\n=== Daily Verse ===');
        console.log(`${daily.verse.reference} (${daily.verse.version})`);
        console.log(`"${daily.verse.text}"`);
        console.log(`\nConnection: ${daily.connection}`);
        console.log(`\nHistorical Context: ${daily.context.historical}`);
        console.log(`\nReading Plan: ${daily.readingPlan.days}-day ${daily.readingPlan.theme} journey`);
        break;

      case 'search':
        const query = process.argv.slice(3).join(' ');
        const result = await scripture.search(query);
        console.log('\n=== Search Results ===');
        console.log(result.explanation);
        console.log('\nVerses:');
        result.verses.forEach((v, i) => {
          console.log(`\n${i + 1}. ${v.reference}`);
          console.log(`   "${v.text.substring(0, 100)}..."`);
        });
        break;

      case 'plan':
        const theme = process.argv[3] || 'hope';
        const days = parseInt(process.argv[4]) || 7;
        const plan = scripture.generateReadingPlan({ theme, days });
        console.log(`\n=== ${days}-Day ${theme.charAt(0).toUpperCase() + theme.slice(1)} Plan ===`);
        console.log(plan.overview);
        plan.verses.forEach(v => {
          console.log(`\nDay ${v.day}: ${v.reference}`);
          console.log(`"${v.text.substring(0, 60)}..."`);
        });
        break;

      default:
        console.log('Scripture-Curated');
        console.log('Usage:');
        console.log('  node scripture-curated.js daily');
        console.log('  node scripture-curated.js search <query>');
        console.log('  node scripture-curated.js plan <theme> [days]');
    }
  })();
}

module.exports = ScriptureCurated;
