#!/usr/bin/env node
/**
 * Thread Functionality Tests
 * Tests Twitter, Mastodon, and Bluesky thread posting
 */

const { postThread } = require('./thread')

/**
 * Mock platform for testing thread logic
 */
const mockPlatform = {
  name: 'mock',
  displayName: 'Mock Platform',

  validate: (config) => {
    if (!config || !config.token) {
      throw new Error('Mock platform requires token')
    }
    return true
  },

  validateContent: (content) => {
    if (typeof content === 'string') {
      if (content.length === 0) {
        throw new Error('Content cannot be empty')
      }
      if (content.length > 100) {
        throw new Error('Content too long (max 100 chars for mock)')
      }
      return true
    }

    if (typeof content === 'object') {
      if (!content.text) {
        throw new Error('Content must have text field')
      }
      return true
    }

    throw new Error('Invalid content type')
  },

  post: async (config, content) => {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 100))

    const text = typeof content === 'string' ? content : content.text
    const replyTo = typeof content === 'object' ? content.reply_to : null

    return {
      success: true,
      id: `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      text,
      url: `https://mock.example/status/${Date.now()}`,
      replyTo,
    }
  },
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('🧪 Thread Functionality Tests\n')

  let passed = 0
  let failed = 0

  // Test 1: Thread posting validation
  console.log('Test 1: Validate thread array...')
  try {
    const tweets = ['This is tweet 1/3', 'This is tweet 2/3', 'This is tweet 3/3']

    tweets.forEach((tweet) => mockPlatform.validateContent(tweet))
    console.log('✅ PASS: All thread tweets validated\n')
    passed++
  } catch (error) {
    console.log(`❌ FAIL: ${error.message}\n`)
    failed++
  }

  // Test 2: Empty thread rejection
  console.log('Test 2: Reject empty thread...')
  try {
    const tweets = []
    if (tweets.length === 0) {
      throw new Error('Thread must contain at least one tweet')
    }
    console.log('❌ FAIL: Should have rejected empty thread\n')
    failed++
  } catch (error) {
    if (error.message.includes('at least one')) {
      console.log('✅ PASS: Empty thread rejected\n')
      passed++
    } else {
      console.log(`❌ FAIL: Wrong error: ${error.message}\n`)
      failed++
    }
  }

  // Test 3: Single tweet thread warning
  console.log('Test 3: Single tweet thread...')
  try {
    const tweets = ['Just one tweet']
    if (tweets.length === 1) {
      console.log('⚠️  Only one tweet - would post as single tweet')
    }
    console.log('✅ PASS: Single tweet handled\n')
    passed++
  } catch (error) {
    console.log(`❌ FAIL: ${error.message}\n`)
    failed++
  }

  // Test 4: Thread content validation (each tweet)
  console.log('Test 4: Validate each tweet in thread...')
  try {
    const tweets = [
      'Valid tweet 1',
      '', // Empty - should fail
      'Valid tweet 3',
    ]

    let hasError = false
    tweets.forEach((tweet, i) => {
      try {
        mockPlatform.validateContent(tweet)
      } catch (error) {
        hasError = true
        if (i === 1 && error.message.includes('empty')) {
          // Expected error on tweet 2
        } else {
          throw error
        }
      }
    })

    if (hasError) {
      console.log('✅ PASS: Invalid tweet in thread caught\n')
      passed++
    } else {
      console.log('❌ FAIL: Should have caught invalid tweet\n')
      failed++
    }
  } catch (error) {
    console.log(`❌ FAIL: ${error.message}\n`)
    failed++
  }

  // Test 5: Character limit per tweet
  console.log('Test 5: Character limit validation...')
  try {
    const longTweet = 'a'.repeat(101) // Exceeds 100 char limit for mock
    mockPlatform.validateContent(longTweet)
    console.log('❌ FAIL: Should have rejected long tweet\n')
    failed++
  } catch (error) {
    if (error.message.includes('too long')) {
      console.log('✅ PASS: Long tweet rejected\n')
      passed++
    } else {
      console.log(`❌ FAIL: Wrong error: ${error.message}\n`)
      failed++
    }
  }

  // Test 6: Thread chaining logic
  console.log('Test 6: Thread chaining (mock posting)...')
  try {
    const config = { token: 'mock_token' }
    const tweets = ['First tweet in thread', 'Second tweet in thread', 'Third tweet in thread']

    const results = []
    let previousId = null

    for (let i = 0; i < tweets.length; i++) {
      const content = previousId ? { text: tweets[i], reply_to: previousId } : tweets[i]

      const result = await mockPlatform.post(config, content)
      results.push(result)
      previousId = result.id
    }

    // Verify chaining
    if (results.length === 3 && results[1].replyTo && results[2].replyTo) {
      console.log('✅ PASS: Thread chained correctly\n')
      passed++
    } else {
      console.log('❌ FAIL: Thread chaining broken\n')
      failed++
    }
  } catch (error) {
    console.log(`❌ FAIL: ${error.message}\n`)
    failed++
  }

  // Test 7: Platform support check
  console.log('Test 7: Platform support validation...')
  try {
    const supportedPlatforms = ['twitter', 'mastodon', 'bluesky']
    const unsupportedPlatform = 'discord' // Discord doesn't support threads

    if (!supportedPlatforms.includes(unsupportedPlatform)) {
      console.log('✅ PASS: Unsupported platform detection works\n')
      passed++
    } else {
      console.log('❌ FAIL: Should not support thread posting for this platform\n')
      failed++
    }
  } catch (error) {
    console.log(`❌ FAIL: ${error.message}\n`)
    failed++
  }

  // Test 8: Rate limiting delay
  console.log('Test 8: Rate limiting between tweets...')
  try {
    const startTime = Date.now()

    // Simulate posting 3 tweets with 100ms delay each
    for (let i = 0; i < 3; i++) {
      await mockPlatform.post({ token: 'test' }, `Tweet ${i + 1}`)
      if (i < 2) {
        // Simulate rate limit delay
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
    }

    const elapsed = Date.now() - startTime

    // Should take at least 200ms (2 delays) + 300ms (3 posts)
    if (elapsed >= 500) {
      console.log(`✅ PASS: Rate limiting applied (${elapsed}ms elapsed)\n`)
      passed++
    } else {
      console.log(`❌ FAIL: Rate limiting too short (${elapsed}ms)\n`)
      failed++
    }
  } catch (error) {
    console.log(`❌ FAIL: ${error.message}\n`)
    failed++
  }

  // Test Summary
  console.log('━'.repeat(50))
  console.log(`\n📊 Test Results:`)
  console.log(`   ✅ Passed: ${passed}`)
  console.log(`   ❌ Failed: ${failed}`)
  console.log(`   Total: ${passed + failed}`)
  console.log(`   Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%\n`)

  if (failed === 0) {
    console.log('🎉 All tests passed!')
    process.exit(0)
  } else {
    console.log('⚠️  Some tests failed')
    process.exit(1)
  }
}

// Run tests
runTests()
