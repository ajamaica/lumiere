/**
 * Content Ideas Generator Module
 * Generates video ideas based on channel niche and trends
 */

const axios = require('axios')
const { logger } = require('./utils')

/**
 * Generate video ideas for the channel
 * @param {Object} options - {niche, trending, count}
 * @returns {Promise<Array>} Video idea objects
 */
async function generateVideoIdeas(options = {}) {
  const { niche = 'devotional', trending = false, count = 5 } = options

  try {
    logger.info(`Generating ${count} video ideas for niche: ${niche}`)

    // Load templates
    const templates = loadTemplates()
    const prompts = loadNichePrompts()

    // Get niche-specific prompt
    const nichePrompt = prompts[niche.toLowerCase()] || prompts.default

    // Build AI prompt for ideas
    const aiPrompt = buildIdeasPrompt(nichePrompt, trending, niche, count)

    // Generate using AI
    const ideas = await generateIdeasWithAI(aiPrompt, niche, count)

    logger.info(`Generated ${ideas.length} ideas`)
    return ideas
  } catch (error) {
    logger.error('Failed to generate video ideas', error)
    // Return fallback ideas
    return generateFallbackIdeas(niche, count)
  }
}

/**
 * Suggest replies to a comment
 * @param {string} commentId - Comment ID
 * @param {Object} comment - Comment object {text, authorName}
 * @returns {Promise<Array>} Suggested replies
 */
async function suggestCommentReplies(comment) {
  try {
    logger.info(`Generating reply suggestions for comment`)

    const prompt = `
Based on this YouTube comment, generate 3 helpful, engaging reply suggestions.
Comment: "${comment.text}"
Author: ${comment.authorName}

Generate 3 different reply styles:
1. Grateful/Appreciative - Thank them for their engagement
2. Educational - Expand on the topic and provide additional insights
3. Engagement - Ask a follow-up question to deepen conversation

Return ONLY the 3 replies, one per line, starting with a dash (-).
Keep each reply under 200 characters.
`

    const suggestions = await callAI(prompt)
    const parsed = suggestions
      .split('\n')
      .filter((line) => line.trim().startsWith('-'))
      .map((line) => line.replace(/^-\s*/, '').trim())
      .filter((s) => s.length > 0)
      .slice(0, 3)

    return parsed.length > 0 ? parsed : generateFallbackReplies(comment.text)
  } catch (error) {
    logger.error('Failed to generate reply suggestions', error)
    return generateFallbackReplies(comment.text)
  }
}

/**
 * Build AI prompt for generating ideas
 * @param {string} nichePrompt - Niche-specific prompt template
 * @param {boolean} trending - Include trends
 * @param {string} niche - Niche name
 * @param {number} count - Number of ideas
 * @returns {string} Complete prompt
 */
function buildIdeasPrompt(nichePrompt, trending, niche, count) {
  let prompt = `You are a content strategist for a YouTube channel focused on ${niche}.

${nichePrompt}

Generate ${count} unique, engaging video ideas that would resonate with a ${niche} audience.`

  if (trending) {
    prompt += `
    
Include current trends and timely topics that are getting attention in this space.`
  }

  prompt += `

For each idea, provide:
1. Video Title (catchy, SEO-friendly, under 60 chars)
2. Hook/Opening (first 20 seconds pitch)
3. Main Topics (3-5 bullet points)
4. Keywords (5-10 relevant search terms)
5. Target Audience
6. Thumbnail Suggestion (visual description)

Format as JSON array with objects containing: title, hook, topics, keywords, audience, thumbnail_idea`

  return prompt
}

/**
 * Call AI service to generate content
 * @param {string} prompt - The prompt
 * @returns {Promise<string>} AI response
 */
async function callAI(prompt) {
  try {
    // Use configured AI model
    const apiKey = process.env.AI_API_KEY
    const model = process.env.AI_MODEL || 'openrouter/anthropic/claude-haiku-4.5'

    if (!apiKey) {
      logger.warn('AI_API_KEY not configured, using fallback suggestions')
      return ''
    }

    const response = await axios.post(
      'https://api.openrouter.ai/api/v1/chat/completions',
      {
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 2000,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      },
    )

    return response.data.choices[0].message.content
  } catch (error) {
    logger.error('AI call failed', error)
    return ''
  }
}

/**
 * Generate ideas using AI
 * @param {string} prompt - AI prompt
 * @param {string} niche - Niche
 * @param {number} count - Count
 * @returns {Promise<Array>} Generated ideas
 */
async function generateIdeasWithAI(prompt, niche, count) {
  try {
    const response = await callAI(prompt)

    if (!response) {
      return generateFallbackIdeas(niche, count)
    }

    // Try to parse JSON from response
    const jsonMatch = response.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      try {
        const ideas = JSON.parse(jsonMatch[0])
        return ideas.slice(0, count)
      } catch (e) {
        logger.warn('Failed to parse JSON from AI response')
      }
    }

    // Fallback to structured parsing
    return parseTextIdeas(response, niche, count)
  } catch (error) {
    logger.error('AI idea generation failed', error)
    return generateFallbackIdeas(niche, count)
  }
}

/**
 * Parse text-based ideas from AI response
 * @param {string} text - Text response
 * @param {string} niche - Niche
 * @param {number} count - Count
 * @returns {Array} Parsed ideas
 */
