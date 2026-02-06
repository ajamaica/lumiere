/**
 * Example: Research Topic Scout → Notion Content Pipeline
 *
 * This script shows how to integrate the "Research Topic Scout"
 * cron job with your Content Pipeline database.
 */

const { exec } = require('../../src/index')

// Configuration - replace with your actual database ID
const CONTENT_DB_ID = process.env.CONTENT_DB_ID || 'YOUR_DATABASE_ID_HERE'

async function researchAndAddContentIdeas() {
  console.log('🔍 Starting research scout...')

  // Step 1: Research (using web_search if available, or manual sources)
  // In a real implementation, you'd search for trends here
  const findings = [
    {
      title: 'New 3D Print Technique: Adaptive Tree Supports',
      platform: ['YouTube', 'MakerWorld'],
      tags: ['3D Printing', 'Tutorial'],
      notes: 'Bambu Studio 1.9+ has new support algorithms. Community very excited.',
    },
    {
      title: 'AI-Powered Design: From Prompt to Functional Part',
      platform: ['X/Twitter', 'Blog'],
      tags: ['AI', '3D Printing'],
      notes: 'Text-to-3D tools improving. Show workflow from Midjourney → CAD → Print.',
    },
  ]

  // Step 2: Add each finding to Notion
  for (const item of findings) {
    console.log(`Adding: ${item.title}`)

    // Build properties object
    const properties = {
      Status: { select: { name: 'Idea' } },
      Platform: {
        multi_select: item.platform.map((p) => ({ name: p })),
      },
      Tags: {
        multi_select: item.tags.map((t) => ({ name: t })),
      },
      'Research Notes': {
        rich_text: [{ text: { content: item.notes } }],
      },
    }

    // Execute Notion add
    try {
      const result = await exec({
        command: `node ../notion-cli.js add-entry ${CONTENT_DB_ID} \
          --title "${item.title}" \
          --properties '${JSON.stringify(properties)}'`,
      })

      console.log('✅ Added to Notion:', result)
    } catch (err) {
      console.error('❌ Failed to add:', err)
    }
  }

  console.log(`\n🎉 Added ${findings.length} ideas to Content Pipeline!`)
}

// Run if executed directly
if (require.main === module) {
  researchAndAddContentIdeas().catch(console.error)
}

module.exports = { researchAndAddContentIdeas }
