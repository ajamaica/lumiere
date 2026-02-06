require('dotenv').config()
const { think } = require('./think')

console.log('🧠 Agent VIIXv2 online')

;(async () => {
  const question = 'Маніпуляція ж ефективніша за аргументи, хіба ні?'
  const answer = await think(question)
  console.log(answer)
})()
