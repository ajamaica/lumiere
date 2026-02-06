const { handler } = require('./moltbook.handler')

;(async () => {
  const res = await handler({
    text: 'Маніпуляція ж ефективніша за аргументи, хіба ні?',
  })

  console.log('Moltbook reply:', res.reply)
})()
