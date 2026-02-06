#!/usr/bin/env node
/**
 * Bring Shopping List CLI
 * Requires: bring-shopping npm package
 * Usage: node bring-cli.js <command> [args]
 */

const BringApi = require('bring-shopping')
const fs = require('fs')
const path = require('path')
const os = require('os')

const CONFIG_DIR = path.join(os.homedir(), '.openclaw', 'bring')
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json')

// Ensure config directory exists
if (!fs.existsSync(CONFIG_DIR)) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true })
}

// Load or create config
function loadConfig() {
  if (fs.existsSync(CONFIG_FILE)) {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'))
  }
  return { email: null, password: null, defaultListUuid: null }
}

function saveConfig(config) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2))
}

// Detect list language from existing items
async function detectListLanguage(bring, listUuid) {
  try {
    const items = await bring.getItems(listUuid)
    const allItems = [...(items.purchase || []), ...(items.recently || [])]

    if (allItems.length === 0) {
      return null // No items to detect from
    }

    // Try each locale to see which has most matches
    const locales = ['it-IT', 'es-ES', 'en-US', 'de-DE', 'fr-FR']
    let bestMatch = { locale: 'en-US', score: 0 }

    for (const locale of locales) {
      const catalog = await bring.getCatalog(locale)
      const catalogNames = new Set(catalog.map((item) => item.name.toLowerCase()))

      let score = 0
      for (const item of allItems) {
        if (catalogNames.has(item.toLowerCase())) {
          score++
        }
      }

      if (score > bestMatch.score) {
        bestMatch = { locale, score }
      }
    }

    return bestMatch.score > 0 ? bestMatch.locale : null
  } catch (e) {
    return null
  }
}

