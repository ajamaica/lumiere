#!/usr/bin/env node

/**
 * YouTube Studio - Main CLI Orchestrator
 * Handles command parsing, routing, and output formatting
 */

const fs = require('fs')
const path = require('path')
const chalk = require('chalk')
const yargs = require('yargs')

const authHandler = require('./auth-handler')
const channelAnalytics = require('./channel-analytics')
const videoUploader = require('./video-uploader')
const commentManager = require('./comment-manager')
const contentIdeas = require('./content-ideas')
const { initLogger, logger } = require('./utils')

// Initialize logger
initLogger()

// Configuration paths
const CONFIG_DIR = path.join(process.env.HOME, '.clawd-youtube')
const CREDENTIALS_FILE = path.join(CONFIG_DIR, 'credentials.json')
const TOKENS_FILE = path.join(CONFIG_DIR, 'tokens.json')
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.env')

// Ensure config directory exists
if (!fs.existsSync(CONFIG_DIR)) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true })
}

// Main CLI definition
const cli = yargs(process.argv.slice(2))
  .command('auth', 'Authenticate with YouTube account (OAuth 2.0)', {}, handleAuth)
  .command(
    'stats',
    'Get channel statistics and analytics',
    (yargs) =>
      yargs
        .option('days', {
          alias: 'd',
          describe: 'Days to look back',
          type: 'number',
          default: 30,
        })
        .option('json', {
          describe: 'Output as JSON',
          type: 'boolean',
        })
        .option('detailed', {
          describe: 'Show detailed breakdown',
          type: 'boolean',
        }),
    handleStats,
  )
  .command(
    'upload',
    'Upload a video to your channel',
    (yargs) =>
      yargs
        .option('file', {
          alias: 'f',
          describe: 'Video file path',
          type: 'string',
          demandOption: true,
        })
        .option('title', {
          alias: 't',
          describe: 'Video title',
          type: 'string',
          demandOption: true,
        })
        .option('description', {
          alias: 'desc',
          describe: 'Video description',
          type: 'string',
        })
        .option('tags', {
          describe: 'Comma-separated tags',
          type: 'string',
        })
        .option('privacy', {
          describe: 'Privacy level: public, unlisted, private',
          type: 'string',
          default: 'unlisted',
        })
        .option('thumbnail', {
          describe: 'Custom thumbnail image path',
          type: 'string',
        })
        .option('playlist', {
          describe: 'Add to playlist by name',
          type: 'string',
        })
        .option('schedule', {
          describe: 'Schedule publish time (ISO 8601)',
          type: 'string',
        })
        .option('category', {
          describe: 'Video category',
          type: 'string',
          default: 'People',
        })
        .option('dry-run', {
          describe: 'Preview without uploading',
          type: 'boolean',
        }),
    handleUpload,
  )
  .command(
    'comments',
    'List recent comments on your videos',
    (yargs) =>
      yargs
        .option('video-id', {
          describe: 'Get comments for specific video',
          type: 'string',
        })
        .option('unread', {
          describe: 'Show unread comments only',
          type: 'boolean',
        })
        .option('limit', {
          alias: 'l',
          describe: 'Limit results',
          type: 'number',
          default: 20,
        })
        .option('json', {
          describe: 'Output as JSON',
          type: 'boolean',
        })
        .option('suggest', {
          describe: 'Show AI reply suggestions',
          type: 'boolean',
        }),
    handleComments,
  )
  .command(
    'reply',
    'Reply to a comment',
    (yargs) =>
      yargs
        .option('comment-id', {
          alias: 'c',
          describe: 'Comment ID to reply to',
          type: 'string',
          demandOption: true,
        })
        .option('text', {
          alias: 't',
          describe: 'Reply text',
          type: 'string',
        })
        .option('template', {
          describe: 'Use preset template (grateful, educational, promotional)',
          type: 'string',
        })
        .option('suggest', {
          describe: 'Show AI suggestions first',
          type: 'boolean',
        })
        .option('dry-run', {
          describe: 'Preview without sending',
          type: 'boolean',
        }),
    handleReply,
  )
  .command(
    'ideas',
    'Generate video ideas for your channel',
    (yargs) =>
      yargs
        .option('niche', {
          alias: 'n',
          describe: 'Channel niche',
          type: 'string',
        })
        .option('trending', {
          describe: 'Include trending topics',
          type: 'boolean',
        })
        .option('count', {
          alias: 'c',
          describe: 'Number of ideas',
          type: 'number',
          default: 5,
        })
        .option('json', {
          describe: 'Output as JSON',
          type: 'boolean',
        }),
    handleIdeas,
  )
  .command('quota-status', 'Check API quota usage', {}, handleQuotaStatus)
  .option('verbose', {
    alias: 'v',
    describe: 'Verbose output',
    type: 'boolean',
  })
  .option('config', {
    describe: 'Config file path',
    type: 'string',
    default: CONFIG_FILE,
  })
  .help()
  .alias('help', 'h')
  .strict()

