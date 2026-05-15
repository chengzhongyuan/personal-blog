const { Client } = require('ssh2');
const c = new Client();
c.on('ready', () => {
  c.exec('cd ~/my-blog && git pull && pm2 reload my-blog', (e, s) => {
    s.stderr.on('data', d => process.stderr.write(d));
    s.on('close', () => { console.log('ok'); c.end(); });
  });
});
c.connect({ host: '49.232.244.54', port: 22, username: 'zhongyuan', password: '050129czy', readyTimeout: 10000 });
