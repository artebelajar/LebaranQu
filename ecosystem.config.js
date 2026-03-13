// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'lebaranqu',
    script: 'index.js',
    instances: 'max', // gunakan semua CPU
    exec_mode: 'cluster',
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 6006
    }
  }]
};