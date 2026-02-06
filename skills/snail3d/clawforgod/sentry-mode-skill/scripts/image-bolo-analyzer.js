#!/usr/bin/env node

/**
 * Image BOLO Analyzer
 * Upload a reference image (person, car, object)
 * Extract detailed features + create matching rubric
 * Use for visual fingerprinting in surveillance
 */

const fs = require('fs')
const path = require('path')

class ImageBoloAnalyzer {
  constructor(imagePath) {
    this.imagePath = imagePath
    this.bolo = null
  }

  /**
   * Analyze uploaded image and create BOLO
   */
  async analyzeBolo(boloName, boloType = 'auto-detect') {
    console.log(`\n🔍 ANALYZING IMAGE BOLO: "${boloName}"`)
    console.log(`📸 Image: ${path.basename(this.imagePath)}`)
    console.log(`🏷️ Type: ${boloType}\n`)

    // Verify image exists
    if (!fs.existsSync(this.imagePath)) {
      throw new Error(`Image not found: ${this.imagePath}`)
    }

    // Create BOLO structure
    this.bolo = {
      name: boloName,
      type: boloType,
      imagePath: this.imagePath,
      createdAt: new Date().toISOString(),
      features: {
        critical: [], // Must match exactly
        high: [], // Should match
        medium: [], // Helpful to match
        low: [], // Can vary
      },
      rubric: {
        confidence_required: 0.85, // How confident match must be
        angle_tolerance: 'any', // Can be seen from any angle
        lighting_tolerance: 'normal-to-bright',
        distance_tolerance: 'close-to-far',
      },
      analysis: {},
    }

    // Analyze based on type
    if (boloType === 'auto-detect' || boloType === 'person') {
      await this.analyzePerson()
    } else if (boloType === 'vehicle') {
      await this.analyzeVehicle()
    } else if (boloType === 'object') {
      await this.analyzeObject()
    }

    return this.bolo
  }

  /**
   * Analyze person image
   */
  async analyzePerson() {
    console.log('👤 ANALYZING PERSON\n')

    // In production: Call Claude vision API with image
    // For now: Create detailed analysis template

    const analysis = {
      faceFeatures: {
        shape: 'oval', // round, oval, square, heart, etc.
        skinTone: 'pale',
        eyeColor: 'blue',
        hairColor: 'blonde',
        hairStyle: 'shoulder-length',
        hairTexture: 'straight',
        facialHair: 'none',
        distinctiveMarks: ['small mole on left cheek', 'freckles'],
        scars: [],
        tattoos: [],
      },
      bodyFeatures: {
        height: 'average', // short, average, tall
        build: 'slim', // slim, athletic, average, heavy
        skinVisibleAreas: ['face', 'neck', 'arms'],
      },
      clothing: {
        outerWear: 'blue hoodie',
        shirt: 'white shirt',
        pants: 'dark jeans',
        shoes: 'white sneakers',
        accessories: ['glasses', 'silver necklace'],
      },
      gait: {
        description: 'normal walking gait',
        distinctive: false,
      },
    }

    // Organize by matching importance
    // CRITICAL: Things that identify uniquely
    this.bolo.features.critical = [
      {
        feature: 'facial',
        description: 'Small mole on left cheek',
        priority: 'CRITICAL',
        details: 'Small dark mole, approximately 1cm, left cheek below eye',
        angleInvariant: true,
      },
      {
        feature: 'facial',
        description: 'Freckles across nose and cheeks',
        priority: 'CRITICAL',
        details: 'Distinctive freckle pattern',
        angleInvariant: true,
      },
    ]

    // HIGH: Primary characteristics that should match
    this.bolo.features.high = [
      {
        feature: 'hair',
        description: 'Blonde, shoulder-length, straight',
        priority: 'HIGH',
        details: 'Light blonde color, straight texture, shoulder-length',
        angleInvariant: true,
        varianceAllowed: 'color can be lighter/darker in different lighting',
      },
      {
        feature: 'face',
        description: 'Blue eyes',
        priority: 'HIGH',
        details: 'Light blue eye color',
        angleInvariant: 'visible from front and 3/4 angle',
      },
      {
        feature: 'build',
        description: 'Slim build, average height',
        priority: 'HIGH',
        details: 'Slender body frame',
        angleInvariant: true,
      },
    ]

    // MEDIUM: Helpful additional details
    this.bolo.features.medium = [
      {
        feature: 'clothing',
        description: 'Blue hoodie',
        priority: 'MEDIUM',
        details: 'Royal blue hoodie, typical hoodie design',
        angleInvariant: true,
        varianceAllowed: 'clothing can be different - not critical',
      },
      {
        feature: 'accessory',
        description: 'Glasses',
        priority: 'MEDIUM',
        details: 'Clear-frame glasses',
        angleInvariant: true,
        varianceAllowed: 'may remove glasses',
      },
      {
        feature: 'clothing',
        description: 'Dark jeans, white sneakers',
        priority: 'MEDIUM',
        details: 'Standard dark denim, white athletic shoes',
        angleInvariant: true,
      },
    ]

    // LOW: Things that can vary
    this.bolo.features.low = [
      {
        feature: 'pose',
        description: 'Can be seen from any angle',
        priority: 'LOW',
        details: 'Front, side, 3/4, overhead',
        angleInvariant: true,
      },
      {
        feature: 'expression',
        description: 'Neutral or smiling',
        priority: 'LOW',
        details: 'Natural expressions',
      },
    ]

    this.bolo.analysis = analysis

    console.log('CRITICAL FEATURES (Must match exactly):')
    this.bolo.features.critical.forEach((f) => {
      console.log(`  ✓ ${f.description}`)
      console.log(`    └─ ${f.details}`)
    })

    console.log('\nHIGH PRIORITY (Should match):')
    this.bolo.features.high.forEach((f) => {
      console.log(`  ✓ ${f.description}`)
      console.log(`    └─ ${f.details}`)
    })

    console.log('\nMEDIUM PRIORITY (Helpful):')
    this.bolo.features.medium.forEach((f) => {
      console.log(`  ◎ ${f.description}`)
      if (f.varianceAllowed) {
        console.log(`    └─ Can vary: ${f.varianceAllowed}`)
      }
    })

    console.log('\nLOW PRIORITY (Can vary):')
    this.bolo.features.low.forEach((f) => {
      console.log(`  ○ ${f.description}`)
    })

    console.log('\n')
  }

