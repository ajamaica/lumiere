#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require('fs')
const path = require('path')
const svgPathBbox = require('svg-path-bounding-box')

/**
 * Process a single SVG file to remove padding
 */
function processSVGFile(filePath) {
  const filename = path.basename(filePath)
  const content = fs.readFileSync(filePath, 'utf-8')

  // Get original viewBox
  const originalViewBox = content.match(/viewBox="([^"]+)"/)?.[1]

  // Extract all path elements
  const pathRegex = /<path[^>]*d="([^"]+)"/g
  const paths = []
  let match

  while ((match = pathRegex.exec(content)) !== null) {
    paths.push(match[1])
  }

  if (paths.length === 0) {
    console.log(`✗ No paths found in ${filename}`)
    return
  }

  // Calculate combined bounding box
  let globalMinX = Infinity
  let globalMaxX = -Infinity
  let globalMinY = Infinity
  let globalMaxY = -Infinity

  for (const pathData of paths) {
    try {
      const bbox = svgPathBbox(pathData)
      globalMinX = Math.min(globalMinX, bbox.x1)
      globalMaxX = Math.max(globalMaxX, bbox.x2)
      globalMinY = Math.min(globalMinY, bbox.y1)
      globalMaxY = Math.max(globalMaxY, bbox.y2)
    } catch (error) {
      console.log(`✗ Error processing path in ${filename}: ${error.message}`)
      return
    }
  }

  if (!isFinite(globalMinX)) {
    console.log(`✗ Could not calculate bounds for ${filename}`)
    return
  }

  // Calculate new viewBox with no padding
  const width = globalMaxX - globalMinX
  const height = globalMaxY - globalMinY

  // Round to 2 decimal places
  const newViewBox = `${globalMinX.toFixed(2)} ${globalMinY.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)}`

  // Update viewBox
  let newContent = content.replace(/viewBox="[^"]+"/, `viewBox="${newViewBox}"`)

  // Update width and height attributes
  const aspectRatio = width / height
  let newWidth, newHeight

  if (aspectRatio > 1) {
    newWidth = 24
    newHeight = Math.round(24 / aspectRatio)
  } else {
    newHeight = 24
    newWidth = Math.round(24 * aspectRatio)
  }

  newContent = newContent.replace(/width="[^"]+"/, `width="${newWidth}"`)
  newContent = newContent.replace(/height="[^"]+"/, `height="${newHeight}"`)

  // Write the updated SVG
  fs.writeFileSync(filePath, newContent)

  console.log(`✓ Processed ${filename}`)
  console.log(`  Original viewBox: ${originalViewBox}`)
  console.log(`  New viewBox: ${newViewBox}`)
  console.log(`  Size: ${newWidth}x${newHeight}\n`)
}

// Main execution
function main() {
  const assetsDir = path.join(__dirname, '..', 'assets')
  const svgFiles = fs.readdirSync(assetsDir).filter((file) => file.endsWith('.svg'))

  console.log(`Processing ${svgFiles.length} SVG files...\n`)

  for (const file of svgFiles) {
    const filePath = path.join(assetsDir, file)
    processSVGFile(filePath)
  }

  console.log('Done!')
}

main()
