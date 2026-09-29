const { cmd } = require('../redx');
const { exec } = require('child_process');
const path = require('path');

cmd({
  pattern: "wareact",
  alias: ["wreact"],
  react: "❤️",
  desc: "Channel react via Python satria API",
  category: "tools",
  filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
  if(!q ||!q.includes('whatsapp.com/channel/'))
    return reply('Use:.wareact https://whatsapp.com/channel/xxx/123 😍 ❤️');

  const args = q.trim().split(/\s+/);
  const url = args[0];
  const emojis = args.slice(1).join(' ') || '❤️';

  const pyFile = path.join(__dirname, '../channelreact.py');

  await reply(`🚀 Sending via Chrome impersonation...\n${url}\n${emojis}\nWait 15s...`);

  exec(`python3 "${pyFile}" "${url}" ${emojis}`, { timeout: 30000 }, (err, stdout, stderr) => {
    console.log('STDOUT:', stdout);
    console.log('STDERR:', stderr);
    if(err){
      return reply(`❌ Failed 502? Error:\n${stderr.slice(0,500) || err.message}`);
    }
    reply(`✅ Done:\n${stdout.slice(0,800)}`);
  });
});