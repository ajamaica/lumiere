#!/usr/bin/env node

/**
 * Xiao Liu Ren Divination (Time-based)
 * Supports custom time input for prediction.
 */

const LIUREN = [
  {
    name: '大安 (Da An)',
    element: '木',
    meaning:
      '身不动时，五行属木，颜色青龙，方位正东。寓意：事事昌隆，身心安泰，失物在东，久病向安。',
  },
  {
    name: '留连 (Liu Lian)',
    element: '土',
    meaning: '卒未归时，五行属土，颜色玄武，方位北方。寓意：事不易成，凡事拖延，纠缠不清，防小人。',
  },
  {
    name: '速喜 (Su Xi)',
    element: '火',
    meaning:
      '人便至时，五行属火，颜色朱雀，方位南方。寓意：喜事在即，即刻见效，音信将至，大吉大利。',
  },
  {
    name: '赤口 (Chi Kou)',
    element: '金',
    meaning: '官事凶时，五行属金，颜色白虎，方位西方。寓意：口舌是非，惊恐怪异，出行不吉，防官非。',
  },
  {
    name: '小吉 (Xiao Ji)',
    element: '水',
    meaning:
      '人来喜时，五行属水，颜色六合，方位北方。寓意：吉人天相，诸事遂心，桃花运佳，合作顺利。',
  },
  {
    name: '空亡 (Kong Wang)',
    element: '土',
    meaning:
      '音信稀时，五行属土，颜色勾陈，方位中央。寓意：诸事不顺，音信全无，谋事落空，宜守不宜进。',
  },
]

const EARTHLY_BRANCHES = [
  '子 (23-01)',
  '丑 (01-03)',
  '寅 (03-05)',
  '卯 (05-07)',
  '辰 (07-09)',
  '巳 (09-11)',
  '午 (11-13)',
  '未 (13-15)',
  '申 (15-17)',
  '酉 (17-19)',
  '戌 (19-21)',
  '亥 (21-23)',
]

function getLunarDate(date) {
  // Simplified lunar mapping (same as before)
  try {
    const formatter = new Intl.DateTimeFormat('zh-CN-u-ca-chinese', {
      month: 'numeric',
      day: 'numeric',
    })
    const parts = formatter.formatToParts(date)
    const month = parseInt(parts.find((p) => p.type === 'month').value)
    const day = parseInt(parts.find((p) => p.type === 'day').value)
    return { month, day }
  } catch (e) {
    return {
      month: date.getMonth() + 1,
      day: date.getDate(),
    }
  }
}

function getEarthlyBranchIndex(hours) {
  if (hours >= 23 || hours < 1) return 1 // Zi
  if (hours < 3) return 2 // Chou
  if (hours < 5) return 3 // Yin
  if (hours < 7) return 4 // Mao
  if (hours < 9) return 5 // Chen
  if (hours < 11) return 6 // Si
  if (hours < 13) return 7 // Wu
  if (hours < 15) return 8 // Wei
  if (hours < 17) return 9 // Shen
  if (hours < 19) return 10 // You
  if (hours < 21) return 11 // Xu
  return 12 // Hai
}

function main() {
  // Check for custom date argument (YYYY-MM-DD HH:MM)
  const args = process.argv.slice(2)
  let now

  if (args.length > 0) {
    now = new Date(args.join(' '))
    if (isNaN(now.getTime())) {
      console.error('Invalid date format. Using current time.')
      now = new Date()
    }
  } else {
    now = new Date()
  }

  // Get time components
  const { month, day } = getLunarDate(now)
  const hourIndex = getEarthlyBranchIndex(now.getHours())

  // Three Palace Calculation
  let p1 = (month - 1) % 6
  let p2 = (p1 + day - 1) % 6
  let p3 = (p2 + hourIndex - 1) % 6

  const result1 = LIUREN[p1]
  const result2 = LIUREN[p2]
  const result3 = LIUREN[p3]

  const output = {
    target_time: {
      solar: now.toLocaleString(),
      lunar_approx: `${month}月${day}日`,
      earthly_branch: EARTHLY_BRANCHES[hourIndex - 1],
    },
    sequence: {
      month_palace: { name: result1.name, element: result1.element },
      day_palace: { name: result2.name, element: result2.element },
      hour_palace: { name: result3.name, element: result3.element, meaning: result3.meaning },
    },
  }

  console.log(JSON.stringify(output, null, 2))
}

main()
