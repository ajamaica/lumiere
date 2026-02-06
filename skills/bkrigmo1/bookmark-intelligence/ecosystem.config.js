const path = require('path')

module.exports = {
  apps: [
    {
      name: 'bookmark-intelligence',
      script: './monitor.js',
      cwd: __dirname, // Use current directory instead of hardcoded path
      interpreter: 'node',

      // Restart strategy
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',

      // Scheduling - run every hour
      cron_restart: '0 * * * *',

      // Logging
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // Environment
      env: {
        NODE_ENV: 'production',
      },

      // Resource limits
      max_memory_restart: '500M',

      // Instance settings
      instances: 1,
      exec_mode: 'fork',
    },
  ],
}
