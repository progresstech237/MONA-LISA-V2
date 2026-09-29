const { cmd } = require('../redx');
const axios = require('axios');

const API = 'https://omegatech-api.dixonomega.tech/api/Maker/iqc-canvas';

cmd({
  pattern: "iqc",
  alias: ["iqcanvas", "qc", "quotecanvas", "fakequote"],
  react: "💬",
  desc: "Generate Fake WhatsApp Quote canvas - iQC - /api/Maker/iqc-canvas",
  category: "maker",
  filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
  try {
    if (!q) {
      return reply(
`╭─ *💬 iQC CANVAS - LIVE ✅* ─
│ Fake WA quote with reactions
│
├─ *📌 USAGE*
│.iqc PROGRESS TECH
│.iqc Your text here
│.iqc Hello world | 09:23 | 26
│
├─ *⚙️ FULL FORMAT*
│.iqc text | time | battery | wifi | operator
│ Ex:.iqc PROGRESS TECH | 09:23 | 88 | true | true
│
├─ *📝 DEFAULTS*
│ time=09:23, battery=26, wifi=true
│ operator=true, timebar=true
│ batteryCharging=false
│
├─ *🔥 YOUR SCREENSHOT*
│.iqc PROGRESS TECH → dark WA bubble
│ with 👍❤️😂 + Balas/Teruskan
│
╰─ Endpoint: /api/Maker/iqc-canvas`
      );
    }

    await conn.sendMessage(from, { react: { text: "💬", key: mek.key } });
    await conn.sendPresenceUpdate('composing', from);

    let text = q.trim();
    let time = '09:23';
    let battery = '26';
    let batteryCharging = 'false';
    let wifi = 'true';
    let operator = 'true';
    let timebar = 'true';

    // Parse pipe
    if (q.includes('|')) {
      const p = q.split('|').map(s=>s.trim());
      text = p[0] || text;
      if (p[1]) time = p[1];
      if (p[2]) battery = p[2].replace('%','');
      if (p[3]) wifi = p[3];
      if (p[4]) operator = p[4];
      if (p[5]) timebar = p[5];
    }

    const params = { text, time, battery, batteryCharging, wifi, operator, timebar };

    // Call - returns raw PNG
    const res = await axios.get(API, {
      params,
      responseType: 'arraybuffer',
      timeout: 60000
    });

    const buf = Buffer.from(res.data);

    await conn.sendMessage(from, {
      image: buf,
      caption: `*💬 iQC CANVAS DONE ✅*\n*Text:* ${text}\n*Time:* ${time} | *Battery:* ${battery}%\n\n> @Progress Tech1`
    }, { quoted: mek });

  } catch (e) {
    console.error('iQC error', e.message);
    reply(`❌ Failed: ${e.message}\n\nTry:.iqc PROGRESS TECH`);
  }
});
