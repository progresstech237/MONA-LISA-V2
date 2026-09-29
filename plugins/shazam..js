const { cmd } = require('../redx');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const NEWSLETTER_JID = '120363425282620066@newsletter';
const BRAND = '🔹 Powered by Progress Tech • 🥷TECH TOY🧑‍💻™ ✓';
const API = 'https://eliteprotech-apis.zone.id/tools/shazam';

async function uploadToCatbox(filePath) {
  const form = new FormData();
  form.append('reqtype', 'fileupload');
  form.append('fileToUpload', fs.createReadStream(filePath));
  const { data } = await axios.post('https://catbox.moe/user/api.php', form, { headers: form.getHeaders(), timeout: 60000 });
  return data;
}

cmd({
  pattern: "shazam",
  alias: ["findsong","whatsong","songfind"],
  react: "🎧",
  desc: "Shazam - Find song from audio",
  category: "tools",
  filename: __filename
}, async (conn, mek, m, { from, q, reply, prefix }) => {
  try {
    const ctx = {
      forwardingScore: 999,
      isForwarded: true,
      forwardedNewsletterMessageInfo: {
        newsletterJid: NEWSLETTER_JID,
        serverMessageId: 142,
        newsletterName: '🥷TECH TOY🧑‍💻™ ✓'
      }
    };

    const quoted = m.quoted;
    const hasAudio = quoted && (quoted.audioMessage || quoted.videoMessage || quoted.pttMessage || quoted.documentMessage);

    if (!q && !hasAudio) {
      const menu = `┏━━〔 🎧 Shazam 〕━━┓
┃ Identify any song
┃ Provider: eliteprotech-apis.zone.id
┃
┃ *Use:*
┃ Reply to audio/voice with ${prefix}shazam
┃ ${prefix}shazam https://files.catbox.moe/03kcv7.mp3
┃ ${prefix}findsong (reply to song)
┗━━━━━━━━━━━━━━┛`;
      return await conn.sendMessage(from, { text: menu, contextInfo: ctx }, { quoted: mek });
    }

    await conn.sendMessage(from, { react: { text: "🔍", key: mek.key } });

    let audioUrl = q?.trim() || null;
    let tmpFile = null;

    if (hasAudio) {
      try {
        const mime = quoted.mimetype || 'audio/mpeg';
        const ext = mime.includes('video') ? 'mp4' : 'mp3';
        tmpFile = path.join(__dirname, `../tmp_shazam_${Date.now()}.${ext}`);
        const buffer = await conn.downloadMediaMessage({ message: { [quoted.audioMessage ? 'audioMessage' : quoted.videoMessage ? 'videoMessage' : 'documentMessage']: quoted.audioMessage || quoted.videoMessage || quoted.documentMessage } });
        fs.writeFileSync(tmpFile, buffer);
        const uploaded = await uploadToCatbox(tmpFile);
        if (uploaded && uploaded.startsWith('http')) audioUrl = uploaded;
      } catch (e) {
        return reply(`❌ Failed to download audio: ${e.message}`);
      }
    }

    if (!audioUrl || !audioUrl.startsWith('http')) return reply(`❌ Provide valid audio URL or reply to audio.`);

    await reply(`*🎧 Shazaming...*\nAnalyzing: ${audioUrl.slice(0,60)}...`);

    const { data } = await axios.get(`${API}?url=${encodeURIComponent(audioUrl)}`, { timeout: 60000 });

    if (tmpFile && fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);

    if (!data.success || !data.data) return reply(`❌ Song not found.\n${JSON.stringify(data).slice(0,500)}`);

    const s = data.data;
    const duration = s.duration_ms ? `${Math.floor(s.duration_ms/60000)}:${String(Math.floor((s.duration_ms%60000)/1000)).padStart(2,'0')}` : 'N/A';

    const caption = `┏━━〔 🎧 Shazam Found 〕━━┓
┃ *Title:* ${s.title || 'N/A'}
┃ *Artist:* ${s.artist || 'N/A'}
┃ *Album:* ${s.album || 'N/A'}
┃ *Release:* ${s.release_date || 'N/A'}
┃ *Label:* ${s.label || 'N/A'}
┃ *Genre:* ${s.genres?.join(', ') || 'N/A'}
┃ *Duration:* ${duration}
┃ *Score:* ${s.score || 0}%
┗━━━━━━━━━━━━━━┛

_${BRAND}_`;

    await conn.sendMessage(from, { text: caption, contextInfo: ctx }, { quoted: mek });

  } catch (e) {
    reply(`❌ Error: ${e.response ? JSON.stringify(e.response.data).slice(0,500) : e.message}`);
  }
});