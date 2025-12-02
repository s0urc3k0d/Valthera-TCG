module.exports = {
  apps: [{
    name: 'valthera-tcg',
    script: 'npm',
    args: 'run preview -- --port 3004 --host 0.0.0.0',
    cwd: '/var/www/valthera-tcg',
    env: {
      NODE_ENV: 'production',
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    error_file: '/var/log/pm2/valthera-tcg-error.log',
    out_file: '/var/log/pm2/valthera-tcg-out.log',
    time: true,
  }]
};