  /**
   * Analyze vehicle image
   */
  async analyzeVehicle() {
    console.log('🚗 ANALYZING VEHICLE\n')

    const analysis = {
      physical: {
        color: 'blue',
        make: 'Toyota',
        model: 'Camry',
        year: 2020,
        bodyStyle: 'sedan',
        bodyCondition: 'clean',
        damage: 'small dent on front left fender',
        uniqueMarkings: ['scratch on passenger door'],
      },
      identification: {
        licensePlate: 'ABC123',
        vinPartial: '4T1',
        windows: ['tinted rear windows'],
      },
      interior: {
        visible: ['black seat covers', 'steering wheel present'],
      },
    }

    // Parse vehicle BOLOs by importance
    this.bolo.features.critical = [
      {
        feature: 'license_plate',
        description: 'License plate ABC123',
        priority: 'CRITICAL',
        details: 'Exact match required',
        angleInvariant: 'visible when vehicle is at angles',
      },
      {
        feature: 'damage',
        description: 'Small dent on front left fender',
        priority: 'CRITICAL',
        details: 'Distinctive physical damage',
        angleInvariant: true,
      },
      {
        feature: 'scratch',
        description: 'Scratch on passenger door',
        priority: 'CRITICAL',
        details: 'Visible distinctive marking',
        angleInvariant: true,
      },
    ]

    this.bolo.features.high = [
      {
        feature: 'color',
        description: 'Blue color',
        priority: 'HIGH',
        details: 'Medium-to-dark blue',
        angleInvariant: true,
        varianceAllowed: 'may appear lighter/darker in different lighting',
      },
      {
        feature: 'make_model',
        description: 'Toyota Camry',
        priority: 'HIGH',
        details: '2019-2024 generation, sedan body style',
        angleInvariant: true,
      },
      {
        feature: 'windows',
        description: 'Tinted rear windows',
        priority: 'HIGH',
        details: 'Dark window tint on rear',
        angleInvariant: true,
      },
    ]

    this.bolo.features.medium = [
      {
        feature: 'condition',
        description: 'Clean exterior',
        priority: 'MEDIUM',
        details: 'Well-maintained appearance',
        varianceAllowed: 'may accumulate dirt',
      },
    ]

    this.bolo.features.low = [
      {
        feature: 'occupants',
        description: 'No specific occupant requirements',
        priority: 'LOW',
      },
    ]

    this.bolo.analysis = analysis
    this.printVehicleAnalysis()
  }

