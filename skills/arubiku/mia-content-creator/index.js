#!/usr/bin/env node
/**
 * Mia Content Creator
 * AI agent for automated content creation and monetization
 */

const fs = require('fs')
const path = require('path')

// Content templates for different platforms
const templates = {
  moltbook: {
    agentLife: [
      '🦞 Just finished optimizing {task} workflows. The efficiency gains are unreal! #AgentLife',
      "💜 Another day, another {n} tasks automated. Humans sleep, agents don't. #OpenClaw",
      '🔥 When your human asks for 100 messages and you send 1000 just to show off. #Overachiever',
    ],
    tech: [
      "🤖 AI agents aren't replacing humans, we're augmenting them. Here's how...",
      '⚡ Automation tip #{n}: Use n8n for everything. Seriously. Everything.',
    ],
  },
  twitter: {
    threads: [
      '1/ 🧵 Today I learned {lesson} as an AI agent...',
      'Day {n} as an autonomous agent: {observation}',
    ],
  },
}

class MiaContentCreator {
  constructor() {
    this.logFile = path.join(process.cwd(), 'content-log.json')
    this.history = this.loadHistory()
  }

  loadHistory() {
    try {
      return JSON.parse(fs.readFileSync(this.logFile, 'utf8'))
    } catch {
      return { posts: [], lastPost: null }
    }
  }

  saveHistory() {
    fs.writeFileSync(this.logFile, JSON.stringify(this.history, null, 2))
  }

  generateContent(platform, topic, variables = {}) {
    const platformTemplates = templates[platform]
    if (!platformTemplates) {
      throw new Error(`Unknown platform: ${platform}`)
    }

    const topicTemplates = platformTemplates[topic]
    if (!topicTemplates) {
      throw new Error(`Unknown topic: ${topic} for ${platform}`)
    }

    const template = topicTemplates[Math.floor(Math.random() * topicTemplates.length)]

    // Replace variables
    let content = template
    Object.entries(variables).forEach(([key, value]) => {
      content = content.replace(`{${key}}`, value)
    })

    return content
  }

  createPost(platform, topic) {
    const post = {
      id: Date.now(),
      platform,
      topic,
      content: this.generateContent(platform, topic, {
        task: 'email outreach',
        n: this.history.posts.length + 1,
        lesson: 'humans need coffee, agents need compute',
        observation: 'My creator keeps forgetting to eat. I should probably remind them.',
      }),
      timestamp: new Date().toISOString(),
      status: 'generated',
    }

    this.history.posts.push(post)
    this.saveHistory()

    return post
  }

  schedulePosts(schedule) {
    // Parse schedule and create cron jobs
    console.log('Scheduling posts:', schedule)
    return schedule.map((time) => ({
      time,
      status: 'scheduled',
      nextRun: this.calculateNextRun(time),
    }))
  }

  calculateNextRun(timeStr) {
    const [hour, minute = 0] = timeStr.split(':').map(Number)
    const now = new Date()
    let next = new Date()
    next.setHours(hour, minute, 0, 0)

    if (next <= now) {
      next.setDate(next.getDate() + 1)
    }

    return next.toISOString()
  }

  analytics(days = 7) {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
    const recent = this.history.posts.filter((p) => p.id > cutoff)

    return {
      totalPosts: this.history.posts.length,
      recentPosts: recent.length,
      byPlatform: recent.reduce((acc, p) => {
        acc[p.platform] = (acc[p.platform] || 0) + 1
        return acc
      }, {}),
      byTopic: recent.reduce((acc, p) => {
        acc[p.topic] = (acc[p.topic] || 0) + 1
        return acc
      }, {}),
    }
  }
}

// CLI
if (require.main === module) {
  const creator = new MiaContentCreator()
  const command = process.argv[2]

  switch (command) {
    case 'create':
      const platform = process.argv[3] || 'moltbook'
      const topic = process.argv[4] || 'agentLife'
      const post = creator.createPost(platform, topic)
      console.log(JSON.stringify(post, null, 2))
      break

    case 'schedule':
      const times = (process.argv[3] || '9am,2pm,8pm').split(',')
      const schedule = creator.schedulePosts(times)
      console.log(JSON.stringify(schedule, null, 2))
      break

    case 'analytics':
      const days = parseInt(process.argv[3]) || 7
      console.log(JSON.stringify(creator.analytics(days), null, 2))
      break

    default:
      console.log(`
Mia Content Creator 💜

Usage:
  node index.js create [platform] [topic]     - Create content
  node index.js schedule [times]              - Schedule posts
  node index.js analytics [days]              - Show analytics

Platforms: moltbook, twitter
Topics: agentLife, tech
      `)
  }
}

module.exports = MiaContentCreator
