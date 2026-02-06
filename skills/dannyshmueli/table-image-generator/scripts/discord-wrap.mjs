#!/usr/bin/env node
/**
 * discord-wrap.mjs - Wrap an image in a Discord-style message frame
 * 
 * Usage:
 *   node discord-wrap.mjs --input table.png --output wrapped.png --message "Here's the data!"
 */

import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function parseArgs(args) {
  const opts = {
    avatarPath: '/data/clawd/2026-01-29-cluka-avatar-v2.png',
    name: 'Cluka',
    message: '',
    timestamp: '0:07',
    output: 'wrapped.png',
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];
    switch (arg) {
      case '--input': opts.input = next; i++; break;
      case '--output': opts.output = next; i++; break;
      case '--message': opts.message = next; i++; break;
      case '--avatar': opts.avatarPath = next; i++; break;
      case '--name': opts.name = next; i++; break;
      case '--timestamp': opts.timestamp = next; i++; break;
    }
  }
  return opts;
}

async function createDiscordFrame(opts) {
  // Load and resize the input image
  const inputImage = sharp(opts.input);
  const inputMeta = await inputImage.metadata();
  
  // Scale down if too wide
  const maxContentWidth = 500;
  let contentWidth = Math.min(inputMeta.width, maxContentWidth);
  let contentHeight = Math.round(inputMeta.height * (contentWidth / inputMeta.width));
  
  const resizedInput = await inputImage
    .resize(contentWidth, contentHeight)
    .toBuffer();
  
  // Frame dimensions
  const padding = 16;
  const avatarSize = 40;
  const headerHeight = 24;
  const messageHeight = opts.message ? 24 : 0;
  const gap = 8;
  
  const frameWidth = contentWidth + padding * 2 + avatarSize + gap;
  const frameHeight = padding + headerHeight + (opts.message ? messageHeight + 4 : 0) + gap + contentHeight + padding;
  
  // Colors
  const bgColor = '#36393f';
  const nameColor = '#ffffff';
  const badgeColor = '#5865F2';
  const timeColor = '#72767d';
  const msgColor = '#dcddde';
  
  // Create avatar (circular)
  const avatar = await sharp(opts.avatarPath)
    .resize(avatarSize, avatarSize)
    .composite([{
      input: Buffer.from(`<svg><circle cx="${avatarSize/2}" cy="${avatarSize/2}" r="${avatarSize/2}" fill="white"/></svg>`),
      blend: 'dest-in'
    }])
    .png()
    .toBuffer();
  
  // Build the SVG frame
  const contentX = padding + avatarSize + gap;
  const headerY = padding;
  const messageY = headerY + headerHeight + 4;
  const imageY = (opts.message ? messageY + messageHeight : headerY + headerHeight) + gap;
  
  // Escape text for SVG
  const escapeXml = (str) => String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${frameWidth}" height="${frameHeight}">
    <defs>
      <clipPath id="roundedCorners">
        <rect x="0" y="0" width="${frameWidth}" height="${frameHeight}" rx="8" ry="8"/>
      </clipPath>
    </defs>
    <rect width="100%" height="100%" fill="${bgColor}" clip-path="url(#roundedCorners)"/>
    
    <!-- Header: Name + APP badge + timestamp -->
    <text x="${contentX}" y="${headerY + 16}" fill="${nameColor}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="600">${escapeXml(opts.name)}</text>
    
    <rect x="${contentX + 50}" y="${headerY + 4}" width="32" height="16" rx="3" fill="${badgeColor}"/>
    <text x="${contentX + 66}" y="${headerY + 15}" fill="white" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="10" font-weight="600" text-anchor="middle">APP</text>
    
    <text x="${contentX + 90}" y="${headerY + 16}" fill="${timeColor}" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="12">${escapeXml(opts.timestamp)}</text>
    
    ${opts.message ? `<text x="${contentX}" y="${messageY + 16}" fill="${msgColor}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="15">${escapeXml(opts.message)}</text>` : ''}
  </svg>`;
  
  // Compose everything
  const frame = await sharp({
    create: {
      width: frameWidth,
      height: frameHeight,
      channels: 4,
      background: { r: 54, g: 57, b: 63, alpha: 1 }
    }
  })
    .composite([
      // Background SVG with text
      { input: Buffer.from(svg), top: 0, left: 0 },
      // Avatar
      { input: avatar, top: padding, left: padding },
      // Content image
      { input: resizedInput, top: imageY, left: contentX },
    ])
    .png()
    .toBuffer();
  
  // Add rounded corners
  const rounded = await sharp(frame)
    .composite([{
      input: Buffer.from(`<svg width="${frameWidth}" height="${frameHeight}">
        <rect width="100%" height="100%" rx="12" ry="12" fill="white"/>
      </svg>`),
      blend: 'dest-in'
    }])
    .png()
    .toBuffer();
  
  writeFileSync(opts.output, rounded);
  console.log(`Wrapped image saved to ${opts.output}`);
}

const opts = parseArgs(process.argv.slice(2));
if (!opts.input) {
  console.error('Usage: node discord-wrap.mjs --input image.png --output wrapped.png --message "Text"');
  process.exit(1);
}

createDiscordFrame(opts).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
