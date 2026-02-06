// qweather_config.js
// ⚠️ 所有配置只写在这里，其他文件禁止再写死

module.exports = {
  // 你的专属 API Host
  API_HOST: 'xxx.re.qweatherapi.com',

  // JWT 相关
  PROJECT_ID: 'xxx',
  CREDENTIALS_ID: 'xxxx',

  // 私钥路径（相对当前文件）
  PRIVATE_KEY_PATH: './ed25519-private.txt',

  // 可选：默认城市（用户没说地点时用）
  DEFAULT_LOCATION: 'xx',
}