// Command handlers

async function handleAuth() {
  try {
    console.log(chalk.blue('🔐 YouTube Studio - OAuth Authentication'))
    console.log(chalk.gray('Credentials file: ' + CREDENTIALS_FILE))

    if (!fs.existsSync(CREDENTIALS_FILE)) {
      console.error(chalk.red('\n❌ Error: credentials.json not found at ' + CREDENTIALS_FILE))
      console.log(
        chalk.yellow(
          '\nSteps to set up:\n1. Visit https://console.cloud.google.com/\n2. Create a project and enable YouTube Data API v3\n3. Create OAuth 2.0 Desktop credentials\n4. Download JSON and save to: ' +
            CREDENTIALS_FILE,
        ),
      )
      process.exit(1)
    }

    const tokens = await authHandler.authenticate(CREDENTIALS_FILE, TOKENS_FILE)
    console.log(chalk.green('✅ Authentication successful!'))
    console.log('Tokens saved to: ' + TOKENS_FILE)
    console.log('\nYou can now use all youtube-studio commands.')
  } catch (error) {
    console.error(chalk.red('❌ Authentication failed:'), error.message)
    logger.error('Auth failed', error)
    process.exit(1)
  }
}

async function handleStats(argv) {
  try {
    console.log(chalk.blue('📊 Channel Statistics'))

    const stats = await channelAnalytics.getChannelStats({
      days: argv.days,
      detailed: argv.detailed,
    })

    if (argv.json) {
      console.log(JSON.stringify(stats, null, 2))
    } else {
      // Pretty print
      console.log(chalk.cyan('\n📈 Overall Metrics:'))
      console.log(`  Total Views: ${chalk.bold(stats.totalViews?.toLocaleString())}`)
      console.log(`  Subscribers: ${chalk.bold(stats.subscriberCount?.toLocaleString())}`)
      console.log(
        `  Watch Time (hours): ${chalk.bold(stats.estimatedMinutesWatched / 60 || 'N/A')}`,
      )
      console.log(`  Video Count: ${chalk.bold(stats.videoCount)}`)

      if (stats.topVideos?.length) {
        console.log(chalk.cyan('\n🔥 Top Videos:'))
        stats.topVideos.slice(0, 5).forEach((video, i) => {
          console.log(`  ${i + 1}. ${video.title}`)
          console.log(
            `     Views: ${video.views} | Likes: ${video.likes} | Comments: ${video.comments}`,
          )
        })
      }

      if (argv.detailed && stats.recentPerformance) {
        console.log(chalk.cyan('\n📅 Last ' + argv.days + ' Days:'))
        console.log(`  New Views: ${stats.recentPerformance.newViews}`)
        console.log(`  New Subscribers: ${stats.recentPerformance.newSubscribers}`)
        console.log(`  Avg Views/Video: ${stats.recentPerformance.avgViewsPerVideo}`)
      }
    }
  } catch (error) {
    console.error(chalk.red('❌ Failed to fetch stats:'), error.message)
    logger.error('Stats fetch failed', error)
    process.exit(1)
  }
}

async function handleUpload(argv) {
  try {
    console.log(chalk.blue('📹 Video Upload'))

    if (!fs.existsSync(argv.file)) {
      console.error(chalk.red('❌ File not found: ' + argv.file))
      process.exit(1)
    }

    const metadata = {
      title: argv.title,
      description: argv.description || '',
      tags: argv.tags ? argv.tags.split(',').map((t) => t.trim()) : [],
      privacyStatus: argv.privacy,
      categoryId: argv.category,
      publishAt: argv.schedule,
    }

    if (argv['dry-run']) {
      console.log(chalk.yellow('\n📋 Dry Run - Preview:'))
      console.log(JSON.stringify(metadata, null, 2))
      console.log(chalk.gray('\nNo file will be uploaded (--dry-run mode)'))
      return
    }

    console.log(chalk.gray('Uploading: ' + path.basename(argv.file)))
    const result = await videoUploader.uploadVideo(argv.file, metadata, {
      thumbnail: argv.thumbnail,
      playlist: argv.playlist,
    })

    console.log(chalk.green('\n✅ Upload successful!'))
    console.log(`  Video ID: ${chalk.bold(result.videoId)}`)
    console.log(`  Status: ${chalk.bold(result.status)}`)
    if (result.scheduledTime) {
      console.log(`  Scheduled: ${chalk.bold(result.scheduledTime)}`)
    }
    console.log(`  URL: https://youtube.com/watch?v=${result.videoId}`)
  } catch (error) {
    console.error(chalk.red('❌ Upload failed:'), error.message)
    logger.error('Upload failed', error)
    process.exit(1)
  }
}