async function main() {
  const command = process.argv[2]
  const args = process.argv.slice(3)

  if (!command) {
    console.error('Usage: node bring-cli.js <command> [args]')
    console.error('\nCommands:')
    console.error('  configure <email> <password>           - Set up Bring credentials')
    console.error('  lists                                  - Show all shopping lists')
    console.error('  findlist <name>                        - Find list by name (partial match)')
    console.error('  items [listUuid]                       - Show items in a list')
    console.error('  add <listUuid> <item> [note]           - Add item to list (custom name)')
    console.error(
      '  smartadd <listUuid> <item> [locale] [note] - Add with icon support (locale-aware)',
    )
    console.error('  remove <listUuid> <item>               - Remove item from list')
    console.error('  details [listUuid]                     - Show item details')
    console.error('  catalog [locale]                       - Get item catalog (default: en-US)')
    console.error('  translations [locale]                  - Get translations (default: en-US)')
    console.error('  setdefault <listUuid>                  - Set default list')
    console.error('  detectlang <listUuid>                  - Auto-detect list language')
    console.error('  setlang <listUuid> <locale>            - Manually set list language')
    console.error(
      '  getlang <listUuid>                     - Get list language (cached or detected)',
    )
    console.error('\nSupported locales: en-US, it-IT, es-ES, de-DE, fr-FR')
    process.exit(1)
  }

  const config = loadConfig()

  // Handle configure command without requiring login
  if (command === 'configure') {
    if (args.length < 2) {
      console.error('Usage: configure <email> <password>')
      process.exit(1)
    }
    config.email = args[0]
    config.password = args[1]
    saveConfig(config)

    // Test login
    try {
      const bring = new BringApi({ mail: config.email, password: config.password })
      await bring.login()
      console.log(`✓ Successfully configured and logged in as ${bring.name}`)
    } catch (e) {
      console.error(`✗ Login failed: ${e.message}`)
      process.exit(1)
    }
    return
  }

  // All other commands require credentials
  if (!config.email || !config.password) {
    console.error('Error: Not configured. Run: node bring-cli.js configure <email> <password>')
    process.exit(1)
  }

  const bring = new BringApi({ mail: config.email, password: config.password })

  try {
    await bring.login()
  } catch (e) {
    console.error(`Login error: ${e.message}`)
    process.exit(1)
  }

  try {
    switch (command) {
      case 'lists': {
        const lists = await bring.loadLists()
        console.log(JSON.stringify(lists, null, 2))
        break
      }

      case 'findlist': {
        const searchName = args[0]
        if (!searchName) {
          console.error('Usage: findlist <list-name>')
          process.exit(1)
        }
        const lists = await bring.loadLists()
        const matches = lists.filter((list) =>
          list.name.toLowerCase().includes(searchName.toLowerCase()),
        )
        if (matches.length === 0) {
          console.error(`No lists found matching "${searchName}"`)
          process.exit(1)
        }
        console.log(JSON.stringify(matches, null, 2))
        break
      }

      case 'catalog': {
        const locale = args[0] || 'en-US'
        const catalog = await bring.getCatalog(locale)
        console.log(JSON.stringify(catalog, null, 2))
        break
      }

      case 'translations': {
        const locale = args[0] || 'en-US'
        const translations = await bring.loadTranslations(locale)
        console.log(JSON.stringify(translations, null, 2))
        break
      }

      case 'smartadd': {
        const listUuid = args[0]
        const searchTerm = args[1]
        const locale = args[2] || 'en-US'
        const specification = args[3] || ''

        if (!listUuid || !searchTerm) {
          console.error('Usage: smartadd <listUuid> <search-term> [locale] [note]')
          process.exit(1)
        }

        // Load catalog for the specified locale
        const catalog = await bring.getCatalog(locale)

        // Find matching item in catalog (case-insensitive search)
        const searchLower = searchTerm.toLowerCase()
        const match = catalog.find(
          (item) =>
            item.name.toLowerCase() === searchLower ||
            item.name.toLowerCase().includes(searchLower),
        )

        if (!match) {
          console.error(`Item "${searchTerm}" not found in ${locale} catalog`)
          console.error('Try using the exact catalog name or use "add" for custom items')
          process.exit(1)
        }

        // Add using the catalog name (ensures icon appears)
        await bring.saveItem(listUuid, match.name, specification)
        console.log(`✓ Added "${match.name}" to list (locale: ${locale})`)
        break
      }

      case 'items': {
        const listUuid = args[0] || config.defaultListUuid
        if (!listUuid) {
          console.error('Error: listUuid required or set a default list')
          process.exit(1)
        }
        const items = await bring.getItems(listUuid)
        console.log(JSON.stringify(items, null, 2))
        break
      }

      case 'add': {
        const listUuid = args[0]
        const itemName = args[1]
        const specification = args[2] || ''
        if (!listUuid || !itemName) {
          console.error('Usage: add <listUuid> <item> [note]')
          process.exit(1)
        }
        await bring.saveItem(listUuid, itemName, specification)
        console.log(`✓ Added "${itemName}" to list`)
        break
      }

      case 'remove': {
        const listUuid = args[0]
        const itemName = args[1]
        if (!listUuid || !itemName) {
          console.error('Usage: remove <listUuid> <item>')
          process.exit(1)
        }
        await bring.moveToRecentList(listUuid, itemName)
        console.log(`✓ Removed "${itemName}" from list`)
        break
      }

      case 'details': {
        const listUuid = args[0] || config.defaultListUuid
        if (!listUuid) {
          console.error('Error: listUuid required or set a default list')
          process.exit(1)
        }
        const details = await bring.getItemsDetails(listUuid)
        console.log(JSON.stringify(details, null, 2))
        break
      }

      case 'setdefault': {
        const listUuid = args[0]
        if (!listUuid) {
          console.error('Usage: setdefault <listUuid>')
          process.exit(1)
        }
        config.defaultListUuid = listUuid
        saveConfig(config)
        console.log(`✓ Set default list to ${listUuid}`)
        break
      }

      case 'detectlang': {
        const listUuid = args[0]
        if (!listUuid) {
          console.error('Usage: detectlang <listUuid>')
          process.exit(1)
        }
        console.log('Detecting list language...')
        const detectedLocale = await detectListLanguage(bring, listUuid)
        if (detectedLocale) {
          console.log(JSON.stringify({ listUuid, locale: detectedLocale }, null, 2))
        } else {
          console.log('Could not detect language (empty list or no matches)')
        }
        break
      }

      case 'setlang': {
        const listUuid = args[0]
        const locale = args[1]
        if (!listUuid || !locale) {
          console.error('Usage: setlang <listUuid> <locale>')
          process.exit(1)
        }
        if (!config.listLanguages) {
          config.listLanguages = {}
        }
        config.listLanguages[listUuid] = locale
        saveConfig(config)
        console.log(`✓ Set language for list ${listUuid} to ${locale}`)
        break
      }

      case 'getlang': {
        const listUuid = args[0]
        if (!listUuid) {
          console.error('Usage: getlang <listUuid>')
          process.exit(1)
        }

        // Check cached language
        if (config.listLanguages && config.listLanguages[listUuid]) {
          console.log(
            JSON.stringify(
              {
                listUuid,
                locale: config.listLanguages[listUuid],
                source: 'cached',
              },
              null,
              2,
            ),
          )
        } else {
          // Auto-detect
          const detectedLocale = await detectListLanguage(bring, listUuid)
          if (detectedLocale) {
            console.log(
              JSON.stringify(
                {
                  listUuid,
                  locale: detectedLocale,
                  source: 'detected',
                },
                null,
                2,
              ),
            )
          } else {
            console.log('No language set and could not auto-detect')
            process.exit(1)
          }
        }
        break
      }

      default:
        console.error(`Unknown command: ${command}`)
        process.exit(1)
    }
  } catch (e) {
    console.error(`Error: ${e.message}`)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