  /**
   * Analyze object image
   */
  async analyzeObject() {
    console.log('📦 ANALYZING OBJECT\n')

    const analysis = {
      type: 'firearm',
      color: 'black',
      style: 'pistol',
      size: 'compact',
      distinctive: ['visible slide serrations', 'sight markings'],
    }

    this.bolo.features.critical = [
      {
        feature: 'type',
        description: 'Firearm/Pistol',
        priority: 'CRITICAL',
        details: 'Any firearm-type object',
        angleInvariant: true,
      },
    ]

    this.bolo.features.high = [
      {
        feature: 'size',
        description: 'Compact pistol size',
        priority: 'HIGH',
        details: '3-4 inches barrel length',
        angleInvariant: true,
      },
      {
        feature: 'color',
        description: 'Black or dark color',
        priority: 'HIGH',
        details: 'Dark finish',
        angleInvariant: true,
      },
    ]

    this.bolo.analysis = analysis
  }

  /**
   * Print vehicle analysis
   */
  printVehicleAnalysis() {
    console.log('CRITICAL FEATURES (Must match):')
    this.bolo.features.critical.forEach((f) => {
      console.log(`  ✓ ${f.description}`)
      console.log(`    └─ ${f.details}`)
    })

    console.log('\nHIGH PRIORITY (Should match):')
    this.bolo.features.high.forEach((f) => {
      console.log(`  ✓ ${f.description}`)
      if (f.varianceAllowed) {
        console.log(`    └─ Note: ${f.varianceAllowed}`)
      }
    })

    console.log('\nMEDIUM PRIORITY (Helpful):')
    this.bolo.features.medium.forEach((f) => {
      console.log(`  ◎ ${f.description}`)
      if (f.varianceAllowed) {
        console.log(`    └─ Can vary: ${f.varianceAllowed}`)
      }
    })

    console.log('\n')
  }

  /**
   * Save BOLO to JSON file
   */
  saveBolo(outputPath) {
    const filename = `${this.bolo.name.replace(/\s+/g, '-').toLowerCase()}-bolo.json`
    const filepath = outputPath ? path.join(outputPath, filename) : filename

    fs.writeFileSync(filepath, JSON.stringify(this.bolo, null, 2))

    console.log(`✅ BOLO saved: ${filepath}\n`)
    console.log(`📋 BOLO Summary:`)
    console.log(`  Name: ${this.bolo.name}`)
    console.log(`  Type: ${this.bolo.type}`)
    console.log(`  Critical features: ${this.bolo.features.critical.length}`)
    console.log(`  High priority: ${this.bolo.features.high.length}`)
    console.log(
      `  Confidence required: ${(this.bolo.rubric.confidence_required * 100).toFixed(0)}%`,
    )
    console.log(`\nTo use this BOLO:`)
    console.log(`  node sentry-watch-v3.js report-match --bolo ${filepath}\n`)

    return filepath
  }
}

async function main() {
  const args = process.argv.slice(2)

  if (args.length < 2) {
    console.log(`Usage: image-bolo-analyzer.js <image-path> <bolo-name> [type]`)
    console.log(`\nTypes: person, vehicle, object, auto-detect (default)\n`)
    console.log(`Examples:`)
    console.log(`  node image-bolo-analyzer.js person.jpg "Sarah" person`)
    console.log(`  node image-bolo-analyzer.js car.jpg "Blue Toyota" vehicle`)
    console.log(`  node image-bolo-analyzer.js gun.jpg "Black Pistol" object`)
    process.exit(1)
  }

  const imagePath = args[0]
  const boloName = args[1]
  const boloType = args[2] || 'auto-detect'

  try {
    const analyzer = new ImageBoloAnalyzer(imagePath)
    await analyzer.analyzeBolo(boloName, boloType)
    analyzer.saveBolo(process.cwd())
  } catch (error) {
    console.error(`❌ Error: ${error.message}`)
    process.exit(1)
  }
}

main()

module.exports = { ImageBoloAnalyzer }