async function handleComments(argv) {
  try {
    console.log(chalk.blue('💬 Comments'))

    const comments = await commentManager.listComments(argv['video-id'], {
      unread: argv.unread,
      limit: argv.limit,
    })

    if (argv.json) {
      console.log(JSON.stringify(comments, null, 2))
    } else {
      console.log(chalk.gray(`\nFound ${comments.length} comments:\n`))

      comments.forEach((comment, i) => {
        console.log(chalk.cyan(`${i + 1}. ${comment.authorName}`))
        console.log(`   "${comment.text}"`)
        console.log(chalk.gray(`   ID: ${comment.id} | Likes: ${comment.likes}`))

        if (argv.suggest) {
          // Show suggestions (would be generated by contentIdeas)
          console.log(chalk.yellow('   💡 Suggested replies:'))
          console.log('   - Thanks for watching!')
          console.log('   - Check out my other videos on this topic')
          console.log('   - Love your enthusiasm! Drop a like if you found this helpful')
        }
        console.log()
      })
    }
  } catch (error) {
    console.error(chalk.red('❌ Failed to fetch comments:'), error.message)
    logger.error('Comments fetch failed', error)
    process.exit(1)
  }
}

async function handleReply(argv) {
  try {
    console.log(chalk.blue('📝 Reply to Comment'))

    if (argv.suggest && !argv.text) {
      const suggestions = await contentIdeas.suggestCommentReplies(argv['comment-id'])
      console.log(chalk.yellow('\n💡 Suggested replies:\n'))
      suggestions.forEach((s, i) => {
        console.log(`${i + 1}. ${s}`)
      })
      console.log()
      return
    }

    const text = argv.text || argv.template
    if (!text) {
      console.error(chalk.red('❌ Provide --text or --template'))
      process.exit(1)
    }

    if (argv['dry-run']) {
      console.log(chalk.yellow('\n📋 Preview:'))
      console.log(text)
      console.log(chalk.gray('\nNo reply will be sent (--dry-run mode)'))
      return
    }

    const result = await commentManager.replyToComment(argv['comment-id'], text)

    console.log(chalk.green('\n✅ Reply sent!'))
    console.log(`  Reply ID: ${result.replyId}`)
  } catch (error) {
    console.error(chalk.red('❌ Reply failed:'), error.message)
    logger.error('Reply failed', error)
    process.exit(1)
  }
}

async function handleIdeas(argv) {
  try {
    console.log(chalk.blue('💡 Video Ideas'))

    const ideas = await contentIdeas.generateVideoIdeas({
      niche: argv.niche,
      trending: argv.trending,
      count: argv.count,
    })

    if (argv.json) {
      console.log(JSON.stringify(ideas, null, 2))
    } else {
      console.log(chalk.gray(`\nGenerated ${ideas.length} video ideas:\n`))

      ideas.forEach((idea, i) => {
        console.log(chalk.cyan(`${i + 1}. ${idea.title}`))
        console.log(`   Hook: ${idea.hook}`)
        console.log(`   Tags: ${idea.tags.join(', ')}`)
        if (idea.searchVolume) {
          console.log(`   Estimated Search Volume: ${idea.searchVolume}`)
        }
        console.log()
      })
    }
  } catch (error) {
    console.error(chalk.red('❌ Failed to generate ideas:'), error.message)
    logger.error('Ideas generation failed', error)
    process.exit(1)
  }
}

async function handleQuotaStatus() {
  try {
    console.log(chalk.blue('📊 API Quota Status'))

    const quota = await channelAnalytics.getQuotaStatus()

    console.log(chalk.gray(`\nDaily Quota: ${quota.dailyQuota?.toLocaleString()} units`))
    console.log(`  Used: ${chalk.bold(quota.used?.toLocaleString())} units`)
    console.log(`  Remaining: ${chalk.bold(quota.remaining?.toLocaleString())} units`)

    const percentage = ((quota.used / quota.dailyQuota) * 100).toFixed(1)
    const bar = '█'.repeat(Math.round(percentage / 5)) + '░'.repeat(20 - Math.round(percentage / 5))

    if (percentage < 80) {
      console.log(chalk.green(`  Usage: [${bar}] ${percentage}%`))
    } else if (percentage < 95) {
      console.log(chalk.yellow(`  Usage: [${bar}] ${percentage}%`))
    } else {
      console.log(chalk.red(`  Usage: [${bar}] ${percentage}%`))
    }

    console.log(chalk.gray(`\nQuota resets at midnight UTC`))
  } catch (error) {
    console.error(chalk.red('❌ Failed to fetch quota:'), error.message)
    logger.error('Quota fetch failed', error)
    process.exit(1)
  }
}

// Run CLI
cli.parse()
