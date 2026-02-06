const { Pixiv, Illusts, Users, Account } = require('@ibaraki-douji/pixivts')
const fs = require('fs')
const path = require('path')
const axios = require('axios')

const CONFIG_PATH = path.join(__dirname, '../config.json')
const DOWNLOAD_DIR = path.join(__dirname, '../downloads')

if (!fs.existsSync(DOWNLOAD_DIR)) {
  fs.mkdirSync(DOWNLOAD_DIR)
}

function loadConfig() {
  if (fs.existsSync(CONFIG_PATH)) {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'))
  }
  return {}
}

function saveConfig(config) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2))
}

async function getClient() {
  const config = loadConfig()
  const token = process.env.PIXIV_REFRESH_TOKEN || config.refresh_token

  if (!token) {
    console.error('Error: No refresh token found. Run "node pixiv-cli.js login <token>" first.')
    process.exit(1)
  }

  const pixiv = new Pixiv()
  try {
    await pixiv.login(token)
    return pixiv
  } catch (error) {
    console.error('Login failed:', error.message)
    process.exit(1)
  }
}

async function downloadFile(url, filepath, token) {
  const writer = fs.createWriteStream(filepath)

  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream',
    headers: {
      Referer: 'https://www.pixiv.net/',
      'User-Agent': 'PixivAndroidApp/5.0.234 (Android 6.0; PixivAndroidApp)',
      // 'Authorization': `Bearer ${token}` // Images usually don't need auth if Referer is set, but sometimes they do? Actually Pixiv CDN checks Referer primarily.
    },
  })

  response.data.pipe(writer)

  return new Promise((resolve, reject) => {
    writer.on('finish', resolve)
    writer.on('error', reject)
  })
}

async function main() {
  const args = process.argv.slice(2)
  const command = args[0]

  if (command === 'login') {
    const token = args[1]
    if (!token) {
      console.error('Usage: login <refreshToken>')
      process.exit(1)
    }
    const config = loadConfig()
    config.refresh_token = token
    saveConfig(config)
    console.log('Token saved to config.json')
    return
  }

  if (command === 'search') {
    const keyword = args[1]
    const page = parseInt(args[2] || '1')
    if (!keyword) {
      console.error('Usage: search <keyword> [page]')
      process.exit(1)
    }

    const pixiv = await getClient()
    const illusts = new Illusts(pixiv)
    try {
      const results = await illusts.searchIllusts(keyword, page)
      console.log(JSON.stringify(results.slice(0, 10), null, 2)) // Limit output for CLI
    } catch (e) {
      console.error('Search error:', e.message)
    }
    return
  }

  if (command === 'ranking') {
    const mode = args[1] || 'day'
    const page = parseInt(args[2] || '1')

    const pixiv = await getClient()
    const illusts = new Illusts(pixiv)
    try {
      const results = await illusts.getRankingIllusts(mode, page)
      console.log(JSON.stringify(results.slice(0, 10), null, 2))
    } catch (e) {
      console.error('Ranking error:', e.message)
    }
    return
  }

  if (command === 'user') {
    const userId = parseInt(args[1])
    if (isNaN(userId)) {
      console.error('Usage: user <user_id>')
      process.exit(1)
    }

    const pixiv = await getClient()
    const users = new Users(pixiv)
    try {
      const profile = await users.getUser(userId)
      console.log(JSON.stringify(profile, null, 2))
    } catch (e) {
      console.error('User fetch error:', e.message)
    }
    return
  }

  if (command === 'me') {
    const pixiv = await getClient()
    const account = new Account(pixiv)
    try {
      const profile = await account.getSelfUser()
      console.log(JSON.stringify(profile, null, 2))
    } catch (e) {
      console.error('Self profile fetch error:', e.message)
    }
    return
  }

  if (command === 'feed') {
    const restrict = args[1] || 'all' // all, public, private
    const page = parseInt(args[2] || '1')

    const pixiv = await getClient()
    const account = new Account(pixiv)
    try {
      const results = await account.getFollowIllusts(restrict, page)
      console.log(JSON.stringify(results.slice(0, 10), null, 2))
    } catch (e) {
      console.error('Feed fetch error:', e.message)
    }
    return
  }

  if (command === 'following') {
    const page = parseInt(args[1] || '1')
    const restrict = 'public' // or private, maybe make it an option

    const pixiv = await getClient()
    const account = new Account(pixiv)
    try {
      const me = await account.getSelfUser()
      const userId = me.user.id

      // Manually call the API since it's not exposed in Account/Users
      const offset = (page - 1) * 30 // Assuming 30 items per page
      const url = `https://app-api.pixiv.net/v1/user/following?user_id=${userId}&restrict=${restrict}&offset=${offset}`

      const res = await pixiv.requestsCall('GET', url, {
        headers: {
          authorization: `Bearer ${pixiv.accessToken}`,
        },
      })
      const data = await res.json()

      if (data.user_previews) {
        console.log(JSON.stringify(data.user_previews, null, 2))
      } else {
        console.log(JSON.stringify(data, null, 2))
      }
    } catch (e) {
      console.error('Following list fetch error:', e.message)
    }
    return
  }

  if (command === 'download') {
    const id = parseInt(args[1])
    if (!id || isNaN(id)) {
      console.error('Usage: download <id>')
      process.exit(1)
    }

    const pixiv = await getClient()
    const illusts = new Illusts(pixiv)

    try {
      const illust = await illusts.getIllustById(id)

      const targetDir = path.join(DOWNLOAD_DIR, String(id))
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true })
      }

      const files = []

      if (illust.meta_single_page && illust.meta_single_page.original_image_url) {
        // Single Image
        const url = illust.meta_single_page.original_image_url
        const filename = path.basename(url)
        const filepath = path.join(targetDir, filename)
        await downloadFile(url, filepath, pixiv.accessToken)
        files.push(filepath)
      } else if (illust.meta_pages && illust.meta_pages.length > 0) {
        // Manga / Multiple Images
        for (const page of illust.meta_pages) {
          const url = page.image_urls.original
          const filename = path.basename(url)
          const filepath = path.join(targetDir, filename)
          await downloadFile(url, filepath, pixiv.accessToken)
          files.push(filepath)
        }
      } else if (illust.type === 'ugoira') {
        // Ugoira
        const meta = await illusts.getUgoiraMetadata(id)
        if (meta && meta.ugoira_metadata) {
          const zipUrl = meta.ugoira_metadata.zip_urls.medium
          const filename = `${id}_ugoira.zip`
          const filepath = path.join(targetDir, filename)
          await downloadFile(zipUrl, filepath, pixiv.accessToken)
          files.push(filepath)
          // Also save delay info
          fs.writeFileSync(
            path.join(targetDir, 'frames.json'),
            JSON.stringify(meta.ugoira_metadata.frames, null, 2),
          )
          files.push(path.join(targetDir, 'frames.json'))
        }
      }

      console.log(
        JSON.stringify(
          {
            id: illust.id,
            title: illust.title,
            type: illust.type,
            files: files,
          },
          null,
          2,
        ),
      )
    } catch (e) {
      console.error('Download error:', e.message)
    }
    return
  }

  console.log('Usage: node pixiv-cli.js <login|search|ranking|user|me|feed|following|download>')
}

main()
