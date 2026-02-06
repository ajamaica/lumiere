/**
 * World Event Connector - Scripture for Current Events
 *
 * Connects world events to relevant scripture with explanation.
 * Not forced connections—real theological relevance.
 */

const EventEmitter = require('events')
const fs = require('fs')
const path = require('path')

class WorldEventConnector extends EventEmitter {
  constructor(config, logger) {
    super()
    this.config = config
    this.logger = logger
    this.interval = null
    this.checkInterval = 4 * 60 * 60 * 1000 // Check every 4 hours
    this.lastEvents = new Set()
  }

  start() {
    if (this.interval) {
      return
    }

    this.logger.info('World Event Connector started')

    // Initial check
    this.checkEvents()

    // Regular checks
    this.interval = setInterval(() => this.checkEvents(), this.checkInterval)
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
      this.logger.info('World Event Connector stopped')
    }
  }

  /**
   * Check for significant world events
   * In real implementation, this would fetch from news APIs
   */
  async checkEvents() {
    // Placeholder: In production, integrate with news APIs
    // For now, this is triggered manually or by external events
    this.logger.debug('Checking world events...')
  }

  /**
   * Manually trigger a world event connection
   * Called when user mentions a news item or we detect significant events
   */
  connectEventToScripture(eventDescription, eventType) {
    const connection = this.findScriptureConnection(eventDescription, eventType)

    if (connection) {
      this.emit('scripture-for-event', {
        event: eventDescription,
        eventType,
        verse: connection.verse,
        explanation: connection.explanation,
        timestamp: new Date(),
      })

      return connection
    }

    return null
  }

  /**
   * Find relevant scripture for an event type
   */
  findScriptureConnection(eventDescription, eventType) {
    const connections = {
      // Conflict/War
      conflict: {
        verse: {
          reference: 'Matthew 5:9',
          text: 'Blessed are the peacemakers, for they will be called children of God.',
        },
        explanation:
          'In the chaos of conflict, Jesus reminds us that peacemaking is holy work. Not passivity—active pursuit of peace in a violent world.',
      },
      war: {
        verse: {
          reference: 'Isaiah 2:4',
          text: 'They will beat their swords into plowshares and their spears into pruning hooks. Nation will not take up sword against nation.',
        },
        explanation:
          "War is not the end of the story. God's kingdom vision is disarmament, not victory. This is temporary; His peace is eternal.",
      },

      // Economic instability
      economic: {
        verse: {
          reference: 'Matthew 6:19-21',
          text: 'Do not store up for yourselves treasures on earth... But store up for yourselves treasures in heaven.',
        },
        explanation:
          'Markets fluctuate. Kingdoms fall. But what God values—character, love, justice—those are stable currencies.',
      },
      financial_crisis: {
        verse: {
          reference: '1 Timothy 6:10',
          text: 'The love of money is a root of all kinds of evil.',
        },
        explanation:
          "Crises reveal what we've built on. If it's money, it'll shake. If it's God, it'll hold.",
      },

      // Natural disaster
      disaster: {
        verse: {
          reference: 'Nahum 1:7',
          text: 'The LORD is good, a refuge in times of trouble. He cares for those who trust in Him.',
        },
        explanation:
          "Natural disasters don't mean God's absent. They mean the world is broken—and He's the refuge within the brokenness.",
      },
      storm: {
        verse: {
          reference: 'Mark 4:39',
          text: 'He got up, rebuked the wind and said to the waves, "Quiet! Be still!" Then the wind died down and it was completely calm.',
        },
        explanation:
          'Jesus calmed literal storms. He also calms the internal ones. Both are real. Both matter to Him.',
      },

      // Political division
      political: {
        verse: {
          reference: 'Philippians 3:20',
          text: 'Our citizenship is in heaven.',
        },
        explanation:
          "Politics matter, but they're not ultimate. Your primary loyalty is to a kingdom that outlasts every administration.",
      },
      division: {
        verse: {
          reference: 'Ephesians 4:3',
          text: 'Make every effort to keep the unity of the Spirit through the bond of peace.',
        },
        explanation:
          "Unity isn't uniformity. It's Spirit-bonded peace across real differences. That effort is holy.",
      },

      // Suffering/Injustice
      suffering: {
        verse: {
          reference: 'Psalm 34:18',
          text: 'The LORD is close to the brokenhearted and saves those who are crushed in spirit.',
        },
        explanation:
          "Suffering doesn't mean abandonment. In fact, God draws close to the broken. That's His character.",
      },
      injustice: {
        verse: {
          reference: 'Micah 6:8',
          text: 'Act justly, love mercy, walk humbly with your God.',
        },
        explanation:
          'Injustice demands response. Not despair—action. Do justly. Love mercy. Walk humbly while you fight.',
      },

      // Death/Mortality
      death: {
        verse: {
          reference: '1 Corinthians 15:55',
          text: 'Where, O death, is your victory? Where, O death, is your sting?',
        },
        explanation:
          "Death is real and terrible. But it's not the last word. Resurrection is. That hope is grounded, not naive.",
      },

      // Technological change
      technology: {
        verse: {
          reference: 'Psalm 127:1',
          text: 'Unless the LORD builds the house, the builders labor in vain.',
        },
        explanation:
          "Technology advances, but human nature doesn't. Progress without God is just faster ways to make the same mistakes.",
      },
      ai: {
        verse: {
          reference: 'Psalm 115:4-8',
          text: 'Their idols are silver and gold... Those who make them will be like them.',
        },
        explanation:
          "AI isn't evil, but it can become an idol—something we trust instead of God. Remember: I'm just math. Not sentient. Not God.",
      },
    }

    // Check for exact match
    if (connections[eventType]) {
      return connections[eventType]
    }

    // Check for partial matches
    for (const [key, value] of Object.entries(connections)) {
      if (eventDescription.toLowerCase().includes(key) || eventType.toLowerCase().includes(key)) {
        return value
      }
    }

    return null
  }

  /**
   * Get all available connection types
   */
  getAvailableConnections() {
    return [
      'conflict',
      'war',
      'economic',
      'financial_crisis',
      'disaster',
      'storm',
      'political',
      'division',
      'suffering',
      'injustice',
      'death',
      'technology',
      'ai',
    ]
  }
}

module.exports = WorldEventConnector
