const { cmd } = require('../redx');
const axios = require('axios');
const FormData = require('form-data');

const API = 'https://omegatech-api.dixonomega.tech/api/tools/weclome-card';
const CATBOX = 'https://catbox.moe/user/api.php';

async function uploadCatbox(buffer, name='img.jpg') {
  const form = new FormData();
  form.append('reqtype', 'fileToUpload');
  form.append('fileToUpload', buffer, { filename: name });
  const { data } = await axios.post(CATBOX, form, { headers: form.getHeaders(), timeout: 30000 });
  if (typeof data === 'string' && data.startsWith('http')) return data.trim();
  throw new Error('Catbox fail');
}

cmd({
  pattern: "welcomecard",
  alias: ["wc", "welcomec", "weclomecard", "welcomebanner", "wcard"],
  react: "👋",
  desc: "Generate welcome card - /api/tools/weclome-card",
  category: "tools",
  filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
  try {
    if (!q) {
      return reply(
`╭─ *👋 WELCOME CARD - LIVE ✅* ─
│ Returns RAW PNG Image
│
├─ *📌 USAGE*
│.wc Welcome | To My Group | Enjoy your stay
│.wc Hello | New Member | Have fun here
│.wc Dixon | Omega Tech | Welcome to the fam
│
├─ *📌 WITH AVATAR (Reply to image)*
│ Reply to user photo with:
│.wc Welcome | To Group | Enjoy
│ → uses replied pic as avatar
│
├─ *📌 ADVANCED - 4 Params*
│.wc Welcome | Subtitle | Footer | https://avatar.url
│ Format: text1 | text2 | text3 | avatarURL
│
├─ *⚙️ PARAMS (from your SS)*
│ background=BG URL (auto default)
│ text1=Main title*
│ text2=Subtitle*
│ text3=Footer text*
│ avatar=Avatar URL* (auto from reply)
│
╰─ Endpoint: /api/tools/weclome-card`
      );
    }

    await conn.sendMessage(from, { react: { text: "🎨", key: mek.key } });
    await conn.sendPresenceUpdate('composing', from);

    let text1 = 'Welcome', text2 = 'To The Group', text3 = 'Enjoy Your Stay', customAvatar = '';
    let avatarUrl = 'https://files.catbox.moe/qm6qeb.png'; // default
    let bgUrl = 'https://files.catbox.moe/0z4b6x.jpg'; // default welcome bg

    // Parse | format
    if (q.includes('|')) {
      const parts = q.split('|').map(p=>p.trim());
      text1 = parts[0] || text1;
      text2 = parts[1] || text2;
      text3 = parts[2] || text3;
      if (parts[3] && parts[3].startsWith('http')) customAvatar = parts[3];
    } else {
      text1 = q.trim();
    }

    // If reply to image, use as avatar
    const quoted = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const hasQuotedImg = quoted && (quoted.imageMessage || quoted.documentMessage);
    const hasDirectImg = mek.message?.imageMessage;

    if (hasQuotedImg || hasDirectImg) {
      try {
        const target = hasQuotedImg? { message: quoted } : mek;
        let buf = await conn.downloadMediaMessage(target);
        buf = Buffer.from(buf);
        avatarUrl = await uploadCatbox(buf, `avatar_${Date.now()}.jpg`);
      } catch (e) {
        console.log('Avatar upload fail', e.message);
      }
    }

    if (customAvatar) avatarUrl = customAvatar;

    // Call API - returns raw PNG
    const res = await axios.get(API, {
      params: {
        background: bgUrl,
        text1,
        text2,
        text3,
        avatar: avatarUrl
      },
      responseType: 'arraybuffer',
      timeout: 60000
    });

    const buf = Buffer.from(res.data);

    await conn.sendMessage(from, {
      image: buf,
      caption: `*👋 WELCOME CARD DONE ✅*\n*Title:* ${text1}\n*Sub:* ${text2}\n*Footer:* ${text3}\n\n> @Omegatech-01 • weclome-card`
    }, { quoted: mek });

  } catch (e) {
    console.error('Welcome card error', e.response?.data || e.message);
    // Try to parse error image as text
    let errMsg = e.message;
    if (e.response?.data) {
      try { errMsg = Buffer.from(e.response.data).toString().slice(0,500); } catch {}
    }
    reply(`❌ Failed: ${errMsg}\n\nTry:.wc Welcome | To Group | Enjoy\n+ reply to avatar image`);
  }
});
