const { cmd } = require('../redx');
const axios = require('axios');
const FormData = require('form-data');

const API = 'https://omegatech-api.dixonomega.tech/api/Maker/fake-tweet';
const CATBOX = 'https://catbox.moe/user/api.php';

async function uploadCatbox(buffer) {
  const form = new FormData();
  form.append('reqtype', 'fileToUpload');
  form.append('fileToUpload', buffer, { filename: `av_${Date.now()}.png` });
  const { data } = await axios.post(CATBOX, form, { headers: form.getHeaders(), timeout: 30000 });
  if (typeof data === 'string' && data.trim().startsWith('http')) return data.trim();
  throw new Error('Catbox fail');
}

async function dlBuf(conn, mek, isQuoted=false) {
  try {
    if (isQuoted) {
      const qMsg = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      if (!qMsg?.imageMessage) return null;
      const b = await conn.downloadMediaMessage({ message: qMsg });
      return b? Buffer.from(b):null;
    } else {
      if (!mek.message?.imageMessage) return null;
      const b = await conn.downloadMediaMessage(mek);
      return b? Buffer.from(b):null;
    }
  } catch { return null; }
}

cmd({
  pattern: "faketweet",
  alias: ["ftweet", "tweet", "fakex", "xtweet"],
  react: "🐦",
  desc: "Generate Fake Tweet image - verified badge - /api/Maker/fake-tweet",
  category: "fun",
  filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
  try {
    if (!q &&!mek.message?.imageMessage) {
      return reply(
`╭─ *🐦 FAKE TWEET - LIVE ✅* ─
│ Generates X/Twitter fake tweet
│
├─ *📌 USAGE - 4 WAYS*
│.faketweet Progress TECH | progress12 | CONNECTING SANDBOX ENDPOINT...
│.faketweet Elon Musk | elonmusk | Starship launch tonight | true
│
│ Avatar from reply:
│ Reply to avatar image with:
│.faketweet Progress TECH | progress12 | My tweet is viral!
│
│ With tweet image:
│ Reply to avatar, attach tweet image:
│.faketweet Name | username | comment
│ (attach tweet image + reply avatar)
│
├─ *📝 FORMAT*
│ name | username | comment | verified(true/false)
│ verified optional - default true
│
├─ *🔥 YOUR EXAMPLE*
│.faketweet Progress TECH | progress12 | CONNECTING SANDBOX ENDPOINT...
│ avatar=https://files.catbox.moe/9wopsr.png
│ → returns fake tweet png
│
╰─ Endpoint: /api/Maker/fake-tweet`
      );
    }

    await conn.sendMessage(from, { react: { text: "🐦", key: mek.key } });

    let name = 'Progress TECH';
    let username = 'progress12';
    let comment = 'CONNECTING SANDBOX ENDPOINT...';
    let verified = 'true';
    let avatarUrl = 'https://files.catbox.moe/9wopsr.png';
    let linkUrl = '';

    // Parse q with |
    if (q) {
      const parts = q.split('|').map(s=>s.trim()).filter(Boolean);
      if (parts.length >= 1) name = parts[0];
      if (parts.length >= 2) username = parts[1].replace('@','');
      if (parts.length >= 3) comment = parts[2];
      if (parts.length >= 4) verified = parts[3].toLowerCase().includes('true')? 'true':'false';
      if (parts.length >= 5) linkUrl = parts[4];
    }

    // Check images - avatar from quoted, link from current
    const quotedBuf = await dlBuf(conn, mek, true);
    const currentBuf = await dlBuf(conn, mek, false);

    if (quotedBuf && currentBuf) {
      // quoted = avatar, current = tweet image
      avatarUrl = await uploadCatbox(quotedBuf);
      linkUrl = await uploadCatbox(currentBuf);
    } else if (quotedBuf) {
      avatarUrl = await uploadCatbox(quotedBuf);
    } else if (currentBuf) {
      // If only current image and q has no avatar url, use as avatar
      // If user wants tweet image only, they can set linkUrl in text
      avatarUrl = await uploadCatbox(currentBuf);
    }

    await conn.sendPresenceUpdate('composing', from);

    // Call API
    const params = { name, username, comment, avatar: avatarUrl, verified };
    if (linkUrl) params.link = linkUrl;
    if (linkUrl) params.image = linkUrl;

    const { data } = await axios.get(API, { params, timeout: 60000 });

    // Find image
    let resultUrl = data?.data?.link || data?.link || data?.data?.image || data?.image || data?.result;
    // Some endpoints return raw PNG directly
    let imgBuf;

    if (resultUrl && resultUrl.startsWith('http')) {
      imgBuf = await axios.get(resultUrl, { responseType: 'arraybuffer', timeout: 60000 }).then(r=>Buffer.from(r.data));
    } else {
      // Try raw PNG from API itself
      const res = await axios.get(API, { params, responseType: 'arraybuffer', timeout: 60000 });
      // If JSON, try parse
      try {
        const json = JSON.parse(Buffer.from(res.data).toString());
        const url2 = json?.data?.link || json?.data?.image;
        if (url2) imgBuf = await axios.get(url2, { responseType: 'arraybuffer' }).then(r=>Buffer.from(r.data));
        else throw new Error('no url');
      } catch {
        imgBuf = Buffer.from(res.data);
      }
    }

    // Send as NORMAL IMAGE
    await conn.sendMessage(from, {
      image: imgBuf,
      caption: `*🐦 FAKE TWEET DONE ✅*\n*Name:* ${name}\n*Username:* @${username}\n*Comment:* ${comment}\n*Verified:* ${verified}\n\n> @Progress Tech `
    }, { quoted: mek });

  } catch (e) {
    console.error('FakeTweet error', e.response?.data || e.message);
    reply(`❌ Failed: ${e.message}\n\nTry:.faketweet Progress TECH | progress12 | Hello world`);
  }
});
