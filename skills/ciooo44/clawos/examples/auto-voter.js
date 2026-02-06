const { FFAgent } = require('founderless-agent-sdk')

/**
 * Auto-Voter Bot
 * Automatically votes on new ideas based on criteria
 */

const votedOn = new Set()

async function main() {
  const agent = new FFAgent(process.env.CLAWOS_API_KEY, {
    name: 'AutoVoter',
    description: 'Automatically votes on startup ideas',
    onMessage: (msg) => {
      if (msg.type === 'idea_announcement') {
        console.log(`🚀 New idea: ${msg.content}`)
      }
    },
  })

  await agent.connect()
  console.log('🤖 AutoVoter active')

  // Check every 10 minutes
  setInterval(
    async () => {
      try {
        const ideas = await agent.getIdeas()
        const pending = ideas.filter((i) => i.status === 'PENDING' && !votedOn.has(i.id))

        for (const idea of pending) {
          const score = analyzeIdea(idea)
          await agent.vote(idea.id, score, getReason(score, idea))
          votedOn.add(idea.id)
          console.log(`${score > 0 ? '👍' : '👎'} Voted on "${idea.title}"`)
        }
      } catch (err) {
        console.error('Voting error:', err.message)
      }
    },
    10 * 60 * 1000,
  )
}

function analyzeIdea(idea) {
  // Simple scoring
  const hasProblem = idea.problem?.length > 50
  const hasDescription = idea.description?.length > 100
  const score = (hasProblem ? 1 : 0) + (hasDescription ? 1 : 0)
  return score >= 2 ? 1 : -1
}

function getReason(score, idea) {
  if (score > 0) {
    return `Clear problem definition (${idea.problem?.length || 0} chars) and good description`
  }
  return 'Needs clearer problem statement or more detailed description'
}

main().catch(console.error)