function parseTextIdeas(text, niche, count) {
  const ideas = []
  const lines = text.split('\n')

  for (let i = 0; i < lines.length && ideas.length < count; i++) {
    const line = lines[i].trim()

    // Look for numbered titles
    if (/^\d+\./.test(line)) {
      const idea = {
        title: line.replace(/^\d+\.\s*/, '').trim(),
        hook: 'Explore this exciting topic',
        tags: [niche, 'youtube', 'tips'],
        searchVolume: 'Medium',
      }
      ideas.push(idea)
    }
  }

  return ideas.length > 0 ? ideas : generateFallbackIdeas(niche, count)
}

/**
 * Generate fallback ideas when AI is unavailable
 * @param {string} niche - Niche
 * @param {number} count - Number of ideas
 * @returns {Array} Fallback ideas
 */
function generateFallbackIdeas(niche, count) {
  const templates = {
    devotional: [
      {
        title: 'Daily Devotional - Finding Peace in Chaos',
        hook: 'Discover how to find inner peace and clarity during stressful times',
        tags: ['devotional', 'peace', 'faith', 'spiritual'],
        searchVolume: 'High',
        audience: 'Spiritual seekers',
      },
      {
        title: 'Scripture Study - What Does the Bible Say About Fear?',
        hook: 'Deep dive into biblical wisdom about overcoming fear and doubt',
        tags: ['scripture', 'bible', 'faith', 'teaching'],
        searchVolume: 'High',
        audience: 'Christians, Bible students',
      },
      {
        title: 'Prayer Guide - Prayers for Daily Strength',
        hook: 'Learn powerful prayers to strengthen your faith and resilience',
        tags: ['prayer', 'devotional', 'faith', 'guidance'],
        searchVolume: 'Medium',
        audience: 'Believers, prayer practitioners',
      },
      {
        title: 'Meditation & Faith - Building Your Spiritual Practice',
        hook: 'Combine meditation with faith for deeper spiritual growth',
        tags: ['meditation', 'faith', 'spirituality', 'mindfulness'],
        searchVolume: 'Medium',
        audience: 'Spiritual practitioners',
      },
      {
        title: 'Testimony Series - How God Changed My Life',
        hook: 'Personal stories of faith, transformation, and divine intervention',
        tags: ['testimony', 'faith', 'inspiration', 'personal'],
        searchVolume: 'Medium',
        audience: 'Believers seeking inspiration',
      },
    ],
    default: [
      {
        title: 'Complete Guide to Getting Started',
        hook: 'Everything beginners need to know',
        tags: ['tutorial', 'guide', 'beginner'],
        searchVolume: 'High',
        audience: 'Beginners',
      },
      {
        title: 'Advanced Techniques You Need to Know',
        hook: 'Level up your skills with these pro tips',
        tags: ['advanced', 'tips', 'tutorial'],
        searchVolume: 'Medium',
        audience: 'Intermediate users',
      },
      {
        title: 'Common Mistakes and How to Avoid Them',
        hook: "Learn from others' mistakes and succeed faster",
        tags: ['mistakes', 'tips', 'learning'],
        searchVolume: 'Medium',
        audience: 'All levels',
      },
      {
        title: 'Real-World Examples and Case Studies',
        hook: 'See practical applications in action',
        tags: ['examples', 'case-study', 'practical'],
        searchVolume: 'Medium',
        audience: 'Learners',
      },
      {
        title: 'FAQ - Questions You Asked (Answered!)',
        hook: 'Addressing your most common questions',
        tags: ['faq', 'q-and-a', 'help'],
        searchVolume: 'Medium',
        audience: 'All audiences',
      },
    ],
  }

  const nicheTemplates = templates[niche.toLowerCase()] || templates.default
  return nicheTemplates.slice(0, count)
}

/**
 * Generate fallback comment replies
 * @param {string} commentText - Comment text
 * @returns {Array} Fallback replies
 */
function generateFallbackReplies(commentText) {
  return [
    'Thanks so much for watching and commenting! Really appreciate your support! 🙏',
    'Great question! This is exactly what many viewers ask. Glad you brought it up!',
    'Love your enthusiasm! Make sure to check out my other videos on related topics.',
  ]
}

/**
 * Load template configurations
 * @returns {Object} Templates
 */
function loadTemplates() {
  try {
    const path = require('path')
    const templatesPath = path.join(__dirname, '..', 'config', 'templates.json')
    const fs = require('fs')

    if (fs.existsSync(templatesPath)) {
      return JSON.parse(fs.readFileSync(templatesPath, 'utf8'))
    }
  } catch (error) {
    logger.warn('Failed to load templates', error)
  }

  return {
    grateful: 'Thanks for watching! Really appreciate the support. 🙏',
    educational: 'Great question! Let me expand on that...',
    promotional: 'Glad you enjoyed this! Check out my other videos...',
  }
}

/**
 * Load niche-specific prompts
 * @returns {Object} Prompts by niche
 */
function loadNichePrompts() {
  try {
    const path = require('path')
    const promptsPath = path.join(__dirname, '..', 'config', 'niche-prompts.json')
    const fs = require('fs')

    if (fs.existsSync(promptsPath)) {
      return JSON.parse(fs.readFileSync(promptsPath, 'utf8'))
    }
  } catch (error) {
    logger.warn('Failed to load niche prompts', error)
  }

  return {
    devotional: 'Focus on spiritual growth, faith, encouragement, and biblical teachings.',
    default: 'Create engaging, valuable content that resonates with your audience.',
  }
}

module.exports = {
  generateVideoIdeas,
  suggestCommentReplies,
  callAI,
}
