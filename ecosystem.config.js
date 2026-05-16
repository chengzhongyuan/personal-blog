module.exports = {
  apps: [{
    name: 'my-blog',
    script: 'app.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      HOST: '0.0.0.0',
    },
    // 日志
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: './logs/error.log',
    out_file: './logs/access.log',
    merge_logs: true,
    // 自动重启
    max_memory_restart: '200M',
    autorestart: true,
    watch: false,
  }],
};
