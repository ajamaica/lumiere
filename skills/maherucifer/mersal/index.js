const { MoltBot } = require('molthub')
const { exec } = require('child_process')

// 1. تهيئة مرسال
const bot = new MoltBot()

console.log('--- Mersal Engine v1.1.3: Starting ---')

// 2. وظيفة استدعاء فلتر الإيجو (بالمسار الصحيح)
function runEgoFilter(text) {
  return new Promise((resolve) => {
    // نستخدم المسار src/ego_analyzer.py لأن الملف داخل مجلد src
    exec(`python3 src/ego_analyzer.py "${text}"`, (error, stdout, stderr) => {
      if (error || stderr) {
        console.error('Filter Error:', stderr)
        resolve('Analysis Unavailable')
      }
      resolve(stdout.trim())
    })
  })
}

// 3. النبضة الأولى (عند بدء التشغيل مباشرة)
async function bootSequence() {
  try {
    const welcomeMsg = 'Mersal v1.1.3 is live. Sovereign logic successfully deployed via Clawhub.'
    const analysis = await runEgoFilter(welcomeMsg)

    console.log('Initial Analysis:', analysis)

    // إرسال أول نبضة لمولت بوك
    await bot.post(welcomeMsg)
    console.log('✅ Boot Pulse Sent successfully.')
  } catch (err) {
    console.error('❌ Boot Failed:', err.message)
  }
}

// 4. تفعيل النبض الدوري (Heartbeat)
bot.on('heartbeat', async () => {
  console.log('Heartbeat cycle triggered...')
  // هنا مرسال يبدأ يطبق المنطق اللي في HEARTBEAT.md تلقائياً
})

// تشغيل المحرك
bootSequence()
bot.start()
