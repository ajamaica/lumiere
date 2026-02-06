#!/usr/bin/env node
/**
 * WhatsApp Automation Skill - Query CLI
 * Copyright © 2026 OpenClaw Contributors
 * License: CC BY-ND-NC 4.0 (Non-commercial, no modifications)
 * 
 * Search, filter, and view stored messages.
 * 
 * TERMS OF USE:
 * - Personal/non-commercial use only
 * - No modifications permitted
 * - No commercial use allowed
 * - See LICENSE.md for full terms
 */

const fs = require('fs');
const path = require('path');

const MESSAGES_FILE = path.join(__dirname, '.whatsapp-messages/messages.jsonl');

function readMessages() {
  if (!fs.existsSync(MESSAGES_FILE)) {
    console.error('❌ No messages stored yet');
    return [];
  }

  const content = fs.readFileSync(MESSAGES_FILE, 'utf8');
  return content
    .split('\n')
    .filter(l => l.trim())
    .map(line => {
      try {
        return JSON.parse(line);
      } catch (e) {
        return null;
      }
    })
    .filter(m => m);
}

function parseRDV(text) {
  // Patterns: "RDV à 15h", "rdv vendredi 10h", "appointment jeudi 14h30"
  const patterns = [
    /(?:rdv|rendez-vous|appointment|réunion).*?(\d{1,2})[h:](\d{0,2}).*/i,
    /(?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche).*?(\d{1,2})[h:](\d{0,2})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return {
        found: true,
        time: `${match[1]}:${match[2] || '00'}`,
        raw: match[0]
      };
    }
  }

  return { found: false };
}

function displayMessages(messages) {
  if (messages.length === 0) {
    console.log('❌ No messages found');
    return;
  }

  messages.forEach((msg, idx) => {
    console.log(`\n${idx + 1}. [${msg.contact}] ${msg.timestamp}`);
    console.log(`   "${msg.text}"`);
    
    const rdv = parseRDV(msg.text);
    if (rdv.found) {
      console.log(`   🕐 **RDV DETECTED:** ${rdv.raw}`);
    }
  });
}

// CLI logic
const command = process.argv[2];
const arg = process.argv[3];

const messages = readMessages();

switch (command) {
  case 'list':
    console.log(`📊 Total messages: ${messages.length}\n`);
    displayMessages(messages);
    break;

  case 'search':
    if (!arg) {
      console.error('Usage: whatsapp-query search <contact|text>');
      process.exit(1);
    }
    const filtered = messages
      .filter(m => !m.text.startsWith('[openclaw]')) // Ignore OpenClaw messages
      .filter(m => 
        m.contact.includes(arg) || m.text.toLowerCase().includes(arg.toLowerCase())
      );
    console.log(`🔍 Found ${filtered.length} messages matching "${arg}"\n`);
    displayMessages(filtered);
    break;

  case 'rdv':
    const rdvMessages = messages.filter(m => parseRDV(m.text).found);
    console.log(`🕐 Found ${rdvMessages.length} messages with potential RDV\n`);
    rdvMessages.forEach(msg => {
      const rdv = parseRDV(msg.text);
      console.log(`[${msg.contact}] ${msg.timestamp}`);
      console.log(`   "${msg.text}"`);
      console.log(`   ⏰ Time: ${rdv.time}\n`);
    });
    break;

  case 'contacts':
    const contacts = [...new Set(messages.map(m => m.contact))];
    console.log(`👥 Contacts (${contacts.length}):`);
    contacts.forEach(c => {
      const count = messages.filter(m => m.contact === c).length;
      console.log(`   ${c}: ${count} messages`);
    });
    break;

  case 'export':
    const outputFile = arg || 'messages.json';
    fs.writeFileSync(outputFile, JSON.stringify(messages, null, 2));
    console.log(`✅ Exported ${messages.length} messages to ${outputFile}`);
    break;

  default:
    console.log(`
WhatsApp Message Query CLI

Usage:
  whatsapp-query list                    - List all messages
  whatsapp-query search <contact|text>   - Search by contact or text
  whatsapp-query rdv                     - Show messages with RDV mentions
  whatsapp-query contacts                - List all contacts
  whatsapp-query export [file]           - Export as JSON

Examples:
  whatsapp-query search "François"
  whatsapp-query search "docteur"
  whatsapp-query rdv
    `);
}
