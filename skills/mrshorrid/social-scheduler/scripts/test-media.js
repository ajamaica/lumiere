#!/usr/bin/env node

/**
 * Media Upload Test Suite
 * Validates media handling without actually uploading
 */

const media = require('./media')
const fs = require('fs').promises
const path = require('path')

async function testMediaLoader() {
  console.log('🧪 Testing Media Loader...\n')

  const tests = [
    {
      name: 'Base64 Data URI',
      input:
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    },
    {
      name: 'Buffer Input',
      input: Buffer.from('test data'),
    },
  ]

  let passed = 0
  let failed = 0

  for (const test of tests) {
    try {
      const result = await media.loadMedia(test.input)

      if (!result.buffer || !Buffer.isBuffer(result.buffer)) {
        throw new Error('Result must have a Buffer')
      }
      if (!result.mimeType) {
        throw new Error('Result must have a mimeType')
      }
      if (!result.filename) {
        throw new Error('Result must have a filename')
      }

      console.log(`✅ ${test.name}`)
      console.log(`   MIME: ${result.mimeType}`)
      console.log(`   Filename: ${result.filename}`)
      console.log(`   Size: ${result.buffer.length} bytes\n`)
      passed++
    } catch (error) {
      console.log(`❌ ${test.name}`)
      console.log(`   Error: ${error.message}\n`)
      failed++
    }
  }

  return { passed, failed }
}

async function testPlatformValidation() {
  console.log('🧪 Testing Platform Validation...\n')

  const testBuffer = Buffer.alloc(100 * 1024) // 100 KB
  const tests = [
    {
      platform: 'twitter',
      mimeType: 'image/jpeg',
      shouldPass: true,
    },
    {
      platform: 'twitter',
      mimeType: 'image/bmp',
      shouldPass: false,
    },
    {
      platform: 'bluesky',
      mimeType: 'image/png',
      shouldPass: true,
    },
    {
      platform: 'reddit',
      mimeType: 'image/gif',
      shouldPass: true,
    },
  ]

  let passed = 0
  let failed = 0

  for (const test of tests) {
    try {
      media.validateForPlatform(test.platform, testBuffer, test.mimeType)

      if (test.shouldPass) {
        console.log(`✅ ${test.platform} + ${test.mimeType} (expected pass)`)
        passed++
      } else {
        console.log(`❌ ${test.platform} + ${test.mimeType} (should have failed)`)
        failed++
      }
    } catch (error) {
      if (!test.shouldPass) {
        console.log(`✅ ${test.platform} + ${test.mimeType} (expected fail: ${error.message})`)
        passed++
      } else {
        console.log(`❌ ${test.platform} + ${test.mimeType} (unexpected fail: ${error.message})`)
        failed++
      }
    }
  }

  return { passed, failed }
}

async function testSizeValidation() {
  console.log('\n🧪 Testing Size Validation...\n')

  const tests = [
    {
      name: 'Twitter - 4MB file (should pass)',
      platform: 'twitter',
      size: 4 * 1024 * 1024,
      shouldPass: true,
    },
    {
      name: 'Twitter - 6MB file (should fail)',
      platform: 'twitter',
      size: 6 * 1024 * 1024,
      shouldPass: false,
    },
    {
      name: 'Bluesky - 900KB file (should pass)',
      platform: 'bluesky',
      size: 900 * 1024,
      shouldPass: true,
    },
    {
      name: 'Bluesky - 2MB file (should fail)',
      platform: 'bluesky',
      size: 2 * 1024 * 1024,
      shouldPass: false,
    },
  ]

  let passed = 0
  let failed = 0

  for (const test of tests) {
    try {
      const buffer = Buffer.alloc(test.size)
      media.validateForPlatform(test.platform, buffer, 'image/jpeg')

      if (test.shouldPass) {
        console.log(`✅ ${test.name}`)
        passed++
      } else {
        console.log(`❌ ${test.name} (should have failed)`)
        failed++
      }
    } catch (error) {
      if (!test.shouldPass) {
        console.log(`✅ ${test.name}`)
        passed++
      } else {
        console.log(`❌ ${test.name} (unexpected: ${error.message})`)
        failed++
      }
    }
  }

  return { passed, failed }
}

async function runAllTests() {
  console.log('═══════════════════════════════════════════════════════════\n')
  console.log('   📸 MEDIA UPLOAD MODULE TEST SUITE\n')
  console.log('═══════════════════════════════════════════════════════════\n')

  const results = []

  results.push(await testMediaLoader())
  results.push(await testPlatformValidation())
  results.push(await testSizeValidation())

  const totalPassed = results.reduce((sum, r) => sum + r.passed, 0)
  const totalFailed = results.reduce((sum, r) => sum + r.failed, 0)

  console.log('\n═══════════════════════════════════════════════════════════')
  console.log(`   RESULTS: ${totalPassed} passed, ${totalFailed} failed`)
  console.log('═══════════════════════════════════════════════════════════\n')

  if (totalFailed === 0) {
    console.log('✅ All tests passed! Media module is ready.\n')
    process.exit(0)
  } else {
    console.log('❌ Some tests failed. Please review.\n')
    process.exit(1)
  }
}

// Run if executed directly
if (require.main === module) {
  runAllTests().catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
}

module.exports = { testMediaLoader, testPlatformValidation, testSizeValidation }
