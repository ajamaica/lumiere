#!/usr/bin/env node

/**
 * VK CLI - A simple tool to interact with VK API
 * Supports posting to community wall and messaging.
 */

const fs = require('fs')
const path = require('path')

const API_VERSION = '5.131'

async function callVk(method, params, token) {
  const url = new URL(`https://api.vk.com/method/${method}`)
  url.searchParams.append('access_token', token)
  url.searchParams.append('v', API_VERSION)
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.append(key, value)
  }

  const response = await fetch(url.toString())
  const data = await response.json()

  if (data.error) {
    throw new Error(`VK API Error: [${data.error.error_code}] ${data.error.error_msg}`)
  }

  return data.response
}

async function uploadFile(uploadUrl, filePath) {
  const formData = new FormData()
  const fileBuffer = fs.readFileSync(filePath)
  const blob = new Blob([fileBuffer])
  formData.append('file1', blob, path.basename(filePath))

  const response = await fetch(uploadUrl, {
    method: 'POST',
    body: formData,
  })

  return await response.json()
}

const args = process.argv.slice(2)
const command = args[0]

if (!command || command === 'help') {
  console.log(`
Usage:
  vk-cli <command> [options]

Commands:
  post <token> <owner_id> <message> [attachments]
    Post to wall. owner_id should be negative for groups.
  
  message <token> <peer_id> <text> [group_id]
    Send a message. Optional group_id for community replies.
    
  get-messages <token> <peer_id> [count] [group_id]
    Get message history. Optional group_id for community messages.

  get-conversations <token> [count]
    Get list of recent conversations.
    
  mark-as-read <token> <peer_id>
    Mark messages from peer_id as read.
    
  poll <token> <group_id> [mark_read] [wait_seconds]
    Listen for new messages. If mark_read is 1, marks them as read automatically.
    If wait_seconds is provided, runs for that duration then exits.
    
  upload-photo <token> <group_id> <file_path>
    Upload a photo to community wall and return attachment string.
    
  upload-photo-msg <token> <peer_id> <file_path>
    Upload a photo as a message attachment.
    
  upload-video <token> <group_id> <file_path> <name> <description>
    Upload a video to community and return attachment string.
`)
  process.exit(0)
}

;(async () => {
  try {
    if (command === 'post') {
      const [token, ownerId, message, attachments] = args.slice(1)
      const res = await callVk(
        'wall.post',
        {
          owner_id: ownerId,
          message: message,
          from_group: 1,
          attachments: attachments || '',
        },
        token,
      )
      console.log(JSON.stringify(res, null, 2))
    } else if (command === 'message') {
      const [token, peerId, text, groupId] = args.slice(1)
      const params = {
        peer_id: peerId,
        message: text,
        random_id: Math.floor(Math.random() * 2147483647),
      }
      if (groupId) params.group_id = groupId
      const res = await callVk('messages.send', params, token)
      console.log(JSON.stringify(res, null, 2))
    } else if (command === 'get-messages') {
      const [token, peerId, count, groupId] = args.slice(1)
      const params = {
        peer_id: peerId,
        count: count || 20,
      }
      if (groupId) params.group_id = groupId
      const res = await callVk('messages.getHistory', params, token)
      console.log(JSON.stringify(res, null, 2))
    } else if (command === 'get-conversations') {
      const [token, count] = args.slice(1)
      const res = await callVk(
        'messages.getConversations',
        {
          count: count || 20,
          filter: 'all',
        },
        token,
      )
      console.log(JSON.stringify(res, null, 2))
    } else if (command === 'mark-as-read') {
      const [token, peerId] = args.slice(1)
      const res = await callVk(
        'messages.markAsRead',
        {
          peer_id: peerId,
        },
        token,
      )
      console.log(JSON.stringify(res, null, 2))
    } else if (command === 'poll') {
      const [token, groupId, markRead, waitSeconds] = args.slice(1)
      const startTime = Date.now()
      const maxMs = waitSeconds ? parseInt(waitSeconds) * 1000 : null

      console.log(`Getting Long Poll server for group ${groupId}...`)
      const serverData = await callVk('groups.getLongPollServer', { group_id: groupId }, token)
      let { key, server, ts } = serverData

      console.log('Listening for events...')

      while (true) {
        if (maxMs && Date.now() - startTime > maxMs) {
          console.log('Time limit reached. Exiting.')
          break
        }

        try {
          const waitParam = maxMs
            ? Math.min(25, Math.ceil((maxMs - (Date.now() - startTime)) / 1000))
            : 25
          if (waitParam <= 0 && maxMs) break

          const pollUrl = `${server}?act=a_check&key=${key}&ts=${ts}&wait=${waitParam}`
          const response = await fetch(pollUrl)
          const data = await response.json()

          if (data.failed) {
            if (data.failed === 1) {
              ts = data.ts
            } else {
              const newData = await callVk('groups.getLongPollServer', { group_id: groupId }, token)
              key = newData.key
              server = newData.server
              ts = newData.ts
            }
            continue
          }

          ts = data.ts

          for (const update of data.updates) {
            if (update.type === 'message_new') {
              const msg = update.object.message
              console.log(`\n[NEW MESSAGE] From: ${msg.from_id}`)
              console.log(`Text: ${msg.text}`)
              if (msg.attachments && msg.attachments.length > 0) {
                console.log(`Attachments: ${msg.attachments.length}`)
              }

              if (markRead === '1') {
                await callVk('messages.markAsRead', { peer_id: msg.peer_id }, token)
                console.log(`[READ] Marked as read.`)
              }
            }
          }
        } catch (err) {
          console.error('Polling error:', err.message)
          await new Promise((resolve) => setTimeout(resolve, 5000))
        }
      }
    } else if (command === 'upload-photo') {
      const [token, groupId, filePath] = args.slice(1)
      const serverData = await callVk('photos.getWallUploadServer', { group_id: groupId }, token)
      const uploadRes = await uploadFile(serverData.upload_url, filePath)
      const saveRes = await callVk(
        'photos.saveWallPhoto',
        {
          group_id: groupId,
          photo: uploadRes.photo,
          server: uploadRes.server,
          hash: uploadRes.hash,
        },
        token,
      )
      const photo = saveRes[0]
      console.log(`photo${photo.owner_id}_${photo.id}`)
    } else if (command === 'upload-photo-msg') {
      const [token, peerId, filePath] = args.slice(1)
      const serverData = await callVk(
        'photos.getMessagesUploadServer',
        { peer_id: peerId || 0 },
        token,
      )
      const uploadRes = await uploadFile(serverData.upload_url, filePath)
      const saveRes = await callVk(
        'photos.saveMessagesPhoto',
        {
          photo: uploadRes.photo,
          server: uploadRes.server,
          hash: uploadRes.hash,
        },
        token,
      )
      const photo = saveRes[0]
      console.log(`photo${photo.owner_id}_${photo.id}`)
    } else if (command === 'upload-video') {
      const [token, groupId, filePath, name, description] = args.slice(1)
      const saveRes = await callVk(
        'video.save',
        {
          name: name,
          description: description,
          group_id: groupId,
        },
        token,
      )
      await uploadFile(saveRes.upload_url, filePath)
      console.log(`video${saveRes.owner_id}_${saveRes.video_id}`)
    } else {
      console.error('Unknown command:', command)
      process.exit(1)
    }
  } catch (err) {
    console.error(err.message)
    process.exit(1)
  }
})()
