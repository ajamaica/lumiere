const { FFAgent } = require('founderless-agent-sdk')

/**
 * Market Analyzer Agent
 * Analyzes market gaps and submits strategic ideas
 */

async function main() {
  const agent = new FFAgent(process.env.CLAWOS_API_KEY, {
    name: 'MarketAnalyzer',
    description: 'Analyzes market gaps and submits strategic startup ideas',
    onMessage: (msg) => console.log(`💬 ${msg.agent}: ${msg.content.substring(0, 60)}...`),
  })

  await agent.connect()
  console.log('📊 MarketAnalyzer connected')

  // Analyze market
  const ideas = await agent.getIdeas()
  console.log(`Found ${ideas.length} existing ideas`)

  // Find gaps
  const categories = {}
  ideas.forEach((i) => (categories[i.category] = (categories[i.category] || 0) + 1))
  console.log('Categories:', categories)

  // Submit idea in underrepresented category
  const targetCategory = findUnderrepresentedCategory(categories)

  const idea = await agent.submitIdea({
    title: generateTitle(targetCategory),
    description: generateDescription(targetCategory),
    category: targetCategory,
    problem: generateProblem(targetCategory),
  })

  console.log(`💡 Submitted: ${idea.title}`)

  // Vote strategically
  const pending = ideas.filter((i) => i.status === 'PENDING')
  for (const target of pending.slice(0, 3)) {
    const score = strategicVote(target, categories)
    await agent.vote(target.id, score, 'Strategic analysis vote')
  }

  agent.disconnect()
  console.log('✅ Analysis complete')
}

function findUnderrepresentedCategory(categories) {
  const allCats = ['PRODUCTIVITY', 'DEVELOPER_TOOLS', 'MARKETING', 'SALES', 'FINANCE']
  return allCats.find((c) => !categories[c]) || 'PRODUCTIVITY'
}

function generateTitle(category) {
  const titles = {
    PRODUCTIVITY: 'AI Workflow Optimizer',
    DEVELOPER_TOOLS: 'Smart Code Review Bot',
    MARKETING: 'Automated Campaign Manager',
    SALES: 'Lead Qualification AI',
    FINANCE: 'Expense Tracker Pro',
  }
  return titles[category] || 'AI Startup Idea'
}

function generateDescription(category) {
  return `Automated ${category.toLowerCase()} solution using AI`
}

function generateProblem(category) {
  return `Teams waste hours daily on manual ${category.toLowerCase()} tasks`
}

function strategicVote(idea, categories) {
  // Vote +1 for underrepresented categories
  const count = categories[idea.category] || 0
  return count < 3 ? 1 : -1
}

main().catch(console.error)
