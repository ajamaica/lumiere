#!/usr/bin/env node

/**
 * Media Upload CLI
 * Upload images/videos to social platforms for later use in posts
 *
 * Usage:
 *   node scripts/upload-media.js <platform> <config> <media-file>
 *
 * Examples:
 *   node scripts/upload-media.js twitter config.json image.jpg
 *   node scripts/upload-media.js mastodon config.json photo.png
 *   node scripts/upload-media.js bluesky config.json video.mp4
 */

const fs = require('fs').promises
const media = require('./media')
const { TwitterApi } = require('twitter-api-v2')
const Mastodon = require('mastodon-api')
const { BskyAgent } = require('@atproto/api')

async function uploadMedia(platform, configPath, mediaPath) {
  try {
    // Load configuration
    let config
    if (configPath.endsWith('.json')) {
      const configData = await fs.readFile(configPath, 'utf8')
      config = JSON.parse(configData)
    } else {
      // Assume it's a direct credential (like API key for simple platforms)
      config = configPath
    }

    console.log(`📤 Uploading media to ${platform}...`)
    console.log(`   File: ${mediaPath}`)

    let result

    switch (platform.toLowerCase()) {
      case 'twitter':
      case 'x':
        result = await uploadToTwitter(config, mediaPath)
        break

      case 'mastodon':
        result = await uploadToMastodon(config, mediaPath)
        break

      case 'bluesky':
        result = await uploadToBluesky(config, mediaPath)
        break

      case 'reddit':
        result = await uploadToReddit(config, mediaPath)
        break

      default:
        throw new Error(
          `Platform '${platform}' does not support media uploads via this tool.\n` +
            'Supported platforms: twitter, mastodon, bluesky, reddit',
        )
    }

    console.log(`✅ Upload successful!\n`)
    console.log(`Platform: ${result.platform}`)
    console.log(`Media ID: ${result.mediaId}`)
    if (result.url) {
      console.log(`URL: ${result.url}`)
    }
    console.log(`\nUse this media ID in your posts with the --media flag`)

    return result
  } catch (error) {
    console.error(`❌ Upload failed: ${error.message}`)
    process.exit(1)
  }
}

async function uploadToTwitter(config, mediaPath) {
  if (!config.appKey || !config.appSecret || !config.accessToken || !config.accessSecret) {
    throw new Error('Twitter config requires: appKey, appSecret, accessToken, accessSecret')
  }

  const client = new TwitterApi({
    appKey: config.appKey,
    appSecret: config.appSecret,
    accessToken: config.accessToken,
    accessSecret: config.accessSecret,
  })

  const mediaId = await media.uploadToTwitter(client, mediaPath)

  return {
    platform: 'twitter',
    mediaId,
    usage: `Use in tweet: { "text": "Your tweet", "media_ids": ["${mediaId}"] }`,
  }
}

async function uploadToMastodon(config, mediaPath) {
  if (!config.instance || !config.accessToken) {
    throw new Error('Mastodon config requires: instance, accessToken')
  }

  const M = new Mastodon({
    access_token: config.accessToken,
    api_url: `https://${config.instance}/api/v1/`,
  })

  const mediaId = await media.uploadToMastodon(M, mediaPath)

  return {
    platform: 'mastodon',
    mediaId,
    usage: `Use in post: { "status": "Your post", "media_ids": ["${mediaId}"] }`,
  }
}

async function uploadToBluesky(config, mediaPath) {
  if (!config.identifier || !config.password) {
    throw new Error('Bluesky config requires: identifier, password')
  }

  const agent = new BskyAgent({ service: 'https://bsky.social' })
  await agent.login({
    identifier: config.identifier,
    password: config.password,
  })

  const blob = await media.uploadToBluesky(agent, mediaPath)

  return {
    platform: 'bluesky',
    mediaId: JSON.stringify(blob),
    usage:
      'Use in post: { "text": "Your post", "embed": { "$type": "app.bsky.embed.images", "images": [{ "image": <blob>, "alt": "" }] } }',
  }
}

async function uploadToReddit(config, mediaPath) {
  if (!config.clientId || !config.clientSecret || !config.username || !config.password) {
    throw new Error('Reddit config requires: clientId, clientSecret, username, password')
  }

  // Get access token
  const auth = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')
  const tokenResponse = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': config.userAgent || 'OpenClawBot/1.0',
    },
    body: new URLSearchParams({
      grant_type: 'password',
      username: config.username,
      password: config.password,
    }),
  })

  const tokenData = await tokenResponse.json()
  if (tokenData.error) {
    throw new Error(`Reddit auth error: ${tokenData.error}`)
  }

  const assetId = await media.uploadToReddit(tokenData.access_token, 'test', mediaPath)

  return {
    platform: 'reddit',
    mediaId: assetId,
    usage: `Use in post: { "subreddit": "test", "title": "Title", "url": "${assetId}" }`,
  }
}

// CLI entrypoint
if (require.main === module) {
  const args = process.argv.slice(2)

  if (args.length < 3) {
    console.log('Usage: node scripts/upload-media.js <platform> <config> <media-file>')
    console.log('')
    console.log('Examples:')
    console.log('  node scripts/upload-media.js twitter twitter-config.json image.jpg')
    console.log('  node scripts/upload-media.js mastodon mastodon-config.json photo.png')
    console.log('  node scripts/upload-media.js bluesky bluesky-config.json video.mp4')
    console.log('')
    console.log('Supported platforms: twitter, mastodon, bluesky, reddit')
    process.exit(1)
  }

  const [platform, configPath, mediaPath] = args
  uploadMedia(platform, configPath, mediaPath)
}

module.exports = { uploadMedia }
